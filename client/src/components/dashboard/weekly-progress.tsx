import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Activity, Sun } from "lucide-react";

interface ProgressMetrics {
  consistencyPct: number;
  habitsCompletedWeek: number;
  habitsScheduledWeek: number;
  journalDays: number;
  daysElapsed: number;
}

export function WeeklyProgressSidebar({ progressMetrics }: { progressMetrics: ProgressMetrics }) {
  return (
    <div className="w-full md:w-56 md:flex-shrink-0">
      <div className="md:sticky md:top-6 space-y-3">
        <Card className="overflow-visible border" data-testid="card-progress-dashboard">
          <CardHeader className="pb-2 p-3">
            <span className="text-xs font-medium uppercase tracking-wide text-bark">Weekly Progress</span>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            <div className="rounded-lg bg-muted/50 p-2.5 space-y-1.5" data-testid="metric-consistency">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-[11px] text-muted-foreground">Consistency</span>
                </div>
                <span className="text-sm font-medium" data-testid="text-consistency">
                  {progressMetrics.consistencyPct}%
                </span>
              </div>
              <Progress
                value={progressMetrics.consistencyPct}
                className="h-1"
              />
            </div>

            <div className="rounded-lg bg-muted/50 p-2.5" data-testid="metric-habits-week">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[11px] text-muted-foreground">Habits</span>
                </div>
                <span className="text-sm font-medium" data-testid="text-habits-week">
                  {progressMetrics.habitsCompletedWeek}/{progressMetrics.habitsScheduledWeek}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">completed this week</p>
            </div>

            <div className="rounded-lg bg-muted/50 p-2.5" data-testid="metric-journal-days">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[11px] text-muted-foreground">Journal</span>
                </div>
                <span className="text-sm font-medium" data-testid="text-journal-days">
                  {progressMetrics.journalDays}/{progressMetrics.daysElapsed}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">days journaled this week</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
