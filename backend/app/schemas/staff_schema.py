from pydantic import BaseModel, EmailStr, field_validator

from app.utils.validators import validate_password_strength, validate_person_name, validate_optional_phone
from datetime import datetime
from typing import List, Optional

from app.models.staff import ROLE_CHOICES


class StaffCreate(BaseModel):
    """Filled in by the hospital when it creates a login for a staff member."""
    full_name: str
    email: EmailStr
    password: str
    shift: str  # "Shift 1" | "Shift 2" | "Shift 3" | "Shift 4"
    role: str = "receptionist"  # receptionist | lab_technician | doctor | manager | nurse | ...
    shift_start: Optional[str] = None  # "HH:MM"; empty = the shift's usual hours
    shift_end: Optional[str] = None
    phone_number: Optional[str] = None

    @field_validator("role")
    @classmethod
    def _role(cls, v):
        if v not in ROLE_CHOICES:
            raise ValueError("Choose a valid staff role.")
        return v

    @field_validator("full_name")
    @classmethod
    def _name(cls, v):
        return validate_person_name(v, "Name")

    @field_validator("password")
    @classmethod
    def _password(cls, v):
        return validate_password_strength(v)

    @field_validator("phone_number")
    @classmethod
    def _phone(cls, v):
        return validate_optional_phone(v)


class StaffLogin(BaseModel):
    email: EmailStr
    password: str


class StaffOut(BaseModel):
    id: int
    hospital_id: int
    full_name: str
    email: EmailStr
    shift: str
    role: str = "receptionist"
    staff_role: Optional[str] = None      # readable name of the role, e.g. "Lab Assistant"
    permissions: List[str] = []
    shift_start: Optional[str] = None
    shift_end: Optional[str] = None
    shift_label: Optional[str] = None     # e.g. "Shift 1 (6:00 AM - 12:00 PM)"
    phone_number: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ShiftChangeCreate(BaseModel):
    requested_shift: str
    requested_start: str
    requested_end: str
    reason: Optional[str] = None


class ShiftChangeOut(BaseModel):
    id: int
    staff_id: int
    staff_name: Optional[str] = None
    requested_shift: str
    requested_start: str
    requested_end: str
    requested_label: str
    current_label: Optional[str] = None
    reason: Optional[str] = None
    status: str
    created_at: datetime
    responded_at: Optional[datetime] = None
