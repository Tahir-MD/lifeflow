import React, { useEffect, useRef, useState } from "react";
import { checkEligibility } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import FormField from "./form/FormField.jsx";

// Every yes/no question. The keys match backend/app/services/eligibility_service.py.
export const QUESTION_GROUPS = [
  {
    title: "Right now",
    items: [
      ["unwell_today", "Are you unwell today (fever, cold, cough, sore throat)?"],
      ["antibiotics_recent", "Did you take antibiotics or have an infection in the last 2 weeks?"],
      ["dental_week", "Did you have a tooth taken out or dental work in the last week?"],
      ["alcohol_24h", "Did you drink alcohol in the last 24 hours?"],
      ["vaccine_4w", "Did you have a vaccination in the last 4 weeks?"],
    ],
  },
  {
    title: "Last few months",
    items: [
      ["malaria_3m", "Did you have malaria in the last 3 months?"],
      ["tattoo_6m", "Did you get a tattoo, piercing or acupuncture in the last 6 months?"],
      ["surgery_6m", "Did you have major surgery in the last 6 months?"],
      ["transfusion_12m", "Did you receive blood from someone else in the last 12 months?"],
      ["exposure_12m", "Did a needle prick you, or did you live with someone who has hepatitis or HIV, in the last 12 months?"],
    ],
  },
  {
    title: "Long-term health",
    items: [
      ["hiv_aids", "Do you have HIV / AIDS?"],
      ["hepatitis", "Do you have hepatitis B or C?"],
      ["heart_disease", "Do you have heart disease?"],
      ["cancer", "Have you ever had cancer?"],
      ["bleeding_disorder", "Do you have a bleeding disorder or thalassemia major?"],
      ["seizures", "Do you have seizures or epilepsy?"],
      ["insulin_diabetes", "Do you have diabetes and use insulin?"],
      ["kidney_liver", "Do you have long-term kidney or liver disease?"],
      ["uncontrolled_bp", "Do you have high blood pressure that is not controlled?"],
      ["blood_thinners", "Do you take blood thinners (for example warfarin)?"],
      ["injected_drugs", "Have you ever used injected drugs that were not prescribed by a doctor?"],
    ],
  },
];
export const FEMALE_GROUP = {
  title: "For women",
  items: [
    ["pregnant", "Are you pregnant?"],
    ["childbirth_6m", "Did you give birth, or are you breastfeeding, in the last 6 months?"],
  ],
};

export const EMPTY_ELIGIBILITY = {
  age: "", gender: "", weight_kg: "", hemoglobin: "", last_donation_date: "",
  ...Object.fromEntries([...QUESTION_GROUPS, FEMALE_GROUP].flatMap((g) => g.items.map(([key]) => [key, false]))),
};

export function eligibilityPayload(values) {
  const payload = { ...values };
  payload.age = Number(values.age);
  payload.weight_kg = Number(values.weight_kg);
  payload.hemoglobin = values.hemoglobin === "" ? null : Number(values.hemoglobin);
  payload.last_donation_date = values.last_donation_date || null;
  return payload;
}

function basicsReady(v) {
  return v.age !== "" && Number(v.age) >= 0 && v.gender && v.weight_kg !== "" && Number(v.weight_kg) >= 20;
}

/**
 * The health questionnaire shown at donor sign-up. It asks in simple words, one yes/no at a time,
 * and tells the person straight away if they cannot donate (and when they can try again).
 * `onResult(verdict | null)` reports the latest answer so the form can block sign-up.
 */
