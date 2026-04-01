import { addDays, addWeeks, format, startOfWeek } from "date-fns";

/**
 * Get week start/end strings for a given base date and week offset.
 * Weeks start on Monday.
 */
export function getWeekBounds(baseDate: Date, weekOffset: number) {
  const weekStart = addWeeks(startOfWeek(baseDate, { weekStartsOn: 1 }), weekOffset);
  return {
    weekStart,
    weekStartStr: format(weekStart, "yyyy-MM-dd"),
    weekEndStr: format(addDays(weekStart, 6), "yyyy-MM-dd"),
  };
}
