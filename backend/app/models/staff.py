from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from datetime import datetime

from app.database import Base


SHIFT_CHOICES = ["Shift 1", "Shift 2", "Shift 3", "Shift 4"]
ROLE_CHOICES = ["receptionist", "lab_technician", "doctor", "manager", "nurse", "blood_bank_technician", "phlebotomist", "pharmacist"]
# Every hospital should have at least one staff login for each of these (shown as a reminder).
REQUIRED_STAFF_ROLES = ["receptionist", "lab_technician", "manager", "doctor"]

# Default working hours of each shift (24 hour "HH:MM"). A hospital can set any other start and end time.
DEFAULT_SHIFT_TIMES = {
    "Shift 1": ("06:00", "12:00"),
    "Shift 2": ("12:00", "18:00"),
    "Shift 3": ("18:00", "00:00"),
    "Shift 4": ("00:00", "06:00"),
}


def _pretty(hhmm: str) -> str:
    try:
        h, m = [int(x) for x in hhmm.split(":")]
    except Exception:
        return hhmm or ""
    return f"{(h % 12) or 12}:{m:02d} {'AM' if h < 12 else 'PM'}"


def shift_label(shift: str, start: str, end: str) -> str:
    """e.g. "Shift 1 (6:00 AM - 12:00 PM)"."""
    if not start or not end:
        start, end = DEFAULT_SHIFT_TIMES.get(shift, ("", ""))
    if not start:
        return shift
    return f"{shift} ({_pretty(start)} - {_pretty(end)})"


class Staff(Base):
    """
    A hospital staff member. The hospital creates this account from
    its own dashboard and hands the login (email + password) to the
    staff member. Each staff member is tied to one fixed shift, so
    whoever is on duty for that shift logs in with their own account
    and every donor/patient they attend to is saved under their name,
    kept completely separate from every other staff member's record.
    """
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    # Soft removal by an admin (or a hospital for its staff): login is disabled, personal data wiped, history kept.
    is_removed = Column(Boolean, default=False)
    removed_at = Column(DateTime, nullable=True)
    shift = Column(String, nullable=False)  # one of SHIFT_CHOICES
    phone_number = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    # What this person may do: see app/utils/permissions.py
    role = Column(String, default="receptionist")
    shift_start = Column(String, nullable=True)  # "HH:MM", 24 hour
    shift_end = Column(String, nullable=True)

    @property
    def shift_label(self) -> str:
        return shift_label(self.shift, self.shift_start, self.shift_end)

    @property
    def permissions(self) -> list:
        from app.utils.permissions import permissions_for
        return permissions_for(self.role)

    @property
    def staff_role(self) -> str:
        from app.utils.permissions import ROLE_LABELS
        return ROLE_LABELS.get(self.role or "receptionist", self.role)
