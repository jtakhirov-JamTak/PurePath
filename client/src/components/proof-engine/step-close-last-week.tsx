import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { CloseWeekData, OpeningData } from "@/lib/proof-engine-logic";

interface Props {
  closeWeekData: CloseWeekData | null;
  isLoading: boolean;
  openingData: OpeningData;
  onOpeningChange: (field: keyof OpeningData, value: string) => void;
  weekLabel: string;
  planNextWeek: boolean;
  onToggleWeek: (next: boolean) => void;
  hasExistingPlan: boolean;
}

export function StepCloseLastWeek({ closeWeekData, isLoading, openingData, onOpeningChange, weekLabel, planNextWeek, onToggleWeek, hasExistingPlan }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Weekly Proof Engine</h2>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{weekLabel}</p>
      </div>

      {/* Week toggle */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => onToggleWeek(false)}
          className={`text-xs px-4 py-2 rounded-full border min-h-[44px] ${!planNextWeek ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
        >
          This week
        </button>
        <button
          onClick={() => onToggleWeek(true)}
          className={`text-xs px-4 py-2 rounded-full border min-h-[44px] ${planNextWeek ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
        >
          Next week
        </button>
      </div>

      {hasExistingPlan && (
        <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
          You already have a plan for this week. Completing this flow will replace it.
        </p>
      )}

      <div className="space-y-2">
        <h3 className="text-base font-semibold">Close last week</h3>
        <p className="text-sm text-muted-foreground">Before opening a new week, look at where you were.</p>
      </div>

      {closeWeekData && closeWeekData.totalCount > 0 ? (
        <div className="space-y-4">
          {/* Weekly items stats */}
          <div className="rounded-lg border px-4 py-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Weekly items</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{closeWeekData.completedCount}</span>
              <span className="text-sm text-muted-foreground">/ {closeWeekData.totalCount} completed</span>
            </div>
          </div>

          {/* Habit stats */}
          {closeWeekData.habitStats.total > 0 && (
            <div className="rounded-lg border px-4 py-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Habits</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{closeWeekData.habitStats.completed}</span>
                <span className="text-sm text-muted-foreground">/ {closeWeekData.habitStats.total} completed</span>
              </div>
              {closeWeekData.habitStats.skipped > 0 && (
                <p className="text-xs text-muted-foreground">{closeWeekData.habitStats.skipped} skipped, {closeWeekData.habitStats.minimum} minimum</p>
              )}
            </div>
          )}

          {/* Skip reasons */}
          {(closeWeekData.skipReasons.length > 0 || closeWeekData.habitStats.skipReasons.length > 0) && (
            <div className="rounded-lg border px-4 py-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Skip reasons</p>
              <ul className="space-y-1">
                {[...closeWeekData.skipReasons, ...closeWeekData.habitStats.skipReasons].map((reason, i) => (
                  <li key={i} className="text-sm text-muted-foreground">- {reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Previous hard action for context */}
          {closeWeekData.previousHardAction && (
            <div className="rounded-md bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-0.5">Last week's hard action</p>
              <p className="text-sm text-foreground/80">{closeWeekData.previousHardAction}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">No data from last week. That's okay — start fresh.</p>
        </div>
      )}

      {/* Reflection question */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Where did the old pattern pull me back last week?</Label>
        <Textarea
          value={openingData.patternPullBack}
          onChange={(e) => onOpeningChange("patternPullBack", e.target.value)}
          placeholder="What patterns showed up? Where did I slip back into old habits?"
          rows={3}
          className="resize-none text-sm"
        />
      </div>
    </div>
  );
}
