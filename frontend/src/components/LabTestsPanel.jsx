import React, { useEffect, useState } from "react";
import { getLabTests, addLabTest, getLabTestTypes } from "../services/api";

const TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

/** Blood test results: record a new one and see the list. */
export default function LabTestsPanel({ canAdd = true }) {
  const [tests, setTests] = useState([]);
  const [types, setTypes] = useState(["Blood group", "Hemoglobin", "HIV", "Hepatitis B (HBsAg)", "Hepatitis C", "Malaria", "Syphilis", "Cross-match", "Other"]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ person_type: "donor", person_name: "", blood_type: "", test_type: "Blood group", result: "", outcome: "normal", notes: "" });

  async function load() {
    try { setTests((await getLabTests()).data); } catch (e) { setTests([]); }
  }
  useEffect(() => {
    load();
    getLabTestTypes().then((r) => setTypes(r.data)).catch(() => {});
  }, []);

  function change(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    try {
      await addLabTest({ ...form, blood_type: form.blood_type || null });
      setForm({ ...form, person_name: "", result: "", notes: "" });
      setMessage("Test result saved.");
      load();
    } catch (error) {
      const detail = error.response?.data?.detail;
      setMessage(typeof detail === "string" ? detail : "Could not save. Please try again.");
    }
  }

  return (
    <>
      {canAdd && (
        <div className="card">
          <h2>Record a blood test</h2>
          {message && <p className="notice-text">{message}</p>}
          <form onSubmit={submit}>
            <label>Person</label>
            <select name="person_type" value={form.person_type} onChange={change}>
              <option value="donor">Donor</option>
              <option value="patient">Patient</option>
            </select>
            <label>Full name</label>
            <input name="person_name" value={form.person_name} onChange={change} required />
            <label>Blood type, optional</label>
            <select name="blood_type" value={form.blood_type} onChange={change}>
              <option value="">-</option>
              {TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <label>Test</label>
            <select name="test_type" value={form.test_type} onChange={change}>
              {types.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <label>Result</label>
            <input name="result" value={form.result} onChange={change} placeholder="e.g. 13.5 g/dL, Negative, O+" required />
            <label>Outcome</label>
            <select name="outcome" value={form.outcome} onChange={change}>
              <option value="normal">Normal</option>
              <option value="abnormal">Abnormal</option>
              <option value="pending">Pending</option>
            </select>
            <label>Notes, optional</label>
            <input name="notes" value={form.notes} onChange={change} />
            <button type="submit">Save test result</button>
          </form>
        </div>
      )}
      <div className="card">
        <h2>Blood tests</h2>
        {tests.length === 0 && <p className="empty-state">No tests recorded yet.</p>}
        {tests.map((t) => (
          <div className="list-row-stack" key={t.id}>
            <div className="list-row-top">
              <div className="meta"><span className="badge">{t.test_type}</span> &nbsp; {t.person_name} ({t.person_type}) {t.blood_type ? `· ${t.blood_type}` : ""}</div>
              <span className="badge" style={t.outcome === "abnormal" ? { background: "#B01E28", color: "#fff" } : undefined}>{t.outcome}</span>
            </div>
            <div className="empty-state">Result: {t.result}{t.notes ? ` · ${t.notes}` : ""} · by {t.done_by} · {new Date(t.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </>
  );
}
