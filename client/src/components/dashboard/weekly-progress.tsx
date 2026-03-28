export interface ProgressMetrics {
  habitsCompletedWeek: number;
  habitsScheduledWeek: number;
  habitsCompletedMonth: number;
  habitsScheduledMonth: number;
  q2CompletedWeek: number;
  q2TotalWeek: number;
  q2CompletedMonth: number;
  q2TotalMonth: number;
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-2">
      <span className="w-[44px] text-[11px] text-muted-foreground shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-[36px] text-[11px] text-muted-foreground text-right shrink-0">
        {value}/{max}
      </span>
    </div>
  );
}

export function WeeklyProgress({ progressMetrics }: { progressMetrics: ProgressMetrics }) {
  return (
    <div data-testid="card-progress-bars">
      <p className="text-[11px] font-medium uppercase tracking-wide text-bark mb-2">Progress</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Habits</p>
          <Bar label="Week" value={progressMetrics.habitsCompletedWeek} max={progressMetrics.habitsScheduledWeek} />
          <Bar label="Month" value={progressMetrics.habitsCompletedMonth} max={progressMetrics.habitsScheduledMonth} />
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Q2 Items</p>
          <Bar label="Week" value={progressMetrics.q2CompletedWeek} max={progressMetrics.q2TotalWeek} />
          <Bar label="Month" value={progressMetrics.q2CompletedMonth} max={progressMetrics.q2TotalMonth} />
        </div>
      </div>
    </div>
  );
}
