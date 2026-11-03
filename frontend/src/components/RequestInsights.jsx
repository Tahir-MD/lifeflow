import React, { useState } from "react";
import { getEtaSuggestions, getResponsePrediction } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import { serverMessage } from "../utils/validators.js";

/** The ambulance / ETA suggestions for one request. */
export function EtaPanel({ requestId }) {
  const { t } = useI18n();
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true); setError("");
    try { setPlan((await getEtaSuggestions(requestId)).data); }
    catch (e) { setError(serverMessage(e, "Could not load suggestions.")); }
    finally { setBusy(false); }
  }
  if (!plan) {
    return (
      <>
        <button type="button" className="inline-btn btn-outline" onClick={load} disabled={busy}>🚑 {busy ? t("Please wait...") : t("Ambulance & travel time")}</button>
        {error && <p className="error-text" role="alert">{t(error)}</p>}
      </>
    );
  }
  return (
    <div className="insight-block">
      <h4>🚑 {t("Ambulance & travel time")}</h4>
      <p className="notice-text">{plan.advice}</p>
      {plan.blood_sources.length > 0 && <h4>{t("Where blood can come from")}</h4>}
      {plan.blood_sources.map((s) => (
        <div className="list-row" key={s.hospital_id}>
          <div className="meta">
            <strong>{s.name}</strong> · {s.distance_km} {t("km")} · ~{s.eta_text}
            {s.has_stock ? <span className="source-tag"> {s.units_in_stock} {t("bag(s) in stock")}</span> : <span className="empty-state"> {t("No stock reported")}</span>}
          </div>
          <span>
            <a href={`tel:${s.phone_number}`}>📞</a>{" "}
            <a href={s.maps_url} target="_blank" rel="noopener noreferrer">🗺️ {t("Map")}</a>
          </span>
        </div>
      ))}
      {plan.donors.length > 0 && <h4>{t("Nearest matching donors")}</h4>}
      {plan.donors.map((d) => (
        <div className="list-row" key={d.donor_id}>
          <div className="meta"><span className="badge">{d.blood_type}</span> {d.name} · {d.distance_km} {t("km")} · ~{d.eta_text}</div>
          {d.maps_url && <a href={d.maps_url} target="_blank" rel="noopener noreferrer">🗺️ {t("Map")}</a>}
        </div>
      ))}
      {plan.ambulances.length > 0 && <h4>{t("Ambulance numbers")}</h4>}
      {plan.ambulances.map((a) => (
        <div className="list-row" key={a.name + a.phone_number}>
          <div className="meta">{a.name}{a.city ? ` · ${a.city}` : ""}{a.is_24h ? ` · ${t("24/7")}` : ""}</div>
          <a href={`tel:${a.phone_number}`}>📞 {a.phone_number}</a>
        </div>
      ))}
      {plan.blood_banks.map((a) => (
        <div className="list-row" key={a.name + a.phone_number}>
          <div className="meta">🩸 {a.name}{a.city ? ` · ${a.city}` : ""}</div>
          <a href={`tel:${a.phone_number}`}>📞 {a.phone_number}</a>
        </div>
      ))}
      <p className="empty-state">{t(plan.assumptions)}</p>
    </div>
  );
}

/** Which donors are most likely to say yes, and how fast. */
export function ResponsePanel({ requestId }) {
  const { t } = useI18n();
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true); setError("");
    try { setPlan((await getResponsePrediction(requestId)).data); }
    catch (e) { setError(serverMessage(e, "Could not load suggestions.")); }
    finally { setBusy(false); }
  }
  if (!plan) {
    return (
      <>
        <button type="button" className="inline-btn btn-outline" onClick={load} disabled={busy}>🎯 {busy ? t("Please wait...") : t("Who will respond?")}</button>
        {error && <p className="error-text" role="alert">{t(error)}</p>}
      </>
    );
  }
  const speedLabel = { fast: "fast reply", normal: "normal reply", slow: "slow reply" };
  return (
    <div className="insight-block">
      <h4>🎯 {t("Donors most likely to respond")}</h4>
      <p className="notice-text">
        {t("Alert the first")} {plan.alert_first_count} {t("donor(s): about")} {plan.expected_acceptances} {t("are expected to say yes for")} {plan.units_still_needed} {t("bag(s) needed.")}
      </p>
      {plan.likely_responders.length === 0 && <p className="empty-state">{t("No eligible donor nearby yet.")}</p>}
      {plan.likely_responders.map((d) => (
        <div className="list-row-stack" key={d.donor_id}>
          <div className="list-row-top">
            <div className="meta"><span className="badge">{d.blood_type}</span> {d.name} · {d.distance_km} {t("km")} · {d.phone_number}</div>
            <span><span className="prob-bar"><span style={{ width: `${Math.round(d.probability * 100)}%` }} /></span>{Math.round(d.probability * 100)}% · {t(speedLabel[d.speed])}</span>
          </div>
          <div className="empty-state">{d.reasons.join(" · ")}</div>
        </div>
      ))}
      <p className="empty-state">{t(plan.note)}</p>
    </div>
  );
}

/** Both buttons side by side, for a request row. */
export default function RequestInsights({ requestId, showResponse = true }) {
  return (
    <div className="request-insights">
      <EtaPanel requestId={requestId} />
      {showResponse && <ResponsePanel requestId={requestId} />}
    </div>
  );
}
