import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerReceiver } from "../services/api";
import { useToast } from "../components/ToastContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import TextField from "../components/form/TextField.jsx";
import PasswordField from "../components/form/PasswordField.jsx";
import PhoneField from "../components/form/PhoneField.jsx";
import PhoneVerify from "../components/PhoneVerify.jsx";
import LocationPicker, { EMPTY_LOCATION, countryIsoFromName } from "../components/form/LocationPicker.jsx";
import {
  nameError, emailError, passwordError, confirmPasswordError, phoneError, cnicError, formatCnic, locationErrors, hasErrors, serverMessage,
} from "../utils/validators.js";

export default function ReceiverRegister({ roleSelect = null, shared = {}, onShared = () => {}, onDone = () => {} }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { toast } = useToast();
  const [form, setForm] = useState({
    full_name: shared.full_name || "", email: shared.email || "", password: shared.password || "", confirm: shared.confirm || "", phone_number: "", cnic_number: "", address: "", patient_name: "",
  });
  const [location, setLocation] = useState(EMPTY_LOCATION);
  const [phoneToken, setPhoneToken] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const locErrors = locationErrors(location);
  const errors = {
    full_name: nameError(form.full_name),
    email: emailError(form.email),
    password: passwordError(form.password),
    confirm: confirmPasswordError(form.password, form.confirm),
    phone_number: phoneError(form.phone_number),
    cnic_number: cnicError(form.cnic_number),
    patient_name: nameError(form.patient_name, false),
  };

  function handleChange(event) {
    const { name, value } = event.target;
    const next = { ...form, [name]: name === "cnic_number" ? formatCnic(value) : value };
    setForm(next);
    onShared({ full_name: next.full_name, email: next.email, password: next.password, confirm: next.confirm });
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
      await registerReceiver({
        phone_token: phoneToken,
        ...rest, full_name: form.full_name.trim(), email: form.email.trim(),
        patient_name: form.patient_name.trim() || null, ...location,
      });
      toast(t("Registered successfully. You can log in now."));
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
        <h2>{t("Patient sign up")}</h2>
        {errorMessage && <p className="error-text" role="alert">{t(errorMessage)}</p>}
        <form onSubmit={handleSubmit} noValidate autoComplete="off">
          {roleSelect}
          <TextField kind="name" label="Your full name" name="full_name" value={form.full_name} onChange={handleChange} error={errors.full_name} submitted={submitted} placeholder="Your full name" autoComplete="name" hint="Write your name in letters only" />
          <TextField kind="email" label="Email" name="email" value={form.email} onChange={handleChange} error={errors.email} submitted={submitted} placeholder="Email" autoComplete="off" />
          <PasswordField value={form.password} onChange={handleChange} error={errors.password} submitted={submitted} />
          <PasswordField label="Type the password again" name="confirm" placeholder="Type the password again" value={form.confirm} onChange={handleChange} error={errors.confirm} submitted={submitted} showRules={false} />
          <PhoneField countryHint={countryIsoFromName(location.country)} value={form.phone_number} onChange={handleChange} error={errors.phone_number} submitted={submitted} hint="Choose your country, then write your number" />
          <PhoneVerify phone={form.phone_number} phoneIsValid={!errors.phone_number && !!form.phone_number} email={form.email} emailIsValid={!errors.email && !!form.email} onToken={setPhoneToken} />
          <TextField label="CNIC number" name="cnic_number" value={form.cnic_number} onChange={handleChange} error={errors.cnic_number} submitted={submitted} placeholder="42101-1234567-1" inputMode="numeric" hint="13 digits of your national ID card" />
          <TextField kind="name" label="Patient name, if different from you" name="patient_name" value={form.patient_name} onChange={handleChange} error={errors.patient_name} submitted={submitted} required={false} placeholder="Patient name" />

          <LocationPicker value={location} onChange={setLocation} errors={locErrors} submitted={submitted} title="Where is the patient?" hint="Write the place in simple words. Nearby donors and hospitals will be found from it." />
          <TextField label="House number or street, optional" name="address" value={form.address} onChange={handleChange} required={false} placeholder="House number or street" maxLength={150} />

          <button type="submit" disabled={busy}>{busy ? t("Please wait...") : t("Create account")}</button>
        </form>
      </div>
      <p className="empty-state">{t("Already registered?")} <Link to="/login">{t("Log in here")}</Link>.</p>
    </div>
  );
}
