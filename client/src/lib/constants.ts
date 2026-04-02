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

// ─── Redesign color system: rose = urgent, amber = intentional, emerald = done ───

/** Quadrant left-border accent on focus items */
export const QUADRANT_BORDER: Record<string, string> = {
  q1: "border-l-[#B8706A]",
  q2: "border-l-[#B09340]",
};

/** Warm background for undone focus items by quadrant */
export const QUADRANT_BG_UNDONE: Record<string, string> = {
  q1: "bg-[#B8706A]/5 dark:bg-[#B8706A]/10",
  q2: "bg-[#B09340]/5 dark:bg-[#B09340]/10",
};

/** Quadrant icon colors */
export const QUADRANT_ICON_COLOR: Record<string, string> = {
  q1: "text-[#B8706A]",
  q2: "text-[#B09340]",
};

/** Category badge classes for inline labels on focus items */
export const CATEGORY_BADGE: Record<string, string> = {
  health: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  wealth: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  relationships: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  growth: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  joy: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};


/** Week strip day cell tints based on completion */
export const WEEK_DAY_TINT: Record<string, string> = {
  allDone: "bg-primary/5 dark:bg-primary/10",
  hasQ1Open: "bg-rose-50 dark:bg-rose-950/15",
  hasQ2Open: "bg-amber-50 dark:bg-amber-950/15",
  neutral: "",
};

