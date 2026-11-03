import React, { useEffect, useState } from "react";
import { getMyCertificates } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import PrintButton from "./PrintButton.jsx";
import ExportButtons from "./ExportButtons.jsx";
import { serverMessage } from "../utils/validators.js";

/** Printable donor certificates (one per donation). The QR code opens the public check page. */
export default function CertificatesPanel() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyCertificates().then((r) => { setData(r.data); setSelected(r.data.certificates[0] || null); })
      .catch((err) => setError(serverMessage(err, "Could not load certificates.")));
  }, []);

  if (error) return <div className="card"><p className="error-text">{error}</p></div>;
  if (!data) return <div className="card"><p className="field-hint">{t("Loading...")}</p></div>;

  const verifyUrl = selected ? `${window.location.origin}/verify/${selected.code}` : "";
  const qr = selected ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyUrl)}` : "";

  return (
    <div className="card">
      <div className="list-row-top no-print">
        <h2>{t("My certificates")}</h2>
        <ExportButtons role="donor" />
      </div>
      <p className="subtitle no-print">{t("Every donation earns a certificate you can print or save as a PDF.")}</p>
      {data.certificates.length === 0 && <p className="empty-state">{t("You have not made a donation yet.")}</p>}

      {data.certificates.length > 0 && (
        <>
          <div className="no-print">
            <label htmlFor="cert-pick">{t("Choose a donation")}</label>
            <select id="cert-pick" value={selected ? selected.code : ""} onChange={(e) => setSelected(data.certificates.find((c) => c.code === e.target.value))}>
              {data.certificates.map((c) => (
                <option key={c.code} value={c.code}>{new Date(c.donated_at).toLocaleDateString()} · {c.units_donated} {t("bags")}</option>
              ))}
            </select>
          </div>

          {selected && (
            <div className="certificate" id="certificate">
              <div className="certificate-border">
                <div className="certificate-brand">🩸 LifeFlow</div>
                <h1>{t("Certificate of Appreciation")}</h1>
                <p>{t("This certificate is proudly given to")}</p>
                <div className="certificate-name">{data.donor_name}</div>
                <p>
                  {t("for donating")} <strong>{selected.units_donated} {t(selected.units_donated === 1 ? "bag" : "bags")}</strong> {t("of blood")} ({selected.blood_type}) {t("on")} <strong>{new Date(selected.donated_at).toLocaleDateString()}</strong>,
                  {" "}{t("given to")} {selected.given_to}.
                </p>
                <p className="certificate-quote">{t("Your gift can save up to three lives.")}</p>
                <div className="certificate-foot">
                  <div>
                    <div className="certificate-meta">{t("Certificate no.")} <strong>{selected.code}</strong></div>
                    <div className="certificate-meta">{t("Level")}: {data.badge_tier} · {data.total_donations} {t("donations")}</div>
                  </div>
                  <img src={qr} alt={t("Scan to check this certificate")} width="90" height="90" />
                </div>
              </div>
            </div>
          )}
          <PrintButton label="Print / Save as PDF" />
        </>
      )}
    </div>
  );
}
