import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { loginAny, verify2FALogin, getMyAdminProfile } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import TextField from "../components/form/TextField.jsx";
import PasswordField from "../components/form/PasswordField.jsx";
import { emailError } from "../utils/validators.js";

const DASHBOARDS = {
  donor: "/donor/dashboard",
  receiver: "/receiver/dashboard",
  hospital: "/hospital/dashboard",
  staff: "/staff/dashboard",
  admin: "/admin/dashboard",
};

/** The one and only login form, for donors, patients, hospitals, staff and admins. */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [tempToken, setTempToken] = useState(null);
  const [pendingRole, setPendingRole] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function finish(role, accessToken) {
    localStorage.setItem("lifeflow_token", accessToken);
    localStorage.setItem("lifeflow_role", role);
    localStorage.setItem("lifeflow_feedback_due", "1"); // the app rating pop up shows once after each login
    window.dispatchEvent(new Event("lifeflow-login"));
    if (role === "admin") {
      try {
        const profile = await getMyAdminProfile();
        if (profile.data.must_change_password) {
          navigate("/admin/change-credentials");
          return;
        }
      } catch (error) {
        // Fall through to the dashboard.
      }
    }
    navigate(DASHBOARDS[role] || "/");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    if (emailError(email) || !password) return;
    setErrorMessage("");
    setBusy(true);
    try {
      const response = await loginAny(email.trim(), password);
      if (response.data.requires_2fa) {
        setTempToken(response.data.temp_token);
        setPendingRole(response.data.role);
        return;
      }
      await finish(response.data.role, response.data.access_token);
    } catch (error) {
      setErrorMessage(t("Incorrect email or password."));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(event) {
    event.preventDefault();
    setErrorMessage("");
    try {
      const response = await verify2FALogin(tempToken, code);
      await finish(pendingRole, response.data.access_token);
    } catch (error) {
      setErrorMessage(t("Incorrect or expired code. Please try again."));
    }
  }

  if (tempToken) {
    return (
      <div className="page">
        <div className="card">
          <h2>{t("Enter your 6 digit code")}</h2>
          {errorMessage && <p className="error-text">{errorMessage}</p>}
          <form onSubmit={handleVerify}>
            <label>{t("Authentication code")}</label>
            <input type="text" inputMode="numeric" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} required />
            <button type="submit">{t("Verify and log in")}</button>
          </form>
          <button className="btn-outline" style={{ marginTop: "10px" }} onClick={() => setTempToken(null)}>{t("Back")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page auth-page">
      <div className="card">
        <h2>{t("Log in")}</h2>
        {location.state && location.state.registered && <p className="notice-text">{t("Registered successfully. Please log in.")}</p>}
        {location.state && location.state.passwordChanged && <p className="notice-text">{t("Your password has been changed. You can log in now.")}</p>}
        {errorMessage && <p className="error-text">{errorMessage}</p>}
        <form onSubmit={handleSubmit} noValidate autoComplete="off">
          <TextField kind="email" label="Email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} error={emailError(email)} submitted={submitted} placeholder="Email" autoComplete="off" />
          <PasswordField showRules={false} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={password ? "" : "Please enter your password."} submitted={submitted} />
          <button type="submit" disabled={busy}>{t("Log in")}</button>
        </form>
        <p className="forgot-link"><Link to="/forgot-password">{t("Forgot password?")}</Link></p>
      </div>
      <p className="empty-state create-account">{t("New here?")} <Link to="/signup">{t("Create new account")}</Link></p>
    </div>
  );
}
