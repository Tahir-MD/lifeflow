from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.hospital import Hospital
from app.models.inventory import BloodInventory
from app.models.request import BloodRequest
from app.models.stock_offer import StockOffer
from app.utils.dependencies import get_current_hospital
from app.utils.notify import notify
from app.services.audit_service import record_event
from app.services.batch_service import consume as consume_batches
from app.services.stock_alerts import check_low_stock
from app.services.tracking_service import add_event
from app.routes.request_routes import build_request_out

router = APIRouter(prefix="/stock-offers", tags=["Hospital Stock Requests"])


class StockOfferOut(BaseModel):
    id: int
    request_id: int
    blood_type: str
    status: str
    units_in_stock_now: int
    units_still_needed: int
    max_can_give: int
    units_given: int = 0
    requester_name: Optional[str] = None
    requester_phone: Optional[str] = None
    patient_name: Optional[str] = None
    urgency_type: Optional[str] = None
    created_at: datetime
    responded_at: Optional[datetime] = None


class AcceptIn(BaseModel):
    units: int


def _stock_now(db: Session, hospital_id: int, blood_type: str) -> int:
    row = db.query(BloodInventory).filter(
        BloodInventory.hospital_id == hospital_id, BloodInventory.blood_type == blood_type).first()
    return row.units_available if row else 0


def _out(db: Session, offer: StockOffer) -> StockOfferOut:
    req = db.query(BloodRequest).filter(BloodRequest.id == offer.request_id).first()
    still = max((req.units_needed - req.units_fulfilled) if req else 0, 0)
    stock = _stock_now(db, offer.hospital_id, offer.blood_type)
    info = build_request_out(db, req) if req else None
    return StockOfferOut(
        id=offer.id, request_id=offer.request_id, blood_type=offer.blood_type, status=offer.status,
        units_in_stock_now=stock, units_still_needed=still, max_can_give=min(stock, still),
        units_given=offer.units_given or 0,
        requester_name=info.requester_name if info else None, requester_phone=info.requester_phone if info else None,
        patient_name=req.patient_name if req else None, urgency_type=req.urgency_type if req else None,
        created_at=offer.created_at, responded_at=offer.responded_at,
    )


def sync_offers_for_hospital(db: Session, hospital: Hospital) -> None:
    """
    A request only reaches a hospital that has the blood on its shelf. When a hospital adds stock later,
    every request that is still open and not fully covered is shown to it from then on.
    """
    if not hospital.is_verified:
        return
    stocked = {r.blood_type for r in db.query(BloodInventory).filter(
        BloodInventory.hospital_id == hospital.id, BloodInventory.units_available > 0).all()}
    if not stocked:
        return
    asked = {o.request_id for o in db.query(StockOffer.request_id).filter(StockOffer.hospital_id == hospital.id).all()}
    for req in db.query(BloodRequest).filter(BloodRequest.status == "open", BloodRequest.blood_type_needed.in_(stocked)).all():
        if req.id in asked or req.units_fulfilled >= req.units_needed:
            continue
        if req.requester_type == "hospital" and req.requester_id == hospital.id:
            continue
        db.add(StockOffer(request_id=req.id, hospital_id=hospital.id, blood_type=req.blood_type_needed,
                          units_in_stock=_stock_now(db, hospital.id, req.blood_type_needed)))
    db.commit()


@router.get("", response_model=List[StockOfferOut])
def my_stock_offers(db: Session = Depends(get_db), hospital: Hospital = Depends(get_current_hospital)):
    sync_offers_for_hospital(db, hospital)
    offers = (db.query(StockOffer).filter(StockOffer.hospital_id == hospital.id)
              .order_by(StockOffer.created_at.desc()).limit(100).all())
    rows = [_out(db, o) for o in offers]
    # A request that is already covered, or that needs a blood type the hospital no longer has, is not shown.
    return [r for r in rows if r.status != "pending" or (r.units_still_needed > 0 and r.units_in_stock_now > 0)]


