import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changeAdminCredentials } from "../services/api";
import { ShieldCheckIcon } from "../components/Icons.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import TextField from "../components/form/TextField.jsx";
import PasswordField from "../components/form/PasswordField.jsx";
import { nameError, emailError, passwordError, confirmPasswordError, hasErrors, serverMessage } from "../utils/validators.js";

export default function AdminChangeCredentials() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [form, setForm] = useState({ current: "", name: "", email: "", password: "", confirm: "" });
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errors = {
    current: form.current ? "" : "Please enter your current password.",
    name: nameError(form.name, false),
    email: emailError(form.email),
    password: form.password === "Admin@123" ? "Please choose something other than the default password." : passwordError(form.password),
    confirm: confirmPasswordError(form.password, form.confirm),
  };

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSubmitted(true);
    if (hasErrors(errors)) return;
    setIsSubmitting(true);
    try {
      await changeAdminCredentials(form.current, form.email.trim(), form.name.trim(), form.password);
      navigate("/admin/dashboard");
    } catch (error) {
      setErrorMessage(serverMessage(error, "Could not update your credentials. Check your current password and try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: "520px", margin: "0 auto" }}>
        <h2><ShieldCheckIcon size={22} color="#B01E28" /> {t("Secure your admin account")}</h2>
        <p className="subtitle">
          {t("You're signed in with the default admin credentials. Before you can see the rest of the dashboard, set your own username (email) and password.")}
        </p>
        {errorMessage && <p className="error-text" role="alert">{t(errorMessage)}</p>}
        <form onSubmit={handleSubmit} noValidate>
          <PasswordField label="Current password" name="current" placeholder="Default: Admin@123" value={form.current} onChange={handleChange} error={errors.current} submitted={submitted} showRules={false} autoComplete="current-password" />
          <TextField kind="name" label="Your name, optional" name="name" value={form.name} onChange={handleChange} error={errors.name} submitted={submitted} required={false} placeholder="Full name" />
          <TextField kind="email" label="New admin username (email)" name="email" value={form.email} onChange={handleChange} error={errors.email} submitted={submitted} placeholder="you@yourorganization.com" />
          <PasswordField label="New password" name="password" placeholder="New password" value={form.password} onChange={handleChange} error={errors.password} submitted={submitted} />
          <PasswordField label="Confirm new password" name="confirm" placeholder="Repeat the new password" value={form.confirm} onChange={handleChange} error={errors.confirm} submitted={submitted} showRules={false} />
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("Saving...") : t("Save and continue to dashboard")}
          </button>
        </form>
      </div>
    </div>
  );
}
