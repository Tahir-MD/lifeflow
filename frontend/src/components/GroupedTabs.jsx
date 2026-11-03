import React from "react";
import TabIcon from "./TabIcon.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

/**
 * Two tidy rows instead of one long strip: the top row has a few big groups, and the
 * row under it shows the pages of the group you are in. Related things live together.
 * groups: [{ key, label, icon, items: [{ key, label }] }]
 */
export default function GroupedTabs({ groups, tab, onSelect, badges = {} }) {
  const { t } = useI18n();
  const active = groups.find((g) => g.items.some((i) => i.key === tab)) || groups[0];
  return (
    <div className="grouped-tabs">
      <div className="tab-row">
        {groups.map((g) => (
          <button
            key={g.key} type="button"
            className={`tab-button ${g.key === active.key ? "active" : ""}`}
            onClick={() => onSelect(g.items[0].key)}
          >
            <TabIcon name={g.icon} /> {t(g.label)}
          </button>
        ))}
      </div>
      {active.items.length > 1 && (
        <div className="subtab-row">
          {active.items.map((i) => (
            <button
              key={i.key} type="button"
              className={`subtab-button ${tab === i.key ? "active" : ""}`}
              onClick={() => onSelect(i.key)}
            >
              {t(i.label)}{badges[i.key] > 0 ? ` (${badges[i.key]})` : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
