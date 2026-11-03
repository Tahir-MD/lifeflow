from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.admin import Admin
from app.models.donor import Donor
from app.models.feedback import AppFeedback
from app.models.hospital import Hospital
from app.models.receiver import Receiver
from app.models.staff import Staff
from app.utils.dependencies import get_current_admin, get_current_any_account

router = APIRouter(prefix="/feedback", tags=["App Feedback"])

ACCOUNT_MODELS = {"donor": Donor, "receiver": Receiver, "hospital": Hospital, "staff": Staff, "admin": Admin}


class FeedbackIn(BaseModel):
    stars: int
    comment: Optional[str] = None


class FeedbackOut(BaseModel):
    id: int
    user_type: str
    user_name: Optional[str] = None
    stars: int
    comment: Optional[str] = None
    created_at: str


def _account_name(db: Session, role: str, account_id: int) -> str:
    model = ACCOUNT_MODELS.get(role)
    account = db.query(model).filter(model.id == account_id).first() if model else None
    if not account:
        return ""
    return getattr(account, "full_name", None) or getattr(account, "name", "") or ""


@router.get("/status")
def feedback_status(db: Session = Depends(get_db), who=Depends(get_current_any_account)):
    """Tells the app whether this account already sent feedback, so the pop up is only shown once."""
    role, account_id = who
    exists = db.query(AppFeedback).filter(AppFeedback.user_type == role, AppFeedback.user_id == account_id).first()
    return {"already_submitted": bool(exists)}


@router.post("", status_code=201)
def submit_feedback(payload: FeedbackIn, db: Session = Depends(get_db), who=Depends(get_current_any_account)):
    role, account_id = who
    if payload.stars < 1 or payload.stars > 5:
        raise HTTPException(status_code=400, detail="Please choose between 1 and 5 stars")
    comment = (payload.comment or "").strip()[:500] or None
    db.add(AppFeedback(
        user_type=role, user_id=account_id, user_name=_account_name(db, role, account_id),
        stars=payload.stars, comment=comment,
    ))
    db.commit()
    return {"message": "Thank you for your feedback"}


@router.get("/all", response_model=List[FeedbackOut])
def all_feedback(db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)):
    rows = db.query(AppFeedback).order_by(AppFeedback.created_at.desc()).limit(500).all()
    return [
        FeedbackOut(
            id=row.id, user_type=row.user_type, user_name=row.user_name, stars=row.stars,
            comment=row.comment, created_at=row.created_at.isoformat(),
        )
        for row in rows
    ]
