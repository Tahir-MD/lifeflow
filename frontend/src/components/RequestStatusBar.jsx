import React, { useState } from "react";
import { cancelRequest } from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";
import { useToast } from "./ToastContext.jsx";
import { serverMessage } from "../utils/validators.js";

const COLORS = {
  Pending: "#b7791f", "Donor Accepted": "#1f6feb", "Donation in Progress": "#1f6feb",
  "Partially Fulfilled": "#7c3aed", Completed: "#15803d", Cancelled: "#6b7280",
};

/** The plain status of a request, plus a Cancel button while it is still running. */
export default function RequestStatusBar({ request, onChanged }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const label = request.display_status || request.status;
  const canCancel = request.status === "open" || request.status === "held";

  async function cancel() {
    if (!window.confirm(t("Cancel this request? Donors who were helping will be told."))) return;
    setBusy(true);
    try {
      await cancelRequest(request.id);
      toast(t("Request cancelled."));
      if (onChanged) onChanged();
    } catch (err) {
      toast(serverMessage(err, "Could not cancel the request."));
    } finally { setBusy(false); }
  }

  return (
    <div className="request-status-bar no-print">
      <span className="status-pill" style={{ background: COLORS[label] || "#6b7280" }}>{t(label)}</span>
      {canCancel && <button type="button" className="btn-outline btn-danger-outline" disabled={busy} onClick={cancel}>✖ {t("Cancel request")}</button>}
    </div>
  );
}
