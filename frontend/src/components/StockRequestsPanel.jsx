import React, { useEffect, useState } from "react";
import { getStockOffers, acceptStockOffer, rejectStockOffer } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";

/** Hospital: blood requests that match its stock. Nothing is taken unless the hospital accepts and picks the bags. */
export default function StockRequestsPanel({ onChanged, onCount }) {
  const { t } = useI18n();
  const [offers, setOffers] = useState([]);
  const [units, setUnits] = useState({});
  const [confirmId, setConfirmId] = useState(null);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const response = await getStockOffers();
      setOffers(response.data);
      if (onCount) onCount(response.data.filter((o) => o.status === "pending").length);
    } catch (error) { setOffers([]); }
  }
  useEffect(() => { load(); const timer = setInterval(load, 20000); return () => clearInterval(timer); }, []);

  async function accept(offer) {
    const n = Number(units[offer.id] || 0);
    try {
      await acceptStockOffer(offer.id, n);
      setConfirmId(null);
      setMessage(t("Confirmed. {n} bag(s) given and taken out of your stock.", { n }));
      load();
      if (onChanged) onChanged();
    } catch (error) {
      const detail = error.response && error.response.data && error.response.data.detail;
      setConfirmId(null);
      setMessage(typeof detail === "string" ? detail : t("Could not confirm. Please try again."));
    }
  }
  async function reject(offer) {
    try {
      await rejectStockOffer(offer.id);
      setMessage(t("Stock request rejected. Nothing was taken from your stock."));
      load();
    } catch (error) { setMessage(t("Could not reject. Please try again.")); }
  }

  return (
    <div className="card">
      <h2>{t("Stock requests")}</h2>
      <p className="subtitle">{t("A request needs a blood type you have in stock. Nothing is taken automatically: you decide to accept or reject, and if you accept you choose how many bags to give.")}</p>
      {message && <p className="notice-text">{message}</p>}
      {offers.length === 0 && <p className="empty-state">{t("No stock requests yet.")}</p>}
      {offers.map((o) => (
        <div className="list-row-stack" key={o.id}>
          <div className="list-row-top">
            <div className="meta">
              <span className="badge">{o.blood_type}</span> &nbsp; {o.requester_name}
              {o.patient_name ? ` · ${t("Patient")}: ${o.patient_name}` : ""}
              {o.urgency_type === "emergency" ? ` · ${t("Emergency")}` : ""}
            </div>
            <span className="badge">
              {o.status === "pending" ? t("Waiting for you") : o.status === "accepted" ? `${t("Accepted")} (${o.units_given})` : o.status === "rejected" ? t("Rejected") : t("Closed")}
            </span>
          </div>
          <div className="empty-state">
            {t("Still needed")}: {o.units_still_needed} · {t("Your stock now")}: {o.units_in_stock_now}
            {o.requester_phone ? ` · ${t("Phone")}: ${o.requester_phone}` : ""}
          </div>
          {o.status === "pending" && o.max_can_give > 0 && (confirmId === o.id ? (
            <div>
              <p className="notice-text">{t("Give {n} bag(s) of {type} to {name}? They will be taken out of your stock.", { n: units[o.id], type: o.blood_type, name: o.requester_name })}</p>
              <div className="location-row">
                <button className="inline-btn" onClick={() => accept(o)}>{t("Yes, confirm")}</button>
                <button className="inline-btn btn-outline" onClick={() => setConfirmId(null)}>{t("Back")}</button>
              </div>
            </div>
          ) : (
            <div className="location-row">
              <input type="number" min="1" max={o.max_can_give} placeholder={`${t("How many bags?")} (max ${o.max_can_give})`}
                value={units[o.id] || ""} onChange={(e) => setUnits({ ...units, [o.id]: e.target.value })} />
              <button className="inline-btn" onClick={() => {
                const n = Number(units[o.id] || 0);
                if (n < 1 || n > o.max_can_give) { setMessage(t("Enter a number of bags between 1 and {max}.", { max: o.max_can_give })); return; }
                setMessage(""); setConfirmId(o.id);
              }}>{t("Accept")}</button>
              <button className="inline-btn btn-outline" onClick={() => reject(o)}>{t("Reject")}</button>
            </div>
          ))}
          {o.status === "pending" && o.max_can_give <= 0 && (
            <div className="location-row">
              <span className="empty-state">{t("No stock or no more bags needed.")}</span>
              <button className="inline-btn btn-outline" onClick={() => reject(o)}>{t("Dismiss")}</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
