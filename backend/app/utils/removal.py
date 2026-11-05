"""
Soft removal of an account. The login stops working and personal details are wiped, but the row
stays so old donations, requests and audit records keep pointing at something valid.
"""
import secrets
from datetime import datetime

from app.utils.security import hash_password


def remove_account(account, role: str) -> None:
    tag = f"removed-{role}-{account.id}"
    account.email = f"{tag}@removed.lifeflow.app"
    if hasattr(account, "full_name"):
        account.full_name = "Removed user"
    if hasattr(account, "name"):
        account.name = "Removed hospital"
    # Unique per account, so database uniqueness rules (CNIC, phone, licence) never clash.
    for field in ("phone_number", "cnic_number", "license_number"):
        if hasattr(account, field):
            setattr(account, field, tag)
    for field in ("address", "patient_name"):
        if hasattr(account, field):
            setattr(account, field, None if field == "patient_name" else "removed")
    account.hashed_password = hash_password(secrets.token_urlsafe(24))  # nobody knows it
    account.is_removed = True
    account.removed_at = datetime.utcnow()
