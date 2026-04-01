/** Types, constants, and pure logic for the Eisenhower weekly planning wizard. */

export const MAX_Q1 = 5;
export const MAX_Q2 = 2;
export const MAX_CANDIDATES = 7;
export const MAX_BRAIN_DUMP = 30;
export const MAX_DAYS_PER_ITEM = 5;
export const TOTAL_STEPS = 7;

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

export const BLOCKER_CHIPS = [
  { value: "getting_it_wrong", label: "Getting it wrong" },
  { value: "being_judged", label: "Being judged" },
  { value: "disappointing_someone", label: "Disappointing someone" },
  { value: "uncertainty", label: "Uncertainty / no perfect choice" },
  { value: "waiting_for_permission", label: "Waiting for permission" },
  { value: "hoping_someone_else_decides", label: "Hoping someone else decides" },
  { value: "shame_discomfort", label: "Shame / discomfort" },
  { value: "succeeding_and_sustaining", label: "Succeeding and having to sustain it" },
] as const;

export type SortImportance = "clearly" | "somewhat" | "not_really";
export type SortConsequence = "real_consequence" | "stays_important" | "someone_annoyed" | "basically_nothing";
export type SortResistance = "low_value" | "uncomfortable" | "straightforward";
export type SortResult = "handle" | "protect" | "not_this_week";

export const IMPORTANCE_CHIPS: { value: SortImportance; label: string }[] = [
  { value: "clearly", label: "Yes, clearly" },
  { value: "somewhat", label: "Somewhat" },
  { value: "not_really", label: "Not really" },
];

export const CONSEQUENCE_CHIPS: { value: SortConsequence; label: string }[] = [
  { value: "real_consequence", label: "Real consequence this week" },
  { value: "stays_important", label: "It stays important, but no immediate consequence" },
  { value: "someone_annoyed", label: "Mostly someone else gets annoyed" },
  { value: "basically_nothing", label: "Basically nothing" },
];

export const RESISTANCE_CHIPS: { value: SortResistance; label: string }[] = [
  { value: "low_value", label: "Low value — I should let it go" },
  { value: "uncomfortable", label: "It matters — I'm just uncomfortable" },
  { value: "straightforward", label: "Not resisting — it's straightforward" },
];

export interface BrainDumpItem {
  id: number;
  text: string;
  selected: boolean;
  sortImportance: SortImportance | null;
  sortConsequence: SortConsequence | null;
  sortResistance: SortResistance | null;
  sortResult: SortResult | null;
  sortPriority: number | null;
  scheduledDates: string[];
  scheduledStartTime: string;
  scheduledEndTime: string;
  firstMove: string;
}

export interface FearData {
  targetTask: string;
  fearIfFaced: string;
  fearIfAvoided: string;
  blockerChip: string;
  smallestProofMove: string;
  promoteToQ2: boolean;
}

export function classifyItem(item: BrainDumpItem): SortResult {
  const { sortImportance: imp, sortConsequence: con, sortResistance: res } = item;
  if (!imp || !con || !res) return "not_this_week";

  // Handle: real consequence regardless of Q1/Q3
  if (con === "real_consequence") return "handle";

  // Not this week rules
  if (imp === "not_really" && (con === "someone_annoyed" || con === "basically_nothing")) return "not_this_week";
  if (imp === "somewhat" && con === "basically_nothing" && res === "low_value") return "not_this_week";

  // Protect: important (clearly or somewhat) + non-urgent consequence
  if (imp === "clearly" || imp === "somewhat") return "protect";

  // Fallback for not_really + stays_important (edge case)
  return "not_this_week";
}

export function computeSortPriority(item: BrainDumpItem): number {
  const { sortImportance: imp, sortConsequence: con, sortResistance: res } = item;
  const result = classifyItem(item);

  if (result === "handle") {
    if (imp === "clearly") return 1;
    if (imp === "somewhat") return 2;
    return 3; // not_really + real_consequence (obligation)
  }

  if (result === "protect") {
    if (imp === "clearly" && con === "stays_important" && res === "uncomfortable") return 1;
    if (imp === "clearly" && con === "stays_important" && res === "straightforward") return 2;
    if (imp === "clearly" && con === "stays_important") return 3; // low_value edge
    if (imp === "clearly" && con === "basically_nothing") return 4;
    if (imp === "clearly" && con === "someone_annoyed") return 5;
    if (imp === "somewhat" && con === "stays_important" && res === "uncomfortable") return 6;
    if (imp === "somewhat" && con === "stays_important" && res === "straightforward") return 7;
    if (imp === "somewhat" && con === "someone_annoyed") return 8;
    return 9;
  }

  return 99;
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
