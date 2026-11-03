from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.donation import Donation
from app.models.donor import Donor
from app.models.request import BloodRequest
from app.services.audit_service import record_event
from app.utils.badges import get_next_eligible_date
from app.utils.dependencies import get_current_donor, hospital_or_staff, HospitalActor
from app.utils.notify import notify
from app.services.referral_service import reward_first_donation
from app.services.tracking_service import add_event

router = APIRouter(prefix="/donation-confirm", tags=["Donation Confirmation"])

POINTS_PER_UNIT = 10
PENDING_EXPIRES_AFTER = timedelta(hours=48)


class ConfirmIn(BaseModel):
    units: Optional[int] = None  # bags really received; defaults to what the donor promised


def _expire_old(db: Session) -> None:
    cutoff = datetime.utcnow() - PENDING_EXPIRES_AFTER
    old = db.query(Donation).filter(Donation.status.in_(("pending", "offered", "accepted")), Donation.donated_at < cutoff).all()
    for d in old:
        d.status = "expired"
        notify(db, "donor", d.donor_id, "Donation promise expired",
               "Nobody confirmed your donation within 48 hours, so it was cancelled. "
               "You can accept a request again.", category="donation", related_request_id=d.request_id)
    if old:
        db.commit()


def _requester_contact(db: Session, req, d: Donation) -> dict:
    """The patient's or hospital's contact details, shown to the donor once the donor's offer is accepted."""
    if not req or d.status not in ("accepted", "pending", "confirmed"):
        return {}
    from app.models.hospital import Hospital
    from app.models.receiver import Receiver
    acc = (db.query(Hospital if req.requester_type == "hospital" else Receiver)
           .filter((Hospital if req.requester_type == "hospital" else Receiver).id == req.requester_id).first())
    if not acc:
        return {}
    return {"requester_name": getattr(acc, "name", None) or getattr(acc, "full_name", ""),
            "requester_phone": acc.phone_number, "requester_email": acc.email}


def _out(db: Session, d: Donation) -> dict:
    donor = db.query(Donor).filter(Donor.id == d.donor_id).first()
    req = db.query(BloodRequest).filter(BloodRequest.id == d.request_id).first()
    return {
        "id": d.id, "request_id": d.request_id, "units": d.units_donated, "status": d.status,
        "promised_at": d.donated_at, "donor_name": donor.full_name if donor else "",
        "donor_phone": donor.phone_number if donor else "", "donor_blood_type": donor.blood_type if donor else "",
        "patient_name": req.patient_name if req else None,
        "request_blood_type": req.blood_type_needed if req else None,
        "requester_type": req.requester_type if req else None,
        **_requester_contact(db, req, d),
    }


def _visible_to(db: Session, hospital_id: int, d: Donation) -> bool:
    """A hospital sees pledges for its own requests, and pledges for patient requests (where the donor may go to any hospital)."""
    req = db.query(BloodRequest).filter(BloodRequest.id == d.request_id).first()
    if not req:
        return False
    if req.requester_type == "hospital":
        return req.requester_id == hospital_id
    return True


@router.get("/pending")
def pending_donations(db: Session = Depends(get_db),
                      actor: HospitalActor = Depends(hospital_or_staff("confirm_donations"))):
    _expire_old(db)
    rows = db.query(Donation).filter(Donation.status == "pending").order_by(Donation.donated_at.desc()).all()
    return [_out(db, d) for d in rows if _visible_to(db, actor.hospital.id, d)]


@router.get("/mine")
def my_pending(db: Session = Depends(get_db), donor: Donor = Depends(get_current_donor)):
    _expire_old(db)
    rows = db.query(Donation).filter(Donation.donor_id == donor.id, Donation.status.in_(("pending", "offered", "accepted"))).all()
    return [_out(db, d) for d in rows]


@router.post("/{donation_id}/cancel")
def cancel_my_pledge(donation_id: int, db: Session = Depends(get_db), donor: Donor = Depends(get_current_donor)):
    d = db.query(Donation).filter(Donation.id == donation_id, Donation.donor_id == donor.id, Donation.status.in_(("pending", "offered", "accepted"))).first()
    if not d:
        raise HTTPException(status_code=404, detail="No waiting donation found")
    d.status = "rejected"
    db.commit()
    return {"message": "Your donation promise was cancelled."}


