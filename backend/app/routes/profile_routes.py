from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.admin import Admin
from app.models.donation import Donation
from app.models.donor import Donor
from app.models.hospital import Hospital
from app.models.receiver import Receiver
from app.models.request import BloodRequest
from app.models.staff import Staff
from app.models.visitor_log import VisitorEntry
from app.utils.dependencies import get_current_any_account
from app.utils.badges import get_badge_tier, get_next_eligible_date, is_eligible_now
from app.utils.location import build_address_label
from app.services.history_service import build_history_entry
from app.models.extras import RecoveryInfo, HospitalReview
from app.utils.security import hash_password, verify_password
from app.services.audit_service import record_event
from pydantic import BaseModel

router = APIRouter(prefix="/profile", tags=["My Profile"])


def _d(value):
    return value.strftime("%d %b %Y, %I:%M %p") if value else "-"


def _yn(flag):
    return "Yes" if flag else "No"


@router.get("/me")
def my_profile(db: Session = Depends(get_db), who=Depends(get_current_any_account)):
    """One profile for every kind of account: a list of labelled fields, a map point and a history list."""
    role, account_id = who
    fields, history, lat, lon = [], [], None, None

    if role == "donor":
        a = db.query(Donor).filter(Donor.id == account_id).first()
        if not a:
            raise HTTPException(status_code=404, detail="Account not found")
        donations = db.query(Donation).filter(Donation.status == "confirmed", Donation.donor_id == a.id).order_by(Donation.donated_at.desc()).all()
        total_units = sum(x.units_donated or 0 for x in donations)
        nxt = get_next_eligible_date(a.last_donation_date, a.gender, a.deferred_until)
        can_now = is_eligible_now(a.is_eligible, a.last_donation_date, a.gender, a.deferred_until)
        fields = [
            ("Full name", a.full_name), ("Email (username)", a.email), ("Phone", a.phone_number),
            ("Blood type", a.blood_type),
            ("Place (where from)", build_address_label(a.village, a.area, a.city, a.state, a.country) or "-"),
            ("Last time donated blood", _d(a.last_donation_date) if a.last_donation_date else "Never donated yet"),
            ("Next time can donate", (_d(nxt) if nxt else "Can donate now") if a.is_eligible else "Not eligible (marked by you)"),
            ("Can donate now", _yn(can_now)),
            ("Total donations", len(donations)), ("Total bags donated", total_units),
            ("Badge", get_badge_tier(len(donations))), ("Points", a.points),
            ("Medical clearance", a.medical_clearance_status or "pending"),
            ("Member since", _d(a.created_at)),
        ]
        lat, lon = a.latitude, a.longitude
        for d in donations:
            req = db.query(BloodRequest).filter(BloodRequest.id == d.request_id).first()
            e = build_history_entry(db, d, req) if req else None
            if e:
                history.append({
                    "title": f"Gave {e.units_donated} bag(s) of {e.donor_blood_type} to {e.requester_name}",
                    "detail": f"Patient: {e.patient_name or '-'} · Phone: {e.requester_phone}"
                              + (f" · {e.requester_address}" if e.requester_address else ""),
                    "date": _d(e.donated_at),
                })

    elif role == "receiver":
        a = db.query(Receiver).filter(Receiver.id == account_id).first()
        if not a:
            raise HTTPException(status_code=404, detail="Account not found")
        reqs = db.query(BloodRequest).filter(BloodRequest.requester_type == "receiver", BloodRequest.requester_id == a.id)\
            .order_by(BloodRequest.created_at.desc()).all()
        fields = [
            ("Full name", a.full_name), ("Patient name", a.patient_name or a.full_name),
            ("Email (username)", a.email), ("Phone", a.phone_number), ("CNIC", a.cnic_number),
            ("Address", a.address),
            ("Place", build_address_label(a.village, a.area, a.city, a.state, a.country) or "-"),
            ("Total blood requests", len(reqs)),
            ("Requests fulfilled", sum(1 for r in reqs if r.status == "fulfilled")),
            ("Member since", _d(a.created_at)),
        ]
        lat, lon = a.latitude, a.longitude
        for r in reqs:
            history.append({"title": f"Needed {r.units_needed} bag(s) of {r.blood_type_needed} ({r.status})",
                            "detail": f"Received {r.units_fulfilled} bag(s)", "date": _d(r.created_at)})

    elif role == "hospital":
        a = db.query(Hospital).filter(Hospital.id == account_id).first()
        if not a:
            raise HTTPException(status_code=404, detail="Account not found")
        reqs = db.query(BloodRequest).filter(BloodRequest.requester_type == "hospital", BloodRequest.requester_id == a.id)\
            .order_by(BloodRequest.created_at.desc()).all()
        staff = db.query(Staff).filter(Staff.hospital_id == a.id).all()
        fields = [
            ("Hospital name", a.name), ("Email (username)", a.email), ("Phone", a.phone_number),
            ("License number", a.license_number), ("Verified by admin", _yn(a.is_verified)),
            ("Place", build_address_label(a.village, a.area, a.city, a.state, a.country) or "-"),
            ("Staff logins", len(staff)),
            ("Staff roles", ", ".join(sorted({s.staff_role for s in staff if s.staff_role})) or "None yet"),
            ("Requests sent", len(reqs)), ("Registered since", _d(a.created_at)),
        ]
        lat, lon = a.latitude, a.longitude
        for r in reqs[:50]:
            history.append({"title": f"Requested {r.units_needed} bag(s) of {r.blood_type_needed} ({r.status})",
                            "detail": f"Received {r.units_fulfilled} bag(s)", "date": _d(r.created_at)})

    elif role == "staff":
        a = db.query(Staff).filter(Staff.id == account_id).first()
        if not a:
            raise HTTPException(status_code=404, detail="Account not found")
        hospital = db.query(Hospital).filter(Hospital.id == a.hospital_id).first()
        entries = db.query(VisitorEntry).filter(VisitorEntry.staff_id == a.id).order_by(VisitorEntry.logged_at.desc()).all()
        fields = [
            ("Full name", a.full_name), ("Role", a.staff_role or "-"), ("Email (username)", a.email),
            ("Phone", a.phone_number or "-"), ("Hospital", hospital.name if hospital else "-"),
            ("Duty time", a.shift_label), ("Donors logged", sum(1 for e in entries if e.visitor_type == "donor")),
            ("Patients logged", sum(1 for e in entries if e.visitor_type == "patient")),
            ("Joined", _d(a.created_at)),
        ]
        if hospital:
            lat, lon = hospital.latitude, hospital.longitude
        for e in entries[:50]:
            history.append({"title": f"{e.visitor_type.title()}: {e.full_name}", "detail": e.blood_type or "", "date": _d(e.logged_at)})

    else:
        a = db.query(Admin).filter(Admin.id == account_id).first()
        if not a:
            raise HTTPException(status_code=404, detail="Account not found")
        fields = [
            ("Full name", a.full_name), ("Email (username)", a.email), ("Role", "Administrator"),
            ("Donors", db.query(Donor).count()), ("Patients", db.query(Receiver).count()),
            ("Hospitals", db.query(Hospital).count()), ("Staff", db.query(Staff).count()),
            ("Blood requests", db.query(BloodRequest).count()),
            ("Two-factor login", "On" if a.two_factor_enabled else "Off"), ("Created", _d(a.created_at)),
        ]

    info = db.query(RecoveryInfo).filter(RecoveryInfo.role == role, RecoveryInfo.account_id == account_id).first()
    fields.append(("Security question set", "Yes" if info else "No - please set one below"))
    if role == "hospital":
        reviews = db.query(HospitalReview).filter(HospitalReview.hospital_id == account_id).all()
        avg = round(sum(r.stars for r in reviews) / len(reviews), 1) if reviews else None
        fields.append(("Rating from donors and patients", f"{avg} / 5 ({len(reviews)} reviews)" if avg else "No reviews yet"))

    return {"role": role, "name": fields[0][1], "has_security_question": bool(info),
            "security_question": info.question if info else None, "fields": [{"label": k, "value": str(v)} for k, v in fields],
            "latitude": lat, "longitude": lon, "history": history}


