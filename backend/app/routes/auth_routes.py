from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.donor import Donor
from app.models.hospital import Hospital
from app.models.receiver import Receiver
from app.models.admin import Admin
from app.models.staff import Staff
from app.schemas.donor_schema import DonorCreate, DonorOut, DonorLogin
from app.schemas.hospital_schema import HospitalCreate, HospitalOut, HospitalLogin
from app.schemas.receiver_schema import ReceiverCreate, ReceiverOut, ReceiverLogin
from app.schemas.admin_schema import AdminLogin
from app.schemas.staff_schema import StaffLogin
from app.utils.security import hash_password, verify_password, create_access_token, decode_access_token
from app.utils.totp import verify_totp
from app.utils.identity import ensure_unique_identity
from app.utils.location import resolve_place, build_address_label
from app.services.eligibility_service import evaluate_eligibility
from app.services.otp_service import require_phone_token
from app.services.referral_service import new_referral_code
from datetime import datetime
import hashlib
import random
import time as _time
from typing import Optional

from app.models.extras import RecoveryInfo
from app.services.delivery_service import is_email_configured, send_email
from app.services.audit_service import record_event

router = APIRouter(prefix="/auth", tags=["Authentication"])

TWO_FA_PENDING_EXPIRE_MINUTES = 5
TWO_FA_MODELS = {"hospital": Hospital, "admin": Admin}


def _coordinates_for(data) -> tuple:
    """The forms ask for words only (country, province, city, area). The position is worked out here."""
    if data.latitude is not None and data.longitude is not None:
        return data.latitude, data.longitude
    return resolve_place(data.village, data.area, data.city, data.state, data.country)


def _place_fields(data) -> dict:
    latitude, longitude = _coordinates_for(data)
    return dict(
        village=data.village, area=data.area, city=data.city, state=data.state, country=data.country,
        latitude=latitude, longitude=longitude,
    )


def _login_response(role: str, account) -> dict:
    """
    Normal path: issues a real access token straight away.
    2FA path (hospital/admin only, and only once they've turned it on):
    issues a short-lived, role-scoped "pending" token instead, which is
    only useful at /auth/login/2fa-verify and nowhere else in the API.
    """
    if role in TWO_FA_MODELS and getattr(account, "two_factor_enabled", False):
        pending_token = create_access_token(
            {"sub": str(account.id), "role": role, "stage": "2fa_pending"},
            expires_minutes=TWO_FA_PENDING_EXPIRE_MINUTES,
        )
        return {"requires_2fa": True, "temp_token": pending_token}

    token = create_access_token({"sub": str(account.id), "role": role})
    return {"access_token": token, "token_type": "bearer", "requires_2fa": False}


@router.post("/register/donor", response_model=DonorOut, status_code=status.HTTP_201_CREATED)
def register_donor(donor_data: DonorCreate, db: Session = Depends(get_db)):
    ensure_unique_identity(db, donor_data.email, donor_data.phone_number, donor_data.cnic_number)

    proof = require_phone_token(donor_data.phone_token, donor_data.phone_number, donor_data.email)

    # The health questionnaire is checked again here: the server never trusts the browser.
    answers = donor_data.eligibility.model_dump()
    verdict = evaluate_eligibility(answers)
    if not verdict["eligible"]:
        reasons = " ".join(r["message"] for r in verdict["reasons"])
        when = f" You can try again after {verdict['retry_after_date']}." if verdict["retry_after_date"] else ""
        raise HTTPException(status_code=422, detail=f"You cannot register as a donor right now. {reasons}{when}")

    referrer_id = None
    if donor_data.referral_code:
        referrer = db.query(Donor).filter(Donor.referral_code == donor_data.referral_code.strip().upper()).first()
        referrer_id = referrer.id if referrer else None  # a wrong code is ignored, it never blocks sign-up

    last_donation = None
    if answers.get("last_donation_date"):
        try:
            last_donation = datetime.strptime(answers["last_donation_date"][:10], "%Y-%m-%d")
        except ValueError:
            last_donation = None

    new_donor = Donor(
        full_name=donor_data.full_name,
        email=donor_data.email,
        hashed_password=hash_password(donor_data.password),
        blood_type=donor_data.blood_type,
        phone_number=donor_data.phone_number,
        cnic_number=donor_data.cnic_number,
        age=answers["age"],
        gender=answers["gender"].lower(),
        weight_kg=answers["weight_kg"],
        eligibility_checked_at=datetime.utcnow(),
        last_donation_date=last_donation,
        phone_verified=(proof == "phone"),
        email_verified=(proof == "email"),
        referral_code=new_referral_code(db),
        referred_by_id=referrer_id,
        **_place_fields(donor_data),
    )
    db.add(new_donor)
    db.commit()
    db.refresh(new_donor)
    return new_donor


