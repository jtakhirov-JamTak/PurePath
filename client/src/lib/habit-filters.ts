import type { Habit } from "@shared/schema";

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MAX_ACTIVE_HABITS = 3;
const TIMING_ORDER: Record<string, number> = { morning: 0, afternoon: 1, evening: 2 };

/**
 * Deduplicate habits by lineageId, preferring active versions.
 */
function dedupeByLineage(habits: Habit[]): Habit[] {
  const byLineage = new Map<string, Habit>();
  habits.forEach((h) => {
    const key = h.lineageId || String(h.id);
    const existing = byLineage.get(key);
    if (!existing || (h.active && !existing.active)) byLineage.set(key, h);
  });
  return Array.from(byLineage.values());
}

/**
 * Get today's active habits: active-only, cadence match, date range, deduped by lineage, max 3.
 * Used on dashboard and journal-hub "today" sections.
 */
export function getTodaysHabits(habits: Habit[], dateStr: string): Habit[] {
  const day = new Date(dateStr + "T12:00:00");
  const dayCode = DAY_CODES[day.getDay()];

  const scheduled = habits.filter((h) => {
    if (!h.active) return false;
    if (!h.cadence.split(",").includes(dayCode)) return false;
    if (h.startDate && dateStr < h.startDate) return false;
    if (h.endDate && dateStr > h.endDate) return false;
    return true;
  });

  const deduped = dedupeByLineage(scheduled);
  if (deduped.length > MAX_ACTIVE_HABITS) {
    deduped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    deduped.length = MAX_ACTIVE_HABITS;
  }
  deduped.sort((a, b) => {
    const ta = TIMING_ORDER[a.timing || "afternoon"] ?? 1;
    const tb = TIMING_ORDER[b.timing || "afternoon"] ?? 1;
    if (ta !== tb) return ta - tb;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
  return deduped;
}

/**
 * Get habits for a past/selected date: includes archived habits within their date range,
 * cadence match, deduped by lineage, no max cap.
 * Used on journal-hub selected-date and dashboard progress metrics.
 */
export function getDateHabits(habits: Habit[], dateStr: string): Habit[] {
  const day = new Date(dateStr + "T12:00:00");
  const dayCode = DAY_CODES[day.getDay()];

  const scheduled = habits.filter((h) => {
    if (!h.cadence.split(",").includes(dayCode)) return false;
    if (h.startDate && dateStr < h.startDate) return false;
    if (h.endDate && dateStr > h.endDate) return false;
    if (!h.active) {
      if (!h.startDate || !h.endDate) return false;
    }
    return true;
  });

  return dedupeByLineage(scheduled);
}
