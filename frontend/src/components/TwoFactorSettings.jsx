import React, { useEffect, useState } from "react";
import { get2FAStatus, setup2FA, enable2FA, disable2FA } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";

/** Lets a hospital or admin account turn TOTP-based 2FA on or off, with a QR code for the setup step. */
export default function TwoFactorSettings({ role }) {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(null);
  const [pending, setPending] = useState(null); // { secret, otpauth_uri } once /setup has been called
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function load() {
    get2FAStatus(role).then((r) => setEnabled(r.data.two_factor_enabled)).catch(() => {});
  }
  useEffect(load, [role]);

  async function startSetup() {
    setError(""); setMessage("");
    try {
      const response = await setup2FA(role);
      setPending(response.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not start setup.");
    }
  }

  async function confirmEnable() {
    setError(""); setMessage("");
    try {
      await enable2FA(role, code);
      setPending(null);
      setCode("");
      setMessage("Two-factor authentication is now on for this account.");
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || "Incorrect code.");
    }
  }

  async function handleDisable() {
    setError(""); setMessage("");
    try {
      await disable2FA(role, password);
      setPassword("");
      setMessage("Two-factor authentication has been turned off.");
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || "Incorrect password.");
    }
  }

  if (enabled === null) return null;

  return (
    <div className="card">
      <h2>{t("Two-factor authentication")}</h2>
      <p className="subtitle">{t("Adds a second step (a 6-digit code from an authenticator app) to logging in — recommended, since this account can see sensitive data.")}</p>
      {error && <p className="error-text">{t(error)}</p>}
      {message && <p className="notice-text">{t(message)}</p>}

      {enabled && !pending && (
        <>
          <p className="empty-state"><span className="source-tag">{t("2FA is ON")}</span></p>
          <label>{t("Enter your password to turn it off")}</label>
          <input type="password" placeholder={t("Current password")} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn-outline" onClick={handleDisable}>{t("Turn off 2FA")}</button>
        </>
      )}

      {!enabled && !pending && (
        <button onClick={startSetup}>{t("Set up two-factor authentication")}</button>
      )}

      {pending && (
        <>
          <p className="empty-state">{t("Scan this in Google Authenticator, Authy, or any TOTP app, then enter the code it shows.")}</p>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pending.otpauth_uri)}`}
            alt={t("2FA setup QR code")} style={{ borderRadius: "10px", margin: "10px 0" }}
          />
          <p className="empty-state">{t("Can't scan? Enter this key manually:")} <code>{pending.secret}</code></p>
          <label>{t("6-digit code")}</label>
          <input type="text" inputMode="numeric" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
          <button onClick={confirmEnable}>{t("Confirm and turn on")}</button>{" "}
          <button className="btn-outline" onClick={() => setPending(null)}>{t("Cancel")}</button>
        </>
      )}
    </div>
  );
}
