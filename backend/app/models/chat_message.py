from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime

from app.database import Base


class ChatMessage(Base):
    """One chat message between a donor and the person (patient or hospital) who asked for blood."""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    donation_id = Column(Integer, nullable=False, index=True)
    sender_role = Column(String, nullable=False)   # "donor" | "receiver" | "hospital"
    sender_id = Column(Integer, nullable=False)
    text = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
