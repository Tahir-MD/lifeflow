from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime

from app.database import Base


class ShiftChangeRequest(Base):
    """A staff member asks their hospital to change their shift. The hospital confirms or rejects it."""
    __tablename__ = "shift_change_requests"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, nullable=False, index=True)
    hospital_id = Column(Integer, nullable=False, index=True)
    requested_shift = Column(String, nullable=False)
    requested_start = Column(String, nullable=False)  # "HH:MM", 24 hour
    requested_end = Column(String, nullable=False)
    reason = Column(String, nullable=True)
    status = Column(String, default="pending", index=True)  # pending | approved | rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)
