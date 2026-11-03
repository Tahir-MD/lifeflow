import React, { useEffect, useRef, useState } from "react";
import { checkEligibility, interpretHealthAnswer, transcribeHealthAnswer } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import { EMPTY_ELIGIBILITY, FEMALE_GROUP, QUESTION_GROUPS, eligibilityPayload } from "./EligibilityForm.jsx";
import MicButton from "./MicButton.jsx";
import { canSpeak, speak, stopSpeaking } from "../utils/speech.js";

const BASE_STEPS = [
  { key: "age", type: "age", q: "How old are you?" },
  { key: "gender", type: "gender", q: "Are you male or female?" },
  { key: "weight_kg", type: "weight", q: "How much do you weigh, in kg?" },
  { key: "hemoglobin", type: "hemoglobin", q: "Do you know your haemoglobin (g/dL) from a blood test? Say no if you do not know." },
  { key: "last_donation_date", type: "last_donation", q: "When did you last give blood? For example “3 months ago”, or say “never”." },
];

function stepsFor(gender) {
  const groups = gender === "female" ? [...QUESTION_GROUPS, FEMALE_GROUP] : QUESTION_GROUPS;
  const yesNo = groups.flatMap((g) => g.items.map(([key, q]) => ({ key, type: "yes_no", q })));
  return [...BASE_STEPS, ...yesNo];
}

/**
 * The health check as a chat: one question at a time, in the person's language, by tapping, typing or
 * speaking. The answers fill exactly the same form the long questionnaire uses, and the same server rules
 * decide the result. onComplete(values, verdict) is called at the end.
 */
