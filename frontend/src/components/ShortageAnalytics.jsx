import React, { useEffect, useState } from "react";
import { getShortageAnalytics } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";

/** Where is blood needed most? Open, unfilled bags by city and blood type, with a camp suggestion. */
export default function ShortageAnalytics() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getShortageAnalytics().then((r) => setData(r.data)).catch(() => setError(t("Could not load the analytics.")));
  }, []);

  if (error) return <p className="error-text">{error}</p>;
  if (!data) return <p className="field-hint">{t("Loading...")}</p>;
  const maxType = Math.max(1, ...data.by_blood_type.map((b) => b.bags_short));
  const maxCity = Math.max(1, ...data.cities.map((c) => c.bags_short));

  return (
    <div className="card">
      <h2>{t("Shortage analytics")}</h2>
      <p className="subtitle">{t("Bags still needed right now, by blood type and by city. Use it to decide where to hold a donation camp.")}</p>
      <p><strong>{data.total_bags_short}</strong> {t("bags short in total")}</p>
      {data.total_bags_short === 0 && <p className="empty-state">{t("No open shortage right now.")}</p>}

      <h3>{t("By blood type")}</h3>
      {data.by_blood_type.map((b) => (
        <div className="bar-row" key={b.blood_type}>
          <span className="badge">{b.blood_type}</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(b.bags_short / maxType) * 100}%` }} /></div>
          <strong>{b.bags_short}</strong>
        </div>
      ))}

      <h3>{t("By city")}</h3>
      {data.cities.map((c) => (
        <div className="list-row-stack" key={c.city}>
          <div className="bar-row">
            <strong className="bar-name">{c.city}</strong>
            <div className="bar-track"><div className="bar-fill" style={{ width: `${(c.bags_short / maxCity) * 100}%` }} /></div>
            <strong>{c.bags_short}</strong>
          </div>
          <div className="empty-state">
            {c.requests} {t("open request(s)")} · {c.donors} {t("ready donors")} · {Object.entries(c.by_blood_type).map(([k, v]) => `${k}: ${v}`).join(", ")}
          </div>
          <div className="notice-text">🏕️ {c.camp_suggestion}</div>
        </div>
      ))}
    </div>
  );
}
