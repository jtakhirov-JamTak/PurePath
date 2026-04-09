import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { MAX_BRAIN_DUMP, type ProofItem } from "@/lib/proof-engine-logic";

interface Props {
  items: ProofItem[];
  newItemText: string;
  onNewItemTextChange: (text: string) => void;
  onAddItem: () => void;
  onRemoveItem: (idx: number) => void;
}

export function StepBrainDump({ items, newItemText, onNewItemTextChange, onAddItem, onRemoveItem }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Brain dump</h2>
        <p className="text-sm text-muted-foreground">Everything on your mind. No filtering. No judging. Get it out.</p>
      </div>

      <div className="flex gap-2">
        <Input
          value={newItemText}
          onChange={(e) => onNewItemTextChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAddItem()}
          placeholder="Add a task (comma-separated OK)"
          data-testid="input-brain-dump"
        />
        <Button size="icon" onClick={onAddItem} data-testid="button-add-item">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-2 rounded-lg border px-3 py-2" data-testid={`brain-dump-item-${i}`}>
            <span className="flex-1 text-sm">{item.text}</span>
            <button type="button" onClick={() => onRemoveItem(i)} className="text-muted-foreground hover:text-destructive min-h-[44px] flex items-center">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">No items yet. Start writing.</p>
      )}
      {items.length >= MAX_BRAIN_DUMP && (
        <p className="text-xs text-amber-600 text-center">Maximum {MAX_BRAIN_DUMP} items.</p>
      )}
    </div>
  );
}
