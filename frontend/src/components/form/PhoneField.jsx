import React, { useEffect, useMemo, useState } from "react";
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, AsYouType } from "libphonenumber-js/min";
import FormField from "./FormField.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";

function flag(iso) {
  return iso.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

function guessCountry() {
  const region = (navigator.language || "").split("-")[1];
  return region && getCountries().includes(region.toUpperCase()) ? region.toUpperCase() : "PK";
}

// Phone number with a drop-down list of every country and its dialling code.
// `value` is the full international number (like +923001234567) or "" while it is incomplete.
export default function PhoneField({
  label = "Phone number", name = "phone_number", value, onChange, error, submitted, required = true, hint, countryHint,
}) {
  const { t, countryName } = useI18n();
  const parsed = value ? parsePhoneNumberFromString(value) : null;
  const [country, setCountry] = useState(parsed?.country || guessCountry());
  const formatNational = (iso, digits) => new AsYouType(iso).input(digits);
  const [national, setNational] = useState(parsed ? formatNational(parsed.country || guessCountry(), parsed.nationalNumber) : "");
  const [touched, setTouched] = useState(false);
  const show = touched || submitted;
  const id = `f-${name}`;

  // When the location form says the person is in another country, the phone format follows it.
  useEffect(() => {
    if (countryHint && countryHint !== country) {
      setCountry(countryHint);
      const digits = national.replace(/\D/g, "");
      setNational(formatNational(countryHint, digits));
      emit(countryHint, digits);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryHint]);

  const countries = useMemo(
    () => getCountries().map((iso) => ({ iso, name: countryName(iso), code: getCountryCallingCode(iso) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [countryName]
  );

  function emit(nextCountry, nextNational) {
    const digits = nextNational.replace(/\D/g, "");
    if (!digits) return onChange({ target: { name, value: "" } });
    const p = parsePhoneNumberFromString(digits, nextCountry);
    // Keep the typed number even while it is still incomplete, so the error message can say so.
    onChange({ target: { name, value: p ? p.number : `+${getCountryCallingCode(nextCountry)}${digits.replace(/^0+/, "")}` } });
  }

  return (
    <FormField label={label} hint={hint} error={error} show={show} required={required} htmlFor={id}>
      <div className="phone-wrap">
        <select
          className="phone-country" value={country} aria-label={t("Country code")}
          onChange={(e) => { const iso = e.target.value; const digits = national.replace(/\D/g, ""); setCountry(iso); setNational(formatNational(iso, digits)); emit(iso, digits); }}
        >
          {countries.map((c) => (
            <option key={c.iso} value={c.iso}>{flag(c.iso)} {c.name} (+{c.code})</option>
          ))}
        </select>
        <span className="phone-code">+{getCountryCallingCode(country)}</span>
        <input
          id={id} name={name} type="tel" inputMode="numeric" autoComplete="tel-national" required={required}
          placeholder={country === "PK" ? "300 1234567" : t("Phone number")}
          value={national}
          onChange={(e) => { const digits = e.target.value.replace(/\D/g, "").slice(0, 15); setNational(formatNational(country, digits)); emit(country, digits); }}
          onBlur={() => setTouched(true)}
          aria-invalid={show && error ? "true" : "false"}
        />
      </div>
    </FormField>
  );
}
