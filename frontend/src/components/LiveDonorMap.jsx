import React, { useEffect, useState } from "react";
import MapView from "./MapView.jsx";
import { getLiveLocation } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";

/** Shows the donor's live position and the place the blood is needed. Refreshes every 15 seconds. */
export default function LiveDonorMap({ requestId }) {
  const { t } = useI18n();
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await getLiveLocation(requestId);
        if (alive) setData(r.data);
      } catch (err) { /* not available: simply show nothing */ }
    }
    load();
    const timer = setInterval(load, 15000);
    return () => { alive = false; clearInterval(timer); };
  }, [requestId]);

  if (!data) return null;
  const points = [{ lat: data.destination.latitude, lng: data.destination.longitude, label: t("Blood needed here"), color: "#1f6feb" }];
  data.donors.forEach((d) => points.push({ lat: d.latitude, lng: d.longitude, label: `🚗 ${d.donor_name}`, color: "#c8102e" }));
  return (
    <div className="live-map">
      <strong>🗺️ {t("Map")}</strong>
      {data.donors.length === 0 && <p className="field-hint">{t("The donor's live location appears here once they tap 'I am on the way'.")}</p>}
      <MapView points={points} />
    </div>
  );
}