@router.post("/register/hospital", response_model=HospitalOut, status_code=status.HTTP_201_CREATED)
def register_hospital(hospital_data: HospitalCreate, db: Session = Depends(get_db)):
    ensure_unique_identity(db, hospital_data.email, hospital_data.phone_number, hospital_data.cnic_number)

    if db.query(Hospital).filter(Hospital.license_number == hospital_data.license_number).first():
        raise HTTPException(status_code=400, detail="A hospital with this license number is already registered")

    proof = require_phone_token(hospital_data.phone_token, hospital_data.phone_number, hospital_data.email)

    new_hospital = Hospital(
        phone_verified=(proof == "phone"),
        email_verified=(proof == "email"),
        name=hospital_data.name,
        email=hospital_data.email,
        hashed_password=hash_password(hospital_data.password),
        license_number=hospital_data.license_number,
        phone_number=hospital_data.phone_number,
        cnic_number=hospital_data.cnic_number,
        **_place_fields(hospital_data),
    )
    db.add(new_hospital)
    db.commit()
    db.refresh(new_hospital)
    return new_hospital


@router.post("/register/receiver", response_model=ReceiverOut, status_code=status.HTTP_201_CREATED)
def register_receiver(receiver_data: ReceiverCreate, db: Session = Depends(get_db)):
    ensure_unique_identity(db, receiver_data.email, receiver_data.phone_number, receiver_data.cnic_number)

    proof = require_phone_token(receiver_data.phone_token, receiver_data.phone_number, receiver_data.email)

    new_receiver = Receiver(
        phone_verified=(proof == "phone"),
        email_verified=(proof == "email"),
        full_name=receiver_data.full_name,
        email=receiver_data.email,
        hashed_password=hash_password(receiver_data.password),
        phone_number=receiver_data.phone_number,
        cnic_number=receiver_data.cnic_number,
        address=", ".join(p for p in (receiver_data.address, build_address_label(
            receiver_data.village, receiver_data.area, receiver_data.city, receiver_data.state, receiver_data.country)) if p),
        patient_name=receiver_data.patient_name,
        **_place_fields(receiver_data),
    )
    db.add(new_receiver)
    db.commit()
    db.refresh(new_receiver)
    return new_receiver