class SecurityQuestionIn(BaseModel):
    question: str
    answer: str
    current_password: str


ACCOUNT_MODELS = {"donor": Donor, "receiver": Receiver, "hospital": Hospital, "staff": Staff, "admin": Admin}


@router.post("/security-question")
def set_security_question(data: SecurityQuestionIn, db: Session = Depends(get_db), who=Depends(get_current_any_account)):
    """Saves a security question for password recovery. The answer is stored hashed. Needs the current password."""
    role, account_id = who
    account = db.query(ACCOUNT_MODELS[role]).filter(ACCOUNT_MODELS[role].id == account_id).first()
    if not account or not verify_password(data.current_password, account.hashed_password):
        raise HTTPException(status_code=400, detail="Your current password is not correct.")
    question, answer = data.question.strip(), " ".join(data.answer.lower().split())
    if len(question) < 5 or len(answer) < 2:
        raise HTTPException(status_code=400, detail="Please write a real question and answer.")
    info = db.query(RecoveryInfo).filter(RecoveryInfo.role == role, RecoveryInfo.account_id == account_id).first()
    if info:
        info.question, info.answer_hash = question, hash_password(answer)
    else:
        db.add(RecoveryInfo(role=role, account_id=account_id, question=question, answer_hash=hash_password(answer)))
    db.commit()
    record_event(db, "security_question_set", actor_type=role, actor_id=account_id, payload={})
    return {"message": "Your security question is saved. You can use it if you forget your password."}
