import React, { useEffect, useState } from "react";
import { getNextEligible, setNotificationChannels, getMyDonorProfile } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";

/** Shows when the donor can give blood again, and lets them choose SMS / WhatsApp alerts. */
export default function NextEligibleCard() {
  const { t } = useI18n();
  const [info, setInfo] = useState(null);
  const [sms, setSms] = useState(true);
  const [wa, setWa] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getNextEligible().then((r) => setInfo(r.data)).catch(() => setInfo(null));
    getMyDonorProfile().then((r) => { setSms(r.data.notify_sms !== false); setWa(r.data.notify_whatsapp === true); }).catch(() => {});
  }, []);

  async function save(nextSms, nextWa) {
    setSms(nextSms); setWa(nextWa); setSaved(false);
    try { await setNotificationChannels(nextSms, nextWa); setSaved(true); } catch (err) { /* keep the choice on screen */ }
  }

  if (!info) return null;
  return (
    <div className="card next-eligible no-print">
      {info.permanent_block ? (
        <p className="error-text">{t("Your health check says you cannot donate blood. Please speak to a doctor.")}</p>
      ) : info.eligible_now ? (
        <p className="success-text">✅ {t("You are eligible to donate right now.")}</p>
      ) : (
        <p className="notice-text">
          ⏳ {t("You can donate again on")} <strong>{info.next_eligible_date}</strong> ({info.days_left} {t("days left")}). {t("We will remind you.")}
        </p>
      )}
      <div className="chip-row" role="group" aria-label={t("How should we alert you?")}>
        <span className="field-hint">{t("Send me urgent alerts by")}:</span>
        <label className="check-inline"><input type="checkbox" checked={sms} onChange={(e) => save(e.target.checked, wa)} /> SMS</label>
        <label className="check-inline"><input type="checkbox" checked={wa} onChange={(e) => save(sms, e.target.checked)} /> WhatsApp</label>
        {saved && <span className="success-text">{t("Saved")}</span>}
      </div>
    </div>
  );
}
