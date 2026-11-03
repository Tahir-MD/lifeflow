from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.donor import Donor
from app.models.hospital import Hospital
from app.models.receiver import Receiver
from app.models.admin import Admin
from app.models.staff import Staff
from app.utils.permissions import can
from app.utils.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login/donor")

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not verify the login token",
    headers={"WWW-Authenticate": "Bearer"},
)


OPEN_PATHS_FOR_UNVERIFIED = ("/auth", "/notifications", "/push", "/2fa", "/assistant", "/profile", "/credentials", "/feedback")


def _block_unverified_hospital(request, hospital) -> None:
    """A hospital the admin has not verified yet can look around, but cannot do anything (no requests, stock, confirmations...)."""
    if hospital is None or getattr(hospital, "is_verified", False):
        return
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return
    if request.url.path.startswith(OPEN_PATHS_FOR_UNVERIFIED):
        return
    raise HTTPException(status_code=403, detail="Your hospital is waiting for the admin to verify it. You can use the app after it is verified.")



def get_current_donor(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Donor:
    payload = decode_access_token(token)
    if not payload or payload.get("role") != "donor" or payload.get("stage"):
        raise CREDENTIALS_ERROR

    donor = db.query(Donor).filter(Donor.id == int(payload.get("sub"))).first()
    if not donor:
        raise CREDENTIALS_ERROR
    return donor


def get_current_hospital(request: Request, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Hospital:
    payload = decode_access_token(token)
    if not payload or payload.get("role") != "hospital" or payload.get("stage"):
        # A "2fa_pending" token is only valid at /auth/login/2fa-verify -- never here.
        raise CREDENTIALS_ERROR

    hospital = db.query(Hospital).filter(Hospital.id == int(payload.get("sub"))).first()
    if not hospital:
        raise CREDENTIALS_ERROR
    _block_unverified_hospital(request, hospital)
    return hospital


def get_current_receiver(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Receiver:
    payload = decode_access_token(token)
    if not payload or payload.get("role") != "receiver" or payload.get("stage"):
        raise CREDENTIALS_ERROR

    receiver = db.query(Receiver).filter(Receiver.id == int(payload.get("sub"))).first()
    if not receiver:
        raise CREDENTIALS_ERROR
    return receiver


def get_current_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Admin:
    payload = decode_access_token(token)
    if not payload or payload.get("role") != "admin" or payload.get("stage"):
        # A "2fa_pending" token is only valid at /auth/login/2fa-verify -- never here.
        raise CREDENTIALS_ERROR

    admin = db.query(Admin).filter(Admin.id == int(payload.get("sub"))).first()
    if not admin:
        raise CREDENTIALS_ERROR
    return admin


def get_current_staff(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Staff:
    payload = decode_access_token(token)
    if not payload or payload.get("role") != "staff" or payload.get("stage"):
        raise CREDENTIALS_ERROR

    staff = db.query(Staff).filter(Staff.id == int(payload.get("sub"))).first()
    if not staff:
        raise CREDENTIALS_ERROR
    return staff


def get_current_requester(request: Request, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    A request for blood can come from either a hospital or a patient
    (receiver), so some endpoints - like rating the donor who helped
    you - need to accept whichever of the two is logged in.
    Returns a tuple of ("hospital" | "receiver", the account object).
    """
    payload = decode_access_token(token)
    if not payload or payload.get("role") not in ("hospital", "receiver") or payload.get("stage"):
        # A "2fa_pending" token is only valid at /auth/login/2fa-verify -- never here.
        raise CREDENTIALS_ERROR

    role = payload.get("role")
    account_id = int(payload.get("sub"))
    if role == "hospital":
        account = db.query(Hospital).filter(Hospital.id == account_id).first()
    else:
        account = db.query(Receiver).filter(Receiver.id == account_id).first()

    if not account:
        raise CREDENTIALS_ERROR
    if role == "hospital":
        _block_unverified_hospital(request, account)
    return role, account


def get_current_any_account(token: str = Depends(oauth2_scheme)):
    """
    For endpoints -- like push-notification subscribe/unsubscribe --
    that any logged-in account can use, whichever of the five roles
    they are. Only decodes the token; it does not touch the database,
    so it works even for roles this file doesn't import a model for.
    Returns a tuple of (role, account_id).
    """
    payload = decode_access_token(token)
    if not payload or payload.get("role") not in ("donor", "hospital", "receiver", "staff", "admin") or payload.get("stage"):
        # A "2fa_pending" token is only valid at /auth/login/2fa-verify -- never here.
        raise CREDENTIALS_ERROR
    return payload.get("role"), int(payload.get("sub"))


def require_staff_permission(permission: str):
    """A dependency: the logged-in staff member must have this permission, or the server says 403."""
    def checker(staff: Staff = Depends(get_current_staff)) -> Staff:
        if not can(staff.role, permission):
            raise HTTPException(status_code=403, detail="Your staff role is not allowed to do this.")
        return staff
    return checker


def _hospital_or_staff_with(permission: str):
    def resolver(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Hospital:
        """The hospital itself, OR a staff member of that hospital whose role has `permission`."""
        payload = decode_access_token(token)
        if not payload or payload.get("stage"):
            raise CREDENTIALS_ERROR
        role = payload.get("role")
        if role == "hospital":
            hospital = db.query(Hospital).filter(Hospital.id == int(payload.get("sub"))).first()
        elif role == "staff":
            staff = db.query(Staff).filter(Staff.id == int(payload.get("sub"))).first()
            if not staff:
                raise CREDENTIALS_ERROR
            if not can(staff.role, permission):
                raise HTTPException(status_code=403, detail="Your staff role is not allowed to do this.")
            hospital = db.query(Hospital).filter(Hospital.id == staff.hospital_id).first()
        else:
            raise CREDENTIALS_ERROR
        if not hospital:
            raise CREDENTIALS_ERROR
        return hospital
    return resolver


get_hospital_for_stock = _hospital_or_staff_with("manage_stock")      # hospital, or lab technician / manager
get_hospital_for_checkin = _hospital_or_staff_with("camp_checkin")    # hospital, or any staff role with check-in


class HospitalActor:
    """Who is acting for a hospital: the hospital itself, or one of its staff (with their role's permission)."""
    def __init__(self, hospital, actor_type, account):
        self.hospital = hospital
        self.actor_type = actor_type  # "hospital" | "staff"
        self.account = account

    @property
    def label(self) -> str:
        return f"{self.actor_type}:{self.account.id}"


def hospital_or_staff(*permissions: str):
    """
    Dependency factory. The hospital account can always do it. A staff member can only do it if
    their role has ANY of the given permissions (see utils/permissions.py).
    """
    def dependency(request: Request, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> HospitalActor:
        payload = decode_access_token(token)
        if not payload or payload.get("stage"):
            raise CREDENTIALS_ERROR
        role = payload.get("role")
        if role == "hospital":
            hospital = db.query(Hospital).filter(Hospital.id == int(payload.get("sub"))).first()
            if not hospital:
                raise CREDENTIALS_ERROR
            _block_unverified_hospital(request, hospital)
            return HospitalActor(hospital, "hospital", hospital)
        if role == "staff":
            staff = db.query(Staff).filter(Staff.id == int(payload.get("sub"))).first()
            if not staff:
                raise CREDENTIALS_ERROR
            if not any(can(staff.role, p) for p in permissions):
                raise HTTPException(status_code=403, detail=f"Your role ({staff.staff_role}) is not allowed to do this.")
            hospital = db.query(Hospital).filter(Hospital.id == staff.hospital_id).first()
            _block_unverified_hospital(request, hospital)
            return HospitalActor(hospital, "staff", staff)
        raise CREDENTIALS_ERROR
    return dependency


def staff_with(*permissions: str):
    """Dependency factory: the logged-in staff member, but only if their role has ANY of these permissions."""
    def dependency(current_staff: Staff = Depends(get_current_staff)) -> Staff:
        if not any(can(current_staff.role, p) for p in permissions):
            raise HTTPException(status_code=403, detail=f"Your role ({current_staff.staff_role}) is not allowed to do this.")
        return current_staff
    return dependency
