import React, { useState } from "react";
import { previewBulk, sendBulk } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import { serverMessage } from "../utils/validators.js";

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

/** Send one message to many donors, chosen by blood group and place. Phone numbers are never shown. */
export default function BulkMessagePanel() {
  const { t } = useI18n();
  const [types, setTypes] = useState([]);
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [onlyReady, setOnlyReady] = useState(true);
  const [channel, setChannel] = useState("app");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const filter = { blood_types: types, city: city.trim() || null, area: area.trim() || null, only_ready_now: onlyReady };

  function toggle(type) {
    setTypes(types.includes(type) ? types.filter((x) => x !== type) : [...types, type]);
    setPreview(null);
  }

  async function count() {
    setError(""); setResult(null);
    try { setPreview((await previewBulk(filter)).data); } catch (err) { setError(serverMessage(err, "Could not count donors.")); }
  }

  async function send() {
    setError(""); setResult(null);
    if (!window.confirm(`${t("Send this message to")} ${preview ? preview.count : "?"} ${t("donors")}?`)) return;
    setBusy(true);
    try {
      setResult((await sendBulk({ ...filter, message: text, channel })).data);
      setText(""); setPreview(null);
    } catch (err) { setError(serverMessage(err, "Could not send the message.")); }
    finally { setBusy(false); }
  }

  return (
    <div className="card">
      <h2>{t("Message donors")}</h2>
      <p className="subtitle">{t("Reach donors by blood group and place, for example before a camp or in a shortage. Only donors who can donate now are included.")}</p>

      <div role="group" aria-label={t("Blood type")}>
        <span className="field-hint">{t("Blood groups (choose none for all)")}</span>
        <div className="chip-row">
          {BLOOD_TYPES.map((b) => (
            <button key={b} type="button" className={`lang-chip ${types.includes(b) ? "active" : ""}`} aria-pressed={types.includes(b)} onClick={() => toggle(b)}>{b}</button>
          ))}
        </div>
      </div>
      <label htmlFor="bm-city">{t("City, optional")}</label>
      <input id="bm-city" value={city} maxLength={80} onChange={(e) => { setCity(e.target.value); setPreview(null); }} />
      <label htmlFor="bm-area">{t("Area / Town / Colony")} ({t("optional")})</label>
      <input id="bm-area" value={area} maxLength={80} onChange={(e) => { setArea(e.target.value); setPreview(null); }} />
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={onlyReady} onChange={(e) => { setOnlyReady(e.target.checked); setPreview(null); }} style={{ width: "auto" }} />
        {t("Only donors who can donate now")}
      </label>
      <button type="button" className="btn-outline" onClick={count}>{t("Count donors")}</button>
      {preview && <p className="notice-text">{preview.count} {t("donors will receive this message.")}</p>}

      <label htmlFor="bm-text">{t("Your message")}</label>
      <textarea id="bm-text" rows={3} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} />
      <p className="field-hint">{text.length}/300</p>
      <label htmlFor="bm-channel">{t("How to send")}</label>
      <select id="bm-channel" value={channel} onChange={(e) => setChannel(e.target.value)}>
        <option value="app">{t("App notification")}</option>
        <option value="sms">SMS</option>
        <option value="whatsapp">WhatsApp</option>
      </select>
      {error && <p className="error-text" role="alert">{error}</p>}
      {result && <p className="success-text" role="status">✅ {t("Sent to")} {result.recipients} {t("donors")}.</p>}
      <button type="button" onClick={send} disabled={busy || text.trim().length < 5 || !preview || preview.count === 0}>
        {busy ? t("Please wait...") : t("Send message")}
      </button>
    </div>
  );
}
