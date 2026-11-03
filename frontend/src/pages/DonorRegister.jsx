import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useNavigate, Link } from "react-router-dom";
import { registerDonor } from "../services/api";
import { useToast } from "../components/ToastContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import TextField from "../components/form/TextField.jsx";
import PasswordField from "../components/form/PasswordField.jsx";
import PhoneField from "../components/form/PhoneField.jsx";
import FormField from "../components/form/FormField.jsx";
import PhoneVerify from "../components/PhoneVerify.jsx";
import EligibilityForm, { EMPTY_ELIGIBILITY, eligibilityPayload } from "../components/EligibilityForm.jsx";
import HealthChat from "../components/HealthChat.jsx";
import LocationPicker, { EMPTY_LOCATION, countryIsoFromName } from "../components/form/LocationPicker.jsx";
import {
  nameError, emailError, passwordError, confirmPasswordError, phoneError, cnicError, formatCnic, locationErrors, hasErrors, serverMessage,
} from "../utils/validators.js";

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

export default function DonorRegister({ roleSelect = null, shared = {}, onShared = () => {}, onDone = () => {} }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { toast } = useToast();
  const [form, setForm] = useState({ full_name: shared.full_name || "", email: shared.email || "", password: shared.password || "", confirm: shared.confirm || "", blood_type: "O+", phone_number: "", cnic_number: "" });
  const [location, setLocation] = useState(EMPTY_LOCATION);
  const [searchParams] = useSearchParams();
  const referralCode = (searchParams.get("ref") || "").trim().toUpperCase().slice(0, 12);
  const [elig, setElig] = useState(EMPTY_ELIGIBILITY);
  const [verdict, setVerdict] = useState(null);
  const [chatMode, setChatMode] = useState(false);
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
    if (!verdict) {
      setErrorMessage("Please answer all the health questions first.");
      return;
    }
    if (!verdict.eligible) {
      setErrorMessage("You cannot register as a donor right now.");
      return;
    }
    if (!phoneToken) {
      setErrorMessage("Please verify your phone number with the code we send you.");
      return;
    }
    setBusy(true);
    try {
      const { confirm, ...rest } = form;
      await registerDonor({
        ...rest, full_name: form.full_name.trim(), email: form.email.trim(), ...location,
        eligibility: eligibilityPayload(elig), phone_token: phoneToken, referral_code: referralCode || null,
      });
      toast(t("Registered successfully. The admin will verify your account before you can donate."));
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
        <h2>{t("Donor sign up")}</h2>
        {errorMessage && <p className="error-text" role="alert">{t(errorMessage)}</p>}
        <form onSubmit={handleSubmit} noValidate autoComplete="off">
          {roleSelect}
          <TextField kind="name" label="Full name" name="full_name" value={form.full_name} onChange={handleChange} error={errors.full_name} submitted={submitted} placeholder="Full name" autoComplete="name" hint="Write your name in letters only" />
          <TextField kind="email" label="Email" name="email" value={form.email} onChange={handleChange} error={errors.email} submitted={submitted} placeholder="Email" autoComplete="off" />
          <PasswordField value={form.password} onChange={handleChange} error={errors.password} submitted={submitted} />
          <PasswordField label="Type the password again" name="confirm" placeholder="Type the password again" value={form.confirm} onChange={handleChange} error={errors.confirm} submitted={submitted} showRules={false} />

          <FormField label="Blood type" required htmlFor="f-blood_type" hint="Choose your blood group. If unsure, ask at a lab or hospital.">
            <select id="f-blood_type" name="blood_type" value={form.blood_type} onChange={handleChange}>
              {BLOOD_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </FormField>

          <PhoneField countryHint={countryIsoFromName(location.country)} value={form.phone_number} onChange={handleChange} error={errors.phone_number} submitted={submitted} hint="Choose your country, then write your number" />

          <TextField label="CNIC number" name="cnic_number" value={form.cnic_number} onChange={handleChange} error={errors.cnic_number} submitted={submitted} placeholder="42101-1234567-1" inputMode="numeric" hint="13 digits of your national ID card" />
          {referralCode && <p className="notice-text">🤝 {t("You were invited by a friend. Your invite code")}: <strong>{referralCode}</strong></p>}

          <PhoneVerify phone={form.phone_number} phoneIsValid={!errors.phone_number && !!form.phone_number} email={form.email} emailIsValid={!errors.email && !!form.email} onToken={setPhoneToken} />

          <div className="no-print" style={{ margin: "8px 0" }}>
            <button type="button" className="btn-outline" onClick={() => setChatMode(!chatMode)}>
              💬 {chatMode ? t("Hide the chat") : t("Answer the health questions by chat or voice")}
            </button>
          </div>
          {chatMode && <HealthChat onComplete={(values, result) => { setElig(values); setVerdict(result); }} />}

          <EligibilityForm values={elig} onChange={setElig} onResult={setVerdict} submitted={submitted} />

          <LocationPicker value={location} onChange={setLocation} errors={locErrors} submitted={submitted} title="Where do you live?" hint="Write your place in simple words. You do not need to know latitude or longitude." />

          <button type="submit" disabled={busy || (verdict && !verdict.eligible)}>{busy ? t("Please wait...") : t("Create account")}</button>
        </form>
      </div>
      <p className="empty-state">{t("Already registered?")} <Link to="/login">{t("Log in here")}</Link>.</p>
    </div>
  );
}
