import React, { useState } from "react";
import { sendSos } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import { serverMessage } from "../utils/validators.js";
import RequestTimeline from "./RequestTimeline.jsx";

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

/**
 * One big red SOS button for patients and hospitals. Only the blood type and the number of bags are
 * asked: the place comes from the account. The alert reaches matching donors within 100 km and the
 * nearest hospitals, and a live timeline opens straight away.
 */
export default function SosButton({ onSent }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [bloodType, setBloodType] = useState("O+");
  const [units, setUnits] = useState(1);
  const [patient, setPatient] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(null);

  async function send() {
    setError("");
    setBusy(true);
    try {
      const response = await sendSos({
        blood_type_needed: bloodType,
        units_needed: Number(units) || 1,
        patient_name: patient.trim() || null,
      });
      setSent(response.data);
      if (onSent) onSent(response.data);
    } catch (err) {
      setError(serverMessage(err, "Could not send the SOS. Please call the hospital directly."));
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setSent(null);
    setError("");
  }

  if (!open) {
    return (
      <button type="button" className="sos-button" onClick={() => setOpen(true)} aria-label={t("Emergency SOS")}>
        🚨 {t("Emergency SOS")}
        <small>{t("One tap: alert nearby donors and hospitals")}</small>
      </button>
    );
  }

  return (
    <div className="card sos-card" role="dialog" aria-label={t("Emergency SOS")}>
      <h2>🚨 {t("Emergency SOS")}</h2>
      {!sent ? (
        <>
          <p className="subtitle">{t("We will alert matching donors within 100 km and the nearest hospitals, using your registered place.")}</p>
          <label htmlFor="sos-blood">{t("Blood type needed")}</label>
          <select id="sos-blood" value={bloodType} onChange={(e) => setBloodType(e.target.value)}>
            {BLOOD_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <label htmlFor="sos-units">{t("Bags needed")}</label>
          <input id="sos-units" type="number" min="1" max="10" value={units} onChange={(e) => setUnits(e.target.value)} />
          <label htmlFor="sos-patient">{t("Patient name, optional")}</label>
          <input id="sos-patient" value={patient} onChange={(e) => setPatient(e.target.value)} maxLength={60} />
          {error && <p className="error-text" role="alert">{error}</p>}
          <div className="list-row-top">
            <button type="button" className="sos-confirm" onClick={send} disabled={busy}>{busy ? t("Please wait...") : t("Send SOS now")}</button>
            <button type="button" className="btn-outline" onClick={close}>{t("Cancel")}</button>
          </div>
        </>
      ) : (
        <>
          <p className="success-text" role="status">✅ {t("Your SOS was sent.")}</p>
          <RequestTimeline requestId={sent.id} />
          <button type="button" className="btn-outline" onClick={close}>{t("Close")}</button>
        </>
      )}
    </div>
  );
}
