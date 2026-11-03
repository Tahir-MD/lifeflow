// Usual working hours of each shift. The hospital can type any other times.
export const SHIFT_CHOICES = ["Shift 1", "Shift 2", "Shift 3", "Shift 4"];
export const DEFAULT_SHIFT_TIMES = {
  "Shift 1": ["06:00", "12:00"],
  "Shift 2": ["12:00", "18:00"],
  "Shift 3": ["18:00", "00:00"],
  "Shift 4": ["00:00", "06:00"],
};

export function prettyTime(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  return `${(h % 12) || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
