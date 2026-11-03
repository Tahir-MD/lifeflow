import React from "react";
import { useI18n } from "../../i18n/I18nContext.jsx";

// One labelled form row: label, optional help text in simple words, the input itself, and a clear error.
// `error` is a message key (string) or { key, params }; it is only shown once `show` is true.
export function ErrorText({ error }) {
  const { t } = useI18n();
  if (!error) return null;
  return <p className="field-error" role="alert">{typeof error === "string" ? t(error) : t(error.key, error.params)}</p>;
}

export default function FormField({ label, hint, error, show, required, htmlFor, children }) {
  const { t } = useI18n();
  return (
    <div className={`field ${show && error ? "has-error" : ""}`}>
      {label && (
        <label htmlFor={htmlFor}>
          {t(label)}
          {required ? <span className="req" aria-hidden="true"> *</span> : <span className="opt"> ({t("optional")})</span>}
        </label>
      )}
      {children}
      {show && <ErrorText error={error} />}
    </div>
  );
}
