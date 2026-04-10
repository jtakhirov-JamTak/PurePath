/** Types, constants, and pure logic for the Weekly Proof Engine (4-screen wizard). */

export const MAX_Q1 = 5;
export const MAX_Q2 = 2;
export const MAX_BRAIN_DUMP = 30;
export const MAX_DAYS_PER_ITEM = 5;
export const SOFT_CAP = 10;
export const TOTAL_STEPS = 8;
export const VISIBLE_SCREENS = 4;

/** Map internal step (1-8) to visible screen (1-4) */
export function stepToScreen(step: number): number {
  if (step <= 1) return 1; // Review
  if (step <= 2) return 2; // Choose Truth
  if (step <= 6) return 3; // Build Week
  return 4;                // Protect Week
}

/** Screen labels for progress display */
export const SCREEN_LABELS = ["Review", "Choose Truth", "Build Week", "Protect Week"];

export const TIME_SLOTS = Array.from({ length: 27 }, (_, i) => {
  const totalMinutes = 8 * 60 + i * 30; // 8:00am to 9:00pm
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const label = `${h12}:${String(m).padStart(2, "0")}${h >= 12 ? "p" : "a"}`;
  return { value: `${hh}:${mm}`, label };
});

// Step 5 — Classification enums
export type SortImportance = "clearly" | "no";
export type SortConsequence = "deadline_breaks" | "task_blocked" | "cost_worse" | "important_nothing_breaks" | "not_much";
export type SortBlocker = "avoiding_discomfort" | "unclear_next_step" | "need_someone_else" | "nothing";
export type SortResult = "handle" | "protect" | "not_this_week";

export const IMPORTANCE_CHIPS: { value: SortImportance; label: string }[] = [
  { value: "clearly", label: "Yes, this clearly deserves space this week" },
  { value: "no", label: "No, not this week" },
];

export const CONSEQUENCE_CHIPS: { value: SortConsequence; label: string }[] = [
  { value: "deadline_breaks", label: "A deadline or appointment breaks" },
  { value: "task_blocked", label: "Another important task is blocked" },
  { value: "cost_worse", label: "Cost or risk gets worse" },
  { value: "important_nothing_breaks", label: "It stays important, but nothing breaks yet" },
  { value: "not_much", label: "Not much happens" },
];

export const BLOCKER_CHIPS: { value: SortBlocker; label: string }[] = [
  { value: "avoiding_discomfort", label: "I'm avoiding it because it feels uncomfortable" },
  { value: "unclear_next_step", label: "I'm not clear on the next step" },
  { value: "need_someone_else", label: "I need something from someone else" },
  { value: "nothing", label: "Nothing is in the way" },
];

// Step 7 — Sequence reasons
export type SequenceReason = "dependency" | "deadline" | "consequence" | "leverage";

export const SEQUENCE_LABELS: Record<SequenceReason, string> = {
  dependency: "Unblocks other items",
  deadline: "Hard deadline / appointment",
  consequence: "Highest consequence",
  leverage: "Strategic leverage",
};

export interface ProofItem {
  id: number;
  text: string;
  outcome: string;
  hardTruthRelated: boolean;
  // Classification (Step 5)
  classifyGoalMove: SortImportance | null;
  classifyIgnore7Days: SortConsequence | null;
  classifyBlocker: SortBlocker | null;
  // Bucket result
  sortResult: SortResult | null;
  sortPriority: number | null;
  // Sequencing (Step 7)
  sequenceOrder: number | null;
  sequenceReason: SequenceReason | null;
  // Scheduling (Step 8)
  scheduledDates: string[];
  scheduledStartTime: string;
  scheduledEndTime: string;
  firstMove: string;
  ifThenStatement: string;
  revisitDate: string;
}

export interface OpeningData {
  patternPullBack: string;
  openStory: string;
  openHardTruth: string;
  openHardAction: string;
}

