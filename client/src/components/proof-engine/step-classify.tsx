import { Label } from "@/components/ui/label";
import {
  IMPORTANCE_CHIPS, CONSEQUENCE_CHIPS, BLOCKER_CHIPS, RESULT_BADGE,
  classifyItem,
  type ProofItem, type SortImportance, type SortConsequence, type SortBlocker,
} from "@/lib/proof-engine-logic";

interface Props {
  items: ProofItem[];
  sortItemIdx: number | null;
  badgeItemId: number | null;
  allClassified: boolean;
  onAnswer: (idx: number, field: "classifyGoalMove" | "classifyIgnore7Days" | "classifyBlocker", value: string) => void;
}

export function StepClassify({ items, sortItemIdx, badgeItemId, allClassified, onAnswer }: Props) {
  const classifiedCount = items.filter(i =>
    i.classifyGoalMove !== null && i.classifyIgnore7Days !== null && i.classifyBlocker !== null
  ).length;

  if (allClassified || sortItemIdx === null) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">All items classified</h2>
          <p className="text-sm text-muted-foreground">Continue to review your buckets.</p>
        </div>
      </div>
    );
  }

  const item = items[sortItemIdx];
  if (!item) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Item {classifiedCount + 1} of {items.length}
        </p>
        <h2 className="text-lg font-semibold">"{item.outcome || item.text}"</h2>
      </div>

      {/* Q1 — Does this materially move a goal? */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Does this materially move a goal or key responsibility?</Label>
        <div className="space-y-1.5">
          {IMPORTANCE_CHIPS.map(chip => (
            <button
              key={chip.value}
              type="button"
              onClick={() => onAnswer(sortItemIdx, "classifyGoalMove", chip.value)}
              className={`w-full text-left rounded-lg px-3 py-2.5 text-sm border transition-colors min-h-[44px] ${
                item.classifyGoalMove === chip.value
                  ? "border-primary bg-primary/[0.06]"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Q2 — If I ignore this for 7 days? */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">If I ignore this for 7 days, what happens?</Label>
        <div className="space-y-1.5">
          {CONSEQUENCE_CHIPS.map(chip => (
            <button
              key={chip.value}
              type="button"
              onClick={() => onAnswer(sortItemIdx, "classifyIgnore7Days", chip.value)}
              className={`w-full text-left rounded-lg px-3 py-2.5 text-sm border transition-colors min-h-[44px] ${
                item.classifyIgnore7Days === chip.value
                  ? "border-primary bg-primary/[0.06]"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Q3 — What is the main thing getting in the way? */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">What is the main thing getting in the way?</Label>
        <div className="space-y-1.5">
          {BLOCKER_CHIPS.map(chip => (
            <button
              key={chip.value}
              type="button"
              onClick={() => onAnswer(sortItemIdx, "classifyBlocker", chip.value)}
              className={`w-full text-left rounded-lg px-3 py-2.5 text-sm border transition-colors min-h-[44px] ${
                item.classifyBlocker === chip.value
                  ? "border-primary bg-primary/[0.06]"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result badge after all 3 answered */}
      {item.classifyGoalMove && item.classifyIgnore7Days && item.classifyBlocker && (
        <div className="flex items-center gap-2 pt-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${RESULT_BADGE[classifyItem(item)].className}`}>
            {RESULT_BADGE[classifyItem(item)].label}
          </span>
        </div>
      )}
    </div>
  );
}
