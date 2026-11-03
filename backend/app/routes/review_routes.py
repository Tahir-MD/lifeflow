from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.donor import Donor
from app.models.extras import HospitalReview
from app.models.hospital import Hospital
from app.models.receiver import Receiver
from app.utils.dependencies import get_current_any_account
from app.services.audit_service import record_event

router = APIRouter(prefix="/hospital-reviews", tags=["Hospital Ratings"])


class ReviewIn(BaseModel):
    stars: int
    comment: Optional[str] = None


def _summary(db: Session, hospital_id: int) -> dict:
    rows = db.query(HospitalReview).filter(HospitalReview.hospital_id == hospital_id).all()
    avg = round(sum(r.stars for r in rows) / len(rows), 1) if rows else None
    return {"average": avg, "count": len(rows)}


@router.get("")
def hospitals_with_ratings(db: Session = Depends(get_db), who=Depends(get_current_any_account)):
    role, account_id = who
    mine = {}
    if role in ("donor", "receiver"):
        for r in db.query(HospitalReview).filter(HospitalReview.reviewer_type == role, HospitalReview.reviewer_id == account_id).all():
            mine[r.hospital_id] = {"stars": r.stars, "comment": r.comment}
    out = []
    for h in db.query(Hospital).order_by(Hospital.name).all():
        item = {"hospital_id": h.id, "name": h.name, "verified": bool(h.is_verified), "phone": h.phone_number,
                "my_review": mine.get(h.id)}
        item.update(_summary(db, h.id))
        out.append(item)
    return out


@router.get("/{hospital_id}")
def hospital_reviews(hospital_id: int, db: Session = Depends(get_db), who=Depends(get_current_any_account)):
    rows = db.query(HospitalReview).filter(HospitalReview.hospital_id == hospital_id)\
        .order_by(HospitalReview.created_at.desc()).limit(30).all()
    data = _summary(db, hospital_id)
    data["reviews"] = [{"stars": r.stars, "comment": r.comment, "by": r.reviewer_name or "Anonymous",
                        "when": r.created_at} for r in rows]
    return data


@router.post("/{hospital_id}")
def rate_hospital(hospital_id: int, data: ReviewIn, db: Session = Depends(get_db), who=Depends(get_current_any_account)):
    role, account_id = who
    if role not in ("donor", "receiver"):
        raise HTTPException(status_code=403, detail="Only donors and patients can rate a hospital.")
    if data.stars < 1 or data.stars > 5:
        raise HTTPException(status_code=400, detail="Stars must be from 1 to 5.")
    if not db.query(Hospital).filter(Hospital.id == hospital_id).first():
        raise HTTPException(status_code=404, detail="Hospital not found")
    person = db.query(Donor if role == "donor" else Receiver).filter((Donor if role == "donor" else Receiver).id == account_id).first()
    review = db.query(HospitalReview).filter(
        HospitalReview.hospital_id == hospital_id, HospitalReview.reviewer_type == role,
        HospitalReview.reviewer_id == account_id).first()
    comment = (data.comment or "").strip()[:500] or None
    if review:
        review.stars, review.comment = data.stars, comment
    else:
        db.add(HospitalReview(hospital_id=hospital_id, reviewer_type=role, reviewer_id=account_id,
                              reviewer_name=person.full_name if person else None, stars=data.stars, comment=comment))
    db.commit()
    record_event(db, "hospital_rated", actor_type=role, actor_id=account_id,
                 payload={"hospital_id": hospital_id, "stars": data.stars})
    return _summary(db, hospital_id)
