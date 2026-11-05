import re
from datetime import datetime
from typing import List, Optional

from app.utils.removal import remove_account
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.staff import Staff, SHIFT_CHOICES, ROLE_CHOICES, REQUIRED_STAFF_ROLES, DEFAULT_SHIFT_TIMES, shift_label
from app.models.shift_change import ShiftChangeRequest
from app.models.extras import LabTest
from app.models.inventory import BloodInventory
from app.models.hospital import Hospital
from app.models.visitor_log import VisitorEntry
from app.schemas.staff_schema import StaffCreate, StaffOut, ShiftChangeCreate, ShiftChangeOut
from app.schemas.visitor_schema import VisitorEntryCreate, VisitorEntryOut
from app.utils.dependencies import get_current_hospital, get_current_staff, require_staff_permission, hospital_or_staff, HospitalActor
from app.utils.permissions import permissions_for, ROLE_LABELS
from app.utils.security import hash_password
from app.models.donor import Donor
from app.schemas.donor_schema import DonorOut
from app.services.audit_service import record_event
from app.utils.notify import notify

router = APIRouter(prefix="/staff", tags=["Hospital Staff & Shifts"])


def _staff_out(staff: Staff) -> StaffOut:
    return StaffOut(
        id=staff.id, hospital_id=staff.hospital_id, full_name=staff.full_name, email=staff.email, shift=staff.shift,
        role=staff.role or "receptionist", staff_role=staff.staff_role, permissions=permissions_for(staff.role),
        shift_start=staff.shift_start, shift_end=staff.shift_end, shift_label=staff.shift_label,
        phone_number=staff.phone_number, created_at=staff.created_at,
    )


def _entry_out(entry: VisitorEntry, staff: Staff) -> VisitorEntryOut:
    return VisitorEntryOut(
        id=entry.id,
        staff_id=entry.staff_id,
        hospital_id=entry.hospital_id,
        visitor_type=entry.visitor_type,
        full_name=entry.full_name,
        blood_type=entry.blood_type,
        phone_number=entry.phone_number,
        from_location=entry.from_location,
        notes=entry.notes,
        logged_at=entry.logged_at,
        staff_name=staff.full_name if staff else None,
        staff_shift=(f"{staff.staff_role} - {staff.shift_label}") if staff else None,
    )


# --- The hospital creates and manages its own staff logins -----------------

_TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def _check_times(start: str, end: str) -> None:
    if not (_TIME_RE.match(start or "") and _TIME_RE.match(end or "")):
        raise HTTPException(status_code=400, detail="Start and end time must look like 08:00 (24 hour).")
    if start == end:
        raise HTTPException(status_code=400, detail="Start time and end time cannot be the same.")


def _change_out(db: Session, item: ShiftChangeRequest) -> ShiftChangeOut:
    staff = db.query(Staff).filter(Staff.id == item.staff_id).first()
    return ShiftChangeOut(
        id=item.id, staff_id=item.staff_id, staff_name=staff.full_name if staff else None,
        requested_shift=item.requested_shift, requested_start=item.requested_start, requested_end=item.requested_end,
        requested_label=shift_label(item.requested_shift, item.requested_start, item.requested_end),
        current_label=staff.shift_label if staff else None,
        reason=item.reason, status=item.status, created_at=item.created_at, responded_at=item.responded_at,
    )


@router.post("", response_model=StaffOut, status_code=201)
def create_staff(
    staff_data: StaffCreate,
    db: Session = Depends(get_db),
    current_hospital: Hospital = Depends(get_current_hospital),
):
    if staff_data.shift not in SHIFT_CHOICES:
        raise HTTPException(status_code=400, detail=f"Shift must be one of {SHIFT_CHOICES}")

    start = staff_data.shift_start or DEFAULT_SHIFT_TIMES[staff_data.shift][0]
    end = staff_data.shift_end or DEFAULT_SHIFT_TIMES[staff_data.shift][1]
    _check_times(start, end)

    existing = db.query(Staff).filter(Staff.email == staff_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A staff account with this email already exists")

    new_staff = Staff(
        hospital_id=current_hospital.id,
        full_name=staff_data.full_name,
        email=staff_data.email,
        hashed_password=hash_password(staff_data.password),
        shift=staff_data.shift,
        shift_start=start,
        shift_end=end,
        role=staff_data.role,
        phone_number=staff_data.phone_number,
    )
    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)
    record_event(db, "staff_created", actor_type="hospital", actor_id=current_hospital.id,
                 payload={"staff_id": new_staff.id, "role": new_staff.role, "shift": new_staff.shift_label})
    return _staff_out(new_staff)


