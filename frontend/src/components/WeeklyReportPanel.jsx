import React, { useEffect, useState } from "react";
import { downloadWeeklyReport, generateWeeklyReport, getWeeklyReport, getWeeklyReportHistory } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import { serverMessage } from "../utils/validators.js";
import { canSpeak, speak, stopSpeaking } from "../utils/speech.js";

/** The automatic weekly report: a plain-language summary plus the numbers, printable and downloadable. */
export default function WeeklyReportPanel() {
  const { t, language } = useI18n();
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function load() {
    getWeeklyReport().then((r) => setReport(r.data.empty ? null : r.data)).catch(() => {});
    getWeeklyReportHistory().then((r) => setHistory(r.data)).catch(() => {});
  }
  useEffect(() => { load(); return () => stopSpeaking(); }, []);

  async function makeNow() {
    setBusy(true); setError("");
    try { setReport((await generateWeeklyReport()).data); getWeeklyReportHistory().then((r) => setHistory(r.data)).catch(() => {}); }
    catch (e) { setError(serverMessage(e, "Could not make the report.")); }
    finally { setBusy(false); }
  }
  async function download(format) {
    try { await downloadWeeklyReport(report.id, format); } catch (e) { setError("Could not download the report."); }
  }

  const s = report && report.stats;
  return (
    <div className="card">
      <div className="list-row-top">
        <h2>{t("Weekly report")}</h2>
        <span className="no-print" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button type="button" onClick={makeNow} disabled={busy}>{busy ? t("Please wait...") : t("Make this week's report now")}</button>
          <button type="button" className="btn-outline" onClick={() => window.print()} disabled={!report}>🖨️ {t("Print")}</button>
        </span>
      </div>
      <p className="subtitle">{t("A new report is written automatically every week. It uses real numbers from the app, then explains them in plain words.")}</p>
      {error && <p className="error-text" role="alert">{t(error)}</p>}
      {!report && <p className="empty-state">{t("No report yet. Press the button to make the first one.")}</p>}
      {report && (
        <>
          <p className="empty-state">{s.period_start} → {s.period_end} · {report.narrative_source === "ai" ? t("written by AI from the numbers") : t("written from the numbers")}</p>
          <p className="report-text notice-text">{report.narrative}</p>
          <div className="no-print" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="button" className="btn-outline" onClick={() => download("xlsx")}>📊 {t("Download Excel")}</button>
            <button type="button" className="btn-outline" onClick={() => download("pdf")}>📄 {t("Download PDF")}</button>
            {canSpeak() && <button type="button" className="btn-outline" onClick={() => speak(report.narrative, language)}>🔊 {t("Listen")}</button>}
          </div>
          <div className="stat-row">
            <div className="stat"><div className="figure">{s.requests}</div><div className="label">{t("requests")} ({t("last week")}: {s.requests_previous_period})</div></div>
            <div className="stat"><div className="figure">{s.fulfilled}</div><div className="label">{t("fully covered")}</div></div>
            <div className="stat"><div className="figure">{s.units_fulfilled}/{s.units_requested}</div><div className="label">{t("bags supplied / needed")}</div></div>
            <div className="stat"><div className="figure">{s.donations}</div><div className="label">{t("donations")}</div></div>
          </div>
          {s.low_stock.length > 0 && <p className="error-text">⚠️ {t("Low stock")}: {s.low_stock.map((x) => `${x.blood_type} (${x.units})`).join(", ")}</p>}
          {s.expiring_soon.length > 0 && <p className="error-text">⏳ {t("Expiring within a week")}: {s.expiring_soon.map((x) => `${x.blood_type} ×${x.units}`).join(", ")}</p>}
        </>
      )}
      {history.length > 1 && (
        <details className="no-print" style={{ marginTop: "10px" }}>
          <summary>{t("Earlier reports")}</summary>
          {history.slice(1).map((h) => (
            <div className="list-row-stack" key={h.id}>
              <div className="meta">{h.stats.period_start} → {h.stats.period_end} · {h.stats.requests} {t("requests")}</div>
              <div className="empty-state">{h.narrative}</div>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
