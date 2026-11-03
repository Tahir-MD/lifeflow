import React from "react";

/** A friendly little robot head, drawn as SVG so it stays sharp at any size. */
export default function RobotIcon({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {/* antenna */}
      <line x1="32" y1="6" x2="32" y2="14" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="5" r="3.2" fill="#FFD9DC" />
      {/* ears */}
      <rect x="4" y="30" width="6" height="14" rx="3" fill="#FFD9DC" />
      <rect x="54" y="30" width="6" height="14" rx="3" fill="#FFD9DC" />
      {/* head */}
      <rect x="9" y="14" width="46" height="40" rx="14" fill="#FFFFFF" />
      {/* face screen */}
      <rect x="15" y="23" width="34" height="22" rx="9" fill="#7E141C" />
      {/* eyes */}
      <circle cx="25" cy="32" r="3.6" fill="#FFFFFF" />
      <circle cx="39" cy="32" r="3.6" fill="#FFFFFF" />
      <circle cx="26" cy="31" r="1.2" fill="#7E141C" />
      <circle cx="40" cy="31" r="1.2" fill="#7E141C" />
      {/* smile */}
      <path d="M26 39c1.8 2.4 10.2 2.4 12 0" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
