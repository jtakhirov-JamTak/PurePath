import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sun, Moon,
  Target, CalendarDays,
} from "lucide-react";
import { useLocation } from "wouter";
import { buildProcessUrl } from "@/hooks/use-return-to";
import { format, startOfWeek, addDays, startOfMonth, endOfMonth } from "date-fns";
import type { Habit, HabitCompletion, Journal, EisenhowerEntry, MonthlyGoal } from "@shared/schema";
import { ContainmentModal } from "@/components/tools/containment-modal";
import { TriggerLogModal } from "@/components/tools/trigger-log-modal";
import { JournalQuickEntry } from "@/components/dashboard/journal-quick-entry";
import { DailyHabitsCard } from "@/components/dashboard/daily-habits-card";
import { ToolPalette } from "@/components/dashboard/tool-palette";
import { WeeklyProgress } from "@/components/dashboard/weekly-progress";
import type { ProgressMetrics } from "@/components/dashboard/weekly-progress";

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const weekStartDate = startOfWeek(today, { weekStartsOn: 1 });
  const weekStartStr = format(weekStartDate, "yyyy-MM-dd");
  const weekEndDate = addDays(weekStartDate, 6);
  const weekLabel = format(weekStartDate, "MMM d") + " – " + format(weekEndDate, "d");

  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const monthStartStr = format(monthStart, "yyyy-MM-dd");
  const monthEndStr = format(monthEnd, "yyyy-MM-dd");

  const { data: onboarding, isLoading: onboardingLoading } = useQuery<{ onboardingStep: number; onboardingComplete: boolean }>({
    queryKey: ["/api/onboarding"],
    enabled: !!user,
  });

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: !!user,
  });

  const weekEndStr = format(addDays(weekStartDate, 6), "yyyy-MM-dd");

  const { data: habitCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions", todayStr],
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: weekHabitCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions/range/" + weekStartStr + "/" + weekEndStr],
    enabled: !!user,
  });

  const { data: monthHabitCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions/range/" + monthStartStr + "/" + monthEndStr],
    enabled: !!user,
  });

  const { data: journals = [] } = useQuery<Journal[]>({
    queryKey: ["/api/journals"],
    enabled: !!user,
  });

  const { data: eisenhowerEntries = [] } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower"],
    enabled: !!user,
  });


  const currentMonthKey = format(today, "yyyy-MM");

  const { data: monthlyGoal, isSuccess: monthlyGoalLoaded } = useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal", currentMonthKey],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-goal?month=${currentMonthKey}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user,
  });

  const todayDayCode = DAY_CODES[today.getDay()];
  const todaysHabits = (() => {
    const scheduled = habits.filter((h) => {
      if (!h.active) return false;
      if (!h.cadence.split(",").includes(todayDayCode)) return false;
      if (h.startDate && todayStr < h.startDate) return false;
      if (h.endDate && todayStr > h.endDate) return false;
      return true;
    });
    // Deduplicate by lineage — prefer active version
    const byLineage = new Map<string, typeof habits[0]>();
    scheduled.forEach(h => {
      const key = h.lineageId || String(h.id);
      const existing = byLineage.get(key);
      if (!existing || (h.active && !existing.active)) byLineage.set(key, h);
    });
    // Cap at 3 most recently created active habits
    const deduped = Array.from(byLineage.values());
    if (deduped.length > 3) {
      deduped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return deduped.slice(0, 3);
    }
    return deduped;
  })();

  const habitStatusMap = new Map<number, string>();
  const habitLevelMap = new Map<number, number>();
  habitCompletions.forEach((hc) => {
    habitStatusMap.set(hc.habitId, hc.status || "completed");
    if (hc.completionLevel != null) {
      habitLevelMap.set(hc.habitId, hc.completionLevel);
    } else {
      const fallback = hc.status === "completed" ? 2 : hc.status === "minimum" ? 1 : hc.status === "skipped" ? 0 : null;
      if (fallback != null) habitLevelMap.set(hc.habitId, fallback);
    }
  });

  const todayJournals = journals.filter((j) => j.date === todayStr);
  const hasMorning = todayJournals.some((j) => j.session === "morning");
  const hasEvening = todayJournals.some((j) => j.session === "evening");


  const focusItems = eisenhowerEntries.filter((e) => {
    if (e.weekStart !== weekStartStr) return false;
    if (e.quadrant === "q1") return true;
    if (e.quadrant === "q2" && e.blocksGoal) return true;
    return false;
  });

  const setHabitLevelMutation = useMutation({
    mutationFn: async ({ habitId, level, skipReason, isBinary }: { habitId: number; level: number | null; skipReason?: string; isBinary?: boolean }) => {
      let res;
      if (level === null) {
        res = await apiRequest("DELETE", `/api/habit-completions/${habitId}/${todayStr}`);
      } else {
        const status = (isBinary && level === 1) ? "completed" : level === 2 ? "completed" : level === 1 ? "minimum" : "skipped";
        const existing = habitCompletions.some(hc => hc.habitId === habitId);
        const payload: Record<string, unknown> = { status, completionLevel: level };
        if (skipReason) payload.skipReason = skipReason;
        if (existing) {
          res = await apiRequest("PATCH", `/api/habit-completions/${habitId}/${todayStr}`, payload);
        } else {
          res = await apiRequest("POST", "/api/habit-completions", { habitId, date: todayStr, ...payload });
        }
      }
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update habit status");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habit-completions", todayStr] });
      queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("/api/habit-completions/range/") });
    },
    onError: (error: Error) => {
      toast({ title: "Could not update habit", description: error.message, variant: "destructive" });
    },
  });


  const setEisenhowerLevelMutation = useMutation({
    mutationFn: async ({ id, level, skipReason, scheduledStartTime, actualStartTime, durationMinutes, actualDuration, isBinary,
      startedOnTime, delayMinutes, delayReason, completedRequiredTime, timeShortMinutes }: {
      id: number; level: number | null; skipReason?: string; isBinary?: boolean;
      scheduledStartTime?: string | null; actualStartTime?: string | null;
      durationMinutes?: number | null; actualDuration?: number | null;
      startedOnTime?: boolean | null; delayMinutes?: number | null; delayReason?: string | null;
      completedRequiredTime?: boolean | null; timeShortMinutes?: number | null;
    }) => {
      let status: string | null;
      if (level === null) { status = null; }
      else if (level === 0) { status = "skipped"; }
      else if (isBinary && level === 1) { status = "completed"; }
      else if (level === 1) { status = "minimum"; }
      else { status = "completed"; }
      const body: Record<string, unknown> = { status, completionLevel: level };
      if (skipReason) body.skipReason = skipReason;
      if (scheduledStartTime !== undefined) body.scheduledStartTime = scheduledStartTime;
      if (actualStartTime !== undefined) body.actualStartTime = actualStartTime;
      if (durationMinutes !== undefined) body.durationMinutes = durationMinutes;
      if (actualDuration !== undefined) body.actualDuration = actualDuration;
      if (startedOnTime !== undefined) body.startedOnTime = startedOnTime;
      if (delayMinutes !== undefined) body.delayMinutes = delayMinutes;
      if (delayReason !== undefined) body.delayReason = delayReason;
      if (completedRequiredTime !== undefined) body.completedRequiredTime = completedRequiredTime;
      if (timeShortMinutes !== undefined) body.timeShortMinutes = timeShortMinutes;
      const res = await apiRequest("PATCH", `/api/eisenhower/${id}`, body);
      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.error || "Failed to update status");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not update status", description: error.message, variant: "destructive" });
    },
  });

  const redirectedRef = useRef(false);
  useEffect(() => {
    if (
      monthlyGoalLoaded &&
      onboarding?.onboardingComplete &&
      monthlyGoal &&
      !monthlyGoal.goalStatement?.trim() &&
      !redirectedRef.current
    ) {
      redirectedRef.current = true;
      toast({ title: "Monthly goal needed", description: "Let's set your goal for this month." });
      setLocation(buildProcessUrl("/monthly-goal", "/dashboard"));
    }
  }, [monthlyGoalLoaded, monthlyGoal, onboarding, setLocation]);

  const [quickToolOpen, setQuickToolOpen] = useState<string | null>(null);

  const progressMetrics: ProgressMetrics = useMemo(() => {
    // Build lineage→habitIds map for sibling matching
    const lineageMap = new Map<string, number[]>();
    habits.forEach(h => {
      if (h.lineageId) {
        if (!lineageMap.has(h.lineageId)) lineageMap.set(h.lineageId, []);
        lineageMap.get(h.lineageId)!.push(h.id);
      }
    });

    function countHabits(dayStrs: string[], completions: HabitCompletion[]) {
      let completed = 0;
      let scheduled = 0;
      for (const dayStr of dayStrs) {
        if (dayStr > todayStr) continue;
        const day = new Date(dayStr + "T12:00:00");
        const dayCode = DAY_CODES[day.getDay()];
        const scheduledHabits = habits.filter(h => {
          if (!h.cadence.split(",").includes(dayCode)) return false;
          if (h.startDate && dayStr < h.startDate) return false;
          if (h.endDate && dayStr > h.endDate) return false;
          // Active habits always count; archived habits only count within their date range
          if (!h.active) {
            if (!h.startDate || !h.endDate) return false;
            if (dayStr < h.startDate || dayStr > h.endDate) return false;
          }
          return true;
        });
        const byLineage = new Map<string, typeof scheduledHabits[0]>();
        scheduledHabits.forEach(h => {
          const key = h.lineageId || String(h.id);
          if (!byLineage.has(key)) byLineage.set(key, h);
        });
        Array.from(byLineage.values()).forEach(h => {
          scheduled++;
          const siblingIds = h.lineageId ? (lineageMap.get(h.lineageId) || [h.id]) : [h.id];
          const hc = completions.find(c => siblingIds.includes(c.habitId) && c.date === dayStr);
          if (hc) {
            if (hc.completionLevel != null && hc.completionLevel >= 1) completed++;
          }
        });
      }
      return { completed, scheduled };
    }

    // Week days
    const weekDayStrs: string[] = [];
    for (let d = 0; d < 7; d++) weekDayStrs.push(format(addDays(weekStartDate, d), "yyyy-MM-dd"));

    // Month days
    const monthDayStrs: string[] = [];
    let cursor = monthStart;
    while (cursor <= monthEnd) {
      monthDayStrs.push(format(cursor, "yyyy-MM-dd"));
      cursor = addDays(cursor, 1);
    }

    const weekHabits = countHabits(weekDayStrs, weekHabitCompletions);
    const monthHabits = countHabits(monthDayStrs, monthHabitCompletions);

    // Q2 items for the week
    const weekQ2 = eisenhowerEntries.filter(e => e.quadrant === "q2" && e.weekStart === weekStartStr);
    const q2CompletedWeek = weekQ2.filter(e => e.status === "completed").length;
    const q2TotalWeek = weekQ2.length;

    // Q2 items for the month
    const monthQ2 = eisenhowerEntries.filter(e => e.quadrant === "q2" && e.weekStart! >= monthStartStr && e.weekStart! <= monthEndStr);
    const q2CompletedMonth = monthQ2.filter(e => e.status === "completed").length;
    const q2TotalMonth = monthQ2.length;

    return {
      habitsCompletedWeek: weekHabits.completed,
      habitsScheduledWeek: weekHabits.scheduled,
      habitsCompletedMonth: monthHabits.completed,
      habitsScheduledMonth: monthHabits.scheduled,
      q2CompletedWeek,
      q2TotalWeek,
      q2CompletedMonth,
      q2TotalMonth,
    };
  }, [habits, weekHabitCompletions, monthHabitCompletions, eisenhowerEntries, weekStartDate, weekStartStr, todayStr, monthStartStr, monthEndStr, monthStart, monthEnd]);


  useEffect(() => {
    if (!onboardingLoading && onboarding && !onboarding.onboardingComplete) {
      toast({
        title: "Setup required",
        description: "Complete your setup to unlock all features.",
      });
      setLocation("/setup");
    }
  }, [onboarding, onboardingLoading]);

  if (authLoading || onboardingLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-3 max-w-2xl space-y-2">
          <Skeleton className="h-24 w-full" data-testid="skeleton-header" />
          <Skeleton className="h-48 w-full" data-testid="skeleton-habits" />
        </div>
      </AppLayout>
    );
  }

  if (onboarding && !onboarding.onboardingComplete) {
    return null;
  }

  const currentHour = new Date().getHours();
  const morningSkipped = !hasMorning && currentHour >= 12;
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon
  const showPlanWeekPrompt = dayOfWeek === 0 || dayOfWeek === 1;

  const journalHabitItems = [
    { id: -1, name: "Morning Journal", isMorning: true, done: hasMorning, skipped: morningSkipped },
    { id: -2, name: "Evening Journal", isMorning: false, done: hasEvening, skipped: false },
  ];

  const completedHabits = todaysHabits.filter(h => habitStatusMap.get(h.id) === "completed").length + journalHabitItems.filter(j => j.done).length;
  const totalHabits = todaysHabits.length + journalHabitItems.length;
  const goalDisplay = monthlyGoal?.goalWhat?.trim() || monthlyGoal?.goalStatement?.trim() || "";

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-3 max-w-2xl space-y-2">
        <div className="flex items-center justify-between gap-4 flex-wrap" data-testid="today-header">
          <div>
            <h1 className="text-sm font-medium" data-testid="text-today-title">
              {format(today, "EEEE, MMM d")}
            </h1>
            {goalDisplay && (
              <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-monthly-promise">
                <Target className="h-3 w-3 inline mr-1" />
                {goalDisplay}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!hasMorning && (
              <Button
                size="sm"
                className="text-xs py-1 px-3 h-auto"
                onClick={() => { setLocation(`/journal/${todayStr}/morning`); window.scrollTo(0, 0); }}
                data-testid="button-morning-journal"
              >
                <Sun className="h-3.5 w-3.5 mr-1" />
                Morning
              </Button>
            )}
            {hasMorning && !hasEvening && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs py-1 px-3 h-auto"
                onClick={() => { setLocation(`/journal/${todayStr}/evening`); window.scrollTo(0, 0); }}
                data-testid="button-evening-journal"
              >
                <Moon className="h-3.5 w-3.5 mr-1" />
                Evening
              </Button>
            )}
          </div>
        </div>

        {focusItems.length > 0 ? (
          <div data-testid="card-focus">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] uppercase text-bark font-medium">Focus</p>
              <span className="text-[11px] text-muted-foreground">{weekLabel}</span>
            </div>
            <ul className="space-y-0.5">
              {focusItems.map((item) => {
                const isBin = item.isBinary || false;
                const lvl = item.completionLevel ?? null;
                const cycleFocus = () => {
                  if (isBin) {
                    if (lvl === null) setEisenhowerLevelMutation.mutate({ id: item.id, level: 1, isBinary: true });
                    else if (lvl === 1) setEisenhowerLevelMutation.mutate({ id: item.id, level: 0 });
                    else setEisenhowerLevelMutation.mutate({ id: item.id, level: null });
                  } else {
                    if (lvl === null) setEisenhowerLevelMutation.mutate({ id: item.id, level: 2 });
                    else if (lvl === 2) setEisenhowerLevelMutation.mutate({ id: item.id, level: 1 });
                    else if (lvl === 1) setEisenhowerLevelMutation.mutate({ id: item.id, level: 0 });
                    else setEisenhowerLevelMutation.mutate({ id: item.id, level: null });
                  }
                };
                const boxLabel = isBin
                  ? (lvl === 1 ? "Done" : lvl === 0 ? "Skip" : "—")
                  : (lvl === 2 ? "Full" : lvl === 1 ? "Min" : lvl === 0 ? "Skip" : "—");
                const boxClass =
                  (lvl === 2 || (isBin && lvl === 1)) ? "bg-emerald-500 border-emerald-600 text-white"
                  : lvl === 1 ? "bg-yellow-300 border-yellow-400 text-yellow-800 dark:bg-yellow-400/40 dark:border-yellow-400/60 dark:text-yellow-200"
                  : lvl === 0 ? "bg-red-400 border-red-500 text-white dark:bg-red-500/40 dark:border-red-500/60"
                  : "border-border text-muted-foreground";
                return (
                  <li key={item.id} className="flex items-center gap-2.5 py-1.5" data-testid={`focus-item-${item.id}`}>
                    <button
                      onClick={cycleFocus}
                      className={`h-5 w-12 text-[10px] rounded-md border-2 shrink-0 font-medium cursor-pointer ${boxClass}`}
                      data-testid={`focus-level-${item.id}`}
                    >
                      {boxLabel}
                    </button>
                    <span className={`text-xs flex-1 ${
                      item.status === "completed" ? "line-through text-muted-foreground"
                      : item.status === "skipped" ? "text-muted-foreground italic"
                      : ""
                    }`}>{item.task}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div data-testid="card-focus-empty">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] uppercase text-bark font-medium">Focus</p>
              <span className="text-[11px] text-muted-foreground">{weekLabel}</span>
            </div>
            <button
              className="text-xs text-primary hover:underline cursor-pointer"
              onClick={() => setLocation("/eisenhower")}
              data-testid="link-plan-week"
            >
              Plan your week →
            </button>
          </div>
        )}

        {showPlanWeekPrompt && (
          <div className="p-2.5 rounded-xl border-2 border-primary/30 bg-primary/5 flex items-center justify-between gap-3" data-testid="card-plan-week-prompt">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-xs font-medium">Time to plan your week</p>
                <p className="text-[10px] text-muted-foreground">Pick your top priorities for the week ahead</p>
              </div>
            </div>
            <Button size="sm" className="text-xs" onClick={() => setLocation("/eisenhower")} data-testid="button-plan-week-go">
              Plan Week
            </Button>
          </div>
        )}

        <JournalQuickEntry
          todayStr={todayStr}
          hasMorning={hasMorning}
          hasEvening={hasEvening}
          setLocation={setLocation}
          firstName={user?.firstName || ""}
        />

        <DailyHabitsCard
          todayStr={todayStr}
          todaysHabits={todaysHabits}
          journalHabitItems={journalHabitItems}
          habitStatusMap={habitStatusMap}
          habitLevelMap={habitLevelMap}
          completedHabits={completedHabits}
          totalHabits={totalHabits}
          onHabitLevel={(habitId, level, options) => {
            setHabitLevelMutation.mutate({ habitId, level, isBinary: options?.isBinary });
          }}
          onHabitSkip={(habitId) => setHabitLevelMutation.mutate({ habitId, level: 0 })}
          onNavigate={(path) => { setLocation(path.startsWith("/journal/") ? path : buildProcessUrl(path, "/dashboard")); window.scrollTo(0, 0); }}
        />

        <WeeklyProgress progressMetrics={progressMetrics} />

        <ToolPalette
          onToolOpen={setQuickToolOpen}
          onNavigate={setLocation}
        />
      </div>

      <ContainmentModal open={quickToolOpen === "containment"} onClose={() => setQuickToolOpen(null)} />
      <TriggerLogModal open={quickToolOpen === "trigger"} onClose={() => setQuickToolOpen(null)} />
    </AppLayout>
  );
}