def _get_pending(db: Session, offer_id: int, hospital: Hospital) -> StockOffer:
    offer = db.query(StockOffer).filter(StockOffer.id == offer_id, StockOffer.hospital_id == hospital.id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Stock request not found")
    if offer.status != "pending":
        raise HTTPException(status_code=400, detail="You already answered this stock request.")
    return offer


@router.post("/{offer_id}/accept", response_model=StockOfferOut)
def accept_stock_offer(offer_id: int, data: AcceptIn, db: Session = Depends(get_db),
                       hospital: Hospital = Depends(get_current_hospital)):
    offer = _get_pending(db, offer_id, hospital)
    req = db.query(BloodRequest).filter(BloodRequest.id == offer.request_id).first()
    row = db.query(BloodInventory).filter(
        BloodInventory.hospital_id == hospital.id, BloodInventory.blood_type == offer.blood_type).first()
    still = max((req.units_needed - req.units_fulfilled) if req else 0, 0)
    if not req or still <= 0:
        offer.status = "expired"
        offer.responded_at = datetime.utcnow()
        db.commit()
        raise HTTPException(status_code=400, detail="This request is already fully covered.")
    stock = row.units_available if row else 0
    limit = min(stock, still)
    if data.units < 1:
        raise HTTPException(status_code=400, detail="Enter how many bags you will give (at least 1).")
    if data.units > limit:
        raise HTTPException(status_code=400, detail=f"You can give at most {limit} bag(s) (stock {stock}, still needed {still}).")

    row.units_available -= data.units
    consume_batches(db, hospital.id, offer.blood_type, data.units)
    check_low_stock(db, hospital.id, row)
    req.units_fulfilled += data.units
    req.inventory_units_used = (req.inventory_units_used or 0) + data.units
    req.fulfilled_from_inventory = True
    if req.fulfilling_hospital_id is None:
        req.fulfilling_hospital_id = hospital.id
    offer.status = "accepted"
    offer.units_given = data.units
    offer.responded_at = datetime.utcnow()

    if req.units_fulfilled >= req.units_needed:
        req.status = "fulfilled"
        for other in db.query(StockOffer).filter(
                StockOffer.request_id == req.id, StockOffer.status == "pending", StockOffer.id != offer.id).all():
            other.status = "expired"
            other.responded_at = datetime.utcnow()

    add_event(db, req.id, "stock_accepted", f"{hospital.name} accepted and gave {data.units} bag(s) from its blood bank.", "hospital", hospital.id)
    if req.status == "fulfilled":
        add_event(db, req.id, "fulfilled", "The request is fully covered.")
    notify(db, req.requester_type, req.requester_id, "A hospital accepted to give blood",
           f"{hospital.name} confirmed {data.units} bag(s) of {req.blood_type_needed} from its blood bank. "
           f"{'Your request is fully covered.' if req.status == 'fulfilled' else 'Donors are still being contacted for the rest.'}",
           category="request", related_request_id=req.id)
    notify(db, "hospital", hospital.id, "Stock request confirmed",
           f"You gave {data.units} bag(s) of {req.blood_type_needed}. {row.units_available} bag(s) left in stock.",
           category="inventory", related_request_id=req.id)
    record_event(db, "inventory_used_for_request", actor_type="hospital", actor_id=hospital.id,
                 payload={"request_id": req.id, "blood_type": req.blood_type_needed, "units": data.units})
    db.commit()
    return _out(db, offer)


@router.post("/{offer_id}/reject", response_model=StockOfferOut)
def reject_stock_offer(offer_id: int, db: Session = Depends(get_db), hospital: Hospital = Depends(get_current_hospital)):
    offer = _get_pending(db, offer_id, hospital)
    offer.status = "rejected"
    offer.responded_at = datetime.utcnow()
    add_event(db, offer.request_id, "stock_rejected", f"{hospital.name} could not give stock.", "hospital", hospital.id)
    db.commit()
    return _out(db, offer)
