import type { HabitCompletion } from "@shared/schema";

/** Label for a completion level box */
export function getCompletionLabel(level: number | null, isBinary = false): string {
  if (isBinary) {
    return level === 1 ? "Done" : level === 0 ? "Skip" : "\u2014";
  }
  return level === 2 ? "Full" : level === 1 ? "Min" : level === 0 ? "Skip" : "\u2014";
}

/** Habit-specific label (always non-binary style: Done/Min/Skip) */
export function getHabitLabel(level: number | null): string {
  return level === 2 ? "Done" : level === 1 ? "Min" : level === 0 ? "Skip" : "\u2014";
}

/** Tailwind classes for a completion level box based on status */
export function getCompletionBoxClass(status: string | null): string {
  if (status === "completed") return "bg-emerald-500 border-emerald-600 text-white";
  if (status === "minimum") return "bg-yellow-300 border-yellow-400 text-yellow-800 dark:bg-yellow-400/40 dark:border-yellow-400/60 dark:text-yellow-200";
  if (status === "skipped") return "bg-red-400 border-red-500 text-white dark:bg-red-500/40 dark:border-red-500/60";
  return "border-border text-muted-foreground";
}

/** Tailwind classes for a focus item completion box based on level + isBinary */
export function getFocusBoxClass(level: number | null, isBinary = false): string {
  if (level === 2 || (isBinary && level === 1)) return "bg-emerald-500 border-emerald-600 text-white";
  if (level === 1) return "bg-yellow-300 border-yellow-400 text-yellow-800 dark:bg-yellow-400/40 dark:border-yellow-400/60 dark:text-yellow-200";
  if (level === 0) return "bg-red-400 border-red-500 text-white dark:bg-red-500/40 dark:border-red-500/60";
  return "border-border text-muted-foreground";
}

/** Build habitId → completionLevel map from completions array */
export function buildHabitLevelMap(completions: HabitCompletion[]): Map<number, number> {
  const map = new Map<number, number>();
  completions.forEach((hc) => {
    if (hc.completionLevel != null) {
      map.set(hc.habitId, hc.completionLevel);
    } else {
      const fallback = hc.status === "completed" ? 2 : hc.status === "minimum" ? 1 : hc.status === "skipped" ? 0 : null;
      if (fallback != null) map.set(hc.habitId, fallback);
    }
  });
  return map;
}

/** Build habitId → status string map from completions array */
export function buildHabitStatusMap(completions: HabitCompletion[]): Map<number, string> {
  const map = new Map<number, string>();
  completions.forEach((hc) => {
    map.set(hc.habitId, hc.status || "completed");
  });
  return map;
}

/** Next level in habit cycling: null → 2 → 1 → 0 → null */
export function getNextHabitLevel(current: number | null): number | null {
  if (current === null || current === undefined) return 2;
  if (current === 2) return 1;
  if (current === 1) return 0;
  return null;
}

/** Next level in focus item cycling (handles binary vs non-binary) */
export function getNextFocusLevel(current: number | null, isBinary: boolean): number | null {
  if (isBinary) {
    if (current === null) return 1;
    if (current === 1) return 0;
    return null;
  }
  if (current === null) return 2;
  if (current === 2) return 1;
  if (current === 1) return 0;
  return null;
}
