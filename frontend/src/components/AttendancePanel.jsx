import React, { useEffect, useState } from "react";
import { checkIn, checkOut, getMyAttendance } from "../services/api";

const COLORS = { present: "On time", late: "Late", checked_out: "Finished", absent: "Absent", not_started: "Not started" };

/** A staff member's own attendance: check in when duty starts, check out when it ends. */
export default function AttendancePanel() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const response = await getMyAttendance();
      setData(response.data);
    } catch (error) {
      setData(null);
    }
  }
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  async function act(fn) {
    setMessage("");
    try {
      await fn();
      load();
    } catch (error) {
      const detail = error.response?.data?.detail;
      setMessage(typeof detail === "string" ? detail : "Could not do that. Please try again.");
    }
  }

  const today = data?.today;
  return (
    <>
      <div className="card">
        <h2>My attendance</h2>
        {today && (
          <>
            <p className="subtitle">Duty: {today.shift_label}</p>
            <p className="notice-text"><strong>{COLORS[today.state] || today.state}</strong> · {today.text}
              {today.check_in ? ` · In: ${today.check_in}` : ""}{today.check_out ? ` · Out: ${today.check_out}` : ""}</p>
            {message && <p className="error-text">{message}</p>}
            <div className="location-row">
              <button disabled={!today.can_check_in || !!today.check_in} onClick={() => act(checkIn)}>Check in</button>
              <button className="btn-outline" disabled={!today.can_check_out} onClick={() => act(checkOut)}>Check out</button>
            </div>
            <p className="empty-state">Check-in opens 30 minutes before your duty. More than 10 minutes after the start counts as late.</p>
          </>
        )}
      </div>
      <div className="card">
        <h3>My last days</h3>
        {(!data || data.history.length === 0) && <p className="empty-state">No attendance yet.</p>}
        {data && data.history.map((r) => (
          <div className="list-row-stack" key={r.id}>
            <div className="list-row-top">
              <div className="meta">{r.work_date} · {r.check_in} → {r.check_out || "..."}</div>
              <span className="badge">{r.late_minutes > 0 ? `Late ${r.late_minutes} min` : "On time"}{r.left_early ? " · left early" : ""}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
