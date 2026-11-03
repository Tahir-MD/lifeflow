import React, { useEffect, useState } from "react";
import { getAllHospitalsVerification, approveHospital, rejectHospitalWithReason, getAllFeedback, runChecksNow } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import VerifiedBadge from "./VerifiedBadge.jsx";

/** Admin: check every hospital's license, read app feedback, and run the expiry / reminder checks now. */
export default function AdminExtrasPanel() {
  const { t } = useI18n();
  const [hospitals, setHospitals] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [note, setNote] = useState("");

  async function load() {
    try { setHospitals((await getAllHospitalsVerification()).data); } catch (error) { setHospitals([]); }
    try { setFeedback((await getAllFeedback()).data); } catch (error) { setFeedback([]); }
  }
  useEffect(() => { load(); }, []);

  async function approve(id) { try { await approveHospital(id); load(); } catch (error) { setNote(t("Could not save. Please try again.")); } }
  async function reject(id) {
    const reason = window.prompt(t("Why is this license not accepted? (the hospital will see this)"));
    if (reason === null) return;
    try { await rejectHospitalWithReason(id, reason); load(); } catch (error) { setNote(t("Could not save. Please try again.")); }
  }
  async function runChecks() {
    try { await runChecksNow(); setNote(t("Checks finished: blood expiry and donor reminders.")); } catch (error) { setNote(t("Could not run the checks.")); }
  }

  const avg = feedback.length ? (feedback.reduce((sum, f) => sum + f.stars, 0) / feedback.length).toFixed(1) : null;

  return (
    <>
      <div className="card">
        <h2>{t("Hospital verification")}</h2>
        <p className="subtitle">{t("Check each license number. A verified hospital shows a Verified badge to donors and patients.")}</p>
        {note && <p className="notice-text">{note}</p>}
        {hospitals.length === 0 && <p className="empty-state">{t("No hospitals yet.")}</p>}
        {hospitals.map((h) => (
          <div className="list-row-stack" key={h.id}>
            <div className="list-row-top">
              <div className="meta">{h.name} <VerifiedBadge verified={h.is_verified} /></div>
              <span>
                {!h.is_verified && <button className="inline-btn" onClick={() => approve(h.id)}>{t("Verify")}</button>}
                {" "}
                <button className="inline-btn btn-outline" onClick={() => reject(h.id)}>{h.is_verified ? t("Remove verification") : t("Reject")}</button>
              </span>
            </div>
            <div className="empty-state">{t("License")}: {h.license_number} · {h.email} · {h.phone}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>{t("Blood expiry and reminders")}</h2>
        <p className="subtitle">{t("These checks also run by themselves every 30 minutes.")}</p>
        <button className="inline-btn" onClick={runChecks}>{t("Run checks now")}</button>
      </div>

      <div className="card">
        <h2>{t("App feedback")}{avg ? ` · ★ ${avg} (${feedback.length})` : ""}</h2>
        {feedback.length === 0 && <p className="empty-state">{t("No feedback yet.")}</p>}
        {feedback.map((f) => (
          <div className="list-row-stack" key={f.id}>
            <div className="list-row-top">
              <div className="meta">{"★".repeat(f.stars)} · {f.user_name || f.user_type} <span className="badge">{f.user_type}</span></div>
              <span className="distance">{new Date(f.created_at).toLocaleString()}</span>
            </div>
            {f.comment && <div className="empty-state">{f.comment}</div>}
          </div>
        ))}
      </div>
    </>
  );
}
