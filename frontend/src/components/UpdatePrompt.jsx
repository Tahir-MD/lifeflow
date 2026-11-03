import React, { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nContext.jsx";

/** When a new version of the app has been downloaded in the background, offer a one-tap refresh. */
export default function UpdatePrompt() {
  const { t } = useI18n();
  const [waiting, setWaiting] = useState(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let reloading = false;
    const onControllerChange = () => { if (!reloading) { reloading = true; window.location.reload(); } };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(worker);
        });
      });
      // Look for a new version whenever the app is opened again.
      const check = () => reg.update().catch(() => {});
      document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
    });
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  if (!waiting) return null;
  return (
    <div className="update-toast" role="status">
      <span>{t("pwa.update.body")}</span>
      <button type="button" onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })}>{t("pwa.update.button")}</button>
    </div>
  );
}
