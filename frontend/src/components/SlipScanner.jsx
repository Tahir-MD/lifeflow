import React, { useRef, useState } from "react";
import { scanSlip } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import { serverMessage } from "../utils/validators.js";

const FIELD_LABELS = [
  ["blood_type_needed", "Blood type needed"], ["units_needed", "Bags needed"], ["patient_name", "Patient name"],
  ["patient_age", "Patient age"], ["patient_gender", "Patient gender"], ["medical_reason", "Reason"], ["hospital_name", "Hospital"],
];

/** Take or choose a photo of a doctor's slip. AI reads it and suggests the request form; the photo is not saved. */
export default function SlipScanner({ onFill }) {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const [filled, setFilled] = useState(false);

  async function handleFile(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    setError(""); setResult(null); setFilled(false);
    if (!file.type.startsWith("image/")) { setError("Please choose a photo (JPG or PNG)."); return; }
    if (file.size > 4 * 1024 * 1024) { setError("Image too large (max 4 MB)."); return; }
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const response = await scanSlip(file);
      setResult(response.data);
    } catch (e) {
      setError(serverMessage(e, "Could not read the photo just now."));
    } finally {
      setBusy(false);
    }
  }

  function useDetails() {
    const fields = {};
    Object.entries(result.fields || {}).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== "" && k !== "hospital_name") fields[k] = v; });
    onFill(fields);
    setFilled(true);
  }

  return (
    <div className="ai-intake-box">
      <h3>📄 {t("Scan a doctor's slip")}</h3>
      <p className="field-hint">{t("Take a clear photo of the doctor's slip or blood requisition form. AI reads it and fills the form for you to check. The photo is not saved.")}</p>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
      <button type="button" className="btn-outline" style={{ marginTop: 0 }} onClick={() => inputRef.current && inputRef.current.click()} disabled={busy}>
        📷 {busy ? t("Reading the slip...") : t("Take or choose a photo")}
      </button>
      {error && <p className="error-text" role="alert">{t(error)}</p>}
      {preview && <div><img src={preview} alt={t("Your photo")} style={{ maxWidth: "160px", maxHeight: "120px", borderRadius: "8px", marginTop: "10px" }} /></div>}
      {result && !result.read_ok && <p className="error-text" role="alert">{result.note}</p>}
      {result && result.read_ok && (
        <div style={{ marginTop: "10px" }}>
          <table className="simple-table">
            <tbody>
              {FIELD_LABELS.filter(([k]) => result.fields[k] !== null && result.fields[k] !== undefined).map(([k, label]) => (
                <tr key={k}><td>{t(label)}</td><td><strong>{String(result.fields[k])}</strong></td></tr>
              ))}
            </tbody>
          </table>
          {result.warnings.map((w) => <p className="error-text" key={w}>⚠️ {t(w)}</p>)}
          <p className="field-hint">{t("Please check every field. The photo was not saved.")}</p>
          {!filled && <button type="button" onClick={useDetails}>{t("Use these details in the form")}</button>}
          {filled && <p className="success-text">✅ {t("Form filled. Please check it before sending.")}</p>}
        </div>
      )}
    </div>
  );
}
