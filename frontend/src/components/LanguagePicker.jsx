import React from "react";

// Which language to listen for. Defaults to the language the app is showing.
export default function LanguagePicker({ value, onChange }) {
  const options = [["ur", "اردو"], ["sd", "سنڌي"], ["en", "English"]];
  return (
    <span role="radiogroup" style={{ display: "inline-flex", gap: "6px" }}>
      {options.map(([code, label]) => (
        <button key={code} type="button" role="radio" aria-checked={value === code}
          className={`lang-chip ${value === code ? "active" : ""}`} onClick={() => onChange(code)}>{label}</button>
      ))}
    </span>
  );
}
