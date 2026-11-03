from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.donor import Donor
from app.models.hospital import Hospital
from app.models.receiver import Receiver
from app.models.request import BloodRequest
from app.models.donation import Donation
from app.models.inventory import BloodInventory
from app.models.rating import Rating
from app.schemas.stats_schema import DonorStatsOut, HospitalStatsOut, ReceiverStatsOut, PlatformStatsOut
from app.utils.dependencies import get_current_donor, get_current_hospital, get_current_receiver, get_current_any_account
from app.utils.badges import get_badge_tier, get_next_eligible_date, is_eligible_now

router = APIRouter(tags=["Stats"])


@router.get("/donors/me/stats", response_model=DonorStatsOut)
def donor_stats(db: Session = Depends(get_db), current_donor: Donor = Depends(get_current_donor)):
    donations = db.query(Donation).filter(Donation.status == "confirmed").filter(Donation.donor_id == current_donor.id).all()
    total_units = sum(d.units_donated for d in donations)

    donation_ids = [d.id for d in donations]
    ratings = (
        db.query(Rating)
        .filter(Rating.donation_id.in_(donation_ids), Rating.direction == "requester_to_donor")
        .all()
        if donation_ids else []
    )
    average_rating = round(sum(r.stars for r in ratings) / len(ratings), 2) if ratings else None

    return DonorStatsOut(
        total_donations=len(donations),
        total_units_donated=total_units,
        estimated_lives_impacted=total_units * 3,
        badge_tier=get_badge_tier(len(donations)),
        is_eligible_now=is_eligible_now(current_donor.is_eligible, current_donor.last_donation_date, current_donor.gender, current_donor.deferred_until),
        next_eligible_date=get_next_eligible_date(current_donor.last_donation_date, current_donor.gender, current_donor.deferred_until),
        points=current_donor.points,
        average_rating=average_rating,
    )


@router.get("/hospitals/me/stats", response_model=HospitalStatsOut)
def hospital_stats(db: Session = Depends(get_db), current_hospital: Hospital = Depends(get_current_hospital)):
    requests = (
        db.query(BloodRequest)
        .filter(BloodRequest.requester_type == "hospital", BloodRequest.requester_id == current_hospital.id)
        .all()
    )
    low_stock = (
        db.query(BloodInventory)
        .filter(BloodInventory.hospital_id == current_hospital.id)
        .filter(BloodInventory.units_available <= BloodInventory.low_stock_threshold)
        .all()
    )
    return HospitalStatsOut(
        total_requests=len(requests),
        open_requests=len([r for r in requests if r.status == "open"]),
        fulfilled_requests=len([r for r in requests if r.status == "fulfilled"]),
        total_units_received=sum(r.units_fulfilled for r in requests),
        low_stock_types=[row.blood_type for row in low_stock],
    )


@router.get("/receivers/me/stats", response_model=ReceiverStatsOut)
def receiver_stats(db: Session = Depends(get_db), current_receiver: Receiver = Depends(get_current_receiver)):
    requests = (
        db.query(BloodRequest)
        .filter(BloodRequest.requester_type == "receiver", BloodRequest.requester_id == current_receiver.id)
        .all()
    )
    return ReceiverStatsOut(
        total_requests=len(requests),
        open_requests=len([r for r in requests if r.status == "open"]),
        fulfilled_requests=len([r for r in requests if r.status == "fulfilled"]),
        total_units_received=sum(r.units_fulfilled for r in requests),
    )


@router.get("/stats/platform", response_model=PlatformStatsOut)
def platform_stats(db: Session = Depends(get_db)):
    """Public, headline numbers shown on the landing page. No login needed."""
    total_donors = db.query(Donor).count()
    total_hospitals = db.query(Hospital).count()
    total_receivers = db.query(Receiver).count()
    fulfilled_requests = db.query(BloodRequest).filter(BloodRequest.status == "fulfilled").all()
    all_donations = db.query(Donation).filter(Donation.status == "confirmed").all()
    total_units_donated = sum(d.units_donated for d in all_donations)

    all_ratings = db.query(Rating).all()
    average_rating = round(sum(r.stars for r in all_ratings) / len(all_ratings), 2) if all_ratings else None

    return PlatformStatsOut(
        total_donors=total_donors,
        total_hospitals=total_hospitals,
        total_patients_helped=total_receivers,
        total_units_donated=total_units_donated,
        total_requests_fulfilled=len(fulfilled_requests),
        average_platform_rating=average_rating,
    )


@router.get("/people/registered")
def registered_people(db: Session = Depends(get_db), _who=Depends(get_current_any_account)):
    """
    How many donors and patients have registered, with a simple list of each. Only names and the
    details that help (blood type, eligibility) are shared. Phone numbers, emails and addresses
    are never in this list.
    """
    donors = db.query(Donor).order_by(Donor.created_at.desc()).all()
    patients = db.query(Receiver).order_by(Receiver.created_at.desc()).all()

    request_counts = {}
    for row in db.query(BloodRequest).filter(BloodRequest.requester_type == "receiver").all():
        request_counts[row.requester_id] = request_counts.get(row.requester_id, 0) + 1

    donation_counts = {}
    for row in db.query(Donation).filter(Donation.status == "confirmed").all():
        donation_counts[row.donor_id] = donation_counts.get(row.donor_id, 0) + 1

    out_donors = []
    for d in donors:
        nxt = get_next_eligible_date(d.last_donation_date, d.gender, d.deferred_until)
        out_donors.append({
            "id": d.id,
            "full_name": d.full_name,
            "blood_type": d.blood_type,
            "is_eligible_now": is_eligible_now(d.is_eligible, d.last_donation_date, d.gender, d.deferred_until),
            "next_eligible_date": nxt.isoformat() if nxt else None,
            "total_donations": donation_counts.get(d.id, 0),
            "registered_on": d.created_at.isoformat() if d.created_at else None,
        })
    return {
        "total_donors": len(donors),
        "total_patients": len(patients),
        "donors": out_donors,
        "patients": [
            {
                "id": r.id,
                "full_name": r.full_name,
                "total_requests": request_counts.get(r.id, 0),
                "registered_on": r.created_at.isoformat() if r.created_at else None,
            }
            for r in patients
        ],
    }
