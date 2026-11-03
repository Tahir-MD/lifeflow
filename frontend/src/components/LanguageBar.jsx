import React from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext.jsx";

// Big, easy language buttons shown on every sign-up, login and password page, so a person who
// cannot read English can pick their own language before filling anything in.
export default function LanguageBar() {
  const { pathname } = useLocation();
  const { t, language, setLanguage, LANGUAGES } = useI18n();
  if (!/(login|register|forgot-password)/.test(pathname)) return null;
  return (
    <div className="language-bar" role="group" aria-label={t("Choose your language")}>
      <span className="language-bar-title">🌐 {t("Choose your language")}</span>
      {Object.entries(LANGUAGES).map(([code, label]) => (
        <button
          key={code} type="button" onClick={() => setLanguage(code)}
          className={`lang-chip ${language === code ? "active" : ""}`} aria-pressed={language === code}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
