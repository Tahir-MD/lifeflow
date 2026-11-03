from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime

from app.database import Base


class AppFeedback(Base):
    """
    Feedback about the LifeFlow app itself (not about a donor, hospital or
    patient). It is collected from a small pop up window, once per account.
    """
    __tablename__ = "app_feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_type = Column(String, nullable=False, index=True)  # donor, receiver, hospital, staff, admin
    user_id = Column(Integer, nullable=False, index=True)
    user_name = Column(String, nullable=True)
    stars = Column(Integer, nullable=False)
    comment = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
