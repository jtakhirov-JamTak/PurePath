import { differenceInCalendarDays, parseISO } from "date-fns";

const TOTAL_SPRINT_FRAMES = 31;

/**
 * Returns sprint day info, or null if no active sprint.
 */
export function getSprintDay(startDate: string, endDate: string, today: string): { day: number; totalDays: number } | null {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const now = parseISO(today);

  const totalDays = differenceInCalendarDays(end, start) + 1;
  if (totalDays < 1) return null;

  const elapsed = differenceInCalendarDays(now, start) + 1;
  const day = Math.max(1, Math.min(elapsed, totalDays));
  return { day, totalDays };
}

/**
 * Maps a sprint day to a background image path.
 * Uses linear interpolation so any sprint length (10-31 days) cycles through all 31 frames.
 */
export function getSprintBackground(currentDay: number, totalDays: number): string {
  const frame = Math.ceil((currentDay / totalDays) * TOTAL_SPRINT_FRAMES);
  const clamped = Math.max(1, Math.min(frame, TOTAL_SPRINT_FRAMES));
  return `/backgrounds/sprint/day-${String(clamped).padStart(2, "0")}.webp`;
}

/**
 * Convenience: get sprint background from dates directly.
 */
export function getSprintBackgroundForDate(startDate: string, endDate: string, today: string): string | null {
  const result = getSprintDay(startDate, endDate, today);
  if (!result) return null;
  return getSprintBackground(result.day, result.totalDays);
}

/**
 * Returns the wizard background image path for a given setup step (0-5).
 */
export function getWizardBackground(step: number): string {
  const clamped = Math.max(0, Math.min(step, 5));
  return `/backgrounds/wizard/step-${clamped}.webp`;
}
