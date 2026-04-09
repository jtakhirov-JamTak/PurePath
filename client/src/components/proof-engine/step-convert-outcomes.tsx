import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { SOFT_CAP, type ProofItem, type OpeningData } from "@/lib/proof-engine-logic";

interface Props {
  items: ProofItem[];
  openingData: OpeningData;
  onUpdateOutcome: (idx: number, outcome: string) => void;
  onRemoveItem: (idx: number) => void;
  onToggleHardTruth: (idx: number) => void;
  showSoftCapWarning: boolean;
}

export function StepConvertOutcomes({ items, openingData, onUpdateOutcome, onRemoveItem, onToggleHardTruth, showSoftCapWarning }: Props) {
  const hardTruthCount = items.filter(i => i.hardTruthRelated).length;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Convert to this-week outcomes</h2>
        <p className="text-sm text-muted-foreground">
          Every vague item becomes a concrete weekly outcome. Delete what doesn't matter.
        </p>
      </div>

      {showSoftCapWarning && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            You have {items.length} items. Consider cutting to {SOFT_CAP} or fewer before classifying — each item will need 3 questions answered.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.id} className="rounded-lg border px-3 py-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={item.outcome}
                onChange={(e) => onUpdateOutcome(i, e.target.value)}
                className="text-sm flex-1"
                placeholder="Concrete this-week outcome..."
              />
              <button type="button" onClick={() => onRemoveItem(i)} className="text-muted-foreground hover:text-destructive min-h-[44px] flex items-center shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
            {item.text !== item.outcome && (
              <p className="text-xs text-muted-foreground pl-1">was: {item.text}</p>
            )}
            {/* Hard truth tag */}
            <button
              type="button"
              onClick={() => onToggleHardTruth(i)}
              disabled={!item.hardTruthRelated && hardTruthCount >= 2}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors min-h-[44px] ${
                item.hardTruthRelated
                  ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                  : hardTruthCount >= 2
                    ? "border-border text-muted-foreground/40 cursor-not-allowed"
                    : "border-border text-muted-foreground hover:border-blue-400/50"
              }`}
            >
              {item.hardTruthRelated ? "Hard truth linked" : "Link to hard truth"}
            </button>
          </div>
        ))}
      </div>

      {openingData.openHardAction && (
        <div className="rounded-md bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-0.5">Your hard action this week</p>
          <p className="text-sm text-foreground/80">{openingData.openHardAction}</p>
          <p className="text-xs text-muted-foreground mt-1">Tag up to 2 items that reflect this.</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">{items.length} items</p>
    </div>
  );
}
