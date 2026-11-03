import React, { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nContext.jsx";

/** Simple offline-mode indicator: the service worker keeps already-visited pages available while this shows. */
export default function OfflineBanner() {
  const { t } = useI18n();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!isOffline) return null;
  return <div className="offline-banner">{t("offline")}</div>;
}
