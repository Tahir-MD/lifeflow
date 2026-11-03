import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotCheck, forgotSendCode, forgotVerify, forgotFinish } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import { useToast } from "../components/ToastContext.jsx";

/**
 * Forgot password, safely, in 3 steps:
 * 1) the username (email) is matched in the database,
 * 2) the person proves it is them: security question answer, or a 6 digit code sent to their email,
 * 3) new password + confirm password.
 */
export default function ForgotPassword() {
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [info, setInfo] = useState(null);
  const [answer, setAnswer] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  function problem(error) {
    const detail = error.response?.data?.detail;
    return typeof detail === "string" ? t(detail) : t("Something went wrong. Please try again.");
  }

  async function handleFind(event) {
    event.preventDefault();
    setErrorMessage("");
    try {
      const response = await forgotCheck(email.trim());
      setInfo(response.data);
      setStep(2);
    } catch (error) {
      setErrorMessage(problem(error));
    }
  }

  async function handleSendCode() {
    setErrorMessage(""); setNotice("");
    try {
      const response = await forgotSendCode(email.trim());
      setNotice(response.data.message);
    } catch (error) {
      setErrorMessage(problem(error));
    }
  }

  async function handleVerify(event, useCode) {
    event.preventDefault();
    setErrorMessage("");
    try {
      const response = await forgotVerify(email.trim(), useCode ? "" : answer, useCode ? code : "");
      setToken(response.data.reset_token);
      setStep(3);
    } catch (error) {
      setErrorMessage(problem(error));
    }
  }

  async function handleReset(event) {
    event.preventDefault();
    setErrorMessage("");
    if (password !== again) {
      setErrorMessage(t("The two passwords are not the same."));
      return;
    }
    try {
      await forgotFinish(token, password, again);
      toast(t("Your password has been changed. You can log in now."));
      navigate("/login", { state: { passwordChanged: true } });
    } catch (error) {
      setErrorMessage(problem(error));
    }
  }

  return (
    <div className="page auth-page">
      <div className="card">
        <h2>{t("Forgot password")}</h2>
        {errorMessage && <p className="error-text">{errorMessage}</p>}
        {notice && <p className="notice-text">{notice}</p>}

        {step === 1 && (
          <form onSubmit={handleFind}>
            <label>{t("Username (email)")}</label>
            <input type="email" placeholder={t("Email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button type="submit">{t("Find my account")}</button>
          </form>
        )}

        {step === 2 && info && (
          <>
            <p className="notice-text">✓ {t("Account found")}: <span data-no-translate>{email}</span></p>
            {!info.can_recover && <p className="error-text">{t(info.help)}</p>}
            {info.question && (
              <form onSubmit={(e) => handleVerify(e, false)}>
                <p className="subtitle">{t("Answer your security question")}:</p>
                <p><strong data-no-translate>{info.question}</strong></p>
                <input value={answer} onChange={(e) => setAnswer(e.target.value)} required />
                <button type="submit">{t("Check my answer")}</button>
              </form>
            )}
            {info.email_code_available && (
              <form onSubmit={(e) => handleVerify(e, true)} style={{ marginTop: 14 }}>
                <p className="subtitle">{t("Or get a 6 digit code on your email")}:</p>
                <button type="button" className="btn-outline" onClick={handleSendCode}>{t("Send me a code")}</button>
                <input inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
                <button type="submit" disabled={code.length < 6}>{t("Check the code")}</button>
              </form>
            )}
            <button type="button" className="btn-outline" onClick={() => { setStep(1); setErrorMessage(""); setNotice(""); }}>
              {t("Use a different username")}
            </button>
          </>
        )}

        {step === 3 && (
          <form onSubmit={handleReset}>
            <p className="notice-text">✓ {t("Verified. Choose your new password.")}</p>
            <label>{t("New password")}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            <label>{t("Confirm new password")}</label>
            <input type="password" value={again} onChange={(e) => setAgain(e.target.value)} required minLength={8} />
            <button type="submit">{t("Change password")}</button>
          </form>
        )}
      </div>
      <p className="empty-state"><Link to="/login">{t("Back to log in")}</Link></p>
    </div>
  );
}
