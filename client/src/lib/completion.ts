import type { HabitCompletion } from "@shared/schema";

/** Build habitId → status string map from completions array */
export function buildHabitStatusMap(completions: HabitCompletion[]): Map<number, string> {
  const map = new Map<number, string>();
  completions.forEach((hc) => {
    map.set(hc.habitId, hc.status || "completed");
  });
  return map;
}
