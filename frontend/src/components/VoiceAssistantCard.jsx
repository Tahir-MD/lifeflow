import React, { useEffect, useState } from "react";
import { askVoiceAssistant } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import MicButton from "./MicButton.jsx";
import LanguagePicker from "./LanguagePicker.jsx";
import { canSpeak, speak, stopSpeaking } from "../utils/speech.js";
import { serverMessage } from "../utils/validators.js";

const FIELD_LABELS = [
  ["blood_type_needed", "Blood type needed"], ["units_needed", "Bags needed"], ["patient_name", "Patient name"],
  ["patient_age", "Patient age"], ["patient_gender", "Patient gender"], ["medical_reason", "Reason"], ["urgency_type", "How soon"],
];

/**
 * Talk to LifeFlow in Urdu, Sindhi or English. When the person asks for blood, the details are shown
 * for them to check, and "Use these details" fills the request form (onFill). The answer is also spoken back.
 */
export default function VoiceAssistantCard({ onFill, title = "Voice assistant (Urdu, Sindhi, English)" }) {
  const { t, language } = useI18n();
  const [lang, setLang] = useState(["ur", "sd", "en"].includes(language) ? language : "en");
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [filled, setFilled] = useState(false);

  useEffect(() => { if (["ur", "sd", "en"].includes(language)) setLang(language); }, [language]);
  useEffect(() => () => stopSpeaking(), []);

  async function ask({ blob, text }) {
    setBusy(true); setError(""); setResult(null); setFilled(false);
    try {
      const response = await askVoiceAssistant({ blob, text, language: lang });
      setResult(response.data);
      if (response.data.reply) speak(response.data.reply, lang);
    } catch (e) {
      setError(serverMessage(e, "Could not reach the assistant just now."));
    } finally {
      setBusy(false);
    }
  }

  function useDetails() {
    const fields = {};
    Object.entries(result.fields || {}).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== "") fields[k] = v; });
    onFill(fields);
    setFilled(true);
  }

  const rtl = lang !== "en";
  return (
    <div className="ai-intake-box">
      <h3>🗣️ {t(title)}</h3>
      <p className="field-hint">{t("Speak in your own language. Example: “مجھے دو بوتل او نیگیٹو خون چاہیے، آپریشن ہے”. You always check the details before anything is sent.")}</p>
      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
        <LanguagePicker value={lang} onChange={setLang} />
        <MicButton big onAudio={(blob) => ask({ blob })} disabled={busy} />
        {canSpeak() && result && <button type="button" className="btn-outline" style={{ marginTop: 0 }} onClick={() => speak(result.reply, lang)}>🔊 {t("Listen again")}</button>}
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
        <input style={{ flex: 1, minWidth: "200px" }} placeholder={t("Or type here")} value={typed} onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && typed.trim()) { ask({ text: typed }); } }} />
        <button type="button" onClick={() => typed.trim() && ask({ text: typed })} disabled={busy || !typed.trim()}>{t("Send")}</button>
      </div>
      {busy && <p className="field-hint">{t("Listening and thinking...")}</p>}
      {error && <p className="error-text" role="alert">{t(error)}</p>}
      {result && (
        <div style={{ marginTop: "10px" }} dir={rtl ? "rtl" : "ltr"}>
          {result.transcript && <p className="empty-state">{t("I heard")}: “{result.transcript}”</p>}
          <p className="notice-text">{result.reply}</p>
          {result.note && <p className="field-hint">{result.note}</p>}
          {result.intent === "request_blood" && result.fields && (
            <>
              <table className="simple-table">
                <tbody>
                  {FIELD_LABELS.filter(([k]) => result.fields[k] !== null && result.fields[k] !== undefined).map(([k, label]) => (
                    <tr key={k}><td>{t(label)}</td><td><strong>{String(result.fields[k])}</strong></td></tr>
                  ))}
                </tbody>
              </table>
              {onFill && !filled && <button type="button" onClick={useDetails}>{t("Use these details in the form")}</button>}
              {filled && <p className="success-text">✅ {t("Form filled. Please check it before sending.")}</p>}
            </>
          )}
          {result.intent === "emergency_numbers" && <p className="field-hint">{t("Open the “Ambulance & contacts” page for phone numbers.")}</p>}
        </div>
      )}
    </div>
  );
}
