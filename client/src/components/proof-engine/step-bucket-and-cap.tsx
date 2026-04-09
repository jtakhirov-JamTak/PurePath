import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { MAX_Q1, MAX_Q2, type ProofItem, type SortResult } from "@/lib/proof-engine-logic";

interface Props {
  handleItems: ProofItem[];
  protectItems: ProofItem[];
  discardedItems: ProofItem[];
  onMoveItem: (itemId: number, newResult: SortResult) => void;
  onResetClassification: () => void;
  nudgeMessage: string | null;
  nudgeLoading: boolean;
  onNudgeDismiss: () => void;
}

export function StepBucketAndCap({
  handleItems, protectItems, discardedItems,
  onMoveItem, onResetClassification,
  nudgeMessage, nudgeLoading, onNudgeDismiss,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Bucket and cap</h2>
        <p className="text-sm text-muted-foreground">Review your buckets. Move items if needed.</p>
      </div>

      {/* Handle bucket */}
      {handleItems.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-rose-500 uppercase tracking-wider">Handle this week ({handleItems.length}/{MAX_Q1})</p>
          {handleItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-2">
              <div className="flex-1 min-w-0">
                <span className="text-sm">{item.outcome || item.text}</span>
                {item.hardTruthRelated && (
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">hard truth</span>
                )}
              </div>
              <div className="flex gap-2 ml-2 shrink-0">
                <button type="button" onClick={() => onMoveItem(item.id, "protect")}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline min-h-[44px] flex items-center">
                  Protect
                </button>
                <button type="button" onClick={() => onMoveItem(item.id, "not_this_week")}
                  className="text-xs text-muted-foreground hover:underline min-h-[44px] flex items-center">
                  Not now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Protect bucket */}
      {protectItems.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-amber-500 uppercase tracking-wider">Protect this week ({protectItems.length}/{MAX_Q2})</p>
          {protectItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2">
              <div className="flex-1 min-w-0">
                <span className="text-sm">{item.outcome || item.text}</span>
                {item.hardTruthRelated && (
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">hard truth</span>
                )}
              </div>
              <div className="flex gap-2 ml-2 shrink-0">
                <button type="button" onClick={() => onMoveItem(item.id, "handle")}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline min-h-[44px] flex items-center">
                  Handle
                </button>
                <button type="button" onClick={() => onMoveItem(item.id, "not_this_week")}
                  className="text-xs text-muted-foreground hover:underline min-h-[44px] flex items-center">
                  Not now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Not this week */}
      {discardedItems.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Not this week</p>
          {discardedItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border px-3 py-2 opacity-60">
              <span className="text-sm text-muted-foreground line-through flex-1">{item.outcome || item.text}</span>
              <div className="flex gap-2 ml-2 shrink-0">
                <button type="button" onClick={() => onMoveItem(item.id, "handle")}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline min-h-[44px] flex items-center">
                  Handle
                </button>
                <button type="button" onClick={() => onMoveItem(item.id, "protect")}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline min-h-[44px] flex items-center">
                  Protect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pattern-map nudge */}
      {nudgeLoading && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 px-4 py-3 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <p className="text-sm text-blue-700 dark:text-blue-400">Checking your patterns...</p>
        </div>
      )}
      {nudgeMessage && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 px-4 py-3 space-y-2">
          <p className="text-sm text-blue-700 dark:text-blue-400">{nudgeMessage}</p>
          <div className="flex gap-2">
            <Button variant="outline" className="min-h-[44px]" onClick={onNudgeDismiss}>It's already covered</Button>
            <Button variant="outline" className="min-h-[44px]" onClick={onNudgeDismiss}>Not this week</Button>
          </div>
        </div>
      )}

      {/* Cap enforcement */}
      {(handleItems.length > MAX_Q1 || protectItems.length > MAX_Q2) && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">
            {handleItems.length > MAX_Q1 && `Too many Handle items (${handleItems.length}/${MAX_Q1}). Move some to Protect or Not this week. `}
            {protectItems.length > MAX_Q2 && `Too many Protect items (${protectItems.length}/${MAX_Q2}). Choose your most important. `}
          </p>
        </div>
      )}

      <Button variant="outline" className="min-h-[44px]" onClick={onResetClassification}>
        Re-classify all items
      </Button>
    </div>
  );
}
