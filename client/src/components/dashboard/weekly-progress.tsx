import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Flame, Activity, Sun } from "lucide-react";

interface ProgressMetrics {
  consistencyPct: number;
  habitsCompletedWeek: number;
  habitsScheduledWeek: number;
  journalDays: number;
  daysElapsed: number;
}

export function WeeklyProgressSidebar({ progressMetrics }: { progressMetrics: ProgressMetrics }) {
  return (
    <div className="w-full md:w-72 md:flex-shrink-0">
      <div className="md:sticky md:top-6 space-y-4">
        <Card className="overflow-visible border-2 border-emerald-200 dark:border-emerald-800" data-testid="card-progress-dashboard">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base font-serif">Weekly Progress</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pb-4 space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 space-y-2" data-testid="metric-consistency">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-semibold">Consistency</span>
                </div>
                <span className="text-sm font-bold" data-testid="text-consistency">
                  {progressMetrics.consistencyPct}%
                </span>
              </div>
              <Progress
                value={progressMetrics.consistencyPct}
                className="h-2"
              />
            </div>

            <div className="rounded-lg bg-muted/50 p-3" data-testid="metric-habits-week">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-semibold">Habits</span>
                </div>
                <span className="text-sm font-bold" data-testid="text-habits-week">
                  {progressMetrics.habitsCompletedWeek}/{progressMetrics.habitsScheduledWeek}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">completed this week</p>
            </div>

            <div className="rounded-lg bg-muted/50 p-3" data-testid="metric-journal-days">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-semibold">Journal</span>
                </div>
                <span className="text-sm font-bold" data-testid="text-journal-days">
                  {progressMetrics.journalDays}/{progressMetrics.daysElapsed}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">days journaled this week</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
