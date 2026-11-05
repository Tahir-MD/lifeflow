"""
Optional link to outside systems (a hospital information system, a blood-bank register, a ministry dashboard...).
Set LIFEFLOW_WEBHOOK_URL and every important event (the same ones kept in the audit log) is also POSTed there as JSON.
If LIFEFLOW_WEBHOOK_SECRET is set, each call carries an X-LifeFlow-Signature header: HMAC-SHA256 of the body.
It never slows down or breaks the app: it runs in the background and ignores failures.
"""
import hashlib
import hmac
import json
import os
import threading
from datetime import datetime

import requests


def emit(event_type: str, actor_type, actor_id, payload) -> None:
    url = os.environ.get("LIFEFLOW_WEBHOOK_URL", "").strip()
    if not url:
        return
    body = json.dumps({
        "event": event_type, "actor_type": actor_type, "actor_id": actor_id,
        "payload": payload or {}, "sent_at": datetime.utcnow().isoformat() + "Z",
    }, default=str)
    headers = {"Content-Type": "application/json"}
    secret = os.environ.get("LIFEFLOW_WEBHOOK_SECRET", "")
    if secret:
        headers["X-LifeFlow-Signature"] = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()

    def _send():
        try:
            requests.post(url, data=body, headers=headers, timeout=4)
        except Exception:
            pass

    threading.Thread(target=_send, daemon=True).start()
