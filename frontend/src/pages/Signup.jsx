import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext.jsx";
import DonorRegister from "./DonorRegister.jsx";
import ReceiverRegister from "./ReceiverRegister.jsx";
import HospitalRegister from "./HospitalRegister.jsx";

const ROLES = [
  { key: "donor", label: "Donor", Form: DonorRegister },
  { key: "patient", label: "Patient", Form: ReceiverRegister },
  { key: "hospital", label: "Hospital", Form: HospitalRegister },
];

/** One sign-up page. One dropdown (Donor, Patient or Hospital) decides which fields appear. */
export default function Signup() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const [shared, setShared] = useState({});
  const [round, setRound] = useState(0);   // bumping this empties the form after a successful sign up
  const wanted = params.get("role");
  const current = ROLES.find((r) => r.key === wanted || (wanted === "receiver" && r.key === "patient")) || ROLES[0];

  function choose(event) {
    const next = new URLSearchParams(params);
    next.set("role", event.target.value);
    setParams(next, { replace: true });
  }

  const roleSelect = (
    <div className="signup-role-select">
      <label htmlFor="signup-role">{t("I am signing up as")}</label>
      <select id="signup-role" value={current.key} onChange={choose}>
        {ROLES.map((r) => <option key={r.key} value={r.key}>{t(r.label)}</option>)}
      </select>
    </div>
  );

  return (
    <div>
      <div className="page signup-top">
        <h1 className="signup-title">{t("Create new account")}</h1>
      </div>
      <div className="signup-forms">
        <current.Form key={current.key + round} shared={shared} onShared={setShared} roleSelect={roleSelect}
          onDone={() => { setShared({}); setRound((r) => r + 1); }} />
      </div>
    </div>
  );
}
