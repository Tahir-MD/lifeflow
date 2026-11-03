from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.donor import Donor
from app.models.hospital import Hospital
from app.models.receiver import Receiver
from app.models.request import BloodRequest
from app.models.donation import Donation
from app.schemas.request_schema import MatchedDonorOut, AcceptRequestInput
from app.services.matching_service import find_matching_donors
from app.utils.dependencies import get_current_donor, get_current_any_account
from app.utils.notify import notify
from app.services.audit_service import record_event
from app.services.eligibility_service import min_gap_days
from app.services.tracking_service import add_event
from app.services.referral_service import reward_first_donation

POINTS_PER_UNIT = 10
MAX_BAGS_PER_DONOR = 3      # one donor can give at most 3 bags
WAITING = ("pending", "offered", "accepted")   # a promise that is not finished yet

router = APIRouter(prefix="/matching", tags=["Matching"])


@router.get("/{request_id}", response_model=list[MatchedDonorOut])
def get_matches_for_request(request_id: int, db: Session = Depends(get_db), _who=Depends(get_current_any_account)):
    blood_request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not blood_request:
        raise HTTPException(status_code=404, detail="Request not found")

    return find_matching_donors(db, blood_request)


@router.post("/{request_id}/accept")
def accept_blood_request(
    request_id: int,
    accept_data: AcceptRequestInput,
    db: Session = Depends(get_db),
    current_donor: Donor = Depends(get_current_donor),
):
    if (current_donor.medical_clearance_status or "pending") != "cleared":
        raise HTTPException(status_code=403, detail="The admin has not verified you yet. You can donate blood after the admin verifies your account.")

    blood_request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not blood_request:
        raise HTTPException(status_code=404, detail="Request not found")

    if blood_request.status != "open":
        raise HTTPException(status_code=400, detail="This request is no longer open")

    units_remaining = blood_request.units_needed - blood_request.units_fulfilled
    if units_remaining <= 0:
        raise HTTPException(status_code=400, detail="This request has already been fully covered")

    # A donor who is not medically able to give blood right now cannot accept.
    now = datetime.utcnow()
    if current_donor.is_eligible is False and not current_donor.deferred_until:
        raise HTTPException(status_code=400, detail="Your health check says you cannot donate blood. Please speak to a doctor.")
    if current_donor.deferred_until and current_donor.deferred_until > now:
        raise HTTPException(status_code=400, detail=f"You can donate again after {current_donor.deferred_until.date().isoformat()}.")
    if current_donor.last_donation_date:
        next_ok = current_donor.last_donation_date + timedelta(days=min_gap_days(current_donor.gender))
        if next_ok > now:
            raise HTTPException(status_code=400, detail=f"You can donate again after {next_ok.date().isoformat()}.")

    already_waiting = db.query(Donation).filter(Donation.donor_id == current_donor.id, Donation.status.in_(WAITING)).first()
    if already_waiting:
        raise HTTPException(
            status_code=400,
            detail="You already have a donation waiting to be finished. Please finish that one first.",
        )
    pledged = sum(
        d.units_donated or 0 for d in db.query(Donation).filter(
            Donation.request_id == blood_request.id, Donation.status.in_(WAITING)).all()
    )
    units_remaining -= pledged
    if units_remaining <= 0:
        raise HTTPException(
            status_code=400,
            detail="Other donors have already promised all the bags. We are waiting for the hospital to confirm them.",
        )

    units_donated = accept_data.units_donated
    if units_donated < 1:
        raise HTTPException(status_code=400, detail="You must donate at least one bag")
    if units_donated > MAX_BAGS_PER_DONOR:
        raise HTTPException(status_code=400, detail=f"A donor can give at most {MAX_BAGS_PER_DONOR} bags.")
    if units_donated > units_remaining:
        units_donated = units_remaining

    # For a hospital request the donation is a promise until the hospital confirms the bags.
    # For a patient request the donor only OFFERS: the patient decides whether to take it.
    patient_request = blood_request.requester_type != "hospital"
    first_status = "offered" if patient_request else "pending"
    new_donation = Donation(
        donor_id=current_donor.id,
        request_id=blood_request.id,
        units_donated=units_donated,
        status=first_status,
    )
    db.add(new_donation)
    db.commit()
    db.refresh(new_donation)

    first_name = current_donor.full_name.split()[0]
    if patient_request:
        add_event(db, blood_request.id, "donor_offered",
                  f"{first_name} ({current_donor.blood_type}) offered {units_donated} bag(s). Waiting for the patient to answer.",
                  "donor", current_donor.id)
    else:
        add_event(db, blood_request.id, "donor_accepted",
                  f"{first_name} ({current_donor.blood_type}) promised {units_donated} bag(s) and will go to the hospital.",
                  "donor", current_donor.id)
    db.commit()

    record_event(
        db, "donation_promised", actor_type="donor", actor_id=current_donor.id,
        payload={"donation_id": new_donation.id, "request_id": blood_request.id, "units": units_donated},
    )
    remaining_after = units_remaining - units_donated

    if blood_request.requester_type == "hospital":
        requester = db.query(Hospital).filter(Hospital.id == blood_request.requester_id).first()
        requester_name = requester.name if requester else "Unknown hospital"
        requester_phone = requester.phone_number if requester else ""
    else:
        requester = db.query(Receiver).filter(Receiver.id == blood_request.requester_id).first()
        requester_name = requester.full_name if requester else "Unknown receiver"
        requester_phone = requester.phone_number if requester else ""

    if patient_request:
        notify(
            db, "donor", current_donor.id, "Your offer was sent",
            f"You offered {units_donated} bag(s). We told the patient. Please wait for their answer.",
            category="donation", related_request_id=blood_request.id,
        )
        notify(
            db, blood_request.requester_type, blood_request.requester_id,
            "A donor offered to give blood",
            f"{current_donor.full_name} ({current_donor.blood_type}) offered {units_donated} bag(s). "
            f"Open My requests and choose Accept or No thanks.",
            category="donation", related_request_id=blood_request.id,
        )
    else:
        notify(
            db, "donor", current_donor.id, "Your donation promise is saved",
            f"You promised {units_donated} bag(s). Please go to the hospital. Your donation counts once the hospital confirms it.",
            category="donation", related_request_id=blood_request.id,
        )
        notify(
            db, blood_request.requester_type, blood_request.requester_id,
            "A donor is coming to donate",
            f"{current_donor.full_name} ({current_donor.blood_type}) promised {units_donated} bag(s). "
            f"Their contact number is {current_donor.phone_number}. It will count after a hospital confirms it.",
            category="donation",
            related_request_id=blood_request.id,
        )
    db.commit()

    return {
        "message": (f"Thank you. Your offer of {units_donated} bag{'s' if units_donated != 1 else ''} was sent to the patient. "
                    f"We will tell you when they answer.") if patient_request else f"Thank you. You promised {units_donated} bag{'s' if units_donated != 1 else ''}. "
                   f"Please go to the hospital. It counts after the hospital confirms it.",
        "donation_id": new_donation.id,
        "donation_status": first_status,
        "latitude": blood_request.latitude,
        "longitude": blood_request.longitude,
        "donor_points": current_donor.points,
        "units_donated": units_donated,
        "units_remaining": max(remaining_after, 0),
        "request_status": blood_request.status,
        "requester_type": blood_request.requester_type,
        "requester_name": requester_name,
        "requester_phone": requester_phone,
        "patient_name": blood_request.patient_name,
    }
