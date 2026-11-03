import React, { useState } from "react";
import { downloadExport } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import { serverMessage } from "../utils/validators.js";

/** "Download Excel" and "Download PDF" for the admin, a hospital or a donor (role: admin | hospital | donor). */
export default function ExportButtons({ role }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function go(format) {
    setError("");
    setBusy(format);
    try {
      await downloadExport(role, format);
    } catch (err) {
      let message = serverMessage(err, "Could not download the report.");
      // A failed blob download hides the server's JSON message inside a Blob, so say it simply.
      if (err?.response?.data instanceof Blob) message = "Could not download the report.";
      setError(message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="no-print export-buttons">
      <button type="button" className="btn-outline" onClick={() => go("xlsx")} disabled={!!busy}>
        📊 {busy === "xlsx" ? t("Please wait...") : t("Download Excel")}
      </button>
      <button type="button" className="btn-outline" onClick={() => go("pdf")} disabled={!!busy}>
        📄 {busy === "pdf" ? t("Please wait...") : t("Download PDF")}
      </button>
      {error && <p className="error-text" role="alert">{t(error)}</p>}
    </div>
  );
}
