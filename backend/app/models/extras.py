"""Small tables added in v14: attendance, lab tests, account recovery, hospital reviews."""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, UniqueConstraint
from datetime import datetime

from app.database import Base


class StaffAttendance(Base):
    """One duty day of one staff member: when they checked in / out, and whether they were late."""
    __tablename__ = "staff_attendance"
    __table_args__ = (UniqueConstraint("staff_id", "work_date", name="uq_staff_workdate"),)

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, nullable=False, index=True)
    hospital_id = Column(Integer, nullable=False, index=True)
    work_date = Column(String, nullable=False, index=True)   # local date the shift STARTED, "YYYY-MM-DD"
    scheduled_start = Column(String, nullable=False)          # "HH:MM"
    scheduled_end = Column(String, nullable=False)
    check_in_at = Column(DateTime, nullable=False)            # UTC
    check_out_at = Column(DateTime, nullable=True)            # UTC
    late_minutes = Column(Integer, default=0)
    left_early = Column(Boolean, default=False)


class LabTest(Base):
    """A blood test result recorded by lab / clinical staff."""
    __tablename__ = "lab_tests"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, nullable=False, index=True)
    staff_id = Column(Integer, nullable=True)
    person_type = Column(String, default="donor")  # donor | patient
    person_name = Column(String, nullable=False)
    blood_type = Column(String, nullable=True)
    test_type = Column(String, nullable=False)
    result = Column(String, nullable=False)
    outcome = Column(String, default="normal")      # normal | abnormal | pending
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class RecoveryInfo(Base):
    """Security question for password recovery. The answer is stored hashed, never as text."""
    __tablename__ = "recovery_info"
    __table_args__ = (UniqueConstraint("role", "account_id", name="uq_recovery_account"),)

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String, nullable=False)
    account_id = Column(Integer, nullable=False)
    question = Column(String, nullable=False)
    answer_hash = Column(String, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow)


class HospitalReview(Base):
    """A donor or patient rating a hospital (one review per person per hospital; it can be updated)."""
    __tablename__ = "hospital_reviews"
    __table_args__ = (UniqueConstraint("hospital_id", "reviewer_type", "reviewer_id", name="uq_review_once"),)

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, nullable=False, index=True)
    reviewer_type = Column(String, nullable=False)  # donor | receiver
    reviewer_id = Column(Integer, nullable=False)
    reviewer_name = Column(String, nullable=True)
    stars = Column(Integer, nullable=False)
    comment = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
