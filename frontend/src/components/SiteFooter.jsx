import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext.jsx";
import { DropletIcon } from "./Icons.jsx";
import { APP_VERSION, APP_YEAR } from "../appInfo.js";

/**
 * Rendered once in App.jsx, below every route, so every page — not just
 * the home page — ends with the same contact details and quick links.
 * "About" and "Contact" always point back to the matching section on
 * the home page, wherever the person currently is.
 */
export default function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="site-footer no-print">
      <div className="page footer-inner">
        <div className="footer-brand">
          <span className="nav-logo"><DropletIcon size={20} color="#B01E28" /> {t("LifeFlow")}</span>
          <p>{t("footer.tagline")}</p>
        </div>
        <div className="footer-links footer-simple">
          <Link to="/emergency">🚑 {t("Emergency numbers")}</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="footer-copy">© {APP_YEAR} {t("LifeFlow Blood Network. All rights reserved.")} <span className="version-chip">{APP_VERSION}</span></div>
      </div>
    </footer>
  );
}
