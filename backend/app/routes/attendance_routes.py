import os
from datetime import datetime, timedelta, time, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.extras import StaffAttendance, LabTest
from app.models.staff import Staff, DEFAULT_SHIFT_TIMES, shift_label
from app.models.visitor_log import VisitorEntry
from app.services.audit_service import record_event
from app.utils.dependencies import get_current_staff, hospital_or_staff, HospitalActor

router = APIRouter(prefix="/attendance", tags=["Staff Attendance"])

# Pakistan is UTC+5. Change LIFEFLOW_TZ_OFFSET_MINUTES for another country.
TZ_OFFSET = timedelta(minutes=int(os.environ.get("LIFEFLOW_TZ_OFFSET_MINUTES", "300")))
GRACE_MINUTES = 10          # arriving within 10 minutes of the start is still on time
EARLY_CHECKIN_MINUTES = 30  # check-in opens 30 minutes before the shift starts


def local_now() -> datetime:
    return datetime.utcnow() + TZ_OFFSET


def to_local(dt: datetime) -> datetime:
    return dt + TZ_OFFSET


def _hm(value: str):
    h, m = value.split(":")
    return int(h), int(m)


def _times(staff: Staff):
    start, end = staff.shift_start, staff.shift_end
    if not start or not end:
        start, end = DEFAULT_SHIFT_TIMES.get(staff.shift, ("08:00", "16:00"))
    return start, end


def window_for(staff: Staff, day: date):
    """(start, end) of the duty that STARTS on `day`, in local time. Night shifts end the next day."""
    start, end = _times(staff)
    sh, sm = _hm(start)
    eh, em = _hm(end)
    minutes = ((eh * 60 + em) - (sh * 60 + sm)) % 1440 or 1440
    begin = datetime.combine(day, time(sh, sm))
    return begin, begin + timedelta(minutes=minutes)


def _record_for(db: Session, staff_id: int, day: date) -> Optional[StaffAttendance]:
    return db.query(StaffAttendance).filter(
        StaffAttendance.staff_id == staff_id, StaffAttendance.work_date == day.isoformat()).first()


def current_duty(staff: Staff, now: datetime):
    """The duty window that matters right now: the one open now, else today's."""
    today = now.date()
    for day in (today, today - timedelta(days=1)):
        begin, end = window_for(staff, day)
        if begin - timedelta(minutes=EARLY_CHECKIN_MINUTES) <= now <= end:
            return day, begin, end
    begin, end = window_for(staff, today)
    return today, begin, end


