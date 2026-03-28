/** Canonical category color classes (bg-* for dots/pips) */
export const CATEGORY_COLORS: Record<string, string> = {
  health: "bg-emerald-500",
  wealth: "bg-yellow-500",
  relationships: "bg-rose-500",
  growth: "bg-blue-500",
  joy: "bg-amber-500",
  // Legacy keys (some habits may still use these)
  "self-development": "bg-blue-500",
  happiness: "bg-slate-400",
};

/** Category labels for UI display */
export const CATEGORY_LABELS: Record<string, string> = {
  health: "Health",
  wealth: "Wealth",
  relationships: "Relationships",
  growth: "Growth",
  joy: "Joy",
};

/** Full-opacity category classes for completed items (weekly calendar) */
export const CATEGORY_COMPLETED: Record<string, string> = {
  health: "bg-emerald-500 text-white",
  wealth: "bg-yellow-500 text-white",
  relationships: "bg-rose-500 text-white",
  growth: "bg-blue-500 text-white",
  joy: "bg-amber-500 text-white",
};

/** Muted category classes for pending items (weekly calendar) */
export const CATEGORY_PENDING: Record<string, string> = {
  health: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  wealth: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  relationships: "bg-rose-500/20 text-rose-700 dark:text-rose-400",
  growth: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  joy: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
};

/** Timing sort order */
export const TIMING_ORDER: Record<string, number> = {
  morning: 0,
  afternoon: 1,
  evening: 2,
};

/** Timing display labels */
export const TIMING_LABELS: Record<string, string> = {
  morning: "AM",
  afternoon: "PM",
  evening: "Eve",
};
