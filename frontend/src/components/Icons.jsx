import React from "react";

/**
 * A small set of inline SVG icons so the app never depends on an
 * external icon font or a network-loaded icon library. Every icon
 * takes the same { size, color } props and inherits currentColor by
 * default so it can be recolored purely with CSS.
 */
const base = (size) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": "true",
});

export function DropletIcon({ size = 22, color = "currentColor" }) {
  return (
    <svg {...base(size)}>
      <path
        d="M12 2.5C12 2.5 5 11 5 15.5C5 19.64 8.13 22.5 12 22.5C15.87 22.5 19 19.64 19 15.5C19 11 12 2.5 12 2.5Z"
        stroke={color} strokeWidth="1.7" strokeLinejoin="round"
      />
      <path d="M8.7 15.2C9.3 13 10.7 11.2 12.3 9.8" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function HospitalIcon({ size = 22, color = "currentColor" }) {
  return (
    <svg {...base(size)}>
      <rect x="3.5" y="7" width="17" height="14" rx="1.4" stroke={color} strokeWidth="1.6" />
      <path d="M9 3.5H15V7H9V3.5Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 11V17M9 14H15" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function ShieldCheckIcon({ size = 22, color = "currentColor" }) {
  return (
    <svg {...base(size)}>
      <path d="M12 2.75L19.5 5.75V11.5C19.5 16.2 16.4 20.1 12 21.5C7.6 20.1 4.5 16.2 4.5 11.5V5.75L12 2.75Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.7 12.1L10.9 14.3L15.4 9.6" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MapPinIcon({ size = 22, color = "currentColor" }) {
  return (
    <svg {...base(size)}>
      <path d="M12 21.5C12 21.5 19 15.1 19 9.9C19 5.9 15.9 2.5 12 2.5C8.1 2.5 5 5.9 5 9.9C5 15.1 12 21.5 12 21.5Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="9.8" r="2.6" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

export function PhoneIcon({ size = 22, color = "currentColor" }) {
  return (
    <svg {...base(size)}>
      <path
        d="M4.5 5.2C4.5 4 5.5 3 6.7 3H8.6L10.2 7.2L8.3 9.1C9.1 11.2 10.8 12.9 12.9 13.7L14.8 11.8L19 13.4V15.3C19 16.5 18 17.5 16.8 17.5C10.1 17.1 4.9 11.9 4.5 5.2Z"
        stroke={color} strokeWidth="1.6" strokeLinejoin="round"
      />
    </svg>
  );
}

export function MailIcon({ size = 22, color = "currentColor" }) {
  return (
    <svg {...base(size)}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.4" stroke={color} strokeWidth="1.6" />
      <path d="M4.5 6.7L12 12.5L19.5 6.7" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ClockIcon({ size = 22, color = "currentColor" }) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.6" />
      <path d="M12 7.5V12.2L15.2 14" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UsersIcon({ size = 22, color = "currentColor" }) {
  return (
    <svg {...base(size)}>
      <circle cx="9" cy="8.2" r="3" stroke={color} strokeWidth="1.6" />
      <path d="M3.5 19C3.9 15.9 6.2 14 9 14C11.8 14 14.1 15.9 14.5 19" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15.5 6C17 6.3 18.1 7.6 18.1 9.1C18.1 10.5 17.1 11.7 15.8 12" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M17 14.2C19 14.7 20.5 16.4 20.8 19" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function StarIcon({ size = 18, color = "currentColor", filled = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 2.8L14.9 8.7L21.4 9.7L16.7 14.3L17.8 20.8L12 17.7L6.2 20.8L7.3 14.3L2.6 9.7L9.1 8.7L12 2.8Z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function BoxIcon({ size = 22, color = "currentColor" }) {
  return (
    <svg {...base(size)}>
      <path d="M12 3L20 7.2V16.8L12 21L4 16.8V7.2L12 3Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 7.2L12 11.4L20 7.2M12 11.4V21" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function BellRingIcon({ size = 22, color = "currentColor" }) {
  return (
    <svg {...base(size)}>
      <path d="M6 10.5C6 6.9 8.7 4 12 4C15.3 4 18 6.9 18 10.5C18 15 19.5 16.5 19.5 16.5H4.5C4.5 16.5 6 15 6 10.5Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10.3 19.5C10.6 20.2 11.2 20.6 12 20.6C12.8 20.6 13.4 20.2 13.7 19.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function HeartPulseIcon({ size = 22, color = "currentColor" }) {
  return (
    <svg {...base(size)}>
      <path d="M12 20.3C12 20.3 3.8 15.4 3.8 9.4C3.8 6.4 6.1 4.3 8.7 4.3C10.1 4.3 11.3 5 12 6C12.7 5 13.9 4.3 15.3 4.3C17.9 4.3 20.2 6.4 20.2 9.4C20.2 15.4 12 20.3 12 20.3Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M6.5 10.5H9L10.3 8L12.3 13L13.5 10.5H17" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckCircleIcon({ size = 22, color = "currentColor" }) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.6" />
      <path d="M8.3 12.2L10.7 14.6L15.7 9.6" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HeartIcon({ size = 22, color = "currentColor", filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M12 20.3C12 20.3 3.8 15.4 3.8 9.4C3.8 6.4 6.1 4.3 8.7 4.3C10.1 4.3 11.3 5 12 6C12.7 5 13.9 4.3 15.3 4.3C17.9 4.3 20.2 6.4 20.2 9.4C20.2 15.4 12 20.3 12 20.3Z"
        stroke={color} strokeWidth="1.6" strokeLinejoin="round"
      />
    </svg>
  );
}

export function SparkleIcon({ size = 22, color = "currentColor" }) {
  return (
    <svg {...base(size)}>
      <path
        d="M12 3L13.6 9.1C13.9 10.2 14.8 11.1 15.9 11.4L22 13L15.9 14.6C14.8 14.9 13.9 15.8 13.6 16.9L12 23L10.4 16.9C10.1 15.8 9.2 14.9 8.1 14.6L2 13L8.1 11.4C9.2 11.1 10.1 10.2 10.4 9.1L12 3Z"
        stroke={color} strokeWidth="1.4" strokeLinejoin="round"
      />
    </svg>
  );
}

export function SendIcon({ size = 18, color = "currentColor" }) {
  return (
    <svg {...base(size)}>
      <path d="M4 12L20 4L14 20L11 13L4 12Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M11 13L20 4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function TrendUpIcon({ size = 20, color = "currentColor" }) {
  return (
    <svg {...base(size)}>
      <path d="M3.5 16.5L9.5 10.5L13.5 14.5L20.5 6.5" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 6.5H20.5V11.5" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InfoIcon({ size = 22, color = "currentColor" }) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.6" />
      <path d="M12 11V16.5" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="8" r="0.9" fill={color} />
    </svg>
  );
}

export function LogInIcon({ size = 22, color = "currentColor" }) {
  return (
    <svg {...base(size)}>
      <path d="M10.5 3.5H6.5C5.4 3.5 4.5 4.4 4.5 5.5V18.5C4.5 19.6 5.4 20.5 6.5 20.5H10.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 8L19.5 12L15 16M19.5 12H9.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LogOutIcon({ size = 22, color = "currentColor" }) {
  return (
    <svg {...base(size)}>
      <path d="M13.5 3.5H6.5C5.4 3.5 4.5 4.4 4.5 5.5V18.5C4.5 19.6 5.4 20.5 6.5 20.5H13.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 8L20 12L15.5 16M20 12H9.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 18, color = "currentColor" }) {
  return (
    <svg {...base(size)}>
      <path d="M4.5 12H19M19 12L13.5 6.5M19 12L13.5 17.5" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
