import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRegisteredPeople } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import { EligibilityBadge } from "../components/RequestProgress.jsx";

/** Replaces the old leaderboard: how many donors and patients came, and who they are. */
export default function RegisteredPeople() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const loggedIn = Boolean(localStorage.getItem("lifeflow_token"));

  useEffect(() => {
    if (!loggedIn) return;
    getRegisteredPeople().then((r) => setData(r.data)).catch(() => setFailed(true));
  }, [loggedIn]);

  if (!loggedIn) {
    return (
      <div className="page">
        <div className="card">
          <h2>{t("Registered donors and patients")}</h2>
          <p className="empty-state">{t("Please log in to see this list.")} <Link to="/login">{t("Log in")}</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="card">
        <h2>{t("Registered donors and patients")}</h2>
        <p className="subtitle">{t("How many people joined LifeFlow, and who they are. Phone numbers and addresses are not shown here.")}</p>
        {failed && <p className="error-text">{t("Could not load the list.")}</p>}
        {data && (
          <div className="stat-grid">
            <div className="stat-card"><div className="stat-value">{data.total_donors}</div><div className="stat-label">{t("Donors")}</div></div>
            <div className="stat-card"><div className="stat-value">{data.total_patients}</div><div className="stat-label">{t("Patients")}</div></div>
          </div>
        )}
      </div>

      {data && (
        <>
          <div className="card">
            <h2>{t("Donors")} ({data.total_donors})</h2>
            {data.donors.length === 0 && <p className="empty-state">{t("No donors have registered yet.")}</p>}
            {data.donors.length > 0 && (
              <div className="table-scroll">
                <table className="simple-table">
                  <thead>
                    <tr><th>{t("Name")}</th><th>{t("Blood type")}</th><th>{t("Donations")}</th><th>{t("Eligible to donate")}</th><th>{t("Joined")}</th></tr>
                  </thead>
                  <tbody>
                    {data.donors.map((donor) => (
                      <tr key={donor.id}>
                        <td>{donor.full_name}</td>
                        <td><span className="badge">{donor.blood_type}</span></td>
                        <td>{donor.total_donations}</td>
                        <td>
                          <EligibilityBadge eligible={donor.is_eligible_now} />
                          {!donor.is_eligible_now && donor.next_eligible_date && (
                            <div className="empty-state">{t("Again on")} {new Date(donor.next_eligible_date).toLocaleDateString()}</div>
                          )}
                        </td>
                        <td>{donor.registered_on ? new Date(donor.registered_on).toLocaleDateString() : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <h2>{t("Patients")} ({data.total_patients})</h2>
            {data.patients.length === 0 && <p className="empty-state">{t("No patients have registered yet.")}</p>}
            {data.patients.length > 0 && (
              <div className="table-scroll">
                <table className="simple-table">
                  <thead><tr><th>{t("Name")}</th><th>{t("Requests made")}</th><th>{t("Joined")}</th></tr></thead>
                  <tbody>
                    {data.patients.map((patient) => (
                      <tr key={patient.id}>
                        <td>{patient.full_name}</td>
                        <td>{patient.total_requests}</td>
                        <td>{patient.registered_on ? new Date(patient.registered_on).toLocaleDateString() : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
