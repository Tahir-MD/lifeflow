"""One person, one account: email, phone number and CNIC must each be unique across every kind of account."""
import re

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.admin import Admin
from app.models.donor import Donor
from app.models.hospital import Hospital
from app.models.receiver import Receiver
from app.models.staff import Staff


def _digits(value) -> str:
    return re.sub(r"\D", "", value or "")


def ensure_unique_identity(db: Session, email=None, phone=None, cnic=None, allow_email_of=None) -> None:
    """
    Raise a 400 if the email, phone number or CNIC already belongs to another account.
    allow_email_of: an existing account whose email may be reused (used when someone adds a second role).
    """
    if email:
        e = email.strip().lower()
        for model in (Donor, Receiver, Hospital, Staff, Admin):
            found = db.query(model).filter(func.lower(model.email) == e).first()
            if found and found is not allow_email_of:
                raise HTTPException(status_code=400, detail="An account with this email already exists")
    if phone:
        p = _digits(phone)
        if p:
            for model in (Donor, Receiver, Hospital):
                for row in db.query(model.phone_number).all():
                    if _digits(row[0]) == p:
                        if allow_email_of is not None and db.query(model).filter(
                                model.phone_number == row[0], func.lower(model.email) == (allow_email_of.email or "").lower()).first():
                            continue
                        raise HTTPException(status_code=400, detail="An account with this phone number already exists")
    if cnic:
        c = _digits(cnic)
        if c:
            for model in (Donor, Receiver, Hospital):
                for row in db.query(model.cnic_number).filter(model.cnic_number.isnot(None)).all():
                    if _digits(row[0]) == c:
                        if allow_email_of is not None and db.query(model).filter(
                                model.cnic_number == row[0], func.lower(model.email) == (allow_email_of.email or "").lower()).first():
                            continue
                        raise HTTPException(status_code=400, detail="An account with this CNIC already exists")
