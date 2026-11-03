"""Low-stock alert: tells the hospital and every admin once when a shelf drops to its limit."""
from sqlalchemy.orm import Session

from app.models.admin import Admin
from app.models.hospital import Hospital
from app.models.inventory import BloodInventory
from app.utils.notify import notify


def check_low_stock(db: Session, hospital_id: int, row: BloodInventory) -> None:
    if row.units_available <= (row.low_stock_threshold or 0):
        if not row.low_alerted:
            row.low_alerted = True
            hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
            name = hospital.name if hospital else f"Hospital {hospital_id}"
            text = (f"{name}: only {row.units_available} bag(s) of {row.blood_type} left "
                    f"(low stock limit is {row.low_stock_threshold}).")
            notify(db, "hospital", hospital_id, "Low blood stock", text, category="inventory")
            for admin in db.query(Admin).all():
                notify(db, "admin", admin.id, "Low blood stock at a hospital", text, category="inventory")
    else:
        row.low_alerted = False
