import React, { useEffect, useState } from "react";
import { getMyProfile, setSecurityQuestion } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import PrintButton from "../components/PrintButton.jsx";
import PrintHeader from "../components/PrintHeader.jsx";

/** "My profile" for every kind of account: donor, patient, hospital, staff and admin. */
export default function MyProfile() {
  const { t } = useI18n();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [sq, setSq] = useState({ question: "What is the name of your first school?", answer: "", password: "" });
  const [sqMessage, setSqMessage] = useState("");
  const QUESTIONS = [
    "What is the name of your first school?",
    "What is your mother's maiden name?",
    "What was the name of your first pet?",
    "In which village or city was your father born?",
    "What is your best friend's name from childhood?",
  ];

  async function saveQuestion(event) {
    event.preventDefault();
    setSqMessage("");
    try {
      const r = await setSecurityQuestion(sq.question, sq.answer, sq.password);
      setSqMessage(r.data.message);
      setSq({ ...sq, answer: "", password: "" });
      const fresh = await getMyProfile();
      setProfile(fresh.data);
    } catch (e) {
      const d = e.response?.data?.detail;
      setSqMessage(typeof d === "string" ? d : t("Could not save. Please try again."));
    }
  }

  useEffect(() => {
    getMyProfile()
      .then(async (response) => {
        const data = response.data;
        setProfile(data);
      })
      .catch(() => setError(t("Could not load your profile. Please log in again.")));
  }, []);

  if (error) return <div className="page"><p className="error-text">{error}</p></div>;
  if (!profile) return <div className="page"><p className="empty-state">{t("Loading...")}</p></div>;

  return (
    <div className="page">
      <div className="card">
        <PrintHeader title={t("My profile")} subtitle={profile.name} />
        <div className="list-row-top">
          <h2>{t("My profile")}</h2>
          <PrintButton />
        </div>
        {profile.fields.map((f) => (
          <div className="detail-row" key={f.label}>
            <span className="detail-label">{t(f.label)}</span>
            <span className="detail-value" data-no-translate>{f.value}</span>
          </div>
        ))}
      </div>

      <div className="card no-print">
        <h2>{t("Password recovery")}</h2>
        <p className="subtitle">
          {profile.has_security_question
            ? `${t("Your security question")}: ${profile.security_question}. ${t("You can change it below.")}`
            : t("Set a security question. If you forget your password, this is how we know it is you.")}
        </p>
        {sqMessage && <p className="notice-text">{sqMessage}</p>}
        <form onSubmit={saveQuestion}>
          <label>{t("Question")}</label>
          <select value={sq.question} onChange={(e) => setSq({ ...sq, question: e.target.value })}>
            {QUESTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
          <label>{t("Your answer")}</label>
          <input value={sq.answer} onChange={(e) => setSq({ ...sq, answer: e.target.value })} required />
          <label>{t("Your current password")}</label>
          <input type="password" value={sq.password} onChange={(e) => setSq({ ...sq, password: e.target.value })} required />
          <button type="submit">{t("Save security question")}</button>
        </form>
      </div>

      {profile.history.length > 0 && (
        <div className="card">
          <h2>{t("History")}</h2>
          {profile.history.map((h, i) => (
            <div className="list-row-stack" key={i}>
              <div className="list-row-top">
                <div className="meta" data-no-translate>{h.title}</div>
                <span className="distance" data-no-translate>{h.date}</span>
              </div>
              {h.detail && <div className="empty-state" data-no-translate>{h.detail}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
