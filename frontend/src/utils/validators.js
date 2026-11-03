// Rules for every form. They mirror backend/app/utils/validators.py, so people see
// the problem while typing, and the server still checks everything again.
// Every function returns "" when the value is fine, or a plain-English message key
// (shown through t(), so it is translated into the chosen language).
import { parsePhoneNumberFromString } from "libphonenumber-js/min";

const NAME_ALLOWED = /^[\p{L}\p{M}]+(?:[ .'’-][\p{L}\p{M}]+)*\.?$/u;

// Used while typing: silently drops digits and symbols so a name field can never hold numbers.
export function cleanName(value) {
  return value.replace(/[^\p{L}\p{M} .'’-]/gu, "").replace(/\s{2,}/g, " ");
}

export function nameError(value, required = true) {
  const v = (value || "").trim();
  if (!v) return required ? "Please enter the name." : "";
  if (v.length < 2) return "Name must have at least 2 letters.";
  if (!NAME_ALLOWED.test(v)) return "Use letters only. No numbers or symbols.";
  return "";
}

// Hospital names may have numbers, e.g. "Hospital No. 2".
export function orgNameError(value) {
  const v = (value || "").trim();
  if (!v) return "Please enter the name.";
  if (v.length < 3) return "Name must have at least 3 characters.";
  if (!/\p{L}/u.test(v) || !/^[\p{L}\p{M}\p{N} &.,'’()\/-]+$/u.test(v)) return "This name has characters that are not allowed.";
  return "";
}

export function emailError(value) {
  const v = (value || "").trim();
  if (!v) return "Please enter your email.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Enter a correct email, like name@example.com";
  return "";
}

export const PASSWORD_RULES = [
  { key: "len", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { key: "upper", label: "One capital letter (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { key: "lower", label: "One small letter (a-z)", test: (p) => /[a-z]/.test(p) },
  { key: "digit", label: "One number (0-9)", test: (p) => /\d/.test(p) },
  { key: "special", label: "One special sign (@ # $ ! %)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function passwordError(value) {
  const v = value || "";
  if (!v) return "Please enter a password.";
  // Tell the person exactly which part is missing, one at a time.
  if (v.length < 8) return "Password must have at least 8 characters.";
  if (!/[A-Z]/.test(v)) return "Password is missing a capital letter (A-Z).";
  if (!/[a-z]/.test(v)) return "Password is missing a small letter (a-z).";
  if (!/\d/.test(v)) return "Password is missing a number (0-9).";
  if (!/[^A-Za-z0-9]/.test(v)) return "Password is missing a special sign (@ # $ ! %).";
  return "";
}

export function confirmPasswordError(password, confirm) {
  if (!confirm) return "Please type the password again.";
  if (password !== confirm) return "The two passwords are not the same.";
  return "";
}

export function phoneError(fullNumber, required = true) {
  if (!fullNumber) return required ? "Please enter the phone number." : "";
  const parsed = parsePhoneNumberFromString(fullNumber);
  if (!parsed || !parsed.isValid()) return "This phone number is not correct for the selected country.";
  return "";
}

export function cnicError(value) {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) return "Please enter the CNIC number.";
  if (digits.length !== 13) return "CNIC must have 13 digits.";
  return "";
}

// 4210112345671 -> 42101-1234567-1 while typing
export function formatCnic(value) {
  const d = value.replace(/\D/g, "").slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

export function placeError(value, requiredMessage, required = true) {
  const v = (value || "").trim();
  if (!v) return required ? requiredMessage : "";
  if (!/^[\p{L}\p{M}\p{N} .,'’\/#()-]+$/u.test(v)) return "This has characters that are not allowed.";
  return "";
}

export function locationErrors(loc) {
  return {
    country: loc.country ? "" : "Please choose your country.",
    state: loc.country === "Pakistan" && !loc.state ? "Please choose your province." : placeError(loc.state, "", false),
    city: placeError(loc.city, "Please choose or enter your city.", true),
    area: placeError(loc.area, "", false),
    village: placeError(loc.village, "", false),
  };
}

// Returns "" or { key, params } (key is translated, {min}/{max} are filled in).
export function numberError(value, { min, max }) {
  if (value === "" || value === null || value === undefined) return "Please enter a number.";
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return { key: "Enter a number from {min} to {max}.", params: { min, max } };
  return "";
}

export const hasErrors = (errorsObject) => Object.values(errorsObject).some(Boolean);

// Turns the server's error reply into one readable sentence.
export function serverMessage(error, fallback) {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail) && detail.length) {
    return detail.map((d) => String(d.msg || "").replace(/^Value error, /, "")).join(" ");
  }
  if (typeof detail === "string") return detail;
  if (!error?.response) return "Cannot reach the server. Check your internet and try again.";
  return fallback;
}
