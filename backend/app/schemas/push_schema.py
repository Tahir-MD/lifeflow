from pydantic import BaseModel


class PushSubscribeIn(BaseModel):
    endpoint: str
    p256dh_key: str
    auth_key: str


class PushUnsubscribeIn(BaseModel):
    endpoint: str


class PushStatusOut(BaseModel):
    configured: bool
    public_key: str = ""
    native_configured: bool = False


class DeviceRegisterIn(BaseModel):
    token: str
    platform: str = "android"


class DeviceUnregisterIn(BaseModel):
    token: str
