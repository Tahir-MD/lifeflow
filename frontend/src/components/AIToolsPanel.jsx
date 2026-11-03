import React, { useEffect, useState } from "react";
import {
  getAllocation, getForecastAccuracy, getImpact, getNoShowPlan, askDataAssistant, verifyDocument,
} from "../services/api";
import ForecastPanel from "./ForecastPanel.jsx";
import WeeklyReportPanel from "./WeeklyReportPanel.jsx";
import RequestInsights from "./RequestInsights.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

/** Impact numbers: measured counts plus clearly-labelled estimates. */
export function ImpactCard() {
  const { t } = useI18n();
  const [impact, setImpact] = useState(null);
  useEffect(() => { getImpact().then((r) => setImpact(r.data)).catch(() => {}); }, []);
  if (!impact) return null;
  return (
    <div className="card">
      <h2>{t("Impact of stock-check-first")}</h2>
      <div className="stat-row">
        <div className="stat"><div className="figure">{impact.requests_helped_by_stock}</div><div className="label">{t("requests helped by stock")}</div></div>
        <div className="stat"><div className="figure">{impact.units_supplied_from_stock}</div><div className="label">{t("bags from stock")}</div></div>
        <div className="stat"><div className="figure">{impact.estimated_donor_callouts_avoided}</div><div className="label">{t("donor call-outs avoided (est.)")}</div></div>
        <div className="stat"><div className="figure">{impact.estimated_coordinator_hours_saved}</div><div className="label">{t("coordinator hours saved (est.)")}</div></div>
      </div>
      <p className="empty-state">{impact.assumptions}</p>
    </div>
  );
}