@router.get("/roles")
def staff_roles(db: Session = Depends(get_db), current_hospital: Hospital = Depends(get_current_hospital)):
    """All roles a hospital can assign, and which required roles it still has nobody for."""
    have = {r or "receptionist" for (r,) in db.query(Staff.role).filter(Staff.hospital_id == current_hospital.id).all()}
    return {
        "roles": [{"value": r, "label": ROLE_LABELS[r]} for r in ROLE_CHOICES],
        "required": [{"value": r, "label": ROLE_LABELS[r]} for r in REQUIRED_STAFF_ROLES],
        "missing": [{"value": r, "label": ROLE_LABELS[r]} for r in REQUIRED_STAFF_ROLES if r not in have],
    }


@router.get("", response_model=List[StaffOut])
def list_my_staff(db: Session = Depends(get_db), actor: HospitalActor = Depends(hospital_or_staff("view_all"))):
    """Every staff login this hospital has created, across all shifts (the hospital and its Manager can see this)."""
    rows = (
        db.query(Staff)
        .filter(Staff.hospital_id == actor.hospital.id, Staff.is_removed.isnot(True))
        .order_by(Staff.shift, Staff.full_name)
        .all()
    )
    return [_staff_out(row) for row in rows]


class RoleChange(BaseModel):
    role: str


