import React, { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nContext.jsx";
import { isStandalone } from "../platform.js";

const DISMISS_KEY = "lifeflow_install_dismissed";

function wasDismissed() {
  try { return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < 7 * 24 * 3600 * 1000; } catch (e) { return false; }
}

/**
 * "Install LifeFlow" banner. Android/desktop Chrome and Edge give us a real install button;
 * iPhone/iPad Safari has none, so we show the "Add to Home Screen" steps instead.
 */
export default function InstallPrompt() {
  const { t } = useI18n();
  const [deferred, setDeferred] = useState(null);
  const [iosHint, setIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone() || wasDismissed()) return;
    const ua = window.navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
    if (isIos) { setIosHint(true); setHidden(false); }
    const onPrompt = (event) => { event.preventDefault(); setDeferred(event); setHidden(false); };
    const onInstalled = () => { setHidden(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) { /* ignore */ }
    setHidden(true);
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setDeferred(null);
    setHidden(true);
  }

  if (hidden || (!deferred && !iosHint)) return null;
  return (
    <div className="install-banner" role="dialog" aria-label={t("pwa.install.title")}>
      <img src="/icons/icon-192.png" alt="" width="40" height="40" />
      <div className="install-text">
        <strong>{t("pwa.install.title")}</strong>
        <span>{iosHint && !deferred ? t("pwa.install.ios") : t("pwa.install.body")}</span>
      </div>
      {deferred && <button type="button" onClick={install}>{t("pwa.install.button")}</button>}
      <button type="button" className="btn-outline" onClick={dismiss} aria-label={t("pwa.install.later")}>{t("pwa.install.later")}</button>
    </div>
  );
}