export interface CloseWeekData {
  weekStart: string;
  completedCount: number;
  totalCount: number;
  skipReasons: string[];
  habitStats: {
    completed: number;
    skipped: number;
    minimum: number;
    total: number;
    skipReasons: string[];
  };
  previousHardAction: string | null;
}

export function classifyItem(item: ProofItem): SortResult {
  const { classifyGoalMove: goal, classifyIgnore7Days: ignore, classifyBlocker: blocker } = item;
  if (!goal || !ignore || !blocker) return "not_this_week";

  // Handle: urgent consequence
  if (ignore === "deadline_breaks" || ignore === "task_blocked" || ignore === "cost_worse") {
    return "handle";
  }
  // Handle: clearly important + nothing in the way + no breakage yet
  if (goal === "clearly" && ignore === "important_nothing_breaks" && blocker === "nothing") {
    return "handle";
  }

  // Not this week: not important or nothing happens
  if (goal === "no") return "not_this_week";
  if (ignore === "not_much") return "not_this_week";

  // Protect: important but no urgency
  if (goal === "clearly") return "protect";

  return "not_this_week";
}

export function computeSortPriority(item: ProofItem): number {
  const result = classifyItem(item);
  const { classifyGoalMove: goal, classifyIgnore7Days: ignore } = item;

  if (result === "handle") {
    if (ignore === "deadline_breaks") return 1;
    if (ignore === "task_blocked") return 2;
    if (ignore === "cost_worse") return 3;
    return 4; // clearly + nothing in the way
  }

  if (result === "protect") {
    if (goal === "clearly") return 1;
    return 2;
  }

  return 99;
}

/** Suggest ordering for Handle items based on classification data */
export function suggestSequence(handleItems: ProofItem[]): { item: ProofItem; reason: SequenceReason }[] {
  return [...handleItems]
    .sort((a, b) => {
      // 1. Deadline first
      if (a.classifyIgnore7Days === "deadline_breaks" && b.classifyIgnore7Days !== "deadline_breaks") return -1;
      if (b.classifyIgnore7Days === "deadline_breaks" && a.classifyIgnore7Days !== "deadline_breaks") return 1;
      // 2. Task blocked (dependency)
      if (a.classifyIgnore7Days === "task_blocked" && b.classifyIgnore7Days !== "task_blocked") return -1;
      if (b.classifyIgnore7Days === "task_blocked" && a.classifyIgnore7Days !== "task_blocked") return 1;
      // 3. Cost/consequence
      if (a.classifyIgnore7Days === "cost_worse" && b.classifyIgnore7Days !== "cost_worse") return -1;
      if (b.classifyIgnore7Days === "cost_worse" && a.classifyIgnore7Days !== "cost_worse") return 1;
      // 4. By priority
      return (a.sortPriority ?? 99) - (b.sortPriority ?? 99);
    })
    .map((item) => {
      let reason: SequenceReason = "leverage";
      if (item.classifyIgnore7Days === "deadline_breaks") reason = "deadline";
      else if (item.classifyIgnore7Days === "task_blocked") reason = "dependency";
      else if (item.classifyIgnore7Days === "cost_worse") reason = "consequence";
      return { item, reason };
    });
}

export function generateGroupId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const RESULT_BADGE: Record<SortResult, { label: string; className: string }> = {
  handle: { label: "Handle", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  protect: { label: "Protect", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  not_this_week: { label: "Not this week", className: "bg-muted text-muted-foreground" },
};

export function createEmptyItem(id: number, text: string): ProofItem {
  return {
    id, text, outcome: text, hardTruthRelated: false,
    classifyGoalMove: null, classifyIgnore7Days: null, classifyBlocker: null,
    sortResult: null, sortPriority: null,
    sequenceOrder: null, sequenceReason: null,
    scheduledDates: [], scheduledStartTime: "", scheduledEndTime: "",
    firstMove: "", ifThenStatement: "", revisitDate: "",
  };
}
