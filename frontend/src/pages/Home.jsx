import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext.jsx";
import { DropletIcon, HeartIcon, MapPinIcon, PhoneIcon, MailIcon } from "../components/Icons.jsx";

/** Home: a short welcome, two buttons, a small About us, and the contact details. Nothing else. */
export default function Home() {
  const { t } = useI18n();
  const location = useLocation();

  // Lets the nav buttons (/#about, /#contact) land right on that part of the page.
  React.useEffect(() => {
    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  }, [location.hash]);

  return (
    <div>
      <section className="home-welcome">
        <h1>{t("Welcome to LifeFlow")}</h1>
        <p className="home-lines">
          {t("Every drop of blood can save a life.")}<br />
          {t("Donate blood, or ask for blood when you need it.")}
        </p>

        <div className="home-buttons">
          <Link to="/signup?role=donor" className="btn home-btn">
            <DropletIcon size={22} color="#FFFFFF" /> {t("Donor")}
          </Link>
          <Link to="/signup?role=patient" className="btn home-btn home-btn-alt">
            <HeartIcon size={22} color="#FFFFFF" filled /> {t("I need blood")}
          </Link>
        </div>
      </section>

      <section className="home-contact" id="about">
        <h2>{t("About us")}</h2>
        <p>
          {t("LifeFlow is a blood network that connects patients, donors and hospitals. Send a blood request, and nearby donors and hospitals with stock are told right away.")}
          <br />
          {t("Our goal is simple: no one should wait for blood.")}
        </p>
      </section>

      <section className="home-contact" id="contact">
        <h2>{t("Contact us")}</h2>
        <div className="contact-actions">
          <a className="contact-btn" href="tel:+923001234567"><PhoneIcon size={18} color="#FFFFFF" /> <span data-no-translate>+92 300 1234567</span></a>
          <a className="contact-btn contact-btn-alt" href="mailto:support@lifeflow.app"><MailIcon size={18} color="#B01E28" /> <span data-no-translate>support@lifeflow.app</span></a>
        </div>
        <p className="contact-place"><MapPinIcon size={16} color="#B01E28" /> {t("LifeFlow Blood Network, Sindh, Pakistan")}</p>
      </section>
    </div>
  );
}
