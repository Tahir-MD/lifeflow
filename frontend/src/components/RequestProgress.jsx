import React from "react";
import { useI18n } from "../i18n/I18nContext.jsx";

/**
 * Shows how many bags a request needs, how many it has received, how many are
 * still missing, and which donors gave how many.
 */
export default function RequestProgress({ request }) {
  const { t } = useI18n();
  const needed = request.units_needed;
  const received = Math.min(request.units_fulfilled, needed);
  const missing = Math.max(needed - received, 0);
  const percent = needed ? Math.round((received / needed) * 100) : 0;
  const fromStock = request.inventory_units_used || 0;

  return (
    <div className="progress-box">
      <div className="progress-numbers">
        <span><strong>{needed}</strong> {t("bags needed")}</span>
        <span className="progress-got"><strong>{received}</strong> {t("received")}</span>
        <span className="progress-missing"><strong>{missing}</strong> {t("still needed")}</span>
      </div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div>
      {fromStock > 0 && <div className="empty-state">{fromStock} {t("bag(s) came from hospital stock")}</div>}
      {request.contributions && request.contributions.length > 0 && (
        <ul className="contribution-list">
          {request.contributions.map((c, index) => (
            <li key={index}>
              <span className="badge">{c.blood_type}</span> {c.donor_name} {t("gave")} <strong>{c.units_donated}</strong> {t("bag(s)")}
              <EligibilityBadge eligible={c.donor_is_eligible_now} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function EligibilityBadge({ eligible }) {
  const { t } = useI18n();
  return (
    <span className={eligible ? "elig elig-yes" : "elig elig-no"}>
      {t("Eligible")}: {eligible ? t("Yes") : t("No")}
    </span>
  );
}
