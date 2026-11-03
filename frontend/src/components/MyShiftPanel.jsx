import React, { useEffect, useState } from "react";
import { requestShiftChange, getMyShiftChanges } from "../services/api";
import { SHIFT_CHOICES, DEFAULT_SHIFT_TIMES } from "../shiftUtils";
import { useI18n } from "../i18n/I18nContext.jsx";

/** Staff: see my duty time (from - to) and ask the hospital for a different shift. */
export default function MyShiftPanel({ profile, onChanged }) {
  const { t } = useI18n();
  const [changes, setChanges] = useState([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    requested_shift: SHIFT_CHOICES[0],
    requested_start: DEFAULT_SHIFT_TIMES[SHIFT_CHOICES[0]][0],
    requested_end: DEFAULT_SHIFT_TIMES[SHIFT_CHOICES[0]][1],
    reason: "",
  });

  async function load() {
    try { setChanges((await getMyShiftChanges()).data); if (onChanged) onChanged(); } catch (error) { setChanges([]); }
  }
  useEffect(() => { load(); }, []);

  function pick(shift) {
    setForm({ ...form, requested_shift: shift, requested_start: DEFAULT_SHIFT_TIMES[shift][0], requested_end: DEFAULT_SHIFT_TIMES[shift][1] });
  }
  async function send(event) {
    event.preventDefault();
    setMessage("");
    try {
      await requestShiftChange(form);
      setMessage(t("Your shift change request was sent to your hospital. You will see their answer here."));
      setForm({ ...form, reason: "" });
      load();
    } catch (error) {
      const detail = error.response && error.response.data && error.response.data.detail;
      setMessage(typeof detail === "string" ? detail : t("Could not send the request. Please try again."));
    }
  }

  return (
    <>
      <div className="card">
        <h2>{t("My duty time")}</h2>
        <p className="subtitle">{profile ? (profile.shift_label || profile.shift) : ""}</p>
        <p className="empty-state">{t("You work during these hours. To change them, send a request below. Your hospital will confirm or reject it.")}</p>
      </div>
      <div className="card">
        <h2>{t("Ask for a shift change")}</h2>
        {message && <p className="notice-text">{message}</p>}
        <form onSubmit={send}>
          <label>{t("New shift")}</label>
          <select value={form.requested_shift} onChange={(e) => pick(e.target.value)}>
            {SHIFT_CHOICES.map((sh) => <option key={sh} value={sh}>{sh}</option>)}
          </select>
          <label>{t("From time")}</label>
          <input type="time" value={form.requested_start} onChange={(e) => setForm({ ...form, requested_start: e.target.value })} required />
          <label>{t("To time")}</label>
          <input type="time" value={form.requested_end} onChange={(e) => setForm({ ...form, requested_end: e.target.value })} required />
          <label>{t("Reason, optional")}</label>
          <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <button type="submit">{t("Send request to hospital")}</button>
        </form>
      </div>
      <div className="card">
        <h2>{t("My requests")}</h2>
        {changes.length === 0 && <p className="empty-state">{t("No shift change requests yet.")}</p>}
        {changes.map((c) => (
          <div className="list-row-stack" key={c.id}>
            <div className="list-row-top">
              <div className="meta">{c.requested_label}</div>
              <span className="badge">{c.status === "pending" ? t("Waiting for hospital") : c.status === "approved" ? t("Confirmed") : t("Rejected")}</span>
            </div>
            {c.reason && <div className="empty-state">{c.reason}</div>}
          </div>
        ))}
      </div>
    </>
  );
}
