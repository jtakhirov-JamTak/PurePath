import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { MAX_DAYS_PER_ITEM, TIME_SLOTS, RESULT_BADGE, type ProofItem } from "@/lib/proof-engine-logic";

interface Props {
  allItems: ProofItem[];
  handleItems: ProofItem[];
  protectItems: ProofItem[];
  discardedItems: ProofItem[];
  weekDays: { date: string; label: string }[];
  scheduleIdx: number;
  allItemsScheduled: boolean;
  onToggleDay: (itemIdx: number, date: string) => void;
  onUpdateField: (itemIdx: number, field: string, value: string) => void;
  commitPending: boolean;
  commitError: string | null;
}

export function StepAttachTriggers({
  allItems, handleItems, protectItems, discardedItems,
  weekDays, scheduleIdx, allItemsScheduled,
  onToggleDay, onUpdateField, commitPending, commitError,
}: Props) {
  // Only Handle + Protect are scheduled one-by-one
  const committedItems = [...handleItems, ...protectItems];

  // After all committed items are scheduled, show not-this-week batch + final review
  if (allItemsScheduled) {
    // Check if we need to show the not-this-week batch screen
    const allDiscardedHaveDates = discardedItems.length === 0 ||
      discardedItems.every(d => {
        const orig = allItems.find(it => it.id === d.id);
        return orig && orig.revisitDate.length > 0;
      });

    // Batch screen for not-this-week items
    if (discardedItems.length > 0 && !allDiscardedHaveDates) {
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Not this week</h2>
            <p className="text-sm text-muted-foreground">Set a revisit date for each deferred item. Explicit deferral — no guilt.</p>
          </div>

          <Button
            variant="outline"
            className="w-full min-h-[44px]"
            onClick={() => {
              // Set all to next Sunday
              const today = new Date();
              const daysUntilSunday = (7 - today.getDay()) % 7 || 7;
              const nextSunday = new Date(today);
              nextSunday.setDate(today.getDate() + daysUntilSunday);
              const nextSundayStr = nextSunday.toISOString().slice(0, 10);
              discardedItems.forEach(d => {
                const idx = allItems.findIndex(it => it.id === d.id);
                if (idx >= 0) onUpdateField(idx, "revisitDate", nextSundayStr);
              });
            }}
          >
            Set all to Next Sunday
          </Button>

          <div className="space-y-3">
            {discardedItems.map(item => {
              const originalIdx = allItems.findIndex(it => it.id === item.id);
              const original = allItems[originalIdx];
              if (!original) return null;
              return (
                <div key={item.id} className="rounded-lg border px-3 py-2.5 space-y-2">
                  <p className="text-sm text-muted-foreground">{item.outcome || item.text}</p>
                  <Input
                    type="date"
                    value={original.revisitDate}
                    onChange={e => onUpdateField(originalIdx, "revisitDate", e.target.value)}
                    className="text-sm"
                  />
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Final review
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Your week</h2>
          <p className="text-sm text-muted-foreground">Review and commit.</p>
        </div>

        {handleItems.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-rose-500 uppercase tracking-wider">Handle ({handleItems.length})</p>
            {handleItems.map((item) => {
              const orig = allItems.find(it => it.id === item.id);
              return (
                <div key={item.id} className="rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-2 space-y-1">
                  <p className="text-sm font-medium">{item.outcome || item.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {orig?.scheduledDates.map(d => weekDays.find(wd => wd.date === d)?.label).filter(Boolean).join(", ")}
                    {orig?.scheduledStartTime && ` at ${orig.scheduledStartTime}`}
                  </p>
                  {orig?.firstMove && <p className="text-xs text-muted-foreground italic">First proof move: {orig.firstMove}</p>}
                </div>
              );
            })}
          </div>
        )}

        {protectItems.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-amber-500 uppercase tracking-wider">Protect ({protectItems.length})</p>
            {protectItems.map((item) => {
              const orig = allItems.find(it => it.id === item.id);
              return (
                <div key={item.id} className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2 space-y-1">
                  <p className="text-sm font-medium">{item.outcome || item.text}</p>
                  {orig?.firstMove && <p className="text-xs text-muted-foreground italic">First proof move: {orig.firstMove}</p>}
                  {orig?.ifThenStatement && <p className="text-xs text-muted-foreground italic">When triggered: {orig.ifThenStatement}</p>}
                </div>
              );
            })}
          </div>
        )}

        {discardedItems.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Not this week ({discardedItems.length})</p>
            {discardedItems.map((item) => {
              const orig = allItems.find(it => it.id === item.id);
              return (
                <div key={item.id} className="rounded-lg border px-3 py-2 space-y-1 opacity-60">
                  <p className="text-sm text-muted-foreground">{item.outcome || item.text}</p>
                  {orig?.revisitDate && <p className="text-xs text-muted-foreground">Revisit: {orig.revisitDate}</p>}
                </div>
              );
            })}
          </div>
        )}

        {commitError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
            <p className="text-sm text-destructive">{commitError}</p>
          </div>
        )}
      </div>
    );
  }

  // Scheduling one item at a time (Handle + Protect only)
  const currentItem = committedItems[scheduleIdx];
  if (!currentItem) return null;
  const originalIdx = allItems.findIndex(it => it.id === currentItem.id);
  const original = allItems[originalIdx];
  if (!original) return null;

  const isHandle = currentItem.sortResult === "handle";
  const isProtect = currentItem.sortResult === "protect";

  const bucketBadge = currentItem.sortResult ? RESULT_BADGE[currentItem.sortResult] : null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          {scheduleIdx + 1} of {committedItems.length}
        </p>
        <h2 className="text-lg font-semibold">{currentItem.outcome || currentItem.text}</h2>
        {bucketBadge && (
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${bucketBadge.className}`}>
            {bucketBadge.label}
          </span>
        )}
      </div>

      {/* Handle items: First proof move + time block */}
      {isHandle && (
        <>
          <div className="space-y-2">
            <Label className="text-sm font-medium">First proof move</Label>
            <Input
              value={original.firstMove}
              onChange={e => onUpdateField(originalIdx, "firstMove", e.target.value)}
              placeholder="The very first physical action..."
              data-testid="input-first-move"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Time block — which days?</Label>
            <div className="flex flex-wrap gap-1.5">
              {weekDays.map(day => {
                const isSelectedDay = original.scheduledDates.includes(day.date);
                const atMax = original.scheduledDates.length >= MAX_DAYS_PER_ITEM && !isSelectedDay;
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => !atMax && onToggleDay(originalIdx, day.date)}
                    className={`text-xs px-3 py-2 rounded-md border cursor-pointer min-h-[44px] ${
                      isSelectedDay
                        ? "bg-primary text-primary-foreground border-primary"
                        : atMax
                          ? "border-border text-muted-foreground/40 cursor-not-allowed"
                          : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">What time?</Label>
            <div className="flex gap-2">
              <select
                value={original.scheduledStartTime || ""}
                onChange={e => onUpdateField(originalIdx, "scheduledStartTime", e.target.value)}
                className="text-sm h-10 rounded-md border border-border bg-background px-2 flex-1"
              >
                <option value="">Start</option>
                {TIME_SLOTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select
                value={original.scheduledEndTime || ""}
                onChange={e => onUpdateField(originalIdx, "scheduledEndTime", e.target.value)}
                className="text-sm h-10 rounded-md border border-border bg-background px-2 flex-1"
              >
                <option value="">End</option>
                {TIME_SLOTS.filter(t => !original.scheduledStartTime || t.value > original.scheduledStartTime).map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      {/* Protect items: First proof move + if-then */}
      {isProtect && (
        <>
          <div className="space-y-2">
            <Label className="text-sm font-medium">First proof move</Label>
            <Input
              value={original.firstMove}
              onChange={e => onUpdateField(originalIdx, "firstMove", e.target.value)}
              placeholder="The very first physical action..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Protected blocks — which days?</Label>
            <div className="flex flex-wrap gap-1.5">
              {weekDays.map(day => {
                const isSelectedDay = original.scheduledDates.includes(day.date);
                const atMax = original.scheduledDates.length >= MAX_DAYS_PER_ITEM && !isSelectedDay;
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => !atMax && onToggleDay(originalIdx, day.date)}
                    className={`text-xs px-3 py-2 rounded-md border cursor-pointer min-h-[44px] ${
                      isSelectedDay
                        ? "bg-primary text-primary-foreground border-primary"
                        : atMax
                          ? "border-border text-muted-foreground/40 cursor-not-allowed"
                          : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">When [trigger], I will start with [first proof move]</Label>
            <Textarea
              value={original.ifThenStatement}
              onChange={e => onUpdateField(originalIdx, "ifThenStatement", e.target.value)}
              placeholder="When I feel the urge to avoid this, I will..."
              rows={2}
              className="resize-none text-sm"
            />
          </div>
        </>
      )}

    </div>
  );
}