export default function HealthChat({ onComplete, initialValues }) {
  const { t, language } = useI18n();
  const [values, setValues] = useState({ ...EMPTY_ELIGIBILITY, ...(initialValues || {}) });
  const [index, setIndex] = useState(0);
  const [messages, setMessages] = useState([]);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [aloud, setAloud] = useState(canSpeak());
  const [verdict, setVerdict] = useState(null);
  const [failed, setFailed] = useState(false);
  const endRef = useRef(null);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const steps = stepsFor(values.gender);
  const step = verdict ? null : steps[index];
  const speechLang = ["ur", "sd", "en"].includes(language) ? language : "en";

  function say(text) {
    setMessages((m) => [...m, { from: "bot", text }]);
    if (aloud) speak(text, speechLang);
  }

  useEffect(() => {
    const intro = `${t("Hello! I will ask a few simple questions to see if you can give blood.")} ${t(BASE_STEPS[0].q)}`;
    setMessages([{ from: "bot", text: intro }]);
    if (canSpeak()) speak(intro, speechLang);
    return () => stopSpeaking();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (endRef.current && endRef.current.scrollIntoView) endRef.current.scrollIntoView({ block: "nearest" }); }, [messages, verdict]);

  async function finish(finalValues) {
    setBusy(true); setFailed(false);
    try {
      const response = await checkEligibility(eligibilityPayload(finalValues));
      setVerdict(response.data);
      const text = response.data.eligible
        ? t("Good news: you can register as a blood donor.")
        : `${t("You cannot register as a donor right now.")} ${response.data.reasons.map((r) => t(r.message)).join(" ")}`;
      setMessages((m) => [...m, { from: "bot", text }]);
      if (aloud) speak(text, speechLang);
      if (onComplete) onComplete(finalValues, response.data);
    } catch (e) {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  function advance(nextValues, shownAnswer) {
    setValues(nextValues);
    setMessages((m) => [...m, { from: "me", text: shownAnswer }]);
    const nextSteps = stepsFor(nextValues.gender);
    const nextIndex = index + 1;
    if (nextIndex >= nextSteps.length) {
      finish(nextValues);
      return;
    }
    setIndex(nextIndex);
    const q = t(nextSteps[nextIndex].q);
    setMessages((m) => [...m, { from: "bot", text: q }]);
    if (aloud) speak(q, speechLang);
  }

  function misunderstood() {
    const text = `${t("Sorry, I did not understand. Please try again.")} ${t(step.q)}`;
    setMessages((m) => [...m, { from: "bot", text }]);
    if (aloud) speak(text, speechLang);
  }

  async function answerText(text) {
    if (!step || !text.trim()) return;
    setBusy(true);
    try {
      const response = await interpretHealthAnswer(step.type, text, step.type === "yes_no" ? step.q : null, language);
      const data = response.data;
      if (!data.understood) { setMessages((m) => [...m, { from: "me", text }]); misunderstood(); return; }
      const next = { ...valuesRef.current };
      if (step.type === "last_donation") next.last_donation_date = data.never ? "" : (data.value || "");
      else if (step.type === "hemoglobin") next.hemoglobin = data.value === null || data.value === undefined ? "" : String(data.value);
      else if (step.type === "yes_no") next[step.key] = !!data.value;
      else next[step.key] = step.type === "gender" ? data.value : String(data.value);
      advance(next, text);
    } catch (e) {
      setMessages((m) => [...m, { from: "bot", text: t("Could not check your answers. Check your internet.") }]);
    } finally {
      setBusy(false);
      setTyped("");
    }
  }

  function tapYesNo(yes) {
    if (!step || step.type !== "yes_no") return;
    advance({ ...valuesRef.current, [step.key]: yes }, yes ? t("Yes") : t("No"));
  }

  function tapGender(g) {
    if (!step || step.type !== "gender") return;
    advance({ ...valuesRef.current, gender: g }, g === "male" ? t("Male") : t("Female"));
  }

  async function handleAudio(blob) {
    setBusy(true);
    try {
      const response = await transcribeHealthAnswer(blob, speechLang);
      await answerText(response.data.transcript);
    } catch (e) {
      setMessages((m) => [...m, { from: "bot", text: t("Could not hear that. Please tap Yes or No, or type.") }]);
      setBusy(false);
    }
  }

  function restart() {
    stopSpeaking();
    setValues({ ...EMPTY_ELIGIBILITY }); setIndex(0); setVerdict(null); setFailed(false);
    const intro = `${t("Hello! I will ask a few simple questions to see if you can give blood.")} ${t(BASE_STEPS[0].q)}`;
    setMessages([{ from: "bot", text: intro }]);
    if (aloud) speak(intro, speechLang);
  }

  const answered = Math.min(index, steps.length);
  return (
    <div className="health-chat card-soft">
      <div className="list-row-top">
        <strong>💬 {t("Health check chat")}</strong>
        {canSpeak() && (
          <button type="button" className="lang-chip" aria-pressed={aloud} onClick={() => { if (aloud) stopSpeaking(); setAloud(!aloud); }}>
            {aloud ? `🔊 ${t("Reading aloud")}` : `🔇 ${t("Read aloud off")}`}
          </button>
        )}
      </div>
      <div className="chat-progress" aria-hidden="true"><div style={{ width: `${verdict ? 100 : Math.round((answered / steps.length) * 100)}%` }} /></div>
      <div className="chat-log" role="log" aria-live="polite">
        {messages.map((m, i) => <div key={i} className={`chat-bubble ${m.from}`}>{m.text}</div>)}
        <div ref={endRef} />
      </div>

      {failed && <p className="error-text" role="alert">{t("Could not check your answers. Check your internet.")} <button type="button" className="inline-btn btn-outline" onClick={() => finish(valuesRef.current)}>{t("Try again")}</button></p>}

      {step && (
        <div className="chat-input">
          {step.type === "yes_no" && (
            <div className="chat-choices">
              <button type="button" className="chat-yes" onClick={() => tapYesNo(true)} disabled={busy}>{t("Yes")}</button>
              <button type="button" className="chat-no" onClick={() => tapYesNo(false)} disabled={busy}>{t("No")}</button>
            </div>
          )}
          {step.type === "gender" && (
            <div className="chat-choices">
              <button type="button" onClick={() => tapGender("male")} disabled={busy}>{t("Male")}</button>
              <button type="button" onClick={() => tapGender("female")} disabled={busy}>{t("Female")}</button>
            </div>
          )}
          {step.type !== "yes_no" && step.type !== "gender" && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <input
                style={{ flex: 1, minWidth: "160px" }} value={typed} onChange={(e) => setTyped(e.target.value)} disabled={busy}
                inputMode={step.type === "last_donation" ? "text" : "decimal"} placeholder={t("Type your answer")}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); answerText(typed); } }}
              />
              <button type="button" onClick={() => answerText(typed)} disabled={busy || !typed.trim()}>{t("Send")}</button>
            </div>
          )}
          <div style={{ marginTop: "8px" }}>
            <MicButton onAudio={handleAudio} disabled={busy} />
            <span className="field-hint" style={{ marginInlineStart: "8px" }}>{t("or speak your answer")}</span>
          </div>
        </div>
      )}

      {verdict && (
        <div style={{ marginTop: "10px" }}>
          {verdict.eligible
            ? <p className="success-text" role="status">✅ {t("Good news: you can register as a blood donor.")}</p>
            : (
              <div className="elig-no" role="alert">
                <strong>{t("You cannot register as a donor right now.")}</strong>
                <ul>{verdict.reasons.map((r) => <li key={r.code}>{t(r.message)}</li>)}</ul>
                {verdict.retry_after_date && <p>{t("You can try again after")} <strong>{verdict.retry_after_date}</strong>.</p>}
                {verdict.permanent && <p>{t("Please speak to a doctor. You can still help by sharing LifeFlow with others.")}</p>}
              </div>
            )}
          <button type="button" className="btn-outline" onClick={restart}>{t("Start again")}</button>
        </div>
      )}
      <p className="field-hint">{t("This is a screening, not a medical diagnosis. A doctor will check you on the day you donate.")}</p>
    </div>
  );
}
