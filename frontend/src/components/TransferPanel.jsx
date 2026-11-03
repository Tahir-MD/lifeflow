import React, { useEffect, useState } from "react";
import { findSuppliers, askForBlood, listMyTransfers, respondToTransfer, confirmTransferArrival, cancelTransfer } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import { serverMessage } from "../utils/validators.js";

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

/** Hospital-to-hospital blood transfers: ask a nearby hospital with stock, answer requests sent to you. */
export default function TransferPanel() {
  const { t } = useI18n();
  const [bloodType, setBloodType] = useState("O+");
  const [units, setUnits] = useState(1);
  const [note, setNote] = useState("");
  const [suppliers, setSuppliers] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadTransfers() {
    try { setTransfers((await listMyTransfers()).data); } catch (err) { setError(serverMessage(err, "Could not load transfers.")); }
  }
  useEffect(() => { loadTransfers(); }, []);

  async function search() {
    setError(""); setMessage("");
    try { setSuppliers((await findSuppliers(bloodType)).data); } catch (err) { setError(serverMessage(err, "Could not search.")); }
  }

  async function ask(hospitalId) {
    setError(""); setMessage("");
    try {
      await askForBlood({ from_hospital_id: hospitalId, blood_type: bloodType, units: Number(units), note: note.trim() || null });
      setMessage(t("Your request was sent to the hospital."));
      setSuppliers(null);
      loadTransfers();
    } catch (err) { setError(serverMessage(err, "Could not send the request.")); }
  }

  async function act(fn, ...args) {
    setError(""); setMessage("");
    try { await fn(...args); loadTransfers(); } catch (err) { setError(serverMessage(err, "Could not do this.")); }
  }

  return (
    <div className="card">
      <h2>{t("Blood transfers between hospitals")}</h2>
      <p className="subtitle">{t("Short of a blood group? Ask a nearby hospital that has it. Hospitals asking you for blood appear below.")}</p>

      <label htmlFor="t-type">{t("Blood type needed")}</label>
      <select id="t-type" value={bloodType} onChange={(e) => { setBloodType(e.target.value); setSuppliers(null); }}>
        {BLOOD_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
      </select>
      <label htmlFor="t-units">{t("Bags needed")}</label>
      <input id="t-units" type="number" min="1" max="100" value={units} onChange={(e) => setUnits(e.target.value)} />
      <label htmlFor="t-note">{t("Note, optional")}</label>
      <input id="t-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
      <button type="button" onClick={search}>{t("Find hospitals with this blood")}</button>

      {error && <p className="error-text" role="alert">{error}</p>}
      {message && <p className="success-text" role="status">{message}</p>}

      {suppliers && suppliers.length === 0 && <p className="empty-state">{t("No other hospital has this blood type in stock right now.")}</p>}
      {suppliers && suppliers.map((s) => (
        <div className="list-row-stack" key={s.hospital_id}>
          <div className="list-row-top">
            <div className="meta">{s.name} {s.is_verified ? "✔" : ""}</div>
            <span className="distance">{s.distance_kilometers} {t("km away")}</span>
          </div>
          <div className="empty-state">{[s.area, s.city].filter(Boolean).join(", ")} · {s.units_available} {t("bags")} · {s.phone_number}</div>
          <button type="button" onClick={() => ask(s.hospital_id)} disabled={Number(units) > s.units_available}>
            {t("Ask for")} {units} {t("bags")}
          </button>
        </div>
      ))}

      <h3 style={{ marginTop: 18 }}>{t("My transfers")}</h3>
      {transfers.length === 0 && <p className="empty-state">{t("No transfers yet.")}</p>}
      {transfers.map((x) => (
        <div className="list-row-stack" key={x.id}>
          <div className="list-row-top">
            <div className="meta">
              {x.direction === "incoming" ? `⬅ ${t("Asked of you by")}` : `➡ ${t("You asked")}`} {x.other_hospital}
            </div>
            <span className="badge">{t(x.status)}</span>
          </div>
          <div className="empty-state">{x.units} {t("bags")} {x.blood_type} · {x.other_phone}{x.note ? ` · ${x.note}` : ""}</div>
          <div className="no-print">
            {x.direction === "incoming" && x.status === "pending" && (
              <>
                <button type="button" onClick={() => act(respondToTransfer, x.id, "approve")}>{t("Approve")}</button>{" "}
                <button type="button" className="btn-outline" onClick={() => act(respondToTransfer, x.id, "reject")}>{t("Reject")}</button>
              </>
            )}
            {x.direction === "outgoing" && x.status === "approved" && (
              <button type="button" onClick={() => act(confirmTransferArrival, x.id)}>{t("The bags arrived")}</button>
            )}
            {x.direction === "outgoing" && x.status === "pending" && (
              <button type="button" className="btn-outline" onClick={() => act(cancelTransfer, x.id)}>{t("Cancel")}</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
