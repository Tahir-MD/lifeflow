import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerHospital } from "../services/api";
import { useToast } from "../components/ToastContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import TextField from "../components/form/TextField.jsx";
import PasswordField from "../components/form/PasswordField.jsx";
import PhoneField from "../components/form/PhoneField.jsx";
import PhoneVerify from "../components/PhoneVerify.jsx";
import LocationPicker, { EMPTY_LOCATION, countryIsoFromName } from "../components/form/LocationPicker.jsx";
import {
  orgNameError, emailError, passwordError, confirmPasswordError, phoneError, cnicError, formatCnic, locationErrors, hasErrors, serverMessage,
} from "../utils/validators.js";

function licenseError(value) {
  const v = (value || "").trim();
  if (!v) return "Please enter the license number.";
  if (!/^[A-Za-z0-9][A-Za-z0-9\-/ ]{3,29}$/.test(v)) return "License number must be 4 to 30 letters or numbers.";
  return "";
}

export default function HospitalRegister({ roleSelect = null, shared = {}, onShared = () => {}, onDone = () => {} }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: shared.full_name || "", email: shared.email || "", password: shared.password || "", confirm: shared.confirm || "", license_number: "", phone_number: "", cnic_number: "" });
  const [location, setLocation] = useState(EMPTY_LOCATION);
  const [phoneToken, setPhoneToken] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const locErrors = locationErrors(location);
  const errors = {
    name: orgNameError(form.name),
    email: emailError(form.email),
    password: passwordError(form.password),
    confirm: confirmPasswordError(form.password, form.confirm),
    license_number: licenseError(form.license_number),
    phone_number: phoneError(form.phone_number),
    cnic_number: cnicError(form.cnic_number),
  };

  function handleChange(event) {
    const { name, value } = event.target;
    const next = { ...form, [name]: name === "cnic_number" ? formatCnic(value) : value };
    setForm(next);
    onShared({ full_name: next.name, email: next.email, password: next.password, confirm: next.confirm });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSubmitted(true);
    if (hasErrors(errors) || hasErrors({ a: locErrors.city, b: locErrors.area, c: locErrors.country, d: locErrors.map })) {
      setErrorMessage("Some answers need to be fixed. Please look at the red messages.");
      return;
    }
    if (!phoneToken) {
      setErrorMessage("Please verify your phone number with the code we send you.");
      return;
    }
    setBusy(true);
    try {
      const { confirm, ...rest } = form;
      await registerHospital({ phone_token: phoneToken, ...rest, name: form.name.trim(), email: form.email.trim(), license_number: form.license_number.trim(), ...location });
      toast(t("Registered successfully. The admin will verify your hospital before you can use it."));
      onDone();
    } catch (error) {
      setErrorMessage(serverMessage(error, "Sign up failed. Please check your details."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h2>{t("Hospital sign up")}</h2>
        {errorMessage && <p className="error-text" role="alert">{t(errorMessage)}</p>}
        <form onSubmit={handleSubmit} noValidate autoComplete="off">
          {roleSelect}
          <TextField kind="text" label="Hospital name" name="name" value={form.name} onChange={handleChange} error={errors.name} submitted={submitted} placeholder="Hospital name" />
          <TextField kind="email" label="Email" name="email" value={form.email} onChange={handleChange} error={errors.email} submitted={submitted} placeholder="Email" autoComplete="off" />
          <PasswordField value={form.password} onChange={handleChange} error={errors.password} submitted={submitted} />
          <PasswordField label="Type the password again" name="confirm" placeholder="Type the password again" value={form.confirm} onChange={handleChange} error={errors.confirm} submitted={submitted} showRules={false} />
          <TextField label="CNIC number of the person registering" name="cnic_number" value={form.cnic_number} onChange={handleChange} error={errors.cnic_number} submitted={submitted} placeholder="42101-1234567-1" inputMode="numeric" hint="13 digits of the national ID card" />
          <TextField label="License number" name="license_number" value={form.license_number} onChange={handleChange} error={errors.license_number} submitted={submitted} placeholder="License number" hint="The number on your hospital's registration certificate" />
          <PhoneField countryHint={countryIsoFromName(location.country)} value={form.phone_number} onChange={handleChange} error={errors.phone_number} submitted={submitted} hint="The hospital's main phone number" />
          <PhoneVerify phone={form.phone_number} phoneIsValid={!errors.phone_number && !!form.phone_number} email={form.email} emailIsValid={!errors.email && !!form.email} onToken={setPhoneToken} />

          <LocationPicker value={location} onChange={setLocation} errors={locErrors} submitted={submitted} title="Where is the hospital?" hint="Write the hospital's place in simple words." />

          <button type="submit" disabled={busy}>{busy ? t("Please wait...") : t("Create account")}</button>
        </form>
      </div>
      <p className="empty-state">{t("Already registered?")} <Link to="/login">{t("Log in here")}</Link>.</p>
    </div>
  );
}
