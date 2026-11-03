import React, { useEffect, useState } from "react";
import { listDonorsToScreen, screenDonor } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import { serverMessage } from "../utils/validators.js";

/** For doctors: donors waiting for a medical check. Clear them to donate, or mark them not eligible. */
export default function ScreeningPanel() {
  const { t } = useI18n();
  const [donors, setDonors] = useState([]);
  const [notes, setNotes] = useState({});
  const [error, setError] = useState("");

  async function load() {
    try { setDonors((await listDonorsToScreen()).data); } catch (err) { setError(serverMessage(err, "Could not load the list.")); }
  }
  useEffect(() => { load(); }, []);

  async function decide(id, decision) {
    setError("");
    try { await screenDonor(id, decision, notes[id]); load(); } catch (err) { setError(serverMessage(err, "Could not do this.")); }
  }

  return (
    <div className="card">
      <h2>🩺 {t("Donor medical screening")}</h2>
      <p className="subtitle">{t("Check each donor's answers and details, then clear them to donate or mark them not eligible.")}</p>
      {error && <p className="error-text" role="alert">{error}</p>}
      {donors.length === 0 && <p className="empty-state">{t("No donors waiting for clearance.")}</p>}
      {donors.map((d) => (
        <div className="list-row-stack" key={d.id}>
          <div className="list-row-top">
            <div className="meta"><span className="badge">{d.blood_type}</span> &nbsp;{d.full_name}</div>
            <span className="distance">{d.phone_number}</span>
          </div>
          <div className="empty-state">
            {[d.age ? `${t("Age")} ${d.age}` : null, d.gender ? t(d.gender === "female" ? "Female" : "Male") : null, d.weight_kg ? `${d.weight_kg} kg` : null, [d.area, d.city].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
          </div>
          <input value={notes[d.id] || ""} maxLength={300} placeholder={t("Note, optional")} onChange={(e) => setNotes({ ...notes, [d.id]: e.target.value })} aria-label={t("Note, optional")} />
          <button type="button" onClick={() => decide(d.id, "clear")}>{t("Clear to donate")}</button>{" "}
          <button type="button" className="btn-outline" onClick={() => decide(d.id, "flag")}>{t("Not eligible now")}</button>
        </div>
      ))}
    </div>
  );
}