def state_for(db: Session, staff: Staff, now: Optional[datetime] = None) -> dict:
    """present | late | checked_out | absent | not_started - with plain words for the screen."""
    now = now or local_now()
    day, begin, end = current_duty(staff, now)
    record = _record_for(db, staff.id, day)
    out = {
        "staff_id": staff.id, "staff_name": staff.full_name, "staff_role": staff.staff_role,
        "shift_label": staff.shift_label, "work_date": day.isoformat(),
        "can_check_in": False, "can_check_out": False,
    }
    if record:
        late = record.late_minutes or 0
        out.update(
            check_in=to_local(record.check_in_at).strftime("%I:%M %p"),
            check_out=to_local(record.check_out_at).strftime("%I:%M %p") if record.check_out_at else None,
            late_minutes=late, left_early=bool(record.left_early),
        )
        if record.check_out_at:
            out["state"] = "checked_out"
            out["text"] = "Duty finished" + (" (left early)" if record.left_early else "")
        else:
            out["state"] = "late" if late > 0 else "present"
            out["text"] = f"Late by {late} min" if late > 0 else "On time"
            out["can_check_out"] = True
        return out
    if now < begin - timedelta(minutes=EARLY_CHECKIN_MINUTES):
        out.update(state="not_started", text="Duty not started yet")
    elif now <= end:
        out["can_check_in"] = True
        if now > begin + timedelta(minutes=GRACE_MINUTES):
            mins = int((now - begin).total_seconds() // 60)
            out.update(state="absent", text=f"Not checked in ({mins} min after start)")
        else:
            out.update(state="not_started", text="Check-in is open")
    else:
        out.update(state="absent", text="Absent (no check-in)")
    return out


@router.post("/check-in")
def check_in(db: Session = Depends(get_db), staff: Staff = Depends(get_current_staff)):
    now = local_now()
    day, begin, end = current_duty(staff, now)
    if now < begin - timedelta(minutes=EARLY_CHECKIN_MINUTES) or now > end:
        raise HTTPException(status_code=400, detail=f"Your duty is {staff.shift_label}. You can check in from "
                                                    f"{EARLY_CHECKIN_MINUTES} minutes before it starts until it ends.")
    if _record_for(db, staff.id, day):
        raise HTTPException(status_code=400, detail="You already checked in for this duty.")
    late = max(int((now - begin).total_seconds() // 60), 0)
    late = late if late > GRACE_MINUTES else 0
    start, finish = _times(staff)
    db.add(StaffAttendance(
        staff_id=staff.id, hospital_id=staff.hospital_id, work_date=day.isoformat(),
        scheduled_start=start, scheduled_end=finish, check_in_at=datetime.utcnow(), late_minutes=late,
    ))
    db.commit()
    record_event(db, "staff_check_in", actor_type="staff", actor_id=staff.id,
                 payload={"work_date": day.isoformat(), "late_minutes": late})
    return state_for(db, staff)


@router.post("/check-out")
def check_out(db: Session = Depends(get_db), staff: Staff = Depends(get_current_staff)):
    now = local_now()
    day, begin, end = current_duty(staff, now)
    record = _record_for(db, staff.id, day)
    if not record or record.check_out_at:
        raise HTTPException(status_code=400, detail="You have no open check-in to finish.")
    record.check_out_at = datetime.utcnow()
    record.left_early = now < end - timedelta(minutes=GRACE_MINUTES)
    db.commit()
    record_event(db, "staff_check_out", actor_type="staff", actor_id=staff.id,
                 payload={"work_date": day.isoformat(), "left_early": record.left_early})
    return state_for(db, staff)


def _row(r: StaffAttendance, staff: Optional[Staff]) -> dict:
    return {
        "id": r.id, "staff_id": r.staff_id, "staff_name": staff.full_name if staff else "",
        "staff_role": staff.staff_role if staff else "", "work_date": r.work_date,
        "duty": shift_label("", r.scheduled_start, r.scheduled_end).strip(),
        "check_in": to_local(r.check_in_at).strftime("%I:%M %p"),
        "check_out": to_local(r.check_out_at).strftime("%I:%M %p") if r.check_out_at else None,
        "late_minutes": r.late_minutes or 0, "left_early": bool(r.left_early),
    }


@router.get("/mine")
def my_attendance(db: Session = Depends(get_db), staff: Staff = Depends(get_current_staff)):
    rows = db.query(StaffAttendance).filter(StaffAttendance.staff_id == staff.id)\
        .order_by(StaffAttendance.work_date.desc()).limit(45).all()
    return {"today": state_for(db, staff), "history": [_row(r, staff) for r in rows]}


@router.get("/team")
def team_attendance(db: Session = Depends(get_db), actor: HospitalActor = Depends(hospital_or_staff("view_all"))):
    """Today's picture for the whole hospital: present, late, absent, not started."""
    staff_list = db.query(Staff).filter(Staff.hospital_id == actor.hospital.id).order_by(Staff.full_name).all()
    return [state_for(db, s) for s in staff_list]


@router.get("/history")
def team_history(days: int = 14, db: Session = Depends(get_db),
                 actor: HospitalActor = Depends(hospital_or_staff("view_all"))):
    since = (local_now().date() - timedelta(days=min(max(days, 1), 90))).isoformat()
    staff_map = {s.id: s for s in db.query(Staff).filter(Staff.hospital_id == actor.hospital.id).all()}
    rows = db.query(StaffAttendance).filter(
        StaffAttendance.hospital_id == actor.hospital.id, StaffAttendance.work_date >= since)\
        .order_by(StaffAttendance.work_date.desc(), StaffAttendance.check_in_at.desc()).all()
    return [_row(r, staff_map.get(r.staff_id)) for r in rows]


@router.get("/report")
def monthly_report(month: Optional[str] = None, db: Session = Depends(get_db),
                   actor: HospitalActor = Depends(hospital_or_staff("view_all"))):
    """Monthly staff report: visits logged, tests done, days present, late arrivals, days without check-in."""
    now = local_now()
    try:
        first = datetime.strptime(month, "%Y-%m").date() if month else now.date().replace(day=1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Month must look like 2026-10")
    next_month = (first.replace(day=28) + timedelta(days=4)).replace(day=1)
    last = next_month - timedelta(days=1)

    start_utc = datetime.combine(first, time(0, 0)) - TZ_OFFSET
    end_utc = datetime.combine(next_month, time(0, 0)) - TZ_OFFSET

    result = []
    for staff in db.query(Staff).filter(Staff.hospital_id == actor.hospital.id).order_by(Staff.full_name).all():
        entries = db.query(VisitorEntry).filter(
            VisitorEntry.staff_id == staff.id, VisitorEntry.logged_at >= start_utc, VisitorEntry.logged_at < end_utc).all()
        tests = db.query(LabTest).filter(
            LabTest.staff_id == staff.id, LabTest.created_at >= start_utc, LabTest.created_at < end_utc).count()
        records = db.query(StaffAttendance).filter(
            StaffAttendance.staff_id == staff.id, StaffAttendance.work_date >= first.isoformat(),
            StaffAttendance.work_date <= last.isoformat()).all()
        have = {r.work_date for r in records}

        absent = 0
        day = max(first, to_local(staff.created_at).date() if staff.created_at else first)
        while day <= last and day <= now.date():
            _, end = window_for(staff, day)
            finished = end < now
            if finished and day.isoformat() not in have:
                absent += 1
            day += timedelta(days=1)

        result.append({
            "staff_name": staff.full_name, "staff_role": staff.staff_role, "duty": staff.shift_label,
            "donors_logged": sum(1 for e in entries if e.visitor_type == "donor"),
            "patients_logged": sum(1 for e in entries if e.visitor_type == "patient"),
            "tests_done": tests, "days_present": len(records),
            "late_count": sum(1 for r in records if (r.late_minutes or 0) > 0),
            "late_minutes": sum(r.late_minutes or 0 for r in records),
            "left_early_count": sum(1 for r in records if r.left_early),
            "days_without_checkin": absent,
        })
    return {"month": first.strftime("%Y-%m"), "hospital": actor.hospital.name, "rows": result}
