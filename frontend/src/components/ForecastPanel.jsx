import React, { useEffect, useState } from "react";
import { getHospitalForecast, getPlatformForecast } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";

/**
 * AI shortage forecast: per blood type, how fast stock is being used,
 * the trend, and how many days until it runs short. `scope` is
 * "hospital" (that hospital's own stock) or "platform" (admin view).
 */
export default function ForecastPanel({ scope = "hospital" }) {
  const { t } = useI18n();
  const [forecast, setForecast] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const load = scope === "platform" ? getPlatformForecast : getHospitalForecast;
    load().then((r) => setForecast(r.data)).catch(() => setErrorMessage("Could not load the forecast."));
  }, [scope]);

  return (
    <div className="card">
      <h2>{t("AI shortage forecast")}</h2>
      <p className="subtitle">{t("Based on recent request history and current stock — which blood types are likely to run short.")}</p>
      {errorMessage && <p className="error-text">{t(errorMessage)}</p>}
      {forecast && forecast.summary && <p className="notice-text">{forecast.summary}</p>}
      {forecast && forecast.entries.length === 0 && <p className="empty-state">{t("Not enough history yet to forecast.")}</p>}
      {forecast && forecast.entries.map((entry) => (
        <div className="list-row" key={entry.blood_type}>
          <div className="meta">
            <span className="badge">{entry.blood_type}</span>
            &nbsp; {t("stock")} {entry.current_stock} · ~{entry.average_daily_demand}{t("/day · trend")} {entry.trend}
          </div>
          <span className={entry.risk_level === "high" ? "error-text" : "empty-state"}>
            {entry.days_until_shortage != null ? t("~{n} days left", { n: entry.days_until_shortage }) : t("no shortage projected")} ({t(entry.risk_level)})
          </span>
        </div>
      ))}
    </div>
  );
}
