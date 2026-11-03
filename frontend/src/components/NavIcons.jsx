import React from "react";
import { InfoIcon, MapPinIcon, UsersIcon, LogInIcon, LogOutIcon } from "./Icons.jsx";

// A few extra icons for the top bar. The rest are re-exported from Icons.jsx.
const svg = (size) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" });
const stroke = { stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

export function LayoutDashboardIcon({ size = 16 }) {
  return (
    <svg {...svg(size)}>
      <rect x="3" y="3" width="7.5" height="9" rx="1.5" {...stroke} />
      <rect x="13.5" y="3" width="7.5" height="5.5" rx="1.5" {...stroke} />
      <rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.5" {...stroke} />
      <rect x="3" y="15" width="7.5" height="6" rx="1.5" {...stroke} />
    </svg>
  );
}

export function UserIcon({ size = 16 }) {
  return (
    <svg {...svg(size)}>
      <circle cx="12" cy="8" r="4" {...stroke} />
      <path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7" {...stroke} />
    </svg>
  );
}

export function TrophyIcon({ size = 16 }) {
  return (
    <svg {...svg(size)}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" {...stroke} />
      <path d="M8 6H4v1.5A3.5 3.5 0 0 0 8 11M16 6h4v1.5A3.5 3.5 0 0 1 16 11" {...stroke} />
      <path d="M12 13v4M8.5 21h7M10 17h4" {...stroke} />
    </svg>
  );
}

export { InfoIcon, MapPinIcon, UsersIcon, LogInIcon, LogOutIcon };
