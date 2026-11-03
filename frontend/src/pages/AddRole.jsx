import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext.jsx";
import { addDonorRole, addPatientRole } from "../services/api";
import TextField from "../components/form/TextField.jsx";
import FormField from "../components/form/FormField.jsx";
import EligibilityForm, { EMPTY_ELIGIBILITY, eligibilityPayload } from "../components/EligibilityForm.jsx";
import { nameError, hasErrors, serverMessage } from "../utils/validators.js";

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

/** Adds the other side to your account (same email and password): "I also want to donate" or "I also need blood". */
export default function AddRole() {
  const { kind } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const toDonor = kind === "donor";
  const [blood, setBlood] = useState("O+");
  const [elig, setElig] = useState(EMPTY_ELIGIBILITY);
  const [verdict, setVerdict] = useState(null);
  const [patientName, setPatientName] = useState("");
  const [address, setAddress] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitted(true);
    if (toDonor) {
      if (!verdict) { setError("Please answer all the health questions first."); return; }
      if (!verdict.eligible) { setError("You cannot register as a donor right now."); return; }
    } else if (hasErrors({ p: nameError(patientName, false) })) {
      setError("Some answers need to be fixed. Please look at the red messages.");
      return;
    }
    setBusy(true);
    try {
      const res = toDonor
        ? await addDonorRole({ blood_type: blood, eligibility: eligibilityPayload(elig) })
        : await addPatientRole({ patient_name: patientName.trim() || null, address: address.trim() || null });
      localStorage.setItem("lifeflow_token", res.data.access_token);
      localStorage.setItem("lifeflow_role", res.data.role);
      window.location.href = `/${res.data.role}/dashboard`;
    } catch (e) {
      setError(serverMessage(e, "Something went wrong. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h2>{t(toDonor ? "I also want to donate" : "I also need blood")}</h2>
        {error && <p className="error-text" role="alert">{t(error)}</p>}
        <form onSubmit={submit} noValidate>
          {toDonor ? (
            <>
              <FormField label="Blood type" required htmlFor="ar-blood">
                <select id="ar-blood" value={blood} onChange={(e) => setBlood(e.target.value)}>
                  {BLOOD_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </FormField>
              <EligibilityForm values={elig} onChange={setElig} onResult={setVerdict} submitted={submitted} />
            </>
          ) : (
            <>
              <TextField kind="name" label="Patient name, if different from you" name="patient_name" value={patientName}
                onChange={(e) => setPatientName(e.target.value)} error={nameError(patientName, false)} submitted={submitted}
                required={false} placeholder="Patient name" />
              <TextField label="House number or street, optional" name="address" value={address}
                onChange={(e) => setAddress(e.target.value)} required={false} placeholder="House number or street" maxLength={150} />
            </>
          )}
          <button type="submit" disabled={busy}>{busy ? t("Please wait...") : t("Continue")}</button>
        </form>
      </div>
    </div>
  );
}
