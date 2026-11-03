import React from "react";

// Small line icons for the dashboard tabs (24x24, drawn with currentColor).
const PATHS = {
  droplet: "M12 2.7c3.5 4 6 7.2 6 10.3a6 6 0 0 1-12 0c0-3.1 2.5-6.3 6-10.3z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  chart: "M3 3v18h18M7 15l4-4 3 3 5-6",
  box: "M21 8l-9-5-9 5v8l9 5 9-5V8zM3.3 7.5L12 12.5l8.7-5M12 22V12.5",
  check: "M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4L12 14l-3-3",
  plus: "M12 5v14M5 12h14",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  flask: "M9 3h6M10 3v6L4.5 19a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 9V3M7 15h10",
  swap: "M17 3l4 4-4 4M3 7h18M7 21l-4-4 4-4M21 17H3",
  megaphone: "M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1zM16 8a5 5 0 0 1 0 8",
  phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.2-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
  sparkle: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  database: "M12 8c4.4 0 8-1.1 8-2.5S16.4 3 12 3 4 4.1 4 5.5 7.6 8 12 8zM4 5.5v13C4 19.9 7.6 21 12 21s8-1.1 8-2.5v-13M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.7 21a2 2 0 0 1-3.4 0",
  hospital: "M3 21V7l9-4 9 4v14M9 21v-6h6v6M12 8v4M10 10h4",
  pulse: "M22 12h-4l-3 9L9 3l-3 9H2",
};

// Which icon goes with which tab.
const BY_TAB = {
  requests: "list", history: "file", camps: "calendar", stats: "chart", voice: "pulse",
  new: "plus", myrequests: "list", stockreq: "box", confirm: "check", inventory: "database",
  transfers: "swap", staff: "users", lab: "flask", bulk: "megaphone", directory: "phone", ai: "sparkle",
  duty: "clock", stock: "database", team: "users", visitors: "users", checkin: "check", screening: "pulse",
  donors: "droplet", hospitals: "hospital", receivers: "heart", donations: "droplet", notifications: "bell",
  review: "shield", governance: "shield", extras: "check", backups: "database",
};

export default function TabIcon({ name, size = 16 }) {
  const path = PATHS[BY_TAB[name] || name];
  if (!path) return null;
  return (
    <svg className="tab-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}
