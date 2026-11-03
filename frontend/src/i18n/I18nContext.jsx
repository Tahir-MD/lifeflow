import React, { createContext, useContext, useEffect, useState } from "react";
import { translations, LANGUAGES } from "./translations.js";
import { startAutoTranslate, stopAutoTranslate } from "./autoTranslate.js";

const I18nContext = createContext({ language: "en", setLanguage: () => {}, t: (k) => k, countryName: (c) => c, LANGUAGES });

const RTL_LANGUAGES = ["ur", "sd", "ar"];

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => localStorage.getItem("lifeflow_lang") || "en");

  useEffect(() => {
    localStorage.setItem("lifeflow_lang", language);
    document.documentElement.lang = language;
    document.documentElement.dir = RTL_LANGUAGES.includes(language) ? "rtl" : "ltr";
    document.body.classList.toggle("lang-rtl", RTL_LANGUAGES.includes(language));
    // Any screen text that is not written with t() directly is still translated here.
    if (language === "en") stopAutoTranslate();
    else startAutoTranslate(language);
    return () => stopAutoTranslate();
  }, [language]);

  // t("Some English sentence", { n: 3 })  or  t("nav.about").
  // Looks the text up in the chosen language, falls back to English, and fills {placeholders}.
  const t = (key, params) => {
    if (key === undefined || key === null) return "";
    let text = (translations[language] && translations[language][key]) || (translations.en && translations.en[key]) || key;
    if (params) {
      Object.keys(params).forEach((name) => {
        text = text.split(`{${name}}`).join(params[name]);
      });
    }
    return text;
  };

  // Country names in the chosen language, straight from the browser (no list to maintain).
  const countryName = (isoCode) => {
    try {
      return new Intl.DisplayNames([language], { type: "region" }).of(isoCode) || isoCode;
    } catch (error) {
      return isoCode;
    }
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage: setLanguageState, t, countryName, LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
