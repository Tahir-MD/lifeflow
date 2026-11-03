import React, { useEffect, useState } from "react";
import { getTeamAttendance, getAttendanceHistory, getMonthlyReport, getHospitalAllVisitors } from "../services/api";
import PrintButton from "./PrintButton.jsx";
import PrintHeader from "./PrintHeader.jsx";

const LABEL = { present: "Present (on time)", late: "Present (late)", checked_out: "Finished duty", absent: "Absent", not_started: "Not started" };

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Hospital and Manager view: today's attendance, last days, monthly report (PDF) and the combined visitor record. */
export default function TeamPanel({ hospitalName = "" }) {
  const [team, setTeam] = useState([]);
  const [history, setHistory] = useState([]);
  const [month, setMonth] = useState(thisMonth());
  const [report, setReport] = useState(null);
  const [visitors, setVisitors] = useState([]);

  async function loadToday() {
    try { setTeam((await getTeamAttendance()).data); } catch (e) { setTeam([]); }
  }
  useEffect(() => {
    loadToday();
    getAttendanceHistory(14).then((r) => setHistory(r.data)).catch(() => {});
    getHospitalAllVisitors().then((r) => setVisitors(r.data)).catch(() => {});
    const t = setInterval(loadToday, 60000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    getMonthlyReport(month).then((r) => setReport(r.data)).catch(() => setReport(null));
  }, [month]);

  return (
    <>
      <div className="card">
        <h2>Today's attendance</h2>
        <p className="subtitle">Who is on time, late or absent for their duty. Updates every minute.</p>
        {team.length === 0 && <p className="empty-state">No staff yet.</p>}
        {team.map((s) => (
          <div className="list-row-stack" key={s.staff_id}>
            <div className="list-row-top">
              <div className="meta"><span className="badge">{s.staff_role}</span> &nbsp; {s.staff_name}</div>
              <span className="badge" style={s.state === "absent" ? { background: "#B01E28", color: "#fff" } : undefined}>{LABEL[s.state] || s.state}</span>
            </div>
            <div className="empty-state">
              {s.shift_label} · {s.text}
              {s.check_in ? ` · In: ${s.check_in}` : ""}{s.check_out ? ` · Out: ${s.check_out}` : ""}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <PrintHeader title={`Monthly staff report ${month}`} subtitle={hospitalName || (report ? report.hospital : "")} />
        <div className="list-row-top">
          <h2>Monthly staff report</h2>
          <PrintButton />
        </div>
        <label className="no-print">Month</label>
        <input className="no-print" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        {report && report.rows.length === 0 && <p className="empty-state">No staff yet.</p>}
        {report && report.rows.map((r) => (
          <div className="list-row-stack" key={r.staff_name + r.staff_role}>
            <div className="meta"><span className="badge">{r.staff_role}</span> &nbsp; <strong>{r.staff_name}</strong> · {r.duty}</div>
            <div className="empty-state">
              Donors attended: {r.donors_logged} · Patients attended: {r.patients_logged} · Tests done: {r.tests_done}
              <br />Days present: {r.days_present} · Late: {r.late_count} time(s) ({r.late_minutes} min) · Left early: {r.left_early_count}
              · Days without check-in: {r.days_without_checkin}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Last 14 days of check-ins</h3>
        {history.length === 0 && <p className="empty-state">No check-ins yet.</p>}
        {history.map((r) => (
          <div className="list-row-stack" key={r.id}>
            <div className="list-row-top">
              <div className="meta">{r.work_date} · {r.staff_name} ({r.staff_role}) · {r.check_in} → {r.check_out || "..."}</div>
              <span className="badge">{r.late_minutes > 0 ? `Late ${r.late_minutes} min` : "On time"}{r.left_early ? " · left early" : ""}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Combined visitor record</h3>
        {visitors.length === 0 && <p className="empty-state">No visits logged yet.</p>}
        {visitors.slice(0, 100).map((v) => (
          <div className="list-row-stack" key={v.id}>
            <div className="list-row-top">
              <div className="meta">{v.visitor_type === "donor" ? "Donor" : "Patient"}: {v.full_name} {v.blood_type ? `· ${v.blood_type}` : ""}</div>
              <span className="distance">{new Date(v.logged_at).toLocaleString()}</span>
            </div>
            <div className="empty-state">Logged by {v.staff_name} ({v.staff_shift})</div>
          </div>
        ))}
      </div>
    </>
  );
}
