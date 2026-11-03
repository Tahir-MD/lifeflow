from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.push_schema import PushSubscribeIn, PushUnsubscribeIn, PushStatusOut, DeviceRegisterIn, DeviceUnregisterIn
from app.services.push_service import is_push_configured, get_public_key, save_subscription, remove_subscription
from app.services.fcm_service import is_fcm_configured, save_device_token, remove_device_token
from app.utils.dependencies import get_current_any_account

router = APIRouter(prefix="/push", tags=["Push notifications"])


@router.get("/status", response_model=PushStatusOut)
def push_status():
    """Lets the frontend show/hide the 'enable notifications' button and know the VAPID public key to use."""
    return PushStatusOut(configured=is_push_configured(), public_key=get_public_key(), native_configured=is_fcm_configured())


@router.post("/subscribe")
def subscribe(payload: PushSubscribeIn, db: Session = Depends(get_db), account=Depends(get_current_any_account)):
    role, account_id = account
    save_subscription(db, role, account_id, payload.endpoint, payload.p256dh_key, payload.auth_key)
    return {"subscribed": True}


@router.post("/unsubscribe")
def unsubscribe(payload: PushUnsubscribeIn, db: Session = Depends(get_db), account=Depends(get_current_any_account)):
    remove_subscription(db, payload.endpoint)
    return {"subscribed": False}


@router.post("/device")
def register_device(payload: DeviceRegisterIn, db: Session = Depends(get_db), account=Depends(get_current_any_account)):
    """The Android app calls this with its Firebase token after the person allows notifications."""
    role, account_id = account
    save_device_token(db, role, account_id, payload.token, payload.platform)
    return {"registered": True}


@router.post("/device/remove")
def unregister_device(payload: DeviceUnregisterIn, db: Session = Depends(get_db), account=Depends(get_current_any_account)):
    remove_device_token(db, payload.token)
    return {"registered": False}
