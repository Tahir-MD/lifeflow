from sqlalchemy import Column, Integer, Float, DateTime
from datetime import datetime

from app.database import Base


class DonorLocation(Base):
    """Where a donor is right now, shared only while he is on the way to a request (one row per donor and request)."""
    __tablename__ = "donor_locations"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, nullable=False, index=True)
    donor_id = Column(Integer, nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow)
