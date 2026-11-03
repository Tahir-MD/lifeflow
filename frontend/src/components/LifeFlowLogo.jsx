import React from "react";

export default function LifeFlowLogo({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M13 2C13 2 5 11.5 5 16.5C5 21.19 8.58 24 13 24C17.42 24 21 21.19 21 16.5C21 11.5 13 2 13 2Z"
        fill="#B01E28"
      />
      <path
        d="M8.5 15.5C9.2 12.8 11 10.6 13 9"
        stroke="#F7F4EF"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
