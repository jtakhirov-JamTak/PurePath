import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, BookOpen, Repeat, Grid3X3, TrendingUp } from "lucide-react";
import { format, startOfWeek, subWeeks, addDays } from "date-fns";
import type { Journal, Habit, HabitCompletion, EisenhowerEntry } from "@shared/schema";

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function getHabitsForDate(habits: Habit[], date: Date): Habit[] {
  const dayCode = DAY_CODES[date.getDay()];
  return habits.filter(h => h.cadence.split(",").includes(dayCode));
}

interface WeekData {
  weekStart: Date;
  label: string;
  journalCount: number;
  journalMax: number;
  habitCompleted: number;
  habitRequired: number;
  priorityCompleted: number;
  priorityRequired: number;
  adherencePct: number;
}

export default function ProgressPage() {
  const { user, isLoading: authLoading } = useAuth();

  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const eightWeeksAgo = subWeeks(currentWeekStart, 7);

  const rangeStart = format(eightWeeksAgo, "yyyy-MM-dd");
  const rangeEnd = format(addDays(currentWeekStart, 6), "yyyy-MM-dd");

  const { data: journals = [], isLoading: journalsLoading } = useQuery<Journal[]>({
    queryKey: ["/api/journals"],
    enabled: !!user,
  });

  const { data: habits = [], isLoading: habitsLoading } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: !!user,
  });

  const { data: habitCompletions = [], isLoading: completionsLoading } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions/range", rangeStart, rangeEnd],
    enabled: !!user,
  });

  const { data: eisenhowerEntries = [], isLoading: eisenhowerLoading } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower"],
    enabled: !!user,
  });

  const isLoading = journalsLoading || habitsLoading || completionsLoading || eisenhowerLoading;

  const weeklyData = useMemo<WeekData[]>(() => {
    const weeks: WeekData[] = [];

    for (let i = 7; i >= 0; i--) {
      const weekStart = subWeeks(currentWeekStart, i);
      const weekEnd = addDays(weekStart, 6);
      const label = format(weekStart, "MMM d");

      let journalCount = 0;
      const journalMax = 14;

      for (let d = 0; d < 7; d++) {
        const day = addDays(weekStart, d);
        const dayStr = format(day, "yyyy-MM-dd");
        const dayJournals = journals.filter(j => j.date === dayStr);
        journalCount += dayJournals.length;
      }

      let habitRequired = 0;
      let habitCompleted = 0;

      for (let d = 0; d < 7; d++) {
        const day = addDays(weekStart, d);
        const dayStr = format(day, "yyyy-MM-dd");
        const scheduledHabits = getHabitsForDate(habits, day);
        habitRequired += scheduledHabits.length;

        const dayCompletions = habitCompletions.filter(hc => hc.date === dayStr);
        const completedIds = new Set(dayCompletions.map(hc => hc.habitId));
        scheduledHabits.forEach(h => {
          if (completedIds.has(h.id)) habitCompleted++;
        });
      }

      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const weekEndStr = format(weekEnd, "yyyy-MM-dd");

      const priorityItems = eisenhowerEntries.filter(e =>
        (e.quadrant === "q1" || e.quadrant === "q2") &&
        e.deadline &&
        e.deadline >= weekStartStr &&
        e.deadline <= weekEndStr
      );
      const priorityRequired = priorityItems.length;
      const priorityCompleted = priorityItems.filter(e => e.completed).length;

      const totalCompleted = journalCount + habitCompleted + priorityCompleted;
      const totalRequired = journalMax + habitRequired + priorityRequired;
      const adherencePct = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0;

      weeks.push({
        weekStart,
        label,
        journalCount: Math.min(journalCount, journalMax),
        journalMax,
        habitCompleted,
        habitRequired,
        priorityCompleted,
        priorityRequired,
        adherencePct,
      });
    }

    return weeks;
  }, [journals, habits, habitCompletions, eisenhowerEntries, currentWeekStart]);

  const currentWeek = weeklyData[weeklyData.length - 1];
  const bestJournalWeek = weeklyData.reduce((best, w) => w.journalCount > best.journalCount ? w : best, weeklyData[0]);
  const bestHabitWeek = weeklyData.reduce((best, w) => {
    const bestPct = best.habitRequired > 0 ? best.habitCompleted / best.habitRequired : 0;
    const wPct = w.habitRequired > 0 ? w.habitCompleted / w.habitRequired : 0;
    return wPct > bestPct ? w : best;
  }, weeklyData[0]);
  const bestPriorityWeek = weeklyData.reduce((best, w) => {
    const bestPct = best.priorityRequired > 0 ? best.priorityCompleted / best.priorityRequired : 0;
    const wPct = w.priorityRequired > 0 ? w.priorityCompleted / w.priorityRequired : 0;
    return wPct > bestPct ? w : best;
  }, weeklyData[0]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-16 w-full mb-8" />
          <Skeleton className="h-64 w-full mb-8" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <h1 className="font-serif text-3xl font-bold" data-testid="text-progress-title">Weekly Progress</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            See how consistently you're following your program over time.
          </p>
        </header>

        <Card data-testid="card-adherence-chart">
          <CardHeader>
            <CardTitle className="font-serif">Program Adherence</CardTitle>
            <CardDescription>Your completion rate over the last 8 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="flex items-end gap-3 justify-between" style={{ height: 192 }} data-testid="chart-bars">
                {weeklyData.map((week, idx) => (
                  <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end" data-testid={`chart-bar-${idx}`}>
                    <span className="text-xs font-medium text-muted-foreground mb-1">{week.adherencePct}%</span>
                    <div className="w-full flex justify-center flex-1 items-end">
                      <div
                        className="bg-primary rounded-t-md w-full max-w-10 transition-all"
                        style={{ height: `${Math.max(week.adherencePct, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground mt-2 whitespace-nowrap">{week.label}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <Card data-testid="card-journals-summary">
            <CardHeader>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <div className="h-8 w-8 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="font-serif text-base">Journaling</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">This week</span>
                    <Badge variant="outline" data-testid="badge-journal-thisweek">
                      {currentWeek?.journalCount ?? 0}/14 entries
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Best week</span>
                    <Badge variant="outline" data-testid="badge-journal-best">
                      {bestJournalWeek?.journalCount ?? 0}/14
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-habits-summary">
            <CardHeader>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <div className="h-8 w-8 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Repeat className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="font-serif text-base">Habits</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">This week</span>
                    <Badge variant="outline" data-testid="badge-habit-thisweek">
                      {currentWeek?.habitCompleted ?? 0}/{currentWeek?.habitRequired ?? 0} completed
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Best week</span>
                    <Badge variant="outline" data-testid="badge-habit-best">
                      {bestHabitWeek?.habitCompleted ?? 0}/{bestHabitWeek?.habitRequired ?? 0}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-priority-summary">
            <CardHeader>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <div className="h-8 w-8 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Grid3X3 className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="font-serif text-base">Priority Items</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">This week</span>
                    <Badge variant="outline" data-testid="badge-priority-thisweek">
                      {currentWeek?.priorityCompleted ?? 0}/{currentWeek?.priorityRequired ?? 0} completed
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Best week</span>
                    <Badge variant="outline" data-testid="badge-priority-best">
                      {bestPriorityWeek?.priorityRequired
                        ? `${Math.round((bestPriorityWeek.priorityCompleted / bestPriorityWeek.priorityRequired) * 100)}%`
                        : "N/A"}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
