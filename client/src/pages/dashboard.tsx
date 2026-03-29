import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { buildProcessUrl } from "@/hooks/use-return-to";
import { format, startOfWeek, addDays } from "date-fns";
import type { Habit, HabitCompletion, Journal, EisenhowerEntry, MonthlyGoal, IdentityDocument } from "@shared/schema";
import { buildHabitLevelMap, buildHabitStatusMap } from "@/lib/completion";
import { getTodaysFocusItems, getWeekFocusItems } from "@/lib/eisenhower-filters";
import { getTodaysHabits, getDateHabits } from "@/lib/habit-filters";
import { ContainmentModal } from "@/components/tools/containment-modal";
import { TriggerLogModal } from "@/components/tools/trigger-log-modal";
import { DailyHabitsCard } from "@/components/dashboard/daily-habits-card";
import { ToolPalette } from "@/components/dashboard/tool-palette";
import { WeekStrip } from "@/components/dashboard/week-strip";
import { FocusItem } from "@/components/dashboard/focus-item";


export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const weekStartDate = startOfWeek(today, { weekStartsOn: 1 });
  const weekStartStr = format(weekStartDate, "yyyy-MM-dd");


  const { data: onboarding, isLoading: onboardingLoading } = useQuery<{ onboardingStep: number; onboardingComplete: boolean }>({
    queryKey: ["/api/onboarding"],
    enabled: !!user,
  });

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: !!user,
  });


  const { data: habitCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions", todayStr],
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: journals = [] } = useQuery<Journal[]>({
    queryKey: ["/api/journals"],
    enabled: !!user,
  });

  // 7-day habit completions for streak dots
  const streakStartStr = format(addDays(today, -6), "yyyy-MM-dd");
  const { data: weekStreakCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions/range/" + streakStartStr + "/" + todayStr],
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

  const { data: identityDoc } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
    enabled: !!user,
  });

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const isToday = selectedDate === todayStr;

  // Completions for selected date (when browsing a different day)
  const { data: selectedDateCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions/" + selectedDate],
    enabled: !!user && !isToday,
  });

  // Date-aware habits: active-only max 3 for today, all matching for past dates
  const selectedHabits = useMemo(() => {
    return isToday ? getTodaysHabits(habits, todayStr) : getDateHabits(habits, selectedDate);
  }, [habits, selectedDate, todayStr, isToday]);

  // Date-aware completions and maps
  const activeCompletions = isToday ? habitCompletions : selectedDateCompletions;
  const habitStatusMap = buildHabitStatusMap(activeCompletions);
  const habitLevelMap = buildHabitLevelMap(activeCompletions);

  // Date-aware journal status
  const selectedJournals = journals.filter((j) => j.date === selectedDate);
  const hasMorning = selectedJournals.some((j) => j.session === "morning");
  const hasEvening = selectedJournals.some((j) => j.session === "evening");

  // 7-day journal completion map for journal row dots
  const journalDayMap = useMemo(() => {
    const morning = new Set<string>();
    const evening = new Set<string>();
    journals.forEach((j) => {
      if (j.date >= streakStartStr && j.date <= todayStr) {
        if (j.session === "morning") morning.add(j.date);
        else if (j.session === "evening") evening.add(j.date);
      }
    });
    return { morning, evening };
  }, [journals, streakStartStr, todayStr]);

  // Identity statement for Daily Contract — first non-empty identity field
  const identityStatement = useMemo(() => {
    if (!identityDoc) return null;
    return identityDoc.identity?.trim() || identityDoc.purpose?.trim()
      || identityDoc.vision?.trim() || identityDoc.values?.trim() || null;
  }, [identityDoc]);

  // Focus items for selected day (used by both list and contract)
  const focusItems = getTodaysFocusItems(eisenhowerEntries, weekStartStr, selectedDate);

  const sortedFocusItems = [...focusItems].sort((a, b) =>
    (a.scheduledStartTime || "99:99").localeCompare(b.scheduledStartTime || "99:99")
  );


  const setHabitLevelMutation = useToastMutation<{ habitId: number; level: number | null; skipReason?: string; isBinary?: boolean }>({
    mutationFn: async ({ habitId, level, skipReason, isBinary }) => {
      let res;
      if (level === null) {
        res = await apiRequest("DELETE", `/api/habit-completions/${habitId}/${selectedDate}`);
      } else {
        const status = (isBinary && level === 1) ? "completed" : level === 2 ? "completed" : level === 1 ? "minimum" : "skipped";
        const existing = activeCompletions.some(hc => hc.habitId === habitId);
        const payload: Record<string, unknown> = { status, completionLevel: level };
        if (skipReason) payload.skipReason = skipReason;
        if (existing) {
          res = await apiRequest("PATCH", `/api/habit-completions/${habitId}/${selectedDate}`, payload);
        } else {
          res = await apiRequest("POST", "/api/habit-completions", { habitId, date: selectedDate, ...payload });
        }
      }
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update habit status");
      }
    },
    invalidateKeys: [["/api/habit-completions", todayStr]],
    invalidatePredicates: [(q) => typeof q.queryKey[0] === "string" && (q.queryKey[0].startsWith("/api/habit-completions/range/") || q.queryKey[0].startsWith("/api/habit-completions/"))],
    errorToast: "Could not update habit",
  });

  const setEisenhowerLevelMutation = useToastMutation<{
    id: number; level: number | null; skipReason?: string; isBinary?: boolean;
    scheduledStartTime?: string | null; actualStartTime?: string | null;
    durationMinutes?: number | null; actualDuration?: number | null;
    startedOnTime?: boolean | null; delayMinutes?: number | null; delayReason?: string | null;
    completedRequiredTime?: boolean | null; timeShortMinutes?: number | null;
  }>({
    mutationFn: async ({ id, level, skipReason, scheduledStartTime, actualStartTime, durationMinutes, actualDuration, isBinary,
      startedOnTime, delayMinutes, delayReason, completedRequiredTime, timeShortMinutes }) => {
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
    invalidateKeys: ["/api/eisenhower"],
    errorToast: "Could not update status",
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

  const allFocusDone = focusItems.length > 0 && focusItems.every(e => e.status === "completed");
  const [showCelebration, setShowCelebration] = useState(false);
  const prevAllFocusDoneRef = useRef(allFocusDone);

  useEffect(() => {
    // Only celebrate on false → true transition for today (not past dates or initial load)
    if (isToday && allFocusDone && !prevAllFocusDoneRef.current) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 1500);
      prevAllFocusDoneRef.current = allFocusDone;
      return () => clearTimeout(timer);
    }
    prevAllFocusDoneRef.current = allFocusDone;
  }, [allFocusDone]);



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


  const journalHabitItems = [
    { id: -1, name: "Morning Journal", session: "morning" as const, done: hasMorning },
    { id: -2, name: "Evening Journal", session: "evening" as const, done: hasEvening },
  ];

  const completedHabits = selectedHabits.filter(h => habitStatusMap.get(h.id) === "completed").length + journalHabitItems.filter(j => j.done).length;
  const totalHabits = selectedHabits.length + journalHabitItems.length;
  const goalDisplay = monthlyGoal?.goalWhat?.trim() || monthlyGoal?.goalStatement?.trim() || "";
  const completedFocusCount = focusItems.filter(e => e.status === "completed").length;
  const allContractDone = (focusItems.length === 0 || allFocusDone) && completedHabits === totalHabits;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-3 max-w-2xl space-y-2">
        {/* Daily Contract */}
        <div
          className={`rounded-lg p-3 transition-colors ${isToday && allContractDone ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-bark/5"}`}
          data-testid="daily-contract"
        >
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
            {format(new Date(selectedDate + "T12:00:00"), "EEEE, MMM d")}
          </p>
          {identityStatement && (
            <p className="text-xs italic text-foreground/80 mt-1 line-clamp-2" data-testid="contract-identity">
              <span className="not-italic font-medium text-muted-foreground">Identity: </span>
              &ldquo;{identityStatement}&rdquo;
            </p>
          )}
          {goalDisplay && (
            <p className="text-[11px] text-muted-foreground mt-1" data-testid="contract-goal">
              <span className="font-medium">Goal: </span>
              {goalDisplay}
            </p>
          )}
          <p className="text-[11px] mt-2 font-medium" data-testid="contract-counts">
            <span className={isToday && allContractDone ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}>
              {isToday && allContractDone
                ? "Proved."
                : `${isToday ? "Proving: " : ""}${focusItems.length > 0 ? `${completedFocusCount}/${focusItems.length} focus \u00b7 ` : ""}${completedHabits}/${totalHabits} habits`
              }
            </span>
          </p>
        </div>

        <WeekStrip
          weekStartDate={weekStartDate}
          todayStr={todayStr}
          selectedDateStr={selectedDate}
          eisenhowerEntries={eisenhowerEntries}
          weekStartStr={weekStartStr}
          onSelectDate={setSelectedDate}
        />

        {focusItems.length > 0 ? (
          <div data-testid="card-focus" className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] uppercase text-bark font-medium">Focus</p>
              <span className="text-[11px] text-muted-foreground">{format(new Date(selectedDate + "T12:00:00"), "EEEE")}{selectedDate !== todayStr && <button className="ml-1.5 text-primary hover:underline cursor-pointer" onClick={() => setSelectedDate(todayStr)}>← today</button>}</span>
            </div>
            <ul key={selectedDate} className="space-y-0.5">
              {sortedFocusItems.map((item, i) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: i * 0.04 }}
                >
                  <FocusItem
                    item={item}
                    weekStartDate={weekStartDate}
                    onCycleLevel={(id, level, isBinary) =>
                      setEisenhowerLevelMutation.mutate({ id, level, isBinary })
                    }
                  />
                </motion.li>
              ))}
            </ul>
            {/* Last-item celebration — auto-dismisses after 1.5s */}
            <AnimatePresence>
              {showCelebration && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <div className="bg-emerald-500 text-white rounded-full p-3 shadow-lg animate-check-flash">
                    <Check className="h-6 w-6" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div data-testid="card-focus-empty">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] uppercase text-bark font-medium">Focus</p>
              <span className="text-[11px] text-muted-foreground">{format(new Date(selectedDate + "T12:00:00"), "EEEE")}{selectedDate !== todayStr && <button className="ml-1.5 text-primary hover:underline cursor-pointer" onClick={() => setSelectedDate(todayStr)}>← today</button>}</span>
            </div>
            {getWeekFocusItems(eisenhowerEntries, weekStartStr).length > 0 ? (
              <p className="text-xs text-muted-foreground">Nothing scheduled for today</p>
            ) : (
              <button
                className="text-xs text-primary hover:underline cursor-pointer"
                onClick={() => setLocation("/eisenhower")}
                data-testid="link-plan-week"
              >
                Plan your week →
              </button>
            )}
          </div>
        )}

        <DailyHabitsCard
          todayStr={todayStr}
          selectedDate={selectedDate}
          readOnly={selectedDate > todayStr}
          selectedHabits={selectedHabits}
          journalHabitItems={journalHabitItems}
          habitStatusMap={habitStatusMap}
          habitLevelMap={habitLevelMap}
          completedHabits={completedHabits}
          totalHabits={totalHabits}
          weekStreakCompletions={weekStreakCompletions}
          journalDayMap={journalDayMap}
          onHabitLevel={(habitId, level, options) => {
            setHabitLevelMutation.mutate({ habitId, level, isBinary: options?.isBinary });
          }}
          onHabitSkip={(habitId) => setHabitLevelMutation.mutate({ habitId, level: 0 })}
          onNavigate={(path) => { setLocation(path.startsWith("/journal/") ? path : buildProcessUrl(path, "/dashboard")); window.scrollTo(0, 0); }}
        />

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