export function AllocationCard() {
  const { t } = useI18n();
  const [plan, setPlan] = useState(null);
  return (
    <div className="card">
      <h2>{t("Optimised donor allocation")}</h2>
      <p className="subtitle">{t("Assigns donors across ALL open requests at once, so no donor is double-booked and emergencies come first.")}</p>
      <button onClick={() => getAllocation().then((r) => setPlan(r.data)).catch(() => {})}>{t("Run allocation")}</button>
      {plan && (
        <>
          <p className="notice-text">{t("{covered} of {needed} bags covered ({percent}%) across {open} open request(s).", { covered: plan.units_covered, needed: plan.units_needed, percent: plan.coverage_percent, open: plan.open_requests })}</p>
          <p className="empty-state">{plan.method}</p>
          {plan.assignments.map((a) => (
            <div className="list-row-stack" key={a.request_id}>
              <div className="meta"><span className="badge">{a.blood_type}</span> {t("Request #")}{a.request_id} · {a.urgency} · {a.units_covered}/{a.units_needed} {t("covered")}</div>
              {a.assigned_donors.map((d) => (
                <div className="empty-state" key={d.donor_id}>{d.name} · {d.distance_km} {t("km · score")} {d.score} · {t("no-show risk")} {Math.round((d.no_show_risk || 0) * 100)}%</div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export function NoShowCard() {
  const { t } = useI18n();
  const [requestId, setRequestId] = useState("");
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  async function run() {
    setError(""); setPlan(null);
    try { setPlan((await getNoShowPlan(requestId)).data); } catch (e) { setError("Couldn't load that request."); }
  }
  return (
    <div className="card">
      <h2>{t("Donor no-show planner")}</h2>
      <p className="subtitle">{t("Predicts who is likely to follow through and how many donors to alert so enough actually turn up.")}</p>
      <input placeholder={t("Request number")} value={requestId} onChange={(e) => setRequestId(e.target.value)} />
      <button onClick={run}>{t("Plan outreach")}</button>
      {error && <p className="error-text">{t(error)}</p>}
      {plan && (
        <>
          <p className="notice-text">
            {t("Alert {count} donor(s). Expected arrivals: {arrivals}. Still needed: {units} bag(s). Eligible nearby: {available}.", { count: plan.recommended_alert_count, arrivals: plan.expected_arrivals, units: plan.units_still_needed, available: plan.donors_available })}{plan.shortfall_risk ? ` ${t("Shortfall risk: not enough reliable donors nearby.")}` : ""}
          </p>
          {plan.donors_to_alert.map((d) => (
            <div className="list-row" key={d.donor_id}>
              <div className="meta"><span className="badge">{d.blood_type}</span> {d.full_name} · {d.distance_kilometers} {t("km")} · {d.phone_number}</div>
              <span className="empty-state">{t("no-show risk")} {Math.round((d.no_show_risk || 0) * 100)}%</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export function AccuracyCard() {
  const { t } = useI18n();
  const [acc, setAcc] = useState(null);
  return (
    <div className="card">
      <h2>{t("Forecast accuracy (backtest)")}</h2>
      <p className="subtitle">{t("How well the shortage forecaster would have predicted the last 3 weeks, versus a naive baseline.")}</p>
      <button onClick={() => getForecastAccuracy().then((r) => setAcc(r.data)).catch(() => {})}>{t("Run backtest")}</button>
      {acc && (
        <>
          <p className="notice-text">
            {acc.model}{t(": MAE")} {acc.overall_model_mae ?? "—"} {t("bags/day")} · {acc.baseline}{t(": MAE")} {acc.overall_naive_mae ?? "—"} ·
            {t("improvement")} {acc.improvement_over_baseline_percent ?? "—"}%
          </p>
          <p className="empty-state">{acc.note}</p>
        </>
      )}
    </div>
  );
}

/** Plain-language questions about your own hospital's data. */
export function DataAssistantCard() {
  const { t } = useI18n();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  async function ask() {
    if (!question.trim()) return;
    setBusy(true); setAnswer("");
    try { setAnswer((await askDataAssistant(question)).data.reply); }
    catch (e) { setAnswer("Couldn't get an answer right now."); }
    finally { setBusy(false); }
  }
  return (
    <div className="card">
      <h2>{t("Ask your data")}</h2>
      <p className="subtitle">{t("e.g. \"How many O+ bags do we have?\", \"Which blood type had the most requests this month?\"")}</p>
      <input placeholder={t("Ask a question about your hospital's data")} value={question} onChange={(e) => setQuestion(e.target.value)} />
      <button onClick={ask} disabled={busy}>{busy ? "Thinking..." : "Ask"}</button>
      {answer && <p className="notice-text" style={{ whiteSpace: "pre-wrap" }}>{answer}</p>}
    </div>
  );
}

/** AI (vision) document check: CNIC or hospital licence photo vs the number typed. Suggests only. */
export function DocumentVerifier() {
  const { t } = useI18n();
  const [docType, setDocType] = useState("licence");
  const [claimed, setClaimed] = useState("");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!file || !claimed) return;
    setBusy(true); setResult(null);
    try { setResult((await verifyDocument(docType, claimed, file)).data); }
    catch (e) { setResult({ needs_manual_review: true, note: "Upload failed." }); }
    finally { setBusy(false); }
  }
  return (
    <div className="card">
      <h2>{t("AI document check")}</h2>
      <p className="subtitle">{t("Upload a photo of a CNIC or hospital licence. AI reads the number and compares it — a human still makes the final call.")}</p>
      <select value={docType} onChange={(e) => setDocType(e.target.value)}>
        <option value="licence">{t("Hospital licence")}</option>
        <option value="cnic">{t("CNIC")}</option>
      </select>
      <input placeholder={t("Number as typed at registration")} value={claimed} onChange={(e) => setClaimed(e.target.value)} />
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={run} disabled={busy}>{busy ? "Reading..." : "Check document"}</button>
      {result && (
        <p className={result.matches_claim ? "notice-text" : "error-text"}>
          {result.extracted_number ? `${t("Read")}: ${result.extracted_number}. ` : ""}{result.note}
          {result.needs_manual_review ? " → Needs manual review." : " → Looks consistent."}
        </p>
      )}
    </div>
  );
}

/** Pick any request number to see ambulance / travel-time suggestions and which donors will most likely respond. */
export function RequestInsightsCard() {
  const { t } = useI18n();
  const [requestId, setRequestId] = useState("");
  const [shown, setShown] = useState(null);
  return (
    <div className="card">
      <h2>{t("Ambulance, travel time & likely responders")}</h2>
      <p className="subtitle">{t("Type a request number to see the fastest way to get blood, ambulance numbers, and which donors are most likely to say yes.")}</p>
      <input placeholder={t("Request number")} value={requestId} onChange={(e) => { setRequestId(e.target.value.replace(/\D/g, "")); setShown(null); }} />
      <button type="button" onClick={() => requestId && setShown(requestId)}>{t("Show suggestions")}</button>
      {shown && <RequestInsights key={shown} requestId={shown} />}
    </div>
  );
}

/** Everything for the hospital "AI tools" tab. */
export default function AIToolsPanel() {
  return (
    <div>
      <WeeklyReportPanel />
      <RequestInsightsCard />
      <DataAssistantCard />
      <ImpactCard />
      <AllocationCard />
      <NoShowCard />
      <ForecastPanel scope="hospital" />
      <AccuracyCard />
    </div>
  );
}
