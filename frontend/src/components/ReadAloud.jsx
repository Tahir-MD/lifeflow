import React, { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nContext.jsx";

// Reads the visible page aloud in the chosen language, for people who cannot read well.
// Uses the browser's own voices, so it works with no extra setup. If the browser has no voice
// for the language (Sindhi is rare), it falls back to the closest one (Urdu, then English).
const VOICE_CODES = { en: "en-US", ur: "ur-PK", sd: "sd-PK", es: "es-ES", fr: "fr-FR" };

function pickVoice(language) {
  const voices = window.speechSynthesis.getVoices();
  const tries = [VOICE_CODES[language], language, language === "sd" ? "ur" : null, "en"].filter(Boolean);
  for (const code of tries) {
    const found = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(code.toLowerCase()));
    if (found) return found;
  }
  return null;
}

export default function ReadAloud({ compact = false }) {
  const { t, language } = useI18n();
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);
  useEffect(() => { if (supported) { window.speechSynthesis.cancel(); setSpeaking(false); } }, [language, supported]);

  if (!supported) return null;

  function toggle() {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const root = document.querySelector(".page") || document.body;
    const text = root.innerText.replace(/\s+/g, " ").trim().slice(0, 4000);
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(language);
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang; } else { utterance.lang = VOICE_CODES[language] || "en-US"; }
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <button
      type="button" className="btn-outline read-aloud" onClick={toggle}
      aria-pressed={speaking} title={t("Listen to this page")} aria-label={t("Listen to this page")}
      style={{ marginTop: 0, padding: "8px 14px" }}
    >
      {compact ? (speaking ? "⏹" : "🔊") : (speaking ? `⏹ ${t("Stop listening")}` : `🔊 ${t("Listen")}`)}
    </button>
  );
}