@router.put("/{staff_id}/role", response_model=StaffOut)
def change_staff_role(
    staff_id: int, change: RoleChange,
    db: Session = Depends(get_db), current_hospital: Hospital = Depends(get_current_hospital),
):
    """The hospital changes what a staff member is allowed to do."""
    if change.role not in ROLE_CHOICES:
        raise HTTPException(status_code=400, detail=f"Role must be one of {ROLE_CHOICES}")
    staff = db.query(Staff).filter(Staff.id == staff_id, Staff.hospital_id == current_hospital.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    staff.role = change.role
    db.commit()
    db.refresh(staff)
    return _staff_out(staff)


@router.delete("/{staff_id}", status_code=204)
def remove_staff(staff_id: int, db: Session = Depends(get_db), current_hospital: Hospital = Depends(get_current_hospital)):
    staff = db.query(Staff).filter(Staff.id == staff_id, Staff.hospital_id == current_hospital.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    record_event(db, "staff_removed", actor_type="hospital", actor_id=current_hospital.id,
                 payload={"staff_id": staff.id, "name": staff.full_name})
    remove_account(staff, "staff")
    db.commit()


@router.get("/hospital/visitors", response_model=List[VisitorEntryOut])
def hospital_all_visitor_entries(db: Session = Depends(get_db), actor: HospitalActor = Depends(hospital_or_staff("view_all"))):
    """
    Every donor and patient logged by every staff member across every
    shift, so the hospital can see the combined front-desk record, not
    just one staff member's part of it.
    """
    entries = (
        db.query(VisitorEntry)
        .filter(VisitorEntry.hospital_id == actor.hospital.id)
        .order_by(VisitorEntry.logged_at.desc())
        .all()
    )
    results = []
    for entry in entries:
        staff = db.query(Staff).filter(Staff.id == entry.staff_id).first()
        results.append(_entry_out(entry, staff))
    return results


# --- A staff member's own account, logged in for their shift ---------------

@router.get("/me", response_model=StaffOut)
def read_my_staff_profile(current_staff: Staff = Depends(get_current_staff)):
    return _staff_out(current_staff)


@router.post("/visitors", response_model=VisitorEntryOut, status_code=201)
def log_visitor(
    entry_data: VisitorEntryCreate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_staff_permission("log_visitors")),
):
    """A staff member records one donor or patient they attended to, right now, during their shift."""
    if entry_data.visitor_type not in ("donor", "patient"):
        raise HTTPException(status_code=400, detail="visitor_type must be 'donor' or 'patient'")

    entry = VisitorEntry(
        staff_id=current_staff.id,
        hospital_id=current_staff.hospital_id,
        visitor_type=entry_data.visitor_type,
        full_name=entry_data.full_name,
        blood_type=entry_data.blood_type,
        phone_number=entry_data.phone_number,
        from_location=entry_data.from_location,
        notes=entry_data.notes,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _entry_out(entry, current_staff)


@router.get("/visitors/mine", response_model=List[VisitorEntryOut])
def my_visitor_entries(db: Session = Depends(get_db), current_staff: Staff = Depends(get_current_staff)):
    """
    This staff member's own complete shift record -- every donor and
    patient they have ever logged, kept fully separate from every
    other staff member's record, so it is always there to review and
    print when they go off duty.
    """
    entries = (
        db.query(VisitorEntry)
        .filter(VisitorEntry.staff_id == current_staff.id)
        .order_by(VisitorEntry.logged_at.desc())
        .all()
    )
    return [_entry_out(entry, current_staff) for entry in entries]


# --- Doctor: medical screening of donors ------------------------------------
@router.get("/screening/donors", response_model=List[DonorOut])
def donors_waiting_for_screening(
    db: Session = Depends(get_db), _doctor: Staff = Depends(require_staff_permission("screen_donors")),
):
    """Donors who have not yet been medically cleared. Only doctors and managers can open this."""
    return (
        db.query(Donor).filter(Donor.medical_clearance_status == "pending")
        .order_by(Donor.created_at.desc()).limit(200).all()
    )


class ScreeningDecision(BaseModel):
    notes: Optional[str] = None


def _screen(db: Session, donor_id: int, doctor: Staff, status_value: str, notes: Optional[str]) -> Donor:
    donor = db.query(Donor).filter(Donor.id == donor_id).first()
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    donor.medical_clearance_status = status_value
    donor.medical_clearance_notes = (" ".join((notes or "").split())[:300] or None)
    notify(db, "donor", donor.id,
           "You are medically cleared" if status_value == "cleared" else "Medical check: not eligible now",
           "A doctor checked your details and cleared you to donate blood." if status_value == "cleared"
           else "A doctor says you cannot donate right now. Please speak to the doctor at the blood bank.",
           category="system")
    db.commit()
    db.refresh(donor)
    record_event(db, "donor_medically_cleared" if status_value == "cleared" else "donor_flagged",
                 actor_type="staff", actor_id=doctor.id, payload={"donor_id": donor.id, "role": doctor.role})
    return donor


@router.post("/screening/donors/{donor_id}/clear", response_model=DonorOut)
def doctor_clear_donor(
    donor_id: int, decision: ScreeningDecision, db: Session = Depends(get_db),
    doctor: Staff = Depends(require_staff_permission("screen_donors")),
):
    return _screen(db, donor_id, doctor, "cleared", decision.notes)


@router.post("/screening/donors/{donor_id}/flag", response_model=DonorOut)
def doctor_flag_donor(
    donor_id: int, decision: ScreeningDecision, db: Session = Depends(get_db),
    doctor: Staff = Depends(require_staff_permission("screen_donors")),
):
    return _screen(db, donor_id, doctor, "flagged", decision.notes)


# --- Shift change requests: staff asks, the hospital confirms or rejects ----

@router.post("/shift-change", response_model=ShiftChangeOut, status_code=201)
def request_shift_change(
    data: ShiftChangeCreate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff),
):
    if data.requested_shift not in SHIFT_CHOICES:
        raise HTTPException(status_code=400, detail=f"Shift must be one of {SHIFT_CHOICES}")
    _check_times(data.requested_start, data.requested_end)
    already = db.query(ShiftChangeRequest).filter(
        ShiftChangeRequest.staff_id == current_staff.id, ShiftChangeRequest.status == "pending").first()
    if already:
        raise HTTPException(status_code=400, detail="You already have a shift change request waiting for your hospital.")
    item = ShiftChangeRequest(
        staff_id=current_staff.id, hospital_id=current_staff.hospital_id,
        requested_shift=data.requested_shift, requested_start=data.requested_start,
        requested_end=data.requested_end, reason=(data.reason or "").strip() or None,
    )
    db.add(item)
    notify(db, "hospital", current_staff.hospital_id, "Shift change request",
           f"{current_staff.full_name} wants to change from {current_staff.shift_label} to "
           f"{shift_label(item.requested_shift, item.requested_start, item.requested_end)}. "
           f"Open Staff & shifts to confirm or reject.", category="system")
    db.commit()
    db.refresh(item)
    return _change_out(db, item)


@router.get("/shift-change/mine", response_model=List[ShiftChangeOut])
def my_shift_change_requests(db: Session = Depends(get_db), current_staff: Staff = Depends(get_current_staff)):
    items = (db.query(ShiftChangeRequest).filter(ShiftChangeRequest.staff_id == current_staff.id)
             .order_by(ShiftChangeRequest.created_at.desc()).limit(20).all())
    return [_change_out(db, i) for i in items]


@router.get("/shift-change/hospital", response_model=List[ShiftChangeOut])
def hospital_shift_change_requests(db: Session = Depends(get_db), current_hospital: Hospital = Depends(get_current_hospital)):
    items = (db.query(ShiftChangeRequest).filter(ShiftChangeRequest.hospital_id == current_hospital.id)
             .order_by(ShiftChangeRequest.created_at.desc()).limit(50).all())
    return [_change_out(db, i) for i in items]


@router.post("/shift-change/{change_id}/{decision}", response_model=ShiftChangeOut)
def decide_shift_change(
    change_id: int, decision: str,
    db: Session = Depends(get_db),
    current_hospital: Hospital = Depends(get_current_hospital),
):
    if decision not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Decision must be approve or reject.")
    item = db.query(ShiftChangeRequest).filter(
        ShiftChangeRequest.id == change_id, ShiftChangeRequest.hospital_id == current_hospital.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Request not found")
    if item.status != "pending":
        raise HTTPException(status_code=400, detail="This request was already answered.")
    staff = db.query(Staff).filter(Staff.id == item.staff_id).first()
    item.responded_at = datetime.utcnow()
    record_event(db, "shift_change_" + decision, actor_type="hospital", actor_id=current_hospital.id,
                 payload={"staff_id": item.staff_id, "new_shift": item.requested_shift,
                          "start": item.requested_start, "end": item.requested_end})
    if decision == "approve" and staff:
        item.status = "approved"
        staff.shift = item.requested_shift
        staff.shift_start = item.requested_start
        staff.shift_end = item.requested_end
    else:
        item.status = "rejected"
    db.commit()
    return _change_out(db, item)


# --- Hospital resets a staff member's password -------------------------------

class StaffPasswordIn(BaseModel):
    new_password: str


@router.post("/{staff_id}/reset-password")
def hospital_resets_staff_password(staff_id: int, data: StaffPasswordIn, db: Session = Depends(get_db),
                                   current_hospital: Hospital = Depends(get_current_hospital)):
    staff = db.query(Staff).filter(Staff.id == staff_id, Staff.hospital_id == current_hospital.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    staff.hashed_password = hash_password(data.new_password)
    db.commit()
    record_event(db, "staff_password_reset_by_hospital", actor_type="hospital", actor_id=current_hospital.id,
                 payload={"staff_id": staff.id})
    return {"message": "The staff password was changed. Tell the staff member the new password."}


# --- Lab tests (Lab Assistant, Doctor, Blood Bank Technician, Phlebotomist, Manager) ---

TEST_TYPES = ["Blood group", "Hemoglobin", "HIV", "Hepatitis B (HBsAg)", "Hepatitis C", "Malaria", "Syphilis", "Cross-match", "Other"]


class LabTestIn(BaseModel):
    person_type: str = "donor"
    person_name: str
    blood_type: Optional[str] = None
    test_type: str
    result: str
    outcome: str = "normal"   # normal | abnormal | pending
    notes: Optional[str] = None


def _lab_out(db: Session, t: LabTest) -> dict:
    staff = db.query(Staff).filter(Staff.id == t.staff_id).first() if t.staff_id else None
    return {
        "id": t.id, "person_type": t.person_type, "person_name": t.person_name, "blood_type": t.blood_type,
        "test_type": t.test_type, "result": t.result, "outcome": t.outcome, "notes": t.notes,
        "created_at": t.created_at, "done_by": staff.full_name if staff else "Hospital",
    }


@router.get("/lab-test-types")
def lab_test_types():
    return TEST_TYPES


@router.post("/lab-tests", status_code=201)
def add_lab_test(data: LabTestIn, db: Session = Depends(get_db),
                 actor: HospitalActor = Depends(hospital_or_staff("lab_tests"))):
    if data.person_type not in ("donor", "patient"):
        raise HTTPException(status_code=400, detail="person_type must be donor or patient")
    if data.outcome not in ("normal", "abnormal", "pending"):
        raise HTTPException(status_code=400, detail="outcome must be normal, abnormal or pending")
    t = LabTest(
        hospital_id=actor.hospital.id, staff_id=actor.account.id if actor.actor_type == "staff" else None,
        person_type=data.person_type, person_name=data.person_name.strip(), blood_type=data.blood_type,
        test_type=data.test_type, result=data.result.strip(), outcome=data.outcome, notes=data.notes,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return _lab_out(db, t)


@router.get("/lab-tests")
def list_lab_tests(db: Session = Depends(get_db), actor: HospitalActor = Depends(hospital_or_staff("lab_tests"))):
    rows = db.query(LabTest).filter(LabTest.hospital_id == actor.hospital.id).order_by(LabTest.created_at.desc()).limit(200).all()
    return [_lab_out(db, t) for t in rows]


# --- Read-only blood stock for staff roles that may look at it ---------------

@router.get("/stock")
def staff_view_stock(db: Session = Depends(get_db), actor: HospitalActor = Depends(hospital_or_staff("view_stock", "manage_stock"))):
    from app.routes.inventory_routes import _ensure_rows_exist, _to_item_out, BLOOD_TYPES
    _ensure_rows_exist(db, actor.hospital.id)
    rows = db.query(BloodInventory).filter(BloodInventory.hospital_id == actor.hospital.id).all()
    return [_to_item_out(r) for r in sorted(rows, key=lambda r: BLOOD_TYPES.index(r.blood_type))]
