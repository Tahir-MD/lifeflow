import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { verifyCertificateCode } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";

/** Public page (no login) opened by the QR code on a certificate. */
export default function VerifyCertificate() {
  const { code } = useParams();
  const { t } = useI18n();
  const [result, setResult] = useState(null);

  useEffect(() => {
    verifyCertificateCode(code).then((r) => setResult(r.data)).catch(() => setResult({ valid: false }));
  }, [code]);

  return (
    <div className="page">
      <div className="card">
        <h2>{t("Certificate check")}</h2>
        {!result && <p className="field-hint">{t("Loading...")}</p>}
        {result && result.valid && (
          <>
            <p className="success-text" role="status">✅ {t("This certificate is real.")}</p>
            <p>{result.donor} · {result.blood_type} · {result.units} {t("bags")} · {result.date}</p>
            <p>{t("Given to")}: {result.given_to}</p>
          </>
        )}
        {result && !result.valid && <p className="error-text" role="alert">{t("This certificate could not be confirmed.")}</p>}
        <p className="field-hint">{code}</p>
        <Link to="/">{t("Go to the home page")}</Link>
      </div>
    </div>
  );
}