@router.post("/{donation_id}/confirm")
def confirm_donation(donation_id: int, data: ConfirmIn, db: Session = Depends(get_db),
                     actor: HospitalActor = Depends(hospital_or_staff("confirm_donations"))):
    d = db.query(Donation).filter(Donation.id == donation_id).first()
    if not d or not _visible_to(db, actor.hospital.id, d):
        raise HTTPException(status_code=404, detail="Donation not found")
    if d.status != "pending":
        raise HTTPException(status_code=400, detail="This donation was already answered or has expired.")
    req = db.query(BloodRequest).filter(BloodRequest.id == d.request_id).first()
    donor = db.query(Donor).filter(Donor.id == d.donor_id).first()
    units = data.units if data.units is not None else d.units_donated
    if units < 1 or units > d.units_donated:
        raise HTTPException(status_code=400, detail=f"Bags received must be between 1 and {d.units_donated}.")
    still = max(req.units_needed - req.units_fulfilled, 0)
    units = min(units, still) if still > 0 else units

    d.units_donated = units
    d.status = "confirmed"
    d.confirmed_by = actor.label
    d.confirmed_at = datetime.utcnow()
    d.donated_at = datetime.utcnow()

    donor.last_donation_date = datetime.utcnow()
    donor.points = (donor.points or 0) + POINTS_PER_UNIT * units
    req.units_fulfilled += units
    if req.units_fulfilled >= req.units_needed:
        req.status = "fulfilled"

    reward_first_donation(db, donor)   # invite-a-friend bonus (paid once)
    add_event(db, req.id, "received", f"{donor.full_name.split()[0]} ({donor.blood_type}) gave {units} bag(s) - confirmed by {actor.hospital.name}.",
              actor.actor_type, actor.account.id)
    if req.status == "fulfilled":
        add_event(db, req.id, "fulfilled", "The request is fully covered.")
    next_date = get_next_eligible_date(donor.last_donation_date, donor.gender, donor.deferred_until)
    notify(db, "donor", donor.id, "Donation confirmed - thank you!",
           f"{actor.hospital.name} confirmed your {units} bag(s). You can donate again on "
           f"{next_date.strftime('%d %B %Y') if next_date else 'a later date'}.",
           category="donation", related_request_id=req.id)
    notify(db, req.requester_type, req.requester_id, "Blood received",
           f"{donor.full_name} ({donor.blood_type}) gave {units} bag(s), confirmed by {actor.hospital.name}. "
           f"{'Your request is fully covered.' if req.status == 'fulfilled' else ''}",
           category="donation", related_request_id=req.id)
    db.commit()
    record_event(db, "donation_confirmed", actor_type=actor.actor_type, actor_id=actor.account.id,
                 payload={"donation_id": d.id, "request_id": req.id, "units": units, "hospital_id": actor.hospital.id})
    return _out(db, d)


@router.post("/{donation_id}/reject")
def reject_donation(donation_id: int, db: Session = Depends(get_db),
                    actor: HospitalActor = Depends(hospital_or_staff("confirm_donations"))):
    d = db.query(Donation).filter(Donation.id == donation_id).first()
    if not d or not _visible_to(db, actor.hospital.id, d):
        raise HTTPException(status_code=404, detail="Donation not found")
    if d.status != "pending":
        raise HTTPException(status_code=400, detail="This donation was already answered or has expired.")
    d.status = "rejected"
    d.confirmed_by = actor.label
    d.confirmed_at = datetime.utcnow()
    notify(db, "donor", d.donor_id, "Donation not confirmed",
           f"{actor.hospital.name} did not receive your donation, so it was not counted. "
           f"You can accept a request again.", category="donation", related_request_id=d.request_id)
    db.commit()
    record_event(db, "donation_rejected", actor_type=actor.actor_type, actor_id=actor.account.id,
                 payload={"donation_id": d.id, "request_id": d.request_id})
    return _out(db, d)
