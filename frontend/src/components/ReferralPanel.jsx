import React, { useEffect, useState } from "react";
import { getMyReferral } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import { serverMessage } from "../utils/validators.js";

/** Invite friends: share a personal link. When a friend gives blood for the first time, both earn points. */
export default function ReferralPanel() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getMyReferral().then((r) => setData(r.data)).catch((err) => setError(serverMessage(err, "Could not load your invite code.")));
  }, []);

  if (error) return <div className="card"><p className="error-text">{error}</p></div>;
  if (!data) return <div className="card"><p className="field-hint">{t("Loading...")}</p></div>;

  const link = `${window.location.origin}/donor/register?ref=${data.code}`;
  const text = `${t("Join me on LifeFlow and save lives by giving blood.")} ${link}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      window.prompt(t("Copy this link"), link);
    }
  }

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: "LifeFlow", text: t("Join me on LifeFlow and save lives by giving blood."), url: link }); } catch (err) { /* cancelled */ }
    } else {
      copy();
    }
  }

  return (
    <div className="card">
      <h2>🤝 {t("Invite friends")}</h2>
      <p className="subtitle">
        {t("Share your link. When your friend gives blood for the first time, you earn")} <strong>{data.referrer_bonus}</strong> {t("points")}
        {" "}{t("and your friend earns")} <strong>{data.friend_bonus}</strong>.
      </p>

      <div className="referral-code" aria-label={t("Your invite code")}>{data.code}</div>
      <p className="field-hint" style={{ wordBreak: "break-all" }}>{link}</p>

      <div className="export-buttons">
        <a className="btn-outline whatsapp-share" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">💬 {t("Share on WhatsApp")}</a>
        <button type="button" className="btn-outline" onClick={share}>📤 {t("Share")}</button>
        <button type="button" className="btn-outline" onClick={copy}>{copied ? `✅ ${t("Copied")}` : `📋 ${t("Copy link")}`}</button>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><div className="stat-value">{data.friends_joined}</div><div className="stat-label">{t("Friends joined")}</div></div>
        <div className="stat-card"><div className="stat-value">{data.friends_donated}</div><div className="stat-label">{t("Friends who donated")}</div></div>
        <div className="stat-card"><div className="stat-value">{data.points_earned}</div><div className="stat-label">{t("Bonus points earned")}</div></div>
      </div>
    </div>
  );
}
