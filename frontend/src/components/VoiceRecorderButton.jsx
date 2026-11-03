import React, { useRef, useState } from "react";
import { transcribeAudio } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";

/**
 * A small "hold to talk" style recorder: click once to start, click
 * again to stop. Uses the browser's built-in MediaRecorder -- no extra
 * library -- and sends the clip to Groq's Whisper model for
 * transcription. onTranscript(text) is called once it's back.
 */
export default function VoiceRecorderButton({ onTranscript }) {
  const { t } = useI18n();
  const [state, setState] = useState("idle"); // idle | recording | transcribing
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  async function startRecording() {
    setError("");
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setError("Voice input isn't supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => chunksRef.current.push(event.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setState("transcribing");
        try {
          const response = await transcribeAudio(blob);
          onTranscript(response.data.transcript);
        } catch (err) {
          setError("Couldn't transcribe that. Please try again or type instead.");
        } finally {
          setState("idle");
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch (err) {
      setError("Microphone access was blocked or unavailable.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
      <button
        type="button"
        className={state === "recording" ? "btn-outline recording-pulse" : "btn-outline"}
        style={{ marginTop: "10px" }}
        onClick={state === "recording" ? stopRecording : startRecording}
        disabled={state === "transcribing"}
      >
        {state === "idle" && "🎤 Speak instead"}
        {state === "recording" && "⏹ Stop recording"}
        {state === "transcribing" && "Transcribing…"}
      </button>
      {error && <span className="error-text" style={{ fontSize: "12.5px" }}>{t(error)}</span>}
    </span>
  );
}
