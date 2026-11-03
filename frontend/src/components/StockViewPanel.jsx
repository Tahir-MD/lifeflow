import React, { useEffect, useState } from "react";
import { getStaffStockView } from "../services/api";

/** Read-only blood stock for staff roles that may look at it. */
export default function StockViewPanel() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    getStaffStockView().then((r) => setItems(r.data)).catch(() => setItems([]));
  }, []);
  return (
    <div className="card">
      <h2>Blood stock (view only)</h2>
      {items.map((i) => (
        <div className="list-row-stack" key={i.blood_type}>
          <div className="list-row-top">
            <div className="meta"><span className="badge">{i.blood_type}</span> &nbsp; {i.units_available} bag(s)</div>
            {i.is_low && <span className="badge" style={{ background: "#B01E28", color: "#fff" }}>Low stock</span>}
          </div>
          {i.expiring_soon > 0 && <div className="empty-state">⚠ {i.expiring_soon} bag(s) expire within 7 days{i.next_expiry ? ` (first: ${new Date(i.next_expiry).toLocaleDateString()})` : ""}</div>}
        </div>
      ))}
    </div>
  );
}
