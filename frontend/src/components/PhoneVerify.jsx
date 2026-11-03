import React, { useEffect, useState } from "react";
import { sendPhoneCode, verifyPhoneCode, getOtpChannels } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import { serverMessage } from "../utils/validators.js";

/**
 * "Prove this is really you": sends a 6-digit code by SMS, WhatsApp or EMAIL and checks it.
 *  - phone / phoneIsValid : the full international number from PhoneField
 *  - email / emailIsValid : the email from the form (used when the person chooses the email code)
 * onToken(token) is called with the proof once verified, and with "" if the number/email changes.
 * Only the ways that are really set up on the server are offered. If none are (testing on a laptop),
 * all three are shown and the code appears on screen.
 */
export default function PhoneVerify({ phone, phoneIsValid, email = "", emailIsValid = false, onToken }) {
  const { t } = useI18n();
  const [available, setAvailable] = useState({ sms: true, whatsapp: true, email: true });
  const [channel, setChannel] = useState("sms");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState("");   // "" | "phone" | "email"
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");
  const [wait, setWait] = useState(0);

  useEffect(() => {
    getOtpChannels().then((r) => {
      const found = r.data;
      const none = !found.sms && !found.whatsapp && !found.email;
      const next = none ? { sms: true, whatsapp: true, email: true } : found;
      setAvailable(next);
      setChannel(next.sms ? "sms" : next.email ? "email" : "whatsapp");
    }).catch(() => {});
  }, []);

  const target = channel === "email" ? email.trim().toLowerCase() : phone;
  const targetValid = channel === "email" ? emailIsValid : phoneIsValid;

  // If the person edits the number / email after verifying, the proof no longer applies.
  useEffect(() => {
    if (verified && target !== sentTo) {
      setVerified("");
      setCode("");
      setSentTo("");
      setMessage("");
      onToken("");
    }
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function send() {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const response = await sendPhoneCode(channel === "email" ? "" : phone, channel, channel === "email" ? email.trim() : "");
      setSentTo(target);
      setDevCode(response.data.dev_code || "");
      setMessage(channel === "email" ? t("A 6-digit code was sent to your email.") : t("A 6-digit code was sent to your phone."));
      setWait(45);
    } catch (err) {
      setError(serverMessage(err, "Could not send the code. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function check() {
    setError("");
    setBusy(true);
    try {
      const response = await verifyPhoneCode(channel === "email" ? "" : sentTo || phone, code.trim(), channel === "email" ? email.trim() : "");
      setVerified(channel === "email" ? "email" : "phone");
      setMessage("");
      onToken(response.data.phone_token);
    } catch (err) {
      setError(serverMessage(err, "This code is wrong or has expired. Please ask for a new one."));
    } finally {
      setBusy(false);
    }
  }

  if (verified) {
    return <p className="success-text" role="status">✅ {verified === "email" ? t("Email verified") : t("Phone number verified")}</p>;
  }

  return (
    <div className="phone-verify">
      <div className="phone-verify-row">
        <select value={channel} onChange={(e) => { setChannel(e.target.value); setSentTo(""); setCode(""); setMessage(""); setDevCode(""); }} aria-label={t("How should we send the code?")}>
          {available.sms && <option value="sms">{t("Send by SMS")}</option>}
          {available.whatsapp && <option value="whatsapp">{t("Send by WhatsApp")}</option>}
          {available.email && <option value="email">{t("Send by email")}</option>}
        </select>
        <button type="button" className="btn-outline" onClick={send} disabled={!targetValid || busy || wait > 0}>
          {wait > 0 ? `${t("Send me the code")} (${wait})` : t("Send me the code")}
        </button>
      </div>
      {!targetValid && (
        <p className="field-hint">{channel === "email" ? t("First write a correct email above.") : t("First write a correct phone number above.")}</p>
      )}
      {message && <p className="notice-text">{message}</p>}
      {devCode && <p className="field-hint">{t("Testing mode: email is not set up, so your code is")} <strong>{devCode}</strong></p>}
      {sentTo && (
        <div className="phone-verify-row">
          <input
            inputMode="numeric" maxLength={6} value={code} placeholder={t("6-digit code")}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} aria-label={t("6-digit code")}
          />
          <button type="button" onClick={check} disabled={code.length !== 6 || busy}>{t("Verify")}</button>
        </div>
      )}
      {error && <p className="error-text" role="alert">{error}</p>}
    </div>
  );
}