@router.post("/login/donor")
def login_donor(login_data: DonorLogin, db: Session = Depends(get_db)):
    donor = db.query(Donor).filter(Donor.email == login_data.email).first()
    if not donor or not verify_password(login_data.password, donor.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token({"sub": str(donor.id), "role": "donor"})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/login/hospital")
def login_hospital(login_data: HospitalLogin, db: Session = Depends(get_db)):
    hospital = db.query(Hospital).filter(Hospital.email == login_data.email).first()
    if not hospital or not verify_password(login_data.password, hospital.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    return _login_response("hospital", hospital)


@router.post("/login/receiver")
def login_receiver(login_data: ReceiverLogin, db: Session = Depends(get_db)):
    receiver = db.query(Receiver).filter(Receiver.email == login_data.email).first()
    if not receiver or not verify_password(login_data.password, receiver.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token({"sub": str(receiver.id), "role": "receiver"})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/login/admin")
def login_admin(login_data: AdminLogin, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.email == login_data.email).first()
    if not admin or not verify_password(login_data.password, admin.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    return _login_response("admin", admin)


@router.post("/login/staff")
def login_staff(login_data: StaffLogin, db: Session = Depends(get_db)):
    staff = db.query(Staff).filter(Staff.email == login_data.email).first()
    if not staff or not verify_password(login_data.password, staff.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token({"sub": str(staff.id), "role": "staff"})
    return {"access_token": token, "token_type": "bearer"}


class TwoFactorVerifyIn(BaseModel):
    temp_token: str
    code: str


@router.post("/login/2fa-verify")
def login_2fa_verify(payload: TwoFactorVerifyIn, db: Session = Depends(get_db)):
    """Step 2 of login for an account with 2FA turned on: exchange the temp token + a 6-digit code for a real access token."""
    claims = decode_access_token(payload.temp_token)
    if not claims or claims.get("stage") != "2fa_pending" or claims.get("role") not in TWO_FA_MODELS:
        raise HTTPException(status_code=401, detail="This login attempt has expired. Please log in again.")

    role = claims["role"]
    account = db.query(TWO_FA_MODELS[role]).filter(TWO_FA_MODELS[role].id == int(claims["sub"])).first()
    if not account or not account.totp_secret or not verify_totp(account.totp_secret, payload.code):
        raise HTTPException(status_code=401, detail="Incorrect or expired authentication code")

    token = create_access_token({"sub": str(account.id), "role": role})
    return {"access_token": token, "token_type": "bearer", "requires_2fa": False}


# --- One login for every kind of account ----------------------------------------

LOGIN_ORDER = [
    ("donor", Donor),
    ("receiver", Receiver),
    ("hospital", Hospital),
    ("staff", Staff),
    ("admin", Admin),
]


class UnifiedLogin(BaseModel):
    email: str
    password: str


@router.post("/login")
def login_any(login_data: UnifiedLogin, db: Session = Depends(get_db)):
    """
    The single login used by the whole app. It finds which kind of account the email belongs to
    (donor, patient, hospital, staff or admin), checks the password, and tells the app which role
    it is so the right dashboard can open. (The five older /auth/login/<role> routes still work.)
    """
    email = (login_data.email or "").strip()
    for role, model in LOGIN_ORDER:
        account = db.query(model).filter(model.email.ilike(email)).first()
        if account and verify_password(login_data.password, account.hashed_password):
            result = _login_response(role, account)
            result["role"] = role
            return result
    raise HTTPException(status_code=401, detail="Incorrect email or password")


# --- Forgot password: username check -> security question or emailed code -> new password ---

MAX_WRONG_TRIES = 5
LOCK_SECONDS = 15 * 60
OTP_SECONDS = 10 * 60
_tries: dict = {}   # email -> [wrong_count, locked_until]
_otps: dict = {}    # email -> [code_hash, expires_at]


def strong_password_problem(pw: str) -> Optional[str]:
    if (len(pw) < 8 or not any(c.isupper() for c in pw) or not any(c.islower() for c in pw)
            or not any(not c.isalnum() for c in pw)):
        return "Password must be at least 8 characters with an upper case letter, a lower case letter and a special character."
    return None


def _first_account(db: Session, email: str):
    email = (email or "").strip().lower()
    for role, model in LOGIN_ORDER:
        account = db.query(model).filter(model.email.ilike(email)).first()
        if account:
            return role, account
    return None, None


def _check_locked(email: str) -> None:
    entry = _tries.get(email)
    if entry and entry[1] > _time.time():
        minutes = int((entry[1] - _time.time()) // 60) + 1
        raise HTTPException(status_code=429, detail=f"Too many wrong tries. Please wait {minutes} minute(s) and try again.")


def _wrong_try(email: str) -> None:
    entry = _tries.setdefault(email, [0, 0])
    if entry[1] and entry[1] <= _time.time():
        entry[0], entry[1] = 0, 0
    entry[0] += 1
    if entry[0] >= MAX_WRONG_TRIES:
        entry[1] = _time.time() + LOCK_SECONDS
        entry[0] = 0


def _norm(answer: str) -> str:
    return " ".join((answer or "").lower().split())


def _password_fingerprint(account) -> str:
    """Changes whenever the password changes, so one reset token can only be used once."""
    return hashlib.sha256((account.hashed_password or "").encode()).hexdigest()[:16]


class FindAccountIn(BaseModel):
    email: str


class VerifyIn(BaseModel):
    email: str
    answer: Optional[str] = None
    code: Optional[str] = None


class FinishResetIn(BaseModel):
    token: str
    new_password: str
    confirm_password: str


@router.post("/forgot-password/check")
def forgot_password_check(payload: FindAccountIn, db: Session = Depends(get_db)):
    """Step 1: match the username (email) in the database and say how this account can prove it is theirs."""
    role, account = _first_account(db, payload.email)
    if not account:
        raise HTTPException(status_code=404, detail="No account was found with this username (email).")
    info = db.query(RecoveryInfo).filter(RecoveryInfo.role == role, RecoveryInfo.account_id == account.id).first()
    otp = is_email_configured()
    return {
        "found": True, "role": role,
        "question": info.question if info else None,
        "email_code_available": otp,
        "can_recover": bool(info) or otp,
        "help": None if (info or otp) else (
            "This account has no security question yet. A hospital staff member should ask their hospital to reset the password; "
            "others should contact LifeFlow support."),
    }


@router.post("/forgot-password/send-code")
def forgot_password_send_code(payload: FindAccountIn, db: Session = Depends(get_db)):
    """Optional: email a 6 digit code (only when email sending is set up on the server)."""
    if not is_email_configured():
        raise HTTPException(status_code=400, detail="Email sending is not set up on this server.")
    email = payload.email.strip().lower()
    _check_locked(email)
    role, account = _first_account(db, email)
    if not account:
        raise HTTPException(status_code=404, detail="No account was found with this username (email).")
    code = f"{random.SystemRandom().randint(0, 999999):06d}"
    _otps[email] = [hashlib.sha256(code.encode()).hexdigest(), _time.time() + OTP_SECONDS]
    send_email(account.email, "LifeFlow password reset code",
               f"Your LifeFlow code is {code}. It works for 10 minutes. If you did not ask for it, ignore this message.")
    return {"message": "A 6 digit code was sent to your email."}


@router.post("/forgot-password/verify")
def forgot_password_verify(payload: VerifyIn, db: Session = Depends(get_db)):
    """Step 2: prove it is you (security answer or emailed code). Returns a short-lived reset token."""
    email = payload.email.strip().lower()
    _check_locked(email)
    role, account = _first_account(db, email)
    if not account:
        raise HTTPException(status_code=404, detail="No account was found with this username (email).")

    ok = False
    if payload.code:
        entry = _otps.get(email)
        if entry and entry[1] > _time.time() and hashlib.sha256(payload.code.strip().encode()).hexdigest() == entry[0]:
            ok = True
            _otps.pop(email, None)
    elif payload.answer:
        info = db.query(RecoveryInfo).filter(RecoveryInfo.role == role, RecoveryInfo.account_id == account.id).first()
        ok = bool(info) and verify_password(_norm(payload.answer), info.answer_hash)
    if not ok:
        _wrong_try(email)
        raise HTTPException(status_code=400, detail="That is not correct. Please try again.")

    _tries.pop(email, None)
    token = create_access_token(
        {"sub": str(account.id), "role": role, "stage": "password_reset", "fp": _password_fingerprint(account)},
        expires_minutes=10,
    )
    return {"reset_token": token}


@router.post("/forgot-password/reset")
def forgot_password_reset(payload: FinishResetIn, db: Session = Depends(get_db)):
    """Step 3: new password + confirm password, using the token from step 2."""
    claims = decode_access_token(payload.token)
    if not claims or claims.get("stage") != "password_reset":
        raise HTTPException(status_code=400, detail="This reset session expired. Please start again.")
    model = dict(LOGIN_ORDER).get(claims.get("role"))
    account = db.query(model).filter(model.id == int(claims["sub"])).first() if model else None
    if not account or claims.get("fp") != _password_fingerprint(account):
        raise HTTPException(status_code=400, detail="This reset session was already used or expired. Please start again.")
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="The two passwords are not the same.")
    problem = strong_password_problem(payload.new_password)
    if problem:
        raise HTTPException(status_code=400, detail=problem)
    account.hashed_password = hash_password(payload.new_password)
    if hasattr(account, "must_change_password"):
        account.must_change_password = False
    db.commit()
    record_event(db, "password_reset", actor_type=claims.get("role"), actor_id=account.id, payload={})
    return {"message": "Your password has been changed. You can log in now."}
