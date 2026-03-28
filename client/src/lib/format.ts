import { format } from "date-fns";

/** Format "HH:MM" → compact 12h like "2:30p" or "8a" */
export function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const suffix = h >= 12 ? "p" : "a";
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

/** Format a scheduled item's date + time range → "Wed 2:30p–4p" */
export function formatSchedule(item: {
  scheduledDate?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
}): string {
  if (!item.scheduledDate) return "";
  const d = new Date(item.scheduledDate + "T12:00:00");
  const day = format(d, "EEE");
  if (item.scheduledStartTime) {
    const start = fmtTime(item.scheduledStartTime);
    const end = item.scheduledEndTime ? fmtTime(item.scheduledEndTime) : "";
    return end ? `${day} ${start}–${end}` : `${day} ${start}`;
  }
  return day;
}
