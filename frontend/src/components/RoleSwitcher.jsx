import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext.jsx";
import { getMyRoles, switchRole, addPatientRole } from "../services/api";

/** Donors and patients are the same person: one button moves between the two sides (or adds the missing side). */
export default function RoleSwitcher({ role }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let alive = true;
    getMyRoles().then((r) => alive && setInfo(r.data)).catch(() => {});
    return () => { alive = false; };
  }, [role]);

  if (!info) return null;
  const other = role === "donor" ? "receiver" : "donor";
  const has = other === "donor" ? info.has_donor : info.has_receiver;
  const label = other === "donor"
    ? (has ? "Switch to Donor" : "I also want to donate")
    : (has ? "Switch to Patient" : "I also need blood");

  async function go() {
    if (!has && other === "donor") { navigate("/add-role/donor"); return; }
    try {
      // "I need blood": the patient side is created with the same details, then the full request form opens.
      const res = has ? await switchRole(other) : await addPatientRole({});
      localStorage.setItem("lifeflow_token", res.data.access_token);
      localStorage.setItem("lifeflow_role", res.data.role);
      window.location.href = `/${res.data.role}/dashboard`;
    } catch (e) { /* stay where we are */ }
  }

  return <button type="button" className="nav-switch-btn" onClick={go}>{t(label)}</button>;
}
