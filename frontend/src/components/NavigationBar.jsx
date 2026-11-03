import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext.jsx";
import PushToggle from "./PushToggle.jsx";
import LifeFlowLogo from "./LifeFlowLogo.jsx";
import NotificationBell from "./NotificationBell.jsx";
import ReadAloud from "./ReadAloud.jsx";
import RoleSwitcher from "./RoleSwitcher.jsx";
import { logout } from "../services/api";
import {
  LayoutDashboardIcon, UserIcon, UsersIcon, LogInIcon, LogOutIcon, MapPinIcon, InfoIcon,
} from "./NavIcons.jsx";

const ROLE_LABELS = {
  donor: "Donor",
  receiver: "Patient",
  hospital: "Hospital",
  admin: "Admin",
  staff: "Staff",
};

/** The links each kind of user sees in the top bar. Short on purpose: only what that person really uses. */
function linksFor(role) {
  const dashboard = { to: `/${role}/dashboard`, label: "My dashboard", icon: LayoutDashboardIcon };
  const profile = { to: "/profile", label: "My profile", icon: UserIcon };
  const people = { to: "/people", label: "Donors and patients", icon: UsersIcon };
  if (role === "donor") return [dashboard, profile, people];
  if (role === "receiver") return [dashboard, profile, people];
  if (role === "hospital") return [dashboard, profile, people];
  if (role === "staff") return [dashboard, profile];
  if (role === "admin") return [dashboard, profile, people];
  return [dashboard, profile];
}

export default function NavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language, setLanguage, LANGUAGES } = useI18n();

  const token = localStorage.getItem("lifeflow_token");
  const role = localStorage.getItem("lifeflow_role");
  const isLoggedIn = Boolean(token && role);

  function handleLogout() {
    logout();
    navigate("/");
  }

  const languagePicker = (
    <select
      className="lang-select" value={language} onChange={(e) => setLanguage(e.target.value)}
      aria-label={t("Language")} data-no-translate
    >
      {Object.entries(LANGUAGES).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
    </select>
  );

  return (
    <header className="nav">
      <Link to="/" className="nav-logo">
        <LifeFlowLogo />
        <span data-no-translate>LifeFlow</span>
      </Link>

      {isLoggedIn ? (
        <>
          <nav className="nav-main" aria-label="Main">
            <span className="role-tag">{t(ROLE_LABELS[role] || role)}</span>
            {linksFor(role).map((item) => (
              <Link
                key={item.to} to={item.to}
                className={"nav-item" + (location.pathname === item.to ? " active" : "")}
              >
                <item.icon size={16} /> {t(item.label)}
              </Link>
            ))}
          </nav>
          <div className="nav-tools">
            {role !== "admin" && role !== "staff" && <NotificationBell role={role} />}
            {(role === "donor" || role === "receiver") && <RoleSwitcher role={role} />}
            <PushToggle />
            <ReadAloud compact />
            {languagePicker}
            <button onClick={handleLogout} className="nav-logout-btn">
              <LogOutIcon size={16} /> {t("Log out")}
            </button>
          </div>
        </>
      ) : (
        <>
          <nav className="nav-main" aria-label="Main">
            <a href="/#about" className="nav-pill"><InfoIcon size={16} /> {t("About us")}</a>
            <a href="/#contact" className="nav-pill"><MapPinIcon size={16} /> {t("Contact us")}</a>
          </nav>
          <div className="nav-tools">
            <ReadAloud compact />
            {languagePicker}
            <Link to="/login" className="nav-pill nav-admin-btn"><UserIcon size={16} /> {t("Admin")}</Link>
            <Link to="/login" className="nav-login-btn"><LogInIcon size={16} /> {t("Log in")}</Link>
          </div>
        </>
      )}
    </header>
  );
}
