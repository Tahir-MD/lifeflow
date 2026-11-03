import React, { useCallback, useEffect, useRef, useState } from "react";
import { listMyCamps, checkInDonor, getCampAttendance } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import { serverMessage } from "../utils/validators.js";
import ExportButtons from "./ExportButtons.jsx";
import PrintButton from "./PrintButton.jsx";
import PrintHeader from "./PrintHeader.jsx";

/**
 * Camp QR check-in. Scan the QR code on a donor's digital donor card with the camera (Chrome, Edge,
 * Samsung browser on Android), or type the Donor ID printed on the card. Walk-ins are added
 * automatically. The attendance list can be printed, or downloaded as Excel / PDF.
 */
export default function CampCheckIn() {
  const { t } = useI18n();
  const [camps, setCamps] = useState([]);
  const [campId, setCampId] = useState("");
  const [people, setPeople] = useState([]);
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const lastScan = useRef({ text: "", at: 0 });
  const campIdRef = useRef("");

  const canScan = typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices;

  useEffect(() => {
    listMyCamps().then((r) => {
      setCamps(r.data);
      if (r.data.length) { setCampId(String(r.data[0].id)); }
    }).catch((err) => setError(serverMessage(err, "Could not load your camps.")));
  }, []);

  const loadPeople = useCallback(async (id) => {
    if (!id) { setPeople([]); return; }
    try { setPeople((await getCampAttendance(id)).data); } catch (err) { setError(serverMessage(err, "Could not load the list.")); }
  }, []);

  useEffect(() => { campIdRef.current = campId; loadPeople(campId); }, [campId, loadPeople]);

  const doCheckIn = useCallback(async (text) => {
    const id = campIdRef.current;
    if (!id || !text.trim()) return;
    setError(""); setResult(null);
    try {
      const response = await checkInDonor(id, text.trim());
      setResult(response.data);
      setCode("");
      loadPeople(id);
    } catch (err) {
      setError(serverMessage(err, "Could not check this donor in."));
    }
  }, [loadPeople]);

  function stopScan() {
    if (streamRef.current) { streamRef.current.getTracks().forEach((track) => track.stop()); streamRef.current = null; }
    setScanning(false);
  }
  useEffect(() => stopScan, []); // stop the camera when leaving the page

  async function startScan() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
      setTimeout(() => {
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
      }, 50);
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const timer = setInterval(async () => {
        if (!streamRef.current) { clearInterval(timer); return; }
        try {
          const found = await detector.detect(videoRef.current);
          if (found.length) {
            const text = found[0].rawValue || "";
            const now = Date.now();
            if (text && (text !== lastScan.current.text || now - lastScan.current.at > 4000)) {
              lastScan.current = { text, at: now };
              doCheckIn(text);
            }
          }
        } catch (err) { /* the camera is still warming up */ }
      }, 500);
    } catch (err) {
      setError(t("Could not open the camera. Allow camera access, or type the Donor ID."));
      stopScan();
    }
  }

  const camp = camps.find((c) => String(c.id) === String(campId));
  const came = people.filter((p) => p.status === "attended").length;

  return (
    <div className="card">
      <h2>📷 {t("Camp check-in")}</h2>
      <p className="subtitle no-print">{t("Scan the QR code on the donor's card, or type the Donor ID. Donors who did not register first are added as walk-ins.")}</p>

      {camps.length === 0 ? (
        <p className="empty-state">{t("You have not organized a camp yet.")}</p>
      ) : (
        <>
          <div className="no-print">
            <label htmlFor="ci-camp">{t("Camp")}</label>
            <select id="ci-camp" value={campId} onChange={(e) => { setCampId(e.target.value); setResult(null); }}>
              {camps.map((c) => <option key={c.id} value={c.id}>{c.title} · {new Date(c.camp_date).toLocaleDateString()}</option>)}
            </select>

            <div className="export-buttons">
              {canScan && !scanning && <button type="button" onClick={startScan}>📷 {t("Scan QR code")}</button>}
              {scanning && <button type="button" className="btn-outline" onClick={stopScan}>⏹ {t("Stop camera")}</button>}
            </div>
            {!canScan && <p className="field-hint">{t("This browser cannot scan QR codes. Type the Donor ID instead.")}</p>}
            {scanning && <video ref={videoRef} className="scanner-video" muted playsInline aria-label={t("Camera")} />}

            <div className="phone-verify-row">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("Donor ID, for example 12")} aria-label={t("Donor ID")}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doCheckIn(code); } }} />
              <button type="button" onClick={() => doCheckIn(code)} disabled={!code.trim() || !campId}>{t("Check in")}</button>
            </div>
            {error && <p className="error-text" role="alert">{error}</p>}
            {result && (
              <p className={result.already_checked_in ? "notice-text" : "success-text"} role="status">
                {result.already_checked_in ? "ℹ️" : "✅"} {result.attendee.donor_name} ({result.attendee.blood_type}) — {t(result.message)}
              </p>
            )}
          </div>

          {camp && (
            <>
              <PrintHeader title="Camp attendance" subtitle={`${camp.title} · ${new Date(camp.camp_date).toLocaleDateString()}`} />
              <div className="list-row-top">
                <h3>{t("Attendance")}: {came} / {people.length}</h3>
                <div className="no-print"><PrintButton label="Print attendance" /></div>
              </div>
              <ExportButtons role={`camp/${camp.id}`} />
              {people.length === 0 && <p className="empty-state">{t("Nobody has registered or checked in yet.")}</p>}
              <table className="attendance-table">
                <thead><tr><th>#</th><th>{t("Donor")}</th><th>{t("Blood type")}</th><th>{t("Phone")}</th><th>{t("Status")}</th><th>{t("Checked in")}</th></tr></thead>
                <tbody>
                  {people.map((p, i) => (
                    <tr key={p.donor_id} className={p.status === "attended" ? "row-came" : ""}>
                      <td>{i + 1}</td><td>{p.donor_name}{p.walk_in ? ` (${t("walk-in")})` : ""}</td><td>{p.blood_type}</td><td>{p.phone_number}</td>
                      <td>{p.status === "attended" ? `✅ ${t("Came")}` : t(p.status)}</td>
                      <td>{p.checked_in_at ? new Date(p.checked_in_at + "Z").toLocaleTimeString() : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </div>
  );
}
