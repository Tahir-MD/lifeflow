import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { I18nProvider } from "./i18n/I18nContext.jsx";
import { ThemeProvider } from "./theme/ThemeContext.jsx";
import "./index.css";
import { API_BASE_URL, isNativeApp } from "./platform.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>
);

// Offline mode + push: the service worker caches pages/assets and receives push events.
// (Not registered inside the Android app -- its files are already on the phone.)
if ("serviceWorker" in navigator && !isNativeApp()) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`/sw.js?api=${encodeURIComponent(new URL(API_BASE_URL, window.location.href).origin)}`).catch(() => {});
  });
}
