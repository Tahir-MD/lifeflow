import React, { useEffect, useState } from "react";
import { getTracking } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";

const STEP_LABELS = {
  created: "Request sent",
  stock_checked: "Hospital stock checked",
  donors_alerted: "Donors alerted",
  donor_accepted: "A donor accepted",
  donor_on_the_way: "Donor on the way",
  donor_arrived: "Donor arrived",
  received: "Blood received",
  fulfilled: "Request completed",
};

/** A live timeline for one blood request. It refreshes by itself every 20 seconds while open. */
export default function RequestTimeline({ requestId }) {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await getTracking(requestId);
        if (alive) { setData(response.data); setError(false); }
      } catch (err) {
        if (alive) setError(true);
      }
    }
    load();
    const timer = setInterval(load, 20000);
    return () => { alive = false; clearInterval(timer); };
  }, [requestId]);

  if (error && !data) return <p className="error-text">{t("Could not load the live status.")}</p>;
  if (!data) return <p className="field-hint">{t("Loading...")}</p>;

  return (
    <div className="timeline" aria-live="polite">
      {data.review_status === "held" && <p className="notice-text">🕒 {t("A LifeFlow reviewer is checking this request before donors are alerted.")}</p>}
      {data.review_status === "rejected" && <p className="error-text">{t("This request was not approved.")}</p>}
      <ol className="timeline-steps">
        {data.steps.map((step) => {
          const done = data.done_steps.includes(step);
          return (
            <li key={step} className={done ? "done" : ""}>
              <span className="timeline-dot">{done ? "✓" : ""}</span>
              <span>{t(STEP_LABELS[step] || step)}</span>
            </li>
          );
        })}
      </ol>
      <p className="field-hint">{data.units_fulfilled}/{data.units_needed} {t("bags fulfilled")}</p>
      <ul className="timeline-events">
        {data.events.map((e, i) => (
          <li key={i}><span className="timeline-time">{new Date(e.created_at + "Z").toLocaleString()}</span> {e.message}</li>
        ))}
      </ul>
    </div>
  );
}

/** A "Track" button that opens the timeline under a request row. */
export function TrackToggle({ requestId }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="no-print">
      <button type="button" className="btn-outline" onClick={() => setOpen(!open)}>{open ? t("Hide") : `📍 ${t("Track live")}`}</button>
      {open && <RequestTimeline requestId={requestId} />}
    </div>
  );
}
