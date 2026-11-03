from sqlalchemy import Column, Integer, DateTime, ForeignKey, String
from datetime import datetime

from app.database import Base


class Donation(Base):
    """
    status: "pending" (donor said yes, waiting for a hospital to confirm the
    bags were really received), "confirmed", "rejected" or "expired".
    Only confirmed donations count everywhere (points, history, stats).
    """
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)
    donor_id = Column(Integer, ForeignKey("donors.id"), nullable=False)
    request_id = Column(Integer, ForeignKey("blood_requests.id"), nullable=False)
    units_donated = Column(Integer, default=1)
    donated_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="confirmed", server_default="confirmed", index=True)
    confirmed_by = Column(String, nullable=True)   # e.g. "hospital:3" or "staff:7"
    confirmed_at = Column(DateTime, nullable=True)
