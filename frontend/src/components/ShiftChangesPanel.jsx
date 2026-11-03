import React, { useEffect, useState } from "react";
import { getHospitalShiftChanges, decideShiftChange } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";

/** Hospital: staff asked for a different shift or duty time. The hospital confirms or rejects. */
export default function ShiftChangesPanel({ onDecided }) {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  async function load() {
    try { setItems((await getHospitalShiftChanges()).data); } catch (error) { setItems([]); }
  }
  useEffect(() => { load(); const timer = setInterval(load, 20000); return () => clearInterval(timer); }, []);
  async function decide(change, decision) {
    try { await decideShiftChange(change.id, decision); load(); if (onDecided) onDecided(); } catch (error) { /* list stays */ }
  }
  const pending = items.filter((c) => c.status === "pending");
  return (
    <div className="card">
      <h2>{t("Shift change requests")}</h2>
      {pending.length === 0 && <p className="empty-state">{t("No requests waiting.")}</p>}
      {pending.map((c) => (
        <div className="list-row-stack" key={c.id}>
          <div className="meta">
            <strong>{c.staff_name}</strong>: {c.current_label} → <strong>{c.requested_label}</strong>{c.reason ? ` · ${c.reason}` : ""}
          </div>
          <div className="location-row">
            <button className="inline-btn" onClick={() => decide(c, "approve")}>{t("Confirm")}</button>
            <button className="inline-btn btn-outline" onClick={() => decide(c, "reject")}>{t("Reject")}</button>
          </div>
        </div>
      ))}
    </div>
  );
}
