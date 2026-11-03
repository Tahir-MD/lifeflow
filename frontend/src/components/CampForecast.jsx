import React, { useState } from "react";
import { getCampForecast } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import { serverMessage } from "../utils/validators.js";

const STAFF_LABELS = {
  phlebotomists: "Blood-taking nurses / phlebotomists",
  screening_doctors_or_nurses: "Screening doctors or nurses",
  registration_desk: "Registration desk",
  volunteers: "Volunteers",
};

/** "How many will come and what do we need?" for one camp. */
export default function CampForecast({ campId }) {
  const { t } = useI18n();
  const [hours, setHours] = useState(6);
  const [f, setF] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true); setError("");
    try { setF((await getCampForecast(campId, hours)).data); }
    catch (e) { setError(serverMessage(e, "Could not load the forecast.")); }
    finally { setBusy(false); }
  }

  return (
    <div className="no-print">
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className="inline-btn btn-outline" onClick={load} disabled={busy}>📈 {busy ? t("Please wait...") : t("Predict turnout & staff")}</button>
        <label style={{ margin: 0, fontSize: "13px" }}>{t("Camp hours")}
          <input type="number" min="2" max="12" value={hours} onChange={(e) => setHours(Number(e.target.value) || 6)} style={{ width: "64px", marginInlineStart: "6px" }} />
        </label>
      </div>
      {error && <p className="error-text" role="alert">{t(error)}</p>}
      {f && (
        <div className="insight-block">
          <div className="stat-row">
            <div className="stat"><div className="figure">{f.expected_turnout}</div><div className="label">{t("expected donors")} ({f.range_low}–{f.range_high})</div></div>
            <div className="stat"><div className="figure">{f.expected_bags}</div><div className="label">{t("bags expected")}</div></div>
            <div className="stat"><div className="figure">{f.beds}</div><div className="label">{t("beds / chairs")}</div></div>
            <div className="stat"><div className="figure">{f.staff_total}</div><div className="label">{t("staff needed")}</div></div>
          </div>
          <table className="simple-table">
            <tbody>
              {Object.entries(f.staff).map(([k, v]) => <tr key={k}><td>{t(STAFF_LABELS[k] || k)}</td><td><strong>{v}</strong></td></tr>)}
            </tbody>
          </table>
          <p className="empty-state">
            {f.registered} {t("registered")} · {f.nearby_eligible_donors} {t("eligible donors within 15 km")} · {t("show-up rate used")} {Math.round(f.show_rate_used * 100)}%
          </p>
          {f.notes.map((n) => <p className="empty-state" key={n}>💡 {t(n)}</p>)}
        </div>
      )}
    </div>
  );
}
