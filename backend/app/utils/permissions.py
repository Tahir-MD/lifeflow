"""
What each hospital staff role may do. One place, so the screens and the server agree.

  receptionist   front desk: logs donors and patients, checks donors in at camps
  lab_technician receptionist + manages the blood stock and expiry dates
  doctor         receptionist + screens donors (medical clearance)
  manager        everything above
  nurse, phlebotomist, blood_bank_technician, pharmacist: see the table below
"""
from typing import List

PERMISSIONS = {
    "log_visitors": "Log donors and patients",
    "camp_checkin": "Check donors in at camps",
    "view_nearby": "See nearby donors and hospitals",
    "manage_stock": "Manage blood stock and expiry dates",
    "screen_donors": "Medically screen donors",
    "view_stock": "Look at the blood stock (read only)",
    "lab_tests": "Record and see blood test results",
    "confirm_donations": "Confirm that a donor's bags were really received",
    "view_all": "See the whole hospital team (records, attendance, reports)",
}

ROLE_PERMISSIONS = {
    "receptionist": {"log_visitors", "camp_checkin", "view_nearby"},
    "lab_technician": {"log_visitors", "camp_checkin", "view_nearby", "manage_stock", "view_stock", "lab_tests"},
    "doctor": {"log_visitors", "camp_checkin", "view_nearby", "screen_donors", "view_stock", "lab_tests"},
    "manager": set(PERMISSIONS),
    "nurse": {"log_visitors", "camp_checkin", "view_nearby"},
    "phlebotomist": {"log_visitors", "camp_checkin", "view_nearby", "lab_tests"},
    "blood_bank_technician": {"view_nearby", "manage_stock", "view_stock", "lab_tests", "confirm_donations"},
    "pharmacist": {"view_nearby", "view_stock"},
}

ROLE_LABELS = {
    "receptionist": "Receptionist",
    "lab_technician": "Lab Assistant",
    "doctor": "Doctor",
    "manager": "Manager",
    "nurse": "Nurse",
    "phlebotomist": "Phlebotomist",
    "blood_bank_technician": "Blood Bank Technician",
    "pharmacist": "Pharmacist",
}


def permissions_for(role) -> List[str]:
    """Old staff rows have no role: they keep the front-desk powers they always had."""
    return sorted(ROLE_PERMISSIONS.get(role or "receptionist", ROLE_PERMISSIONS["receptionist"]))


def can(role, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(role or "receptionist", ROLE_PERMISSIONS["receptionist"])
