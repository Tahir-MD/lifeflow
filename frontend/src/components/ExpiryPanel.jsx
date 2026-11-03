import React, { useEffect, useState } from "react";
import { listMyBatches, addMyBatch, discardMyBatch } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import { serverMessage } from "../utils/validators.js";

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
const COLORS = { ok: "#2e7d32", soon: "#b26a00", critical: "#c62828", expired: "#7a1f2b" };

/** Blood expiry tracking for a hospital: bags are listed oldest-expiry first, with a colour and days left. */
export default function ExpiryPanel() {
  const { t } = useI18n();
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState({ blood_type: "O+", units: 1, collected_on: "", expires_on: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const response = await listMyBatches(false);
      setBatches(response.data);
    } catch (err) {
      setError(serverMessage(err, "Could not load the blood bags."));
    }
  }
  useEffect(() => { load(); }, []);

  async function add(event) {
    event.preventDefault();
    setError(""); setMessage("");
    try {
      await addMyBatch({
        blood_type: form.blood_type,
        units: Number(form.units),
        collected_on: form.collected_on || null,
        expires_on: form.expires_on || null,
      });
      setMessage(t("Bags added."));
      setForm({ ...form, units: 1, collected_on: "", expires_on: "" });
      load();
    } catch (err) {
      setError(serverMessage(err, "Could not add the bags."));
    }
  }

  async function discard(id) {
    if (!window.confirm(t("Throw away these bags? They will be removed from your stock."))) return;
    try { await discardMyBatch(id); load(); } catch (err) { setError(serverMessage(err, "Could not remove the bags.")); }
  }

  const soon = batches.filter((b) => b.urgency === "soon" || b.urgency === "critical" || b.urgency === "expired");

  return (
    <div className="card">
      <h2>{t("Blood expiry dates")}</h2>
      <p className="subtitle">{t("Add bags with their expiry date. Old bags are used first, and you get a warning before they expire.")}</p>

      {soon.length > 0 && (
        <div className="elig-no" role="alert">
          <strong>⚠️ {soon.reduce((n, b) => n + b.units_remaining, 0)} {t("bag(s) expire within 7 days")}</strong>
        </div>
      )}

      <form onSubmit={add} noValidate>
        <label htmlFor="b-type">{t("Blood type")}</label>
        <select id="b-type" value={form.blood_type} onChange={(e) => setForm({ ...form, blood_type: e.target.value })}>
          {BLOOD_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <label htmlFor="b-units">{t("Number of bags")}</label>
        <input id="b-units" type="number" min="1" max="500" value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} />
        <label htmlFor="b-col">{t("Date collected, optional")}</label>
        <input id="b-col" type="date" max={new Date().toISOString().slice(0, 10)} value={form.collected_on} onChange={(e) => setForm({ ...form, collected_on: e.target.value })} />
        <label htmlFor="b-exp">{t("Expiry date, optional")}</label>
        <input id="b-exp" type="date" value={form.expires_on} onChange={(e) => setForm({ ...form, expires_on: e.target.value })} />
        <p className="field-hint">{t("If you leave the expiry empty, we use 35 days after the collection date.")}</p>
        {error && <p className="error-text" role="alert">{error}</p>}
        {message && <p className="success-text" role="status">{message}</p>}
        <button type="submit">{t("Add bags")}</button>
      </form>

      <h3 style={{ marginTop: 18 }}>{t("Bags in stock, oldest first")}</h3>
      {batches.length === 0 && <p className="empty-state">{t("No bags with an expiry date yet.")}</p>}
      {batches.map((b) => (
        <div className="list-row-stack" key={b.id}>
          <div className="list-row-top">
            <div className="meta">
              <span className="badge">{b.blood_type}</span> &nbsp; {b.units_remaining} {t("bags")}
            </div>
            <span style={{ color: COLORS[b.urgency] || "inherit", fontWeight: 600 }}>
              {b.days_left < 0 ? t("Expired") : `${b.days_left} ${t("days left")}`}
            </span>
          </div>
          <div className="empty-state">
            {t("Collected")}: {b.collected_on} · {t("Expires")}: {b.expires_on}{b.source === "transfer" ? ` · ${t("From another hospital")}` : ""}
          </div>
          <button type="button" className="btn-outline no-print" onClick={() => discard(b.id)}>{t("Throw away")}</button>
        </div>
      ))}
    </div>
  );
}
