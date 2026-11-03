// Small helpers for speaking and recording, shared by the voice assistant and the health chat.
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

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Reads `text` aloud. Sindhi falls back to an Urdu voice, then English, when the browser has no Sindhi voice. */
export function speak(text, language, onEnd) {
  if (!canSpeak() || !text) { if (onEnd) onEnd(); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(language);
  if (voice) { utterance.voice = voice; utterance.lang = voice.lang; } else { utterance.lang = VOICE_CODES[language] || "en-US"; }
  utterance.onend = () => { if (onEnd) onEnd(); };
  utterance.onerror = () => { if (onEnd) onEnd(); };
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

export function canRecord() {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices && typeof window !== "undefined" && !!window.MediaRecorder;
}

/** Starts recording. Returns { stop } -- call stop() and onBlob(blob) fires. Throws if the microphone is blocked. */
export async function startRecording(onBlob) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks = [];
  recorder.ondataavailable = (event) => chunks.push(event.data);
  recorder.onstop = () => {
    stream.getTracks().forEach((track) => track.stop());
    onBlob(new Blob(chunks, { type: "audio/webm" }));
  };
  recorder.start();
  return { stop: () => { if (recorder.state !== "inactive") recorder.stop(); } };
}
