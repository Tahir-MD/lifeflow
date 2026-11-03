import React, { useState } from "react";
import { setDonorTrackingStatus } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import { serverMessage } from "../utils/validators.js";

/** After accepting a request, the donor taps "I am on the way" and later "I have arrived". */
export default function DonorTrackButtons({ requestId }) {
  const { t } = useI18n();
  const [done, setDone] = useState([]);
  const [error, setError] = useState("");

  async function update(status) {
    setError("");
    try {
      await setDonorTrackingStatus(requestId, status);
      setDone((list) => [...list, status]);
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
      {error && <p className="error-text" role="alert">{error}</p>}
    </div>
  );
}
