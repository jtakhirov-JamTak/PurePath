import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sun, Moon,
  Target, Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { buildProcessUrl } from "@/hooks/use-return-to";
import { format, startOfWeek, addDays, getDayOfYear } from "date-fns";
import type { Habit, HabitCompletion, Journal, EisenhowerEntry, MonthlyGoal, IdentityDocument } from "@shared/schema";
import { buildHabitLevelMap, buildHabitStatusMap } from "@/lib/completion";
import { getTodaysFocusItems, getWeekFocusItems } from "@/lib/eisenhower-filters";
import { getTodaysHabits } from "@/lib/habit-filters";
import { ContainmentModal } from "@/components/tools/containment-modal";
import { TriggerLogModal } from "@/components/tools/trigger-log-modal";
import { JournalQuickEntry } from "@/components/dashboard/journal-quick-entry";
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

  const todaysHabits = getTodaysHabits(habits, todayStr);

  const habitStatusMap = buildHabitStatusMap(habitCompletions);
  const habitLevelMap = buildHabitLevelMap(habitCompletions);

  const todayJournals = journals.filter((j) => j.date === todayStr);
  const hasMorning = todayJournals.some((j) => j.session === "morning");
  const hasEvening = todayJournals.some((j) => j.session === "evening");


  // Daily Anchor — rotating excerpt from identity document
  const anchorExcerpt = useMemo(() => {
    if (!identityDoc) return null;
    const fields = [
      identityDoc.identity?.trim(),
      identityDoc.vision?.trim(),
      identityDoc.values?.trim(),
      identityDoc.purpose?.trim(),
    ];
    const dayIndex = getDayOfYear(today) % 4;
    for (let i = 0; i < 4; i++) {
      const text = fields[(dayIndex + i) % 4];
      if (text) return text;
    }
    return null;
  }, [identityDoc]);

  // Focus items for the selected day (defaults to today)
  const focusItems = getTodaysFocusItems(eisenhowerEntries, weekStartStr, selectedDate);

  const sortedFocusItems = [...focusItems].sort((a, b) =>
    (a.scheduledStartTime || "99:99").localeCompare(b.scheduledStartTime || "99:99")
  );


  const setHabitLevelMutation = useToastMutation<{ habitId: number; level: number | null; skipReason?: string; isBinary?: boolean }>({
    mutationFn: async ({ habitId, level, skipReason, isBinary }) => {
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
    invalidateKeys: [["/api/habit-completions", todayStr]],
    invalidatePredicates: [(q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("/api/habit-completions/range/")],
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
    // Only celebrate on false → true transition (not on initial load)
    if (allFocusDone && !prevAllFocusDoneRef.current) {
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


  const currentHour = new Date().getHours();
  const morningSkipped = !hasMorning && currentHour >= 12;
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
            {anchorExcerpt && (
              <p className="text-[11px] text-muted-foreground italic mt-0.5 line-clamp-1" data-testid="daily-anchor">
                {anchorExcerpt}
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
