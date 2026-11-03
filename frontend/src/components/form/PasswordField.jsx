import React, { useState } from "react";
import FormField from "./FormField.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";

const EyeOpen = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOff = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.9 17.9A10.6 10.6 0 0 1 12 19.5C5.5 19.5 1.5 12 1.5 12a18.5 18.5 0 0 1 4.6-5.6M9.9 4.7A9.8 9.8 0 0 1 12 4.5C18.5 4.5 22.5 12 22.5 12a18.6 18.6 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2M2 2l20 20" />
  </svg>
);

// Password box with an eye inside it to show or hide the password. When the password is not
// strong enough the error says exactly which part is missing (see passwordError in validators.js).
export default function PasswordField({
  label = "Password", name = "password", value, onChange, error, submitted,
  autoComplete = "new-password", required = true, placeholder = "Password",
}) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [touched, setTouched] = useState(false);
  const show = touched || submitted;
  const id = `f-${name}`;

  return (
    <FormField label={label} error={error} show={show} required={required} htmlFor={id}>
      <div className="password-wrap">
        <input
          id={id} name={name} type={visible ? "text" : "password"} value={value} required={required}
          placeholder={t(placeholder)} autoComplete={autoComplete}
          onChange={onChange} onBlur={() => setTouched(true)}
          aria-invalid={show && error ? "true" : "false"}
        />
        <button type="button" className="eye-btn" onClick={() => setVisible(!visible)} aria-label={visible ? t("Hide password") : t("Show password")} title={visible ? t("Hide password") : t("Show password")}>
          {visible ? <EyeOff /> : <EyeOpen />}
        </button>
      </div>
    </FormField>
  );
}