export default function EligibilityForm({ values, onChange, onResult, submitted }) {
  const { t } = useI18n();
  const [verdict, setVerdict] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef(null);

  const groups = values.gender === "female" ? [...QUESTION_GROUPS, FEMALE_GROUP] : QUESTION_GROUPS;

  useEffect(() => {
    clearTimeout(timer.current);
    if (!basicsReady(values)) {
      setVerdict(null);
      onResult(null);
      return undefined;
    }
    timer.current = setTimeout(async () => {
      setBusy(true);
      setFailed(false);
      try {
        const response = await checkEligibility(eligibilityPayload(values));
        setVerdict(response.data);
        onResult(response.data);
      } catch (error) {
        setFailed(true);
        setVerdict(null);
        onResult(null);
      } finally {
        setBusy(false);
      }
    }, 400);
    return () => clearTimeout(timer.current);
  }, [JSON.stringify(values)]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(name, value) {
    onChange({ ...values, [name]: value });
  }

  const ageError = values.age === "" || Number(values.age) < 0 || Number(values.age) > 120 ? "Please enter a number." : "";
  const genderError = !values.gender ? "Please choose one." : "";
  const weightError = values.weight_kg === "" || Number(values.weight_kg) < 20 ? "Please enter a number." : "";

  return (
    <fieldset className="eligibility">
      <legend>🩺 {t("Health check: can you give blood?")}</legend>

      <FormField label="Age" required htmlFor="f-elig-age" error={ageError} show={submitted} hint="Age in years">
        <input id="f-elig-age" type="number" inputMode="numeric" min="0" max="120" value={values.age} onChange={(e) => set("age", e.target.value)} />
      </FormField>

      <FormField label="Gender" required htmlFor="f-elig-gender" error={genderError} show={submitted} hint="Used to know how long to wait between donations">
        <select id="f-elig-gender" value={values.gender} onChange={(e) => set("gender", e.target.value)}>
          <option value="">{t("Choose one")}</option>
          <option value="male">{t("Male")}</option>
          <option value="female">{t("Female")}</option>
        </select>
      </FormField>

      <FormField label="Weight (kg)" required htmlFor="f-elig-weight" error={weightError} show={submitted} hint="You need at least 50 kg to donate">
        <input id="f-elig-weight" type="number" inputMode="decimal" min="20" max="250" step="0.1" value={values.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} />
      </FormField>

      <FormField label="Haemoglobin (g/dL), optional" htmlFor="f-elig-hb" hint="If you know it from a recent blood test. Leave empty if you do not.">
        <input id="f-elig-hb" type="number" inputMode="decimal" min="3" max="25" step="0.1" value={values.hemoglobin} onChange={(e) => set("hemoglobin", e.target.value)} />
      </FormField>

      <FormField label="Date of your last blood donation, optional" htmlFor="f-elig-last" hint="Leave empty if you have never donated">
        <input id="f-elig-last" type="date" max={new Date().toISOString().slice(0, 10)} value={values.last_donation_date} onChange={(e) => set("last_donation_date", e.target.value)} />
      </FormField>

      {groups.map((group) => (
        <div className="elig-group" key={group.title}>
          <h4>{t(group.title)}</h4>
          {group.items.map(([key, question]) => (
            <div className="elig-question" key={key}>
              <span className="elig-text">{t(question)}</span>
              <span className="elig-choices" role="radiogroup" aria-label={t(question)}>
                <button type="button" role="radio" aria-checked={values[key] === true} className={`lang-chip ${values[key] === true ? "active" : ""}`} onClick={() => set(key, true)}>{t("Yes")}</button>
                <button type="button" role="radio" aria-checked={values[key] === false} className={`lang-chip ${values[key] === false ? "active" : ""}`} onClick={() => set(key, false)}>{t("No")}</button>
              </span>
            </div>
          ))}
        </div>
      ))}

      {busy && <p className="field-hint">{t("Checking...")}</p>}
      {failed && <p className="error-text">{t("Could not check your answers. Check your internet.")}</p>}
      {verdict && verdict.eligible && (
        <p className="success-text" role="status">✅ {t("Good news: you can register as a blood donor.")}</p>
      )}
      {verdict && !verdict.eligible && (
        <div className="elig-no" role="alert">
          <strong>{t("You cannot register as a donor right now.")}</strong>
          <ul>{verdict.reasons.map((r) => <li key={r.code}>{t(r.message)}</li>)}</ul>
          {verdict.retry_after_date && <p>{t("You can try again after")} <strong>{verdict.retry_after_date}</strong>.</p>}
          {verdict.permanent && <p>{t("Please speak to a doctor. You can still help by sharing LifeFlow with others.")}</p>}
        </div>
      )}
    </fieldset>
  );
}
