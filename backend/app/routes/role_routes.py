"""Every person can be both a donor and a patient. These routes let one logged-in person add the other role and switch between them."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.donor import Donor
from app.models.receiver import Receiver
from app.schemas.donor_schema import EligibilityAnswers, BLOOD_TYPES
from app.services.eligibility_service import evaluate_eligibility
from app.services.referral_service import new_referral_code
from app.utils.dependencies import get_current_any_account
from app.utils.location import build_address_label
from app.utils.security import create_access_token
from app.utils.validators import validate_person_name

router = APIRouter(prefix="/auth", tags=["Roles"])

PLACE_FIELDS = ("latitude", "longitude", "village", "area", "city", "state", "country")


def _me(db: Session, who):
    role, account_id = who
    if role == "donor":
        return role, db.query(Donor).filter(Donor.id == account_id).first()
    if role == "receiver":
        return role, db.query(Receiver).filter(Receiver.id == account_id).first()
    raise HTTPException(status_code=400, detail="Only donors and patients can have both roles.")


def _sibling(db: Session, role: str, email: str):
    model = Donor if role == "donor" else Receiver
    return db.query(model).filter(func.lower(model.email) == (email or "").lower()).first()


def _token(role: str, account) -> dict:
    return {"access_token": create_access_token({"sub": str(account.id), "role": role}),
            "token_type": "bearer", "role": role}


@router.get("/roles")
def my_roles(db: Session = Depends(get_db), who=Depends(get_current_any_account)):
    role, me = _me(db, who)
    if not me:
        raise HTTPException(status_code=401, detail="Not signed in")
    return {"current": role,
            "has_donor": bool(_sibling(db, "donor", me.email)),
            "has_receiver": bool(_sibling(db, "receiver", me.email))}


class SwitchIn(BaseModel):
    role: str


@router.post("/switch-role")
def switch_role(data: SwitchIn, db: Session = Depends(get_db), who=Depends(get_current_any_account)):
    if data.role not in ("donor", "receiver"):
        raise HTTPException(status_code=400, detail="Choose donor or patient.")
    _role, me = _me(db, who)
    other = _sibling(db, data.role, me.email)
    if not other:
        raise HTTPException(status_code=404, detail="You do not have that kind of account yet.")
    return _token(data.role, other)


class AddDonorRole(BaseModel):
    blood_type: str
    eligibility: EligibilityAnswers

    @field_validator("blood_type")
    @classmethod
    def _blood(cls, v):
        if v not in BLOOD_TYPES:
            raise ValueError("Choose a valid blood type.")
        return v


class AddPatientRole(BaseModel):
    patient_name: Optional[str] = None
    address: Optional[str] = None

    @field_validator("patient_name")
    @classmethod
    def _patient(cls, v):
        return validate_person_name(v, "Patient name") if v and v.strip() else None


@router.post("/add-role/donor")
def add_donor_role(data: AddDonorRole, db: Session = Depends(get_db), who=Depends(get_current_any_account)):
    role, me = _me(db, who)
    if role != "receiver":
        raise HTTPException(status_code=400, detail="You are already a donor.")
    if _sibling(db, "donor", me.email):
        raise HTTPException(status_code=400, detail="You already have a donor account.")
    answers = data.eligibility.model_dump()
    verdict = evaluate_eligibility(answers)
    if not verdict["eligible"]:
        reasons = " ".join(r["message"] for r in verdict["reasons"])
        raise HTTPException(status_code=422, detail=f"You cannot register as a donor right now. {reasons}")
    last = None
    if answers.get("last_donation_date"):
        try:
            last = datetime.strptime(answers["last_donation_date"][:10], "%Y-%m-%d")
        except ValueError:
            last = None
    donor = Donor(
        full_name=me.full_name, email=me.email, hashed_password=me.hashed_password,
        blood_type=data.blood_type, phone_number=me.phone_number, cnic_number=me.cnic_number,
        age=answers["age"], gender=answers["gender"].lower(), weight_kg=answers["weight_kg"],
        eligibility_checked_at=datetime.utcnow(), last_donation_date=last,
        phone_verified=me.phone_verified, email_verified=me.email_verified,
        referral_code=new_referral_code(db),
        **{f: getattr(me, f) for f in PLACE_FIELDS},
    )
    db.add(donor)
    db.commit()
    db.refresh(donor)
    return _token("donor", donor)


@router.post("/add-role/patient")
def add_patient_role(data: AddPatientRole, db: Session = Depends(get_db), who=Depends(get_current_any_account)):
    role, me = _me(db, who)
    if role != "donor":
        raise HTTPException(status_code=400, detail="You are already a patient.")
    if _sibling(db, "receiver", me.email):
        raise HTTPException(status_code=400, detail="You already have a patient account.")
    place = build_address_label(me.village, me.area, me.city, me.state, me.country)
    receiver = Receiver(
        full_name=me.full_name, email=me.email, hashed_password=me.hashed_password,
        phone_number=me.phone_number, cnic_number=me.cnic_number or "",
        address=", ".join(p for p in (data.address, place) if p) or "-",
        patient_name=data.patient_name,
        phone_verified=me.phone_verified, email_verified=me.email_verified,
        **{f: getattr(me, f) for f in PLACE_FIELDS},
    )
    db.add(receiver)
    db.commit()
    db.refresh(receiver)
    return _token("receiver", receiver)
