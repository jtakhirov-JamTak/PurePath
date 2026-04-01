import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { buildProcessUrl } from "@/hooks/use-return-to";
import { format, addDays } from "date-fns";
import { getWeekBounds } from "@/lib/week-utils";
import type { Habit, HabitCompletion, Journal, EisenhowerEntry, MonthlyGoal, IdentityDocument } from "@shared/schema";
import { buildHabitStatusMap } from "@/lib/completion";
import { getTodaysFocusItems } from "@/lib/eisenhower-filters";
import { getTodaysHabits, getDateHabits } from "@/lib/habit-filters";
import { CATEGORY_COLORS, CATEGORY_BADGE, TIMING_LABELS, TIMING_ORDER } from "@/lib/constants";
import { ContainmentModal } from "@/components/tools/containment-modal";
import { CompletionCircle } from "@/components/dashboard/completion-circle";
import { FocusItem } from "@/components/dashboard/focus-item";
import { useCelebrationBeat } from "@/hooks/use-celebration-beat";

// ─── Stories Ring constants ──────────────────────────────────────────
const RING_R = 14;
const RING_CIRC = 2 * Math.PI * RING_R;
const RING_R_TODAY = 18;
const RING_CIRC_TODAY = 2 * Math.PI * RING_R_TODAY;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const [weekOffset, setWeekOffset] = useState(0);
  const { weekStart: weekStartDate, weekStartStr, weekEndStr } = getWeekBounds(today, weekOffset);

  // ─── Queries ─────────────────────────────────────────────────────
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

  const { data: weekStreakCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions/range/" + weekStartStr + "/" + weekEndStr],
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

  // ─── Selected date state ─────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const isToday = selectedDate === todayStr;

  // When navigating weeks, select today (if current week) or last day of that week
  useEffect(() => {
    if (weekOffset === 0) {
      setSelectedDate(todayStr);
    } else {
      setSelectedDate(weekEndStr);
    }
  }, [weekOffset, todayStr, weekEndStr]);

  const { data: selectedDateCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions/" + selectedDate],
    enabled: !!user && !isToday,
  });

  // ─── Computed data ───────────────────────────────────────────────
  const selectedHabits = useMemo(() => {
    return isToday ? getTodaysHabits(habits, todayStr) : getDateHabits(habits, selectedDate);
  }, [habits, selectedDate, todayStr, isToday]);

  const activeCompletions = isToday ? habitCompletions : selectedDateCompletions;
  const habitStatusMap = buildHabitStatusMap(activeCompletions);

  const selectedJournals = journals.filter((j) => j.date === selectedDate);
  const hasMorning = selectedJournals.some((j) => j.session === "morning");
  const hasEvening = selectedJournals.some((j) => j.session === "evening");

  const journalDayMap = useMemo(() => {
    const morning = new Set<string>();
    const evening = new Set<string>();
    journals.forEach((j) => {
      if (j.date >= weekStartStr && j.date <= weekEndStr) {
        if (j.session === "morning") morning.add(j.date);
        else if (j.session === "evening") evening.add(j.date);
      }
    });
    return { morning, evening };
  }, [journals, weekStartStr, weekEndStr]);

  const focusItems = getTodaysFocusItems(eisenhowerEntries, weekStartStr, selectedDate, todayStr);
  const sortedFocusItems = useMemo(() => {
    const incomplete = focusItems.filter(e => e.status !== "completed");
    const complete = focusItems.filter(e => e.status === "completed");
    incomplete.sort((a, b) => (a.scheduledStartTime || "99:99").localeCompare(b.scheduledStartTime || "99:99"));
    return [...incomplete, ...complete];
  }, [focusItems]);

  // ─── Habit sorting with sink ─────────────────────────────────────
  const sortedHabits = useMemo(() => {
    const incomplete = selectedHabits.filter(h => habitStatusMap.get(h.id) !== "completed");
    const complete = selectedHabits.filter(h => habitStatusMap.get(h.id) === "completed");
    const sorter = (a: Habit, b: Habit) => (TIMING_ORDER[a.timing || "afternoon"] ?? 1) - (TIMING_ORDER[b.timing || "afternoon"] ?? 1);
    incomplete.sort(sorter);
    complete.sort(sorter);
    return [...incomplete, ...complete];
  }, [selectedHabits, habitStatusMap]);

  // ─── Streak data ─────────────────────────────────────────────────
  const weekDays = useMemo(() => {
    const monday = new Date(weekStartStr + "T12:00:00");
    return Array.from({ length: 7 }, (_, i) => format(addDays(monday, i), "yyyy-MM-dd"));
  }, [weekStartStr]);

  const streakMap = useMemo(() => {
    const map = new Map<number, Map<string, number | null>>();
    weekStreakCompletions.forEach(hc => {
      if (!map.has(hc.habitId)) map.set(hc.habitId, new Map());
      map.get(hc.habitId)!.set(hc.date, hc.completionLevel);
    });
    return map;
  }, [weekStreakCompletions]);

  // ─── Counts ──────────────────────────────────────────────────────
  const completedHabits = selectedHabits.filter(h => habitStatusMap.get(h.id) === "completed").length;
  const completedFocusCount = focusItems.filter(e => e.status === "completed").length;
  const morningDone = hasMorning ? 1 : 0;
  const eveningDone = hasEvening ? 1 : 0;
  const totalItems = selectedHabits.length + focusItems.length + 2;
  const completedItems = completedHabits + completedFocusCount + morningDone + eveningDone;
  const allDone = totalItems > 0 && completedItems === totalItems;

  // Section-level done states
  const allFocusDone = focusItems.length > 0 && focusItems.every(e => e.status === "completed");
  const allHabitsDone = selectedHabits.length > 0 && selectedHabits.every(h => habitStatusMap.get(h.id) === "completed");
  const allAboveDone = (focusItems.length === 0 || allFocusDone) && (selectedHabits.length === 0 || allHabitsDone) && hasMorning;

  // Close moment: everything done except evening, today only
  const isCloseMoment = isToday && allAboveDone && !hasEvening;

  // Celebration beats
  const focusCelebrating = useCelebrationBeat(allFocusDone);
  const habitsCelebrating = useCelebrationBeat(allHabitsDone);
  const morningCelebrating = useCelebrationBeat(hasMorning);

  // ─── Stories ring per-day progress ───────────────────────────────
  const ringData = useMemo(() => {
    return weekDays.map((dayStr, i) => {
      const dayHabits = getTodaysHabits(habits, dayStr);
      const dayFocus = getTodaysFocusItems(eisenhowerEntries, weekStartStr, dayStr, todayStr);
      const dayHabitCompletions = new Set<number>();
      weekStreakCompletions.forEach(hc => {
        if (hc.date === dayStr && hc.status === "completed") dayHabitCompletions.add(hc.habitId);
      });
      const completedH = dayHabits.filter(h => dayHabitCompletions.has(h.id)).length;
      const completedF = dayFocus.filter(e => e.status === "completed").length;
      const hasMorn = journalDayMap.morning.has(dayStr);
      const hasEve = journalDayMap.evening.has(dayStr);
      const total = dayHabits.length + dayFocus.length + 2;
      const done = completedH + completedF + (hasMorn ? 1 : 0) + (hasEve ? 1 : 0);
      const isFuture = dayStr > todayStr;
      const progress = isFuture ? 0 : total > 0 ? done / total : 0;
      const hasIncomplete = !isFuture && total > 0 && done < total;
      return {
        dateStr: dayStr,
        label: DAY_LABELS[i],
        dayNum: format(new Date(dayStr + "T12:00:00"), "d"),
        isToday: dayStr === todayStr,
        isSelected: dayStr === selectedDate,
        isFuture,
        progress,
        hasIncomplete,
      };
    });
  }, [weekDays, habits, eisenhowerEntries, weekStartStr, todayStr, weekStreakCompletions, journalDayMap, selectedDate]);

  // ─── Mutations ───────────────────────────────────────────────────
  const setHabitLevelMutation = useToastMutation<{ habitId: number; level: number | null }>({
    mutationFn: async ({ habitId, level }) => {
      let res;
      if (level === null) {
        res = await apiRequest("DELETE", `/api/habit-completions/${habitId}/${selectedDate}`);
      } else {
        const existing = activeCompletions.some(hc => hc.habitId === habitId);
        const payload = { status: "completed", completionLevel: 2 };
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

  const setEisenhowerLevelMutation = useToastMutation<{ id: number; done: boolean }>({
    mutationFn: async ({ id, done }) => {
      const body = done
        ? { status: null, completionLevel: null, completed: false }
        : { status: "completed", completionLevel: 2, completed: true };
      const res = await apiRequest("PATCH", `/api/eisenhower/${id}`, body);
      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.error || "Failed to update status");
      }
    },
    invalidateKeys: ["/api/eisenhower"],
    errorToast: "Could not update status",
  });

  // ─── Redirects ───────────────────────────────────────────────────
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

  const [containmentOpen, setContainmentOpen] = useState(false);

  useEffect(() => {
    if (!onboardingLoading && onboarding && !onboarding.onboardingComplete) {
      toast({ title: "Setup required", description: "Complete your setup to unlock all features." });
      setLocation("/setup");
    }
  }, [onboarding, onboardingLoading]);

  // ─── Loading / guard ─────────────────────────────────────────────
  if (authLoading || onboardingLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-3 max-w-2xl space-y-2">
          <Skeleton className="h-16 w-full" data-testid="skeleton-header" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" data-testid="skeleton-habits" />
        </div>
      </AppLayout>
    );
  }

  if (onboarding && !onboarding.onboardingComplete) return null;

  // ─── Anchor card data ────────────────────────────────────────────
  const anchorIdentity = identityDoc?.identity?.trim() || "";
  const anchorValues = identityDoc?.values?.trim() || "";
  const anchorGoal = monthlyGoal?.goalWhat?.trim() || monthlyGoal?.goalStatement?.trim() || "";
  const showAnchor = anchorIdentity || anchorValues || anchorGoal;

  const readOnly = selectedDate > todayStr;

  // ─── Section wrapper helper ──────────────────────────────────────
  const sectionClass = (sectionAllDone: boolean, celebrating: boolean) =>
    `rounded-lg border border-border/60 p-3 transition-colors duration-500 ${
      celebrating
        ? "bg-emerald-50/80 dark:bg-emerald-950/40"
        : sectionAllDone
          ? "bg-emerald-50/40 dark:bg-emerald-950/20"
          : ""
    }`;

  return (
    <AppLayout>
      <div className={`container mx-auto px-4 py-3 max-w-2xl space-y-3 transition-colors duration-700 ${
        isCloseMoment ? "bg-gradient-to-b from-amber-50/30 dark:from-amber-950/15" : ""
      }`}>

        {/* ─── 1. Stories Ring Nav ──────────────────────────────── */}
        <div className="flex items-end justify-between py-2">
          <button
            type="button"
            onClick={() => { setWeekOffset(o => Math.max(o - 1, -52)); }}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex justify-between flex-1 px-1">
            {ringData.map((day) => {
              const isLarge = day.isToday;
              const svgSize = isLarge ? 44 : 34;
              const vb = isLarge ? "0 0 44 44" : "0 0 36 36";
              const cx = isLarge ? 22 : 18;
              const cy = isLarge ? 22 : 18;
              const r = isLarge ? RING_R_TODAY : RING_R;
              const circ = isLarge ? RING_CIRC_TODAY : RING_CIRC;

              return (
                <button
                  key={day.dateStr}
                  onClick={() => setSelectedDate(day.dateStr)}
                  className={`flex flex-col items-center gap-0.5 ${day.isFuture ? "opacity-40" : ""} cursor-pointer`}
                >
                  <svg width={svgSize} height={svgSize} viewBox={vb}>
                    {/* Background ring */}
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor"
                      strokeWidth={isLarge ? "3" : "2.5"} className="text-border/20" />
                    {/* Progress ring */}
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor"
                      strokeWidth={isLarge ? "3" : "2.5"}
                      className={`text-emerald-500 ${day.isToday && day.progress < 1 ? "animate-dot-pulse" : ""}`}
                      strokeDasharray={`${day.progress * circ} ${circ}`}
                      strokeLinecap="round"
                      transform={`rotate(-90 ${cx} ${cy})`}
                    />
                    {/* Selected outer ring */}
                    {day.isSelected && (
                      <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke="currentColor" strokeWidth="1.5"
                        className="text-primary/30" />
                    )}
                    {/* Day number inside circle */}
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                      className={`fill-current ${isLarge ? "text-[10px]" : "text-[9px]"} font-semibold ${
                        day.isToday ? "text-primary" : "text-foreground/70"
                      }`}
                    >
                      {day.dayNum}
                    </text>
                    {/* Red notification dot for incomplete days */}
                    {day.hasIncomplete && (
                      <circle cx={cx + r - 2} cy={cy - r + 2} r="3.5" fill="#ef4444" />
                    )}
                  </svg>
                  <span className={`text-[9px] font-medium ${
                    day.isToday ? "text-primary" : day.isFuture ? "text-muted-foreground/40" : "text-muted-foreground"
                  }`}>
                    {day.label}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => { setWeekOffset(o => Math.min(o + 1, 0)); }}
            disabled={weekOffset === 0}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0 disabled:opacity-20"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {weekOffset !== 0 && (
          <button
            type="button"
            onClick={() => { setWeekOffset(0); setSelectedDate(todayStr); }}
            className="text-[10px] text-primary hover:underline w-full text-center -mt-1 mb-1"
          >
            Back to this week
          </button>
        )}

        {/* ─── 2. Anchor Card ──────────────────────────────────── */}
        {showAnchor && (
          <div className="relative rounded-lg p-3 bg-gradient-to-br from-emerald-50/60 via-card to-card dark:from-emerald-950/20 overflow-hidden">
            {/* Decorative circle */}
            <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-emerald-100/30 dark:bg-emerald-900/10" />
            <div className="relative space-y-1">
              {anchorIdentity && (
                <p className="text-xs italic text-foreground/80 line-clamp-2">
                  &ldquo;{anchorIdentity}&rdquo;
                </p>
              )}
              {anchorValues && (
                <p className="text-[10px] text-muted-foreground">
                  <span className="font-medium">Values:</span> {anchorValues}
                </p>
              )}
              {anchorGoal && (
                <p className="text-[10px] text-muted-foreground">
                  <span className="font-medium">Goal:</span> {anchorGoal}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ─── 3. Daily Contract ───────────────────────────────── */}
        <div
          className={`rounded-lg p-3 transition-colors ${isToday && allDone ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-bark/5"}`}
          data-testid="daily-contract"
        >
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium" data-testid="contract-counts">
            {format(new Date(selectedDate + "T12:00:00"), "EEEE, MMM d")}
          </p>
        </div>

        {/* ─── 4. Morning Journal ──────────────────────────────── */}
        <div className={sectionClass(hasMorning, morningCelebrating)}>
          <button
            className="flex items-center gap-3 w-full text-left"
            onClick={() => { setLocation(`/journal/${selectedDate}/morning`); window.scrollTo(0, 0); }}
            data-testid="journal-row-morning"
          >
            <CompletionCircle
              done={hasMorning}
              onToggle={() => {/* handled by parent button */}}
            />
            <span className={`text-sm flex-1 ${hasMorning ? "line-through text-muted-foreground" : ""}`}>
              Check in with yourself
            </span>
            {hasMorning && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Done</span>
            )}
          </button>
        </div>

        {/* ─── 5. Focus Section ────────────────────────────────── */}
        {focusItems.length > 0 && (
          <div className={sectionClass(allFocusDone, focusCelebrating)} data-testid="card-focus">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wide text-bark">Focus</span>
              <span className="text-[11px] text-muted-foreground">
                {completedFocusCount}/{focusItems.length}
              </span>
            </div>
            <AnimatePresence mode="popLayout">
              {sortedFocusItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={item.status === "completed" ? "opacity-50" : ""}
                >
                  <FocusItem
                    item={item}
                    weekStartDate={weekStartDate}
                    onToggleDone={(id, currentlyDone) =>
                      setEisenhowerLevelMutation.mutate({ id, done: currentlyDone })
                    }
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* ─── 6. Habits Section ───────────────────────────────── */}
        {selectedHabits.length > 0 && (
          <div className={sectionClass(allHabitsDone, habitsCelebrating)} data-testid="card-daily-habits">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium uppercase tracking-wide text-bark">Habits</span>
              <span className="text-[11px] text-muted-foreground">
                {completedHabits}/{selectedHabits.length}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden mb-2">
              <motion.div
                className="h-full bg-emerald-500 rounded-full"
                initial={false}
                animate={{ width: `${selectedHabits.length > 0 ? (completedHabits / selectedHabits.length) * 100 : 0}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
            </div>
            <AnimatePresence mode="popLayout">
              {sortedHabits.map((habit) => {
                const isDone = habitStatusMap.get(habit.id) === "completed";
                const timingLabel = TIMING_LABELS[habit.timing || "afternoon"] || "PM";

                return (
                  <motion.div
                    key={habit.id}
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`py-1.5 ${isDone ? "opacity-50" : ""}`}
                    data-testid={`habit-item-${habit.id}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CompletionCircle
                        done={isDone}
                        onToggle={() => {
                          if (readOnly) return;
                          setHabitLevelMutation.mutate({
                            habitId: habit.id,
                            level: isDone ? null : 2,
                          });
                        }}
                        disabled={readOnly}
                        testId={`habit-level-${habit.id}`}
                      />
                      <span className={`h-2 w-2 rounded-full shrink-0 ${CATEGORY_COLORS[habit.category || "health"] || "bg-emerald-500"}`} />
                      {habit.category && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${CATEGORY_BADGE[habit.category] || "bg-muted text-muted-foreground"}`}>
                          {habit.category.charAt(0).toUpperCase() + habit.category.slice(1)}
                        </span>
                      )}
                      <span className={`text-xs flex-1 ${isDone ? "line-through text-muted-foreground" : ""}`}>
                        {habit.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timingLabel}</span>
                    </div>
                    {/* 7-dot streak row */}
                    <div className="flex gap-0.5 ml-[2.75rem] mt-0.5">
                      {weekDays.map(dayStr => {
                        const lvl = streakMap.get(habit.id)?.get(dayStr) ?? null;
                        const isDayToday = dayStr === todayStr;
                        return (
                          <span
                            key={dayStr}
                            className={`h-1.5 w-1.5 rounded-full ${
                              lvl !== null && lvl >= 1 ? "bg-emerald-500"
                              : isDayToday ? "ring-1 ring-border bg-transparent"
                              : "bg-muted"
                            } ${isDayToday && lvl !== null && lvl >= 1 ? "animate-dot-spring" : ""}`}
                          />
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* ─── 7. Evening Journal ──────────────────────────────── */}
        <div
          className={`${sectionClass(hasEvening, false)} transition-transform duration-300 ${
            isCloseMoment ? "scale-[1.01]" : ""
          }`}
        >
          <button
            className="flex items-center gap-3 w-full text-left"
            onClick={() => { setLocation(`/journal/${selectedDate}/evening`); window.scrollTo(0, 0); }}
            data-testid="journal-row-evening"
          >
            <CompletionCircle
              done={hasEvening}
              onToggle={() => {/* handled by parent button */}}
            />
            <span className={`flex-1 ${
              isCloseMoment ? "text-sm font-bold" : "text-sm"
            } ${hasEvening ? "line-through text-muted-foreground" : ""}`}>
              {isCloseMoment ? "Close the day" : "Evening reflection"}
            </span>
            {hasEvening && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Done</span>
            )}
          </button>
        </div>

        {/* ─── 8. Containment ──────────────────────────────────── */}
        <button
          className="flex items-center gap-2 py-3 px-1 text-muted-foreground hover:text-foreground transition-colors w-full cursor-pointer"
          onClick={() => setContainmentOpen(true)}
        >
          <Heart className="h-4 w-4 text-rose-400" />
          <div className="text-left">
            <span className="text-xs font-medium block">Containment</span>
            <span className="text-[10px] text-muted-foreground">Slow down before reacting</span>
          </div>
        </button>
      </div>

      <ContainmentModal open={containmentOpen} onClose={() => setContainmentOpen(false)} />
    </AppLayout>
  );
}
