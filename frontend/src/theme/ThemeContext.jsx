import React, { createContext, useContext, useEffect, useState } from "react";

// Dark mode and large-text mode, remembered on this device. "auto" follows the phone/computer setting.
const ThemeContext = createContext({ theme: "auto", setTheme: () => {}, textSize: "normal", setTextSize: () => {} });

export const TEXT_SIZES = ["normal", "large", "xlarge"];

function read(key, allowed, fallback) {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value) ? value : fallback;
  } catch (error) {
    return fallback;
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light") // the light/dark button was removed, so the app is always light;
  const [textSize, setTextSize] = useState("normal") // the text size button was removed;

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    const apply = () => {
      const dark = theme === "dark" || (theme === "auto" && media && media.matches);
      root.setAttribute("data-theme", dark ? "dark" : "light");
    };
    apply();
    try { localStorage.setItem("lifeflow_theme", theme); } catch (error) { /* private mode: keep going */ }
    if (media && media.addEventListener) {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
    return undefined;
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-text", textSize);
    try { localStorage.setItem("lifeflow_text", textSize); } catch (error) { /* ignore */ }
  }, [textSize]);

  return <ThemeContext.Provider value={{ theme, setTheme, textSize, setTextSize }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
