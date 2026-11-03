from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime

from app.database import Base


class DeviceToken(Base):
    """One installed Android app's Firebase Cloud Messaging token, so LifeFlow can push to the phone natively."""
    __tablename__ = "device_tokens"

    id = Column(Integer, primary_key=True, index=True)
    owner_type = Column(String, nullable=False)
    owner_id = Column(Integer, nullable=False)
    token = Column(String, unique=True, nullable=False)
    platform = Column(String, default="android")
    created_at = Column(DateTime, default=datetime.utcnow)
