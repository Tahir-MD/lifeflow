import React from "react";
import LocationPicker, { EMPTY_LOCATION } from "./LocationPicker.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { locationErrors } from "../../utils/validators.js";

// "Where is the blood needed?" -- by default the place you registered with, so most people
// never have to type anything. Tick the box to choose a different place with the same word-based picker.
export default function RequestLocation({ profile, value, onChange, submitted }) {
  const { t } = useI18n();
  const registered = profile ? [profile.area, profile.city].filter(Boolean).join(", ") : "";
  return (
    <div className="field">
      <label>{t("Where is the blood needed?")}</label>
      <p className="field-hint">
        {registered
          ? `${t("Your registered place")}: ${registered}`
          : t("Your registered place will be used.")}
      </p>
      <label className="check-row">
        <input
          type="checkbox" checked={value.other}
          onChange={(e) => onChange({ ...EMPTY_LOCATION, ...(e.target.checked ? {} : {}), other: e.target.checked })}
        />
        {t("The blood is needed at a different place")}
      </label>
      {value.other && (
        <LocationPicker
          value={value}
          onChange={(next) => onChange({ ...next, other: true })}
          errors={locationErrors(value)}
          submitted={submitted}
          title="Where is the blood needed?"
        />
      )}
    </div>
  );
}
