// Where is the app running, and where is the backend?
//  - In a browser / installed PWA: the backend address comes from VITE_API_URL (see .env.example).
//  - In the Android app (Capacitor): the same, with the Android emulator's host address as the fallback.
//  - A person (or you, while testing) can override it in the browser console:
//        localStorage.setItem("lifeflow_api_url", "https://api.example.com")

export function isNativeApp() {
  try { return Boolean(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
  catch (e) { return false; }
}

function resolveApiBase() {
  let override = "";
  try { override = localStorage.getItem("lifeflow_api_url") || ""; } catch (e) { /* storage blocked */ }
  const fromEnv = import.meta.env.VITE_API_URL || "";
  const fallback = isNativeApp() ? "http://10.0.2.2:8000" : "http://127.0.0.1:8000";
  return (override || fromEnv || fallback).replace(/\/+$/, "");
}

export const API_BASE_URL = resolveApiBase();

export function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true || isNativeApp();
}
