import React, { useEffect, useState } from "react";
import {
  addEmergencyContact, listMyEmergencyContacts, listEmergencyContacts, listPendingEmergencyContacts,
  approveEmergencyContact, deleteEmergencyContact,
} from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import { serverMessage } from "../utils/validators.js";
import { CATEGORY_LABELS } from "../pages/EmergencyDirectory.jsx";

/**
 * Add, approve and remove emergency contacts.
 * role="admin": sees every approved entry and the ones waiting for approval.
 * role="hospital": adds its own ambulance / blood bank numbers (shown at once if the hospital is verified).
 */
export default function DirectoryManager({ role }) {
  const { t } = useI18n();
  const [mine, setMine] = useState([]);
  const [pending, setPending] = useState([]);
  const [form, setForm] = useState({ name: "", category: "ambulance", phone_number: "", city: "", area: "", notes: "", is_24h: true, is_national: false });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      if (role === "admin") {
        setMine((await listEmergencyContacts()).data);
        setPending((await listPendingEmergencyContacts()).data);
      } else {
        setMine((await listMyEmergencyContacts()).data);
      }
    } catch (err) {
      setError(serverMessage(err, "Could not load the list."));
    }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function set(name, value) { setForm({ ...form, [name]: value }); }

  async function add(event) {
    event.preventDefault();
    setError(""); setMessage("");
    try {
      const response = await addEmergencyContact({
        ...form, city: form.city.trim() || null, area: form.area.trim() || null, notes: form.notes.trim() || null,
      });
      setMessage(response.data.is_approved ? t("Contact added.") : t("Contact added. It will be shown after the admin approves it."));
      setForm({ ...form, name: "", phone_number: "", area: "", notes: "" });
      load();
    } catch (err) {
      setError(serverMessage(err, "Could not add the contact."));
    }
  }

  async function act(fn, id) {
    setError("");
    try { await fn(id); load(); } catch (err) { setError(serverMessage(err, "Could not do this.")); }
  }

  const row = (c, withApprove) => (
    <div className="list-row-stack" key={c.id}>
      <div className="list-row-top">
        <div className="meta"><strong>{c.name}</strong> <span className="badge">{t(CATEGORY_LABELS[c.category] || c.category)}</span></div>
        <a className="call-button" href={`tel:${c.phone_number}`}>📞 {c.phone_number}</a>
      </div>
      <div className="empty-state">
        {[c.area, c.city].filter(Boolean).join(", ")}{c.is_national ? ` · ${t("National")}` : ""}{!c.is_approved ? ` · ${t("Waiting for approval")}` : ""}
      </div>
      <div className="no-print">
        {withApprove && <button type="button" onClick={() => act(approveEmergencyContact, c.id)}>{t("Approve")}</button>}{" "}
        <button type="button" className="btn-outline" onClick={() => { if (window.confirm(t("Remove this contact?"))) act(deleteEmergencyContact, c.id); }}>{t("Remove")}</button>
      </div>
    </div>
  );

  return (
    <div className="card">
      <h2>{role === "admin" ? t("Emergency directory") : t("Our ambulance and contacts")}</h2>
      <p className="subtitle">
        {role === "admin"
          ? t("These numbers are public. Edit the list so people in every city find a working number.")
          : t("Add your ambulance, blood bank or emergency desk number so people can call you quickly.")}
      </p>

      <form onSubmit={add} noValidate>
        <label htmlFor="dm-name">{t("Name")}</label>
        <input id="dm-name" value={form.name} maxLength={80} onChange={(e) => set("name", e.target.value)} placeholder={t("Example: City Hospital ambulance")} />
        <label htmlFor="dm-cat">{t("Type")}</label>
        <select id="dm-cat" value={form.category} onChange={(e) => set("category", e.target.value)}>
          {Object.keys(CATEGORY_LABELS).map((k) => <option key={k} value={k}>{t(CATEGORY_LABELS[k])}</option>)}
        </select>
        <label htmlFor="dm-phone">{t("Phone number")}</label>
        <input id="dm-phone" inputMode="tel" value={form.phone_number} maxLength={20} onChange={(e) => set("phone_number", e.target.value)} placeholder="+92 300 1234567 / 1122" />
        <label htmlFor="dm-city">{t("City")}</label>
        <input id="dm-city" value={form.city} maxLength={80} onChange={(e) => set("city", e.target.value)} />
        <label htmlFor="dm-area">{t("Area / Town / Colony")} ({t("optional")})</label>
        <input id="dm-area" value={form.area} maxLength={80} onChange={(e) => set("area", e.target.value)} />
        <label htmlFor="dm-notes">{t("Notes, optional")}</label>
        <input id="dm-notes" value={form.notes} maxLength={200} onChange={(e) => set("notes", e.target.value)} />
        <label className="check-inline"><input type="checkbox" checked={form.is_24h} onChange={(e) => set("is_24h", e.target.checked)} /> {t("Open 24 hours")}</label>
        {role === "admin" && (
          <label className="check-inline"><input type="checkbox" checked={form.is_national} onChange={(e) => set("is_national", e.target.checked)} /> {t("National number (shown in every city)")}</label>
        )}
        {error && <p className="error-text" role="alert">{error}</p>}
        {message && <p className="success-text" role="status">{message}</p>}
        <button type="submit">{t("Add contact")}</button>
      </form>

      {role === "admin" && pending.length > 0 && (
        <>
          <h3 style={{ marginTop: 18 }}>{t("Waiting for your approval")}</h3>
          {pending.map((c) => row(c, true))}
        </>
      )}

      <h3 style={{ marginTop: 18 }}>{role === "admin" ? t("All contacts") : t("My contacts")}</h3>
      {mine.length === 0 && <p className="empty-state">{t("No contacts yet.")}</p>}
      {mine.map((c) => row(c, false))}
    </div>
  );
}
