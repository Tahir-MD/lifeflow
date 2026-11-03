import React, { useEffect, useState } from "react";
import { listEmergencyContacts } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";

export const CATEGORY_LABELS = {
  ambulance: "Ambulance",
  emergency: "Emergency",
  blood_bank: "Blood bank",
  hospital: "Hospital",
  police: "Police",
  fire: "Fire brigade",
  helpline: "Helpline",
};
const ICONS = { ambulance: "🚑", emergency: "🚨", blood_bank: "🩸", hospital: "🏥", police: "👮", fire: "🚒", helpline: "☎️" };

/** Public page (no login): ambulance and emergency numbers, with a big Call button for each. */
export default function EmergencyDirectory() {
  const { t } = useI18n();
  const [contacts, setContacts] = useState([]);
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      listEmergencyContacts({ category: category || undefined, city: city.trim() || undefined, q: search.trim() || undefined })
        .then((r) => { setContacts(r.data); setError(false); })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [category, city, search]);

  return (
    <div className="page">
      <div className="card">
        <h2>🚑 {t("Ambulance and emergency numbers")}</h2>
        <p className="subtitle">{t("Tap Call to phone straight away. No login needed.")}</p>

        <div className="chip-row" role="group" aria-label={t("Type")}>
          <button type="button" className={`lang-chip ${category === "" ? "active" : ""}`} onClick={() => setCategory("")}>{t("All")}</button>
          {Object.keys(CATEGORY_LABELS).map((key) => (
            <button key={key} type="button" className={`lang-chip ${category === key ? "active" : ""}`} onClick={() => setCategory(key)}>
              {ICONS[key]} {t(CATEGORY_LABELS[key])}
            </button>
          ))}
        </div>

        <label htmlFor="dir-city">{t("Your city")}</label>
        <input id="dir-city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} placeholder={t("Example: Karachi, Lahore, Hyderabad")} />
        <label htmlFor="dir-q">{t("Search by name or area")}</label>
        <input id="dir-q" value={search} onChange={(e) => setSearch(e.target.value)} maxLength={60} />

        {loading && <p className="field-hint">{t("Loading...")}</p>}
        {error && <p className="error-text">{t("Could not load the list.")}</p>}
        {!loading && !error && contacts.length === 0 && <p className="empty-state">{t("No contacts found. Try another city.")}</p>}

        {contacts.map((c) => (
          <div className="list-row-stack contact-row" key={c.id}>
            <div className="list-row-top">
              <div className="meta">
                <span className="contact-icon">{ICONS[c.category] || "☎️"}</span> <strong>{c.name}</strong>
                {c.is_national && <span className="badge" style={{ marginInlineStart: 8 }}>{t("National")}</span>}
              </div>
              <a className="call-button" href={`tel:${c.phone_number}`}>📞 {t("Call")} {c.phone_number}</a>
            </div>
            <div className="empty-state">
              {t(CATEGORY_LABELS[c.category] || c.category)}
              {c.city ? ` · ${[c.area, c.city].filter(Boolean).join(", ")}` : ""}
              {c.is_24h ? ` · ${t("Open 24 hours")}` : ""}
              {c.notes ? ` · ${c.notes}` : ""}
            </div>
          </div>
        ))}
        <p className="field-hint">{t("Numbers and coverage can change between cities. Please confirm that a number works where you live.")}</p>
      </div>
    </div>
  );
}
