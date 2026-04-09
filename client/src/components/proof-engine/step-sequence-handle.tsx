import { ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { suggestSequence, SEQUENCE_LABELS, type ProofItem, type SequenceReason } from "@/lib/proof-engine-logic";

interface Props {
  handleItems: ProofItem[];
  onSwap: (itemId: number, direction: "up" | "down") => void;
}

export function StepSequenceHandle({ handleItems, onSwap }: Props) {
  // Display items sorted by sequenceOrder if set, otherwise by suggested order
  const hasUserOrder = handleItems.some(i => i.sequenceOrder !== null);
  const displayItems = hasUserOrder
    ? [...handleItems].sort((a, b) => (a.sequenceOrder ?? 99) - (b.sequenceOrder ?? 99))
        .map(item => {
          const suggested = suggestSequence([item]);
          return { item, reason: suggested[0]?.reason ?? ("leverage" as const) };
        })
    : suggestSequence(handleItems);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Sequence your Handle items</h2>
        <p className="text-sm text-muted-foreground">Suggested order based on urgency and dependencies. Adjust if needed.</p>
      </div>

      <div className="space-y-2">
        {displayItems.map(({ item, reason }, i) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-2.5"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            <span className="text-sm font-bold text-rose-600 dark:text-rose-400 shrink-0 w-6">#{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm">{item.outcome || item.text}</p>
              <p className="text-xs text-muted-foreground">{SEQUENCE_LABELS[reason]}</p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button
                type="button"
                onClick={() => i > 0 && onSwap(item.id, "up")}
                disabled={i === 0}
                className="p-2 rounded hover:bg-muted disabled:opacity-30 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => i < displayItems.length - 1 && onSwap(item.id, "down")}
                disabled={i === displayItems.length - 1}
                className="p-2 rounded hover:bg-muted disabled:opacity-30 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
