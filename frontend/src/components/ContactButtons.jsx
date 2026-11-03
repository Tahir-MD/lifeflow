import React from "react";
import { useI18n } from "../i18n/I18nContext.jsx";
import { PhoneIcon, MailIcon } from "./Icons.jsx";

/** Call, SMS and Email buttons for one person. They open the phone's own call, message and mail apps. */
export default function ContactButtons({ phone, email }) {
  const { t } = useI18n();
  const clean = (phone || "").replace(/[^\d+]/g, "");
  if (!clean && !email) return null;
  return (
    <div className="contact-actions contact-actions-small">
      {clean && (
        <a className="contact-btn" href={`tel:${clean}`}><PhoneIcon size={16} color="#FFFFFF" /> {t("Call")}</a>
      )}
      {clean && (
        <a className="contact-btn contact-btn-alt" href={`sms:${clean}`}>💬 {t("SMS")}</a>
      )}
      {email && (
        <a className="contact-btn contact-btn-alt" href={`mailto:${email}`}><MailIcon size={16} color="#B01E28" /> {t("Email")}</a>
      )}
    </div>
  );
}
