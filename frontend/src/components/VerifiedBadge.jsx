import React from "react";

export default function VerifiedBadge({ verified }) {
  if (!verified) return null;
  return <span className="badge" title="Checked by the LifeFlow admin" style={{ marginLeft: 6 }}>✔ Verified</span>;
}
