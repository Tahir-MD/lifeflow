import React, { useEffect, useState } from "react";
import { getPendingDonations, confirmDonation, rejectDonation } from "../services/api";

/** Donors who said "I will donate". The hospital confirms the bags were really received. */
export default function PendingDonationsPanel() {
  const [rows, setRows] = useState([]);
  const [units, setUnits] = useState({});
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const response = await getPendingDonations();
      setRows(response.data);
    } catch (error) {
      setRows([]);
    }
  }
  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, []);

  async function confirm(row) {
    setMessage("");
    try {
      await confirmDonation(row.id, Number(units[row.id] || row.units));
      setMessage("Confirmed. The donor's donation now counts.");
      load();
    } catch (error) {
      const detail = error.response?.data?.detail;
      setMessage(typeof detail === "string" ? detail : "Could not confirm. Please try again.");
    }
  }
  async function reject(row) {
    try {
      await rejectDonation(row.id);
      setMessage("Marked as not received. It will not count.");
      load();
    } catch (error) {
      setMessage("Could not update. Please try again.");
    }
  }

  return (
    <div className="card">
      <h2>Donations to confirm</h2>
      <p className="subtitle">A donor's donation counts only after you confirm the bags were really received. Promises not confirmed within 48 hours are cancelled.</p>
      {message && <p className="notice-text">{message}</p>}
      {rows.length === 0 && <p className="empty-state">No donors are waiting right now.</p>}
      {rows.map((r) => (
        <div className="list-row-stack" key={r.id}>
          <div className="list-row-top">
            <div className="meta">
              <span className="badge">{r.donor_blood_type}</span> &nbsp; {r.donor_name}
              {r.patient_name ? ` · for patient ${r.patient_name}` : ""}
            </div>
            <span className="distance">{new Date(r.promised_at).toLocaleString()}</span>
          </div>
          <div className="empty-state">Promised {r.units} bag(s) · Phone: {r.donor_phone} · Request #{r.request_id}</div>
          <div className="location-row">
            <input type="number" min="1" max={r.units} placeholder={`Bags received (max ${r.units})`}
              value={units[r.id] || ""} onChange={(e) => setUnits({ ...units, [r.id]: e.target.value })} />
            <button className="inline-btn" onClick={() => confirm(r)}>Confirm received</button>
            <button className="inline-btn btn-outline" onClick={() => reject(r)}>Not received</button>
          </div>
        </div>
      ))}
    </div>
  );
}
