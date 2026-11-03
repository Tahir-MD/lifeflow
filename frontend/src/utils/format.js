// Small helpers that build readable, translated sentences.
export function describeUrgency(request, t) {
  const n = request.urgency_value;
  if (request.urgency_type === "emergency") return t("Emergency, needed right now");
  if (request.urgency_type === "days") return n === 1 ? t("Needed within 1 day") : t("Needed within {n} days", { n });
  if (request.urgency_type === "months") return n === 1 ? t("Needed within 1 month") : t("Needed within {n} months", { n });
  return "";
}
