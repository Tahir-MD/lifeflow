import React from "react";
import { useI18n } from "../i18n/I18nContext.jsx";

/**
 * Shown only when printing (see .print-only in index.css) -- gives
 * the printed page / PDF a proper title and a timestamp, since the
 * on-screen navigation and tabs are hidden when printing.
 */
export default function PrintHeader({ title, subtitle }) {
  const { t } = useI18n();
  return (
    <div className="print-only print-header">
      <div className="print-title">{t("LifeFlow")} — {t(title)}</div>
      {subtitle && <div className="print-meta">{subtitle}</div>}
      <div className="print-meta">{t("Printed on")} {new Date().toLocaleString()}</div>
    </div>
  );
}
