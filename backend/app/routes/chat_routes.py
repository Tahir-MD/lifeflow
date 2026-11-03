"""Online chat between a donor and the patient (or hospital) their donation is for. Only those two can read it."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.chat_message import ChatMessage
from app.models.donation import Donation
from app.models.request import BloodRequest
from app.utils.dependencies import get_current_any_account
from app.utils.notify import notify

router = APIRouter(prefix="/chat", tags=["Chat"])
CHAT_STATUSES = ("offered", "accepted", "pending", "confirmed")


class MessageIn(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def _text(cls, v):
        v = (v or "").strip()
        if not v:
            raise ValueError("Write a message first.")
        return v[:500]


class MessageOut(BaseModel):
    id: int
    mine: bool
    sender_role: str
    text: str
    created_at: str


def _check(db: Session, donation_id: int, who):
    role, account_id = who
    d = db.query(Donation).filter(Donation.id == donation_id).first()
    req = db.query(BloodRequest).filter(BloodRequest.id == d.request_id).first() if d else None
    if not d or not req or d.status not in CHAT_STATUSES:
        raise HTTPException(status_code=404, detail="Chat not available")
    is_donor = role == "donor" and d.donor_id == account_id
    is_requester = role in ("receiver", "hospital") and req.requester_type == role and req.requester_id == account_id
    if not (is_donor or is_requester):
        raise HTTPException(status_code=403, detail="This chat is not yours")
    return d, req, role, account_id


@router.get("/{donation_id}", response_model=List[MessageOut])
def read_chat(donation_id: int, db: Session = Depends(get_db), who=Depends(get_current_any_account)):
    _d, _req, role, account_id = _check(db, donation_id, who)
    rows = db.query(ChatMessage).filter(ChatMessage.donation_id == donation_id).order_by(ChatMessage.id.asc()).limit(300).all()
    return [MessageOut(id=m.id, mine=(m.sender_role == role and m.sender_id == account_id), sender_role=m.sender_role,
                       text=m.text, created_at=m.created_at.isoformat()) for m in rows]


@router.post("/{donation_id}", response_model=MessageOut)
def send_chat(donation_id: int, data: MessageIn, db: Session = Depends(get_db), who=Depends(get_current_any_account)):
    d, req, role, account_id = _check(db, donation_id, who)
    m = ChatMessage(donation_id=donation_id, sender_role=role, sender_id=account_id, text=data.text)
    db.add(m)
    if role == "donor":
        notify(db, req.requester_type, req.requester_id, "New chat message", data.text[:80],
               category="chat", related_request_id=req.id, external=False)
    else:
        notify(db, "donor", d.donor_id, "New chat message", data.text[:80],
               category="chat", related_request_id=req.id, external=False)
    db.commit()
    db.refresh(m)
    return MessageOut(id=m.id, mine=True, sender_role=role, text=m.text, created_at=m.created_at.isoformat())
