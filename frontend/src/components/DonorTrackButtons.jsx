import React, { useEffect, useRef, useState } from "react";
import { setDonorTrackingStatus, postLiveLocation } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import { serverMessage } from "../utils/validators.js";

/** After accepting a request, the donor taps "I am on the way" and later "I have arrived". */
export default function DonorTrackButtons({ requestId }) {
  const { t } = useI18n();
  const [done, setDone] = useState([]);
  const [error, setError] = useState("");

  const watchId = useRef(null);
  const lastSent = useRef(0);

  function stopSharing() {
    if (watchId.current != null && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
  }

  // While "on the way", share the phone's position (at most every 15 seconds) so the patient sees it on the map.
  function startSharing() {
    if (!navigator.geolocation || watchId.current != null) return;
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSent.current < 15000) return;
        lastSent.current = now;
        postLiveLocation(requestId, pos.coords.latitude, pos.coords.longitude).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
  }

  useEffect(() => stopSharing, []);

  async function update(status) {
    setError("");
    try {
      await setDonorTrackingStatus(requestId, status);
      setDone((list) => [...list, status]);
      if (status === "on_the_way") startSharing();
      if (status === "arrived") stopSharing();
    } catch (err) {
      setError(serverMessage(err, "Could not send the update."));
    }
  }

  return (
    <div className="no-print" style={{ marginTop: 8 }}>
      <button type="button" className="btn-outline" disabled={done.includes("on_the_way")} onClick={() => update("on_the_way")}>
        🚗 {done.includes("on_the_way") ? t("Sent: on the way") : t("I am on the way")}
      </button>{" "}
      <button type="button" className="btn-outline" disabled={done.includes("arrived")} onClick={() => update("arrived")}>
        📍 {done.includes("arrived") ? t("Sent: arrived") : t("I have arrived")}
      </button>
      {done.includes("on_the_way") && !done.includes("arrived") && <p className="field-hint">📡 {t("Sharing your live location with the patient. Keep this page open.")}</p>}
      {error && <p className="error-text" role="alert">{error}</p>}
    </div>
  );
}
