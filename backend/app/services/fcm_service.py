"""
Native push to the Android app through Firebase Cloud Messaging (HTTP v1 API).

Optional and safe: if no service account is configured (or google-auth isn't installed) every send
is simply skipped, and the web-push / in-app / SMS / email paths keep working.

    pip install google-auth
    export FCM_SERVICE_ACCOUNT_FILE=/path/to/firebase-service-account.json
    # or put the whole JSON in FCM_SERVICE_ACCOUNT_JSON
"""
import json
import os
from typing import Optional, Tuple

import requests
from sqlalchemy.orm import Session

from app.models.device_token import DeviceToken

_SCOPE = "https://www.googleapis.com/auth/firebase.messaging"
_cache: dict = {}


def _load_account() -> Optional[dict]:
    raw = os.environ.get("FCM_SERVICE_ACCOUNT_JSON", "")
    path = os.environ.get("FCM_SERVICE_ACCOUNT_FILE", "")
    try:
        if raw:
            return json.loads(raw)
        if path and os.path.isfile(path):
            with open(path, "r", encoding="utf-8") as handle:
                return json.load(handle)
    except (ValueError, OSError):
        return None
    return None


def is_fcm_configured() -> bool:
    return _load_account() is not None


def _access_token() -> Optional[Tuple[str, str]]:
    account = _load_account()
    if not account:
        return None
    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import Request
    except ImportError:
        return None
    credentials = _cache.get("credentials")
    if credentials is None:
        credentials = service_account.Credentials.from_service_account_info(account, scopes=[_SCOPE])
        _cache["credentials"] = credentials
    if not credentials.valid:
        credentials.refresh(Request())
    return credentials.token, account.get("project_id", "")


def save_device_token(db: Session, owner_type: str, owner_id: int, token: str, platform: str = "android") -> None:
    existing = db.query(DeviceToken).filter(DeviceToken.token == token).first()
    if existing:
        existing.owner_type, existing.owner_id, existing.platform = owner_type, owner_id, platform
    else:
        db.add(DeviceToken(owner_type=owner_type, owner_id=owner_id, token=token, platform=platform))
    db.commit()


def remove_device_token(db: Session, token: str) -> None:
    db.query(DeviceToken).filter(DeviceToken.token == token).delete()
    db.commit()


def fcm_push_to_account(db: Session, owner_type: str, owner_id: int, title: str, body: str, url: str = "/") -> int:
    """Sends to every Android device this account is signed in on. Returns how many sends succeeded."""
    if not is_fcm_configured():
        return 0
    devices = db.query(DeviceToken).filter(DeviceToken.owner_type == owner_type, DeviceToken.owner_id == owner_id).all()
    if not devices:
        return 0
    try:
        auth = _access_token()
    except Exception:  # noqa: BLE001
        return 0
    if not auth or not auth[1]:
        return 0
    access_token, project_id = auth
    endpoint = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
    sent = 0
    for device in devices:
        message = {"message": {
            "token": device.token,
            "notification": {"title": title, "body": body},
            "data": {"url": url},
            "android": {"priority": "HIGH", "notification": {"channel_id": "lifeflow_alerts"}},
        }}
        try:
            response = requests.post(endpoint, json=message, timeout=10,
                                     headers={"Authorization": f"Bearer {access_token}"})
            if response.status_code == 200:
                sent += 1
            elif response.status_code in (404, 400) and "UNREGISTERED" in response.text:
                db.delete(device)  # the app was uninstalled
        except requests.RequestException:
            continue
    db.commit()
    return sent
