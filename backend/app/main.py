import os
import threading
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine, SessionLocal
from app.models import (  # noqa: F401
    donor,
    hospital,
    receiver,
    request,
    donation,
    notification,
    rating,
    inventory,
    camp,
    admin,
    staff,
    visitor_log,
    audit_log,
    push_subscription,
    password_reset,
    phone_otp,
    request_event,
    chat_message,
    blood_batch,
    blood_transfer,
    emergency_contact,
    weekly_report,
    device_token,
    stock_offer,
    shift_change,
    feedback,
    extras,
)
from app.routes import (
    auth_routes,
    role_routes,
    chat_routes,
    patient_offer_routes,
    donor_routes,
    hospital_routes,
    receiver_routes,
    request_routes,
    matching_routes,
    donation_routes,
    notification_routes,
    rating_routes,
    inventory_routes,
    camp_routes,
    stats_routes,
    admin_routes,
    staff_routes,
    ai_routes,
    push_routes,
    backup_routes,
    ai_extra_routes,
    interop_routes,
    two_factor_routes,
    location_routes,
    password_routes,
    otp_routes,
    sos_routes,
    tracking_routes,
    transfer_routes,
    bulk_routes,
    certificate_routes,
    export_routes,
    moderation_routes,
    directory_routes,
    checkin_routes,
    ai_v6_routes,
    stock_offer_routes,
    profile_routes,
    attendance_routes,
    donation_confirm_routes,
    review_routes,
    feedback_routes,
)
from app.utils.security import hash_password

DEFAULT_ADMIN_EMAIL = os.environ.get("LIFEFLOW_ADMIN_EMAIL", "admin@lifeflow.com")
DEFAULT_ADMIN_PASSWORD = os.environ.get("LIFEFLOW_ADMIN_PASSWORD", "Admin@123")  # set LIFEFLOW_ADMIN_PASSWORD on the server!

from app.utils.migrate import add_missing_columns  # noqa: E402

Base.metadata.create_all(bind=engine)
add_missing_columns(engine, Base)  # adds the new location columns to an older lifeflow.db


def _seed_default_admin() -> None:
    """
    Makes sure the one LifeFlow admin account always exists, so admin
    login works right away without a separate registration step.
    Change DEFAULT_ADMIN_PASSWORD (or set it via an environment
    variable in a real deployment) before going live.
    """
    db = SessionLocal()
    try:
        existing = db.query(admin.Admin).filter(admin.Admin.email == DEFAULT_ADMIN_EMAIL).first()
        if not existing:
            db.add(admin.Admin(
                full_name="LifeFlow Admin",
                email=DEFAULT_ADMIN_EMAIL,
                hashed_password=hash_password(DEFAULT_ADMIN_PASSWORD),
            ))
            db.commit()
    finally:
        db.close()


_seed_default_admin()

app = FastAPI(
    title="LifeFlow",
    description="A platform that connects blood donors, receivers, and hospitals.",
    version="15.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(role_routes.router)
app.include_router(chat_routes.router)
app.include_router(patient_offer_routes.router)
app.include_router(donor_routes.router)
app.include_router(hospital_routes.router)
app.include_router(receiver_routes.router)
app.include_router(request_routes.router)
app.include_router(matching_routes.router)
app.include_router(donation_routes.router)
app.include_router(notification_routes.router)
app.include_router(rating_routes.router)
app.include_router(inventory_routes.router)
app.include_router(camp_routes.router)
app.include_router(stats_routes.router)
app.include_router(admin_routes.router)
app.include_router(staff_routes.router)
app.include_router(ai_routes.router)
app.include_router(push_routes.router)
app.include_router(ai_extra_routes.router)
app.include_router(interop_routes.router)
app.include_router(two_factor_routes.router)
app.include_router(location_routes.router)
app.include_router(password_routes.router)
app.include_router(otp_routes.router)
app.include_router(sos_routes.router)
app.include_router(tracking_routes.router)
app.include_router(transfer_routes.router)
app.include_router(bulk_routes.router)
app.include_router(certificate_routes.router)
app.include_router(export_routes.router)
app.include_router(moderation_routes.router)
app.include_router(directory_routes.router)
app.include_router(checkin_routes.router)
app.include_router(ai_v6_routes.router)
app.include_router(backup_routes.router)
app.include_router(stock_offer_routes.router)
app.include_router(profile_routes.router)
app.include_router(attendance_routes.router)
app.include_router(donation_confirm_routes.router)
app.include_router(review_routes.router)
app.include_router(feedback_routes.router)


def _background_jobs() -> None:
    """Every hour: remove expired blood bags (and warn about ones expiring soon), send
    "you can donate again" reminders, and write the weekly report when one is due. Set LIFEFLOW_BACKGROUND_JOBS=off to turn this off."""
    from app.services.batch_service import sweep_expired
    from app.services.reminder_service import send_due_reminders
    from app.services.v6_service import run_weekly_reports_if_due
    from app.services.backup_service import run_backup_if_due

    while True:
        db = SessionLocal()
        try:
            sweep_expired(db)
            send_due_reminders(db)
            run_weekly_reports_if_due(db)   # one summary per week for the admin and every hospital
            run_backup_if_due()             # automatic database backup (LIFEFLOW_BACKUP=off to disable)
        except Exception as error:  # noqa: BLE001 -- a failed round must never stop the server
            print(f"[LifeFlow background jobs] {error}")  # noqa: T201
        finally:
            db.close()
        time.sleep(1800)


@app.on_event("startup")
def _seed_emergency_directory() -> None:
    directory_routes.seed_directory()


@app.on_event("startup")
def _start_background_jobs() -> None:
    if os.environ.get("LIFEFLOW_BACKGROUND_JOBS", "on").lower() != "off":
        threading.Thread(target=_background_jobs, daemon=True, name="lifeflow-jobs").start()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def read_root():
    return {"message": "The LifeFlow backend is running."}
