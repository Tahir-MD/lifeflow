import React, { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nContext.jsx";
import { getPushStatus, subscribePush, registerDevice } from "../services/api";
import { isNativeApp } from "../platform.js";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/** Android app: ask for permission, get the Firebase token and give it to the server. */
async function enableNative() {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return false;
  await PushNotifications.removeAllListeners();
  await PushNotifications.addListener("registration", (token) => { registerDevice(token.value).catch(() => {}); });
  await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const url = action?.notification?.data?.url;
    if (url && url.startsWith("/")) window.location.assign(url);   // open the screen the alert is about
  });
  await PushNotifications.register();
  return true;
}

/** Lets a signed-in person turn on push alerts: web push in a browser / installed PWA, Firebase in the Android app. */
export default function PushToggle() {
  const { t } = useI18n();
  const [status, setStatus] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const isLoggedIn = Boolean(localStorage.getItem("lifeflow_token"));
  const native = isNativeApp();

  useEffect(() => {
    if (!isLoggedIn) return;
    getPushStatus().then((r) => setStatus(r.data)).catch(() => {});
  }, [isLoggedIn]);

  // Already allowed on this browser? Show "Alerts on" straight away.
  useEffect(() => {
    if (native || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => { if (sub) setEnabled(true); })
      .catch(() => {});
  }, [native]);

  async function enable() {
    try {
      if (native) {
        if (await enableNative()) setEnabled(true);
        return;
      }
      if (!status || !status.configured || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
      if (Notification.permission === "denied") return;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(status.public_key),
      });
      const raw = subscription.toJSON();
      await subscribePush({ endpoint: raw.endpoint, p256dh_key: raw.keys.p256dh, auth_key: raw.keys.auth });
      setEnabled(true);
    } catch (error) {
      // Push isn't available in this browser/context -- silently ignore.
    }
  }

  if (!isLoggedIn || !status) return null;
  if (native ? !status.native_configured : !status.configured) return null;
  return (
    <button className="btn-outline nav-login" style={{ marginTop: 0, padding: "6px 12px" }} onClick={enable} disabled={enabled}>
      {enabled ? t("push.on") : t("push.enable")}
    </button>
  );
}
