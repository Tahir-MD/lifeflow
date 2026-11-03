import React, { useRef, useState } from "react";
import { canRecord, startRecording } from "../utils/speech.js";
import { useI18n } from "../i18n/I18nContext.jsx";

/** Tap to start talking, tap again to stop. Calls onAudio(blob). The recording is only sent for reading, never kept. */
export default function MicButton({ onAudio, disabled, big = false }) {
  const { t } = useI18n();
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const handle = useRef(null);

  async function toggle() {
    setError("");
    if (recording) {
      handle.current && handle.current.stop();
      setRecording(false);
      return;
    }
    if (!canRecord()) { setError("Voice input isn't supported in this browser."); return; }
    try {
      handle.current = await startRecording((blob) => onAudio(blob));
      setRecording(true);
    } catch (e) {
      setError("Microphone access was blocked or unavailable.");
    }
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      <button
        type="button" onClick={toggle} disabled={disabled}
        className={recording ? "btn-outline recording-pulse" : "btn-outline"}
        style={big ? { padding: "14px 22px", fontSize: "17px" } : { marginTop: 0 }}
        aria-pressed={recording}
      >
        {recording ? `⏹ ${t("Stop")}` : `🎤 ${t("Tap to speak")}`}
      </button>
      {error && <span className="error-text" style={{ fontSize: "12.5px" }}>{t(error)}</span>}
    </span>
  );
}
