import type { EisenhowerEntry } from "@shared/schema";

/**
 * Get focus items for a selected day on the dashboard.
 * Q1 + Q2-that-block-goal for the current week, filtered by scheduled date.
 * Unscheduled items only show on actual today.
 * Excludes skipped items with a skip reason.
 */
export function getTodaysFocusItems(
  entries: EisenhowerEntry[],
  weekStartStr: string,
  selectedDate: string,
  actualToday: string,
): EisenhowerEntry[] {
  return entries.filter((e) => {
    if (e.weekStart !== weekStartStr) return false;
    if (e.status === "skipped" && e.skipReason) return false;
    if (e.quadrant !== "q1" && !(e.quadrant === "q2" && e.blocksGoal)) return false;
    if (e.scheduledDate) return e.scheduledDate === selectedDate;
    return selectedDate === actualToday;
  });
}

/**
 * Get all focus items for the week (Plan tab).
 * Q1 + Q2-that-block-goal for the given week.
 */
export function getWeekFocusItems(
  entries: EisenhowerEntry[],
  weekStartStr: string,
): EisenhowerEntry[] {
  return entries.filter(
    (e) => e.weekStart === weekStartStr && (e.quadrant === "q1" || (e.quadrant === "q2" && e.blocksGoal)),
  );
}

/**
 * Get scheduled items with date+time for the weekly calendar (Proof tab).
 * Q1 + Q2 with a scheduledDate and scheduledStartTime.
 */
export function getScheduledItems(
  entries: EisenhowerEntry[],
  weekStartStr: string,
): EisenhowerEntry[] {
  return entries.filter(
    (e) => e.weekStart === weekStartStr && (e.quadrant === "q1" || e.quadrant === "q2") && e.scheduledDate && e.scheduledStartTime,
  );
}
