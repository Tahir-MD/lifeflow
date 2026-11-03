"""When a donor offers blood for a patient's request: the patient says yes or no, and later says whether the blood was received."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.donation import Donation
from app.models.donor import Donor
from app.models.receiver import Receiver
from app.models.request import BloodRequest
from app.services.audit_service import record_event
from app.services.referral_service import reward_first_donation
from app.services.tracking_service import add_event
from app.utils.badges import get_next_eligible_date
from app.utils.dependencies import get_current_receiver
from app.utils.notify import notify

router = APIRouter(prefix="/patient-offers", tags=["Patient offers"])

POINTS_PER_UNIT = 10


class AnswerIn(BaseModel):
    accept: bool


class ReceivedIn(BaseModel):
    received: bool
    units: Optional[int] = None


def _out(db: Session, d: Donation) -> dict:
    donor = db.query(Donor).filter(Donor.id == d.donor_id).first()
    req = db.query(BloodRequest).filter(BloodRequest.id == d.request_id).first()
    from app.models.request_event import RequestEvent
    kinds = {e.kind for e in db.query(RequestEvent).filter(
        RequestEvent.request_id == d.request_id, RequestEvent.actor_type == "donor", RequestEvent.actor_id == d.donor_id).all()}
    shared = d.status in ("accepted",)   # the donor's phone number is shown only after the patient says yes
    return {
        "id": d.id, "request_id": d.request_id, "units": d.units_donated, "status": d.status,
        "offered_at": d.donated_at,
        "on_the_way": "donor_on_the_way" in kinds, "arrived": "donor_arrived" in kinds,
        "donor_name": donor.full_name if donor else "",
        "donor_blood_type": donor.blood_type if donor else "",
        "donor_phone": donor.phone_number if (donor and shared) else None,
        "donor_email": donor.email if (donor and shared) else None,
        "patient_name": req.patient_name if req else None,
        "request_blood_type": req.blood_type_needed if req else None,
    }


def _mine(db: Session, d_id: int, receiver: Receiver) -> Donation:
    d = db.query(Donation).filter(Donation.id == d_id).first()
    req = db.query(BloodRequest).filter(BloodRequest.id == d.request_id).first() if d else None
    if not d or not req or req.requester_type != "receiver" or req.requester_id != receiver.id:
        raise HTTPException(status_code=404, detail="Offer not found")
    return d


@router.get("/mine")
def my_offers(db: Session = Depends(get_db), receiver: Receiver = Depends(get_current_receiver)):
    ids = [r.id for r in db.query(BloodRequest.id).filter(
        BloodRequest.requester_type == "receiver", BloodRequest.requester_id == receiver.id).all()]
    if not ids:
        return []
    rows = (db.query(Donation).filter(Donation.request_id.in_(ids), Donation.status.in_(("offered", "accepted")))
            .order_by(Donation.donated_at.desc()).all())
    return [_out(db, d) for d in rows]


@router.post("/{donation_id}/answer")
def answer_offer(donation_id: int, data: AnswerIn, db: Session = Depends(get_db),
                 receiver: Receiver = Depends(get_current_receiver)):
    d = _mine(db, donation_id, receiver)
    if d.status != "offered":
        raise HTTPException(status_code=400, detail="You already answered this offer.")
    donor = db.query(Donor).filter(Donor.id == d.donor_id).first()
    if data.accept:
        d.status = "accepted"
        d.donated_at = datetime.utcnow()
        notify(db, "donor", d.donor_id, "The patient accepted your offer",
               f"{receiver.full_name} accepted your {d.units_donated} bag(s). Their phone number is "
               f"{receiver.phone_number}. Please contact them and give blood.",
               category="donation", related_request_id=d.request_id)
        add_event(db, d.request_id, "donor_accepted", f"The patient accepted {donor.full_name.split()[0]}'s offer.", "receiver", receiver.id)
    else:
        d.status = "declined"
        notify(db, "donor", d.donor_id, "The patient said no thanks",
               "The patient did not take your offer. Thank you for helping. You can accept another request.",
               category="donation", related_request_id=d.request_id)
    db.commit()
    record_event(db, "offer_answered", actor_type="receiver", actor_id=receiver.id,
                 payload={"donation_id": d.id, "accepted": data.accept})
    return _out(db, d)


@router.post("/{donation_id}/received")
def mark_received(donation_id: int, data: ReceivedIn, db: Session = Depends(get_db),
                  receiver: Receiver = Depends(get_current_receiver)):
    d = _mine(db, donation_id, receiver)
    if d.status != "accepted":
        raise HTTPException(status_code=400, detail="You can only answer this after you accepted the offer.")
    req = db.query(BloodRequest).filter(BloodRequest.id == d.request_id).first()
    donor = db.query(Donor).filter(Donor.id == d.donor_id).first()
    if not data.received:
        d.status = "rejected"
        d.confirmed_by = "patient"
        d.confirmed_at = datetime.utcnow()
        notify(db, "donor", d.donor_id, "Donation not received",
               "The patient said the blood was not received, so it was not counted.",
               category="donation", related_request_id=d.request_id)
        db.commit()
        return _out(db, d)

    units = data.units if data.units is not None else d.units_donated
    if units < 1 or units > d.units_donated:
        raise HTTPException(status_code=400, detail=f"Bags received must be between 1 and {d.units_donated}.")
    still = max(req.units_needed - req.units_fulfilled, 0)
    units = min(units, still) if still > 0 else units
    d.units_donated = units
    d.status = "confirmed"
    d.confirmed_by = "patient"
    d.confirmed_at = datetime.utcnow()
    d.donated_at = datetime.utcnow()
    donor.last_donation_date = datetime.utcnow()
    donor.points = (donor.points or 0) + POINTS_PER_UNIT * units
    req.units_fulfilled += units
    if req.units_fulfilled >= req.units_needed:
        req.status = "fulfilled"
    reward_first_donation(db, donor)
    add_event(db, req.id, "received", f"{donor.full_name.split()[0]} ({donor.blood_type}) gave {units} bag(s) - confirmed by the patient.",
              "receiver", receiver.id)
    if req.status == "fulfilled":
        add_event(db, req.id, "fulfilled", "The request is fully covered.")
    next_date = get_next_eligible_date(donor.last_donation_date, donor.gender, donor.deferred_until)
    notify(db, "donor", donor.id, "Donation confirmed - thank you!",
           f"The patient confirmed your {units} bag(s). You can donate again on "
           f"{next_date.strftime('%d %B %Y') if next_date else 'a later date'}.",
           category="donation", related_request_id=req.id)
    db.commit()
    record_event(db, "donation_confirmed", actor_type="receiver", actor_id=receiver.id,
                 payload={"donation_id": d.id, "request_id": req.id, "units": units})
    return _out(db, d)
