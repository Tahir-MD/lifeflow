from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime

from app.database import Base


class StockOffer(Base):
    """
    A hospital that has the needed blood type on its shelf is asked
    whether it wants to give some of it to a request. Nothing is taken
    from stock automatically: the hospital decides (accept or reject),
    and when it accepts it says how many bags it will give.
    status: pending | accepted | rejected | expired
    """
    __tablename__ = "stock_offers"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, nullable=False, index=True)
    hospital_id = Column(Integer, nullable=False, index=True)
    blood_type = Column(String, nullable=False)
    units_in_stock = Column(Integer, default=0)   # stock when the offer was created
    units_given = Column(Integer, default=0)
    status = Column(String, default="pending", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)
