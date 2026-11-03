import React from "react";
import { useI18n } from "../i18n/I18nContext.jsx";

/**
 * A "Print / Save as PDF" button for any history view. It just opens
 * the browser's normal print dialog -- choosing "Save as PDF" there
 * is how the record gets saved as a PDF, with no extra library
 * needed. Print-only CSS (see index.css) hides the navigation, tabs,
 * and every other button so only this record prints cleanly.
 */
export default function PrintButton({ label = "Print / Save as PDF" }) {
  const { t } = useI18n();
  return (
    <button type="button" className="inline-btn btn-outline no-print print-btn" onClick={() => window.print()}>
      {t(label)}
    </button>
  );
}
