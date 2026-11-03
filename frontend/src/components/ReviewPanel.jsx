import React, { useEffect, useState } from "react";
import { listRequestsToReview, approveReviewedRequest, rejectReviewedRequest, runReminderJob, runExpirySweepJob } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import { serverMessage } from "../utils/validators.js";

/** Admin: requests the fake-request check held or flagged, with the reasons, plus two background-job buttons. */
export default function ReviewPanel() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function load() {
    try { setItems((await listRequestsToReview()).data); } catch (err) { setError(serverMessage(err, "Could not load the list.")); }
  }
  useEffect(() => { load(); }, []);

  async function decide(fn, id) {
    setError("");
    try { await fn(id); load(); } catch (err) { setError(serverMessage(err, "Could not do this.")); }
  }

  async function job(fn, label) {
    setInfo(""); setError("");
    try { setInfo(`${t(label)}: ${JSON.stringify((await fn()).data)}`); } catch (err) { setError(serverMessage(err, "Could not run this.")); }
  }

  return (
    <div className="card">
      <h2>{t("Request review")}</h2>
      <p className="subtitle">{t("Requests that look fake or unusual. Held requests are not shown to donors until you approve them.")}</p>
      {error && <p className="error-text" role="alert">{error}</p>}
      {items.length === 0 && <p className="empty-state">{t("Nothing to review right now.")}</p>}
      {items.map(({ request: r, fraud_score: score, reasons, review_status: status }) => (
        <div className="list-row-stack" key={r.id}>
          <div className="list-row-top">
            <div className="meta">
              <span className={status === "held" ? "tag-hospital" : "tag-receiver"}>{status === "held" ? t("Held") : t("Flagged")}</span>
              &nbsp;<span className="badge">{r.blood_type_needed}</span> &nbsp;{r.units_needed} {t("bags")} · {r.requester_name} {r.is_sos ? "· 🚨 SOS" : ""}
            </div>
            <span className="distance">{t("Risk")} {score}/100</span>
          </div>
          <ul className="timeline-events">{reasons.map((x, i) => <li key={i}>{x}</li>)}</ul>
          <div className="empty-state">{r.patient_name ? `${t("Patient")}: ${r.patient_name} · ` : ""}{r.medical_reason || ""}</div>
          <button type="button" onClick={() => decide(approveReviewedRequest, r.id)}>{t("Approve")}</button>{" "}
          <button type="button" className="btn-outline" onClick={() => decide(rejectReviewedRequest, r.id)}>{t("Reject")}</button>
        </div>
      ))}
      <h3 style={{ marginTop: 18 }}>{t("Background jobs")}</h3>
      <p className="field-hint">{t("These run by themselves every hour. You can also run them now.")}</p>
      <button type="button" className="btn-outline" onClick={() => job(runReminderJob, "Donation reminders")}>{t("Send donation reminders now")}</button>{" "}
      <button type="button" className="btn-outline" onClick={() => job(runExpirySweepJob, "Expiry check")}>{t("Check expired blood now")}</button>
      {info && <p className="notice-text">{info}</p>}
    </div>
  );
}
