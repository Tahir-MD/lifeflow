import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext.jsx";
import { DropletIcon, MailIcon, PhoneIcon } from "./Icons.jsx";
import { APP_VERSION, APP_YEAR } from "../appInfo.js";

const LINKEDIN_URL = "https://www.linkedin.com/in/tahir-mahmood-781b93329/";
const GITHUB_URL = "https://github.com/Tahir-MD";
const WHATSAPP_NUMBER = "923054773174";
const EMAILS = ["tahirdool67@gmail.com", "tmd.ai.cv.50@gmail.com"];

function LinkedInLogo({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="#0A66C2" />
      <path fill="#fff" d="M6.1 9.6h2.7V18H6.1V9.6zM7.45 5.5a1.57 1.57 0 1 1 0 3.14 1.57 1.57 0 0 1 0-3.14zM10.5 9.6h2.6v1.15h.04c.36-.69 1.25-1.4 2.57-1.4 2.75 0 3.26 1.81 3.26 4.16V18h-2.7v-4.07c0-.97-.02-2.22-1.35-2.22-1.35 0-1.56 1.06-1.56 2.15V18H10.5V9.6z" />
    </svg>
  );
}

function GitHubLogo({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#fff" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function WhatsAppLogo({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#25D366" />
      <path fill="#fff" d="M12 4.6a7.4 7.4 0 0 0-6.3 11.2l-1 3.6 3.7-1A7.4 7.4 0 1 0 12 4.6zm3.9 10.2c-.17.47-.97.9-1.35.95-.35.05-.78.07-1.26-.08-.29-.09-.66-.22-1.14-.43-2-.87-3.3-2.9-3.4-3.03-.1-.13-.8-1.07-.8-2.04 0-.97.5-1.45.69-1.65.18-.2.4-.25.53-.25h.38c.12 0 .29-.05.45.35.17.4.57 1.37.62 1.47.05.1.08.22.02.35-.07.13-.1.22-.2.33-.1.12-.2.26-.29.35-.1.1-.2.2-.09.4.12.2.52.86 1.12 1.39.77.69 1.42.9 1.62 1 .2.1.32.08.44-.05.12-.13.5-.58.64-.78.13-.2.27-.17.45-.1.18.07 1.17.55 1.37.65.2.1.33.15.38.23.05.08.05.47-.12.93z" />
    </svg>
  );
}

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
        <div className="footer-dev">
          <span>{t("Engineered by")} <strong>Tahir Mahmood</strong></span>
          <span className="footer-social">
            <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn"><LinkedInLogo /></a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label="GitHub" title="GitHub"><GitHubLogo /></a>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" title="WhatsApp"><WhatsAppLogo /></a>
          </span>
          <span className="footer-contact-line">
            <a href="tel:+923054773174"><PhoneIcon size={14} color="#D9D4CA" /> +92 305 4773174</a>
            {EMAILS.map((e) => <a key={e} href={`mailto:${e}`}><MailIcon size={14} color="#D9D4CA" /> {e}</a>)}
          </span>
        </div>
        <div className="footer-copy">© {APP_YEAR} {t("LifeFlow Blood Network. All rights reserved.")} <span className="version-chip">{APP_VERSION}</span></div>
      </div>
    </footer>
  );
}
