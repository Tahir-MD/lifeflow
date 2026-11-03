import React, { useMemo, useState } from "react";
import { getCountries } from "libphonenumber-js/min";
import FormField from "./FormField.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { PAKISTAN, PAKISTAN_PROVINCES } from "../../utils/pakistan.js";

export const EMPTY_LOCATION = { village: "", area: "", city: "", state: "", country: "Pakistan", latitude: null, longitude: null };

const englishNames = (() => {
  try { return new Intl.DisplayNames(["en"], { type: "region" }); } catch (e) { return null; }
})();
const englishName = (iso) => (englishNames ? englishNames.of(iso) : iso);

// English country name -> two letter code (used to match the phone format to the country).
export function countryIsoFromName(name) {
  return getCountries().find((iso) => englishName(iso) === name) || null;
}

const OTHER = "__other__";

// Where do you live? Typed by hand, no map and no GPS.
//   Pakistan: pick the province, then the city from a list (or "Other" and type it).
//   Any other country: type the province / state (optional) and the city or town.
//   Area or village is always optional.
export default function LocationPicker({ value, onChange, errors = {}, submitted, title = "Where are you?", hint }) {
  const { t, countryName } = useI18n();
  const [touched, setTouched] = useState({});
  const [otherCity, setOtherCity] = useState(false);

  const countries = useMemo(
    () => getCountries().map((iso) => ({ iso, english: englishName(iso), label: countryName(iso) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [countryName]
  );

  const isPakistan = value.country === "Pakistan";
  const cities = isPakistan && value.state ? PAKISTAN[value.state] || [] : [];
  const cityIsListed = cities.includes(value.city);
  const showCityBox = !isPakistan || otherCity || (value.city && !cityIsListed);

  const show = (field) => touched[field] || submitted;
  const touch = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const set = (patch) => onChange({ ...value, ...patch });

  function changeCountry(e) { setOtherCity(false); set({ country: e.target.value, state: "", city: "" }); }
  function changeProvince(e) { setOtherCity(false); set({ state: e.target.value, city: "" }); }
  function changeCityList(e) {
    if (e.target.value === OTHER) { setOtherCity(true); set({ city: "" }); }
    else { setOtherCity(false); set({ city: e.target.value }); }
  }

  return (
    <fieldset className="location-box">
      <legend>{t(title)}</legend>

      <div className="location-grid">
        <FormField label="Country" error={errors.country} show={show("country")} required htmlFor="f-country">
          <select id="f-country" name="country" value={value.country} onChange={changeCountry} onBlur={() => touch("country")}>
            {countries.map((c) => <option key={c.iso} value={c.english}>{c.label}</option>)}
          </select>
        </FormField>

        {isPakistan ? (
          <FormField label="Province" error={errors.state} show={show("state")} required htmlFor="f-state">
            <select id="f-state" name="state" value={value.state} onChange={changeProvince} onBlur={() => touch("state")}>
              <option value="">{t("Choose your province")}</option>
              {PAKISTAN_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </FormField>
        ) : (
          <FormField label="Province / State" error={errors.state} show={show("state")} required={false} htmlFor="f-state">
            <input id="f-state" name="state" value={value.state} onChange={(e) => set({ state: e.target.value })} onBlur={() => touch("state")} placeholder={t("Province / State")} autoComplete="address-level1" />
          </FormField>
        )}

        {isPakistan && (
          <FormField label="City" error={showCityBox ? undefined : errors.city} show={show("city")} required htmlFor="f-city-list">
            <select
              id="f-city-list" value={showCityBox ? OTHER : value.city} onChange={changeCityList}
              onBlur={() => touch("city")} disabled={!value.state}
            >
              <option value="">{value.state ? t("Choose your city") : t("Choose the province first")}</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              {value.state && <option value={OTHER}>{t("Other (write my city)")}</option>}
            </select>
          </FormField>
        )}

        {showCityBox && (
          <FormField label={isPakistan ? "Your city" : "City / Town"} error={errors.city} show={show("city")} required htmlFor="f-city">
            <input id="f-city" name="city" value={value.city} onChange={(e) => set({ city: e.target.value })} onBlur={() => touch("city")} placeholder={t("City / Town")} autoComplete="address-level2" />
          </FormField>
        )}

        <FormField label="Area or village" error={errors.area} show={show("area")} required={false} htmlFor="f-area">
          <input id="f-area" name="area" value={value.area} onChange={(e) => set({ area: e.target.value })} onBlur={() => touch("area")} placeholder={t("Area or village")} autoComplete="address-level3" />
        </FormField>
      </div>
    </fieldset>
  );
}
