import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { buildProcessUrl } from "@/hooks/use-return-to";
import { format, addDays } from "date-fns";
import { getWeekBounds } from "@/lib/week-utils";
import type { Habit, HabitCompletion, Journal, EisenhowerEntry, MonthlyGoal, IdentityDocument } from "@shared/schema";
import { buildHabitStatusMap } from "@/lib/completion";
import { getTodaysFocusItems } from "@/lib/eisenhower-filters";
import { getTodaysHabits, getDateHabits } from "@/lib/habit-filters";
import { TIMING_LABELS, TIMING_ORDER } from "@/lib/constants";
import { ContainmentModal } from "@/components/tools/containment-modal";
import { FaceTheFear } from "@/components/tools/face-the-fear";
import { CompletionCircle } from "@/components/dashboard/completion-circle";
import { FocusItem } from "@/components/dashboard/focus-item";


// ─── Week strip constants ───────────────────────────────────────────
const RING_R = 14;
const RING_R_TODAY = 18;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getHeatmapClass = (progress: number, isFuture: boolean, isToday: boolean) => {
  if (isFuture) return "fill-transparent";
  if (isToday) {
    if (progress === 0) return "fill-muted";
    if (progress < 1) return "fill-primary/20";
    return "fill-emerald-400/70";
  }
  if (progress === 0) return "fill-muted";
  if (progress < 1) return "fill-lime-400/50";
  return "fill-primary/55";
};

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
  // ─── Unified daily items (sorted by time, incomplete on top) ──────
  type DailyItem =
    | { kind: "journal"; session: "morning" | "evening"; done: boolean; sortKey: number }
    | { kind: "habit"; habit: Habit; done: boolean; sortKey: number }
    | { kind: "focus"; item: EisenhowerEntry; done: boolean; sortKey: number };

  const HABIT_SORT: Record<string, number> = { morning: 1, afternoon: 3, evening: 4 };

  const sortedDailyItems = useMemo((): DailyItem[] => {
    const items: DailyItem[] = [];

    // Journals
    items.push({ kind: "journal", session: "morning", done: hasMorning, sortKey: 0 });
    items.push({ kind: "journal", session: "evening", done: hasEvening, sortKey: 5 });

    // Habits — morning=1, afternoon=3, evening=4
    selectedHabits.forEach(h => {
      items.push({
        kind: "habit", habit: h,
        done: habitStatusMap.get(h.id) === "completed",
        sortKey: HABIT_SORT[h.timing || "afternoon"] ?? 3,
      });
    });

    // Focus items — slotted at 2.xx by scheduled time, unscheduled at 2.99
    focusItems.forEach(item => {
      const t = item.scheduledStartTime;
      const timeSortKey = t ? 2 + parseInt(t.slice(0, 2)) / 100 + parseInt(t.slice(3, 5)) / 10000 : 2.99;
      items.push({
        kind: "focus", item,
        done: item.status === "completed",
        sortKey: timeSortKey,
      });
    });

    // Partition incomplete/complete, sort each by sortKey
    const incomplete = items.filter(i => !i.done);
    const complete = items.filter(i => i.done);
    incomplete.sort((a, b) => a.sortKey - b.sortKey);
    complete.sort((a, b) => a.sortKey - b.sortKey);
    return [...incomplete, ...complete];
  }, [selectedHabits, habitStatusMap, focusItems, hasMorning, hasEvening]);

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

  // (celebration beats removed — no per-section visual consumer)

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
      return {
        dateStr: dayStr,
        label: DAY_LABELS[i],
        dayNum: format(new Date(dayStr + "T12:00:00"), "d"),
        isToday: dayStr === todayStr,
        isSelected: dayStr === selectedDate,
        isFuture,
        progress,
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
      setLocation(buildProcessUrl("/sprint", "/today"));
    }
  }, [monthlyGoalLoaded, monthlyGoal, onboarding, setLocation]);

  const [containmentOpen, setContainmentOpen] = useState(false);
  const [fearOpen, setFearOpen] = useState(false);

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
  const anchorValues = (() => {
    try {
      const parsed = JSON.parse(identityDoc?.values || "");
      if (Array.isArray(parsed)) return parsed.map((v: { value: string }) => v.value).filter(Boolean).join(", ");
    } catch { /* legacy plain text */ }
    return identityDoc?.values?.trim() || "";
  })();
  const anchorGoal = monthlyGoal?.goalWhat?.trim() || monthlyGoal?.goalStatement?.trim() || "";
  const showAnchor = anchorIdentity || anchorValues || anchorGoal;

  const readOnly = selectedDate > todayStr;
  const isPastDate = selectedDate < todayStr;
  const yesterday = format(addDays(today, -1), "yyyy-MM-dd");
  const canEditJournal = selectedDate >= yesterday;

  return (
    <AppLayout>
      <div className={`container mx-auto px-5 py-6 max-w-2xl space-y-6 transition-colors duration-700 ${
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

              return (
                <button
                  key={day.dateStr}
                  onClick={() => setSelectedDate(day.dateStr)}
                  className={`flex flex-col items-center gap-0.5 ${day.isFuture ? "opacity-40" : ""} cursor-pointer`}
                >
                  <svg width={svgSize} height={svgSize} viewBox={vb}>
                    {/* Heatmap fill */}
                    <circle cx={cx} cy={cy} r={r}
                      className={getHeatmapClass(day.progress, day.isFuture, day.isToday)}
                      stroke={day.isToday ? "hsl(var(--primary))" : "none"}
                      strokeWidth={day.isToday ? "1.5" : "0"}
                    />
                    {/* Selected outer ring */}
                    {day.isSelected && (
                      <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"
                        opacity="0.4" />
                    )}
                    {/* Red dot on today until all done */}
                    {day.isToday && day.progress < 1 && (
                      <circle cx={cx + r - 2} cy={cy - r + 2} r="3" fill="#ef4444" />
                    )}
                    {/* Day number */}
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                      className={`fill-current ${isLarge ? "text-[11px]" : "text-[10px]"} font-semibold ${
                        day.isToday ? "text-primary" : "text-foreground/70"
                      }`}
                    >
                      {day.dayNum}
                    </text>
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
          <div className="rounded-[10px] p-5 bg-gradient-to-br from-card via-card to-secondary/20 dark:to-secondary/10 shadow-sm border border-border/40 overflow-hidden">
            <div className="space-y-2">
              {anchorIdentity && (
                <p className="font-serif text-base italic text-foreground/90 leading-relaxed line-clamp-2">
                  &ldquo;{anchorIdentity}&rdquo;
                </p>
              )}
              {anchorValues && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground/70">Values:</span> {anchorValues}
                </p>
              )}
              {anchorGoal && (
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground/70">Goal:</span> {anchorGoal}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ─── 3. Daily Contract ───────────────────────────────── */}
        <div
          className={`py-4 transition-colors ${isToday && allDone ? "bg-primary/5 rounded-[10px] px-4" : ""}`}
          data-testid="daily-contract"
        >
          <p className="font-serif text-[22px] font-normal tracking-tight leading-tight" data-testid="contract-counts">
            {format(new Date(selectedDate + "T12:00:00"), "EEEE, MMM d")}
          </p>
          <p className={`text-[13px] mt-1.5 ${allDone ? "text-primary font-medium" : "text-muted-foreground"}`} data-testid="text-habits-progress">
            {allDone ? "Proved." : `${completedItems} of ${totalItems} proved`}
          </p>
        </div>

        {/* ─── Daily Actions Card ──────────────────────────────── */}
        <div className="rounded-[10px] shadow-sm border border-border/40 bg-card overflow-hidden" data-testid="card-daily-habits">
          <AnimatePresence mode="popLayout">
            {sortedDailyItems.map((dailyItem, idx) => {
              const itemKey = dailyItem.kind === "journal" ? `journal-${dailyItem.session}`
                : dailyItem.kind === "habit" ? `habit-${dailyItem.habit.id}`
                : `focus-${dailyItem.item.id}`;
              const pastIncomplete = isPastDate && !dailyItem.done;

              return (
                <motion.div
                  key={itemKey}
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={dailyItem.done ? "opacity-40" : pastIncomplete ? "opacity-50" : ""}
                >
                  {idx > 0 && <div className="h-px bg-border/40 mx-5" />}

                  {/* ── Journal row ── */}
                  {dailyItem.kind === "journal" && (() => {
                    const isEvening = dailyItem.session === "evening";
                    const label = isEvening
                      ? (isCloseMoment ? "Close the day" : "Evening reflection")
                      : "Check in";
                    const isCloseCTA = isEvening && isCloseMoment;
                    const locked = !canEditJournal;

                    return locked ? (
                      <div
                        className="flex items-center gap-3.5 w-full text-left px-5 py-[18px]"
                        data-testid={`journal-row-${dailyItem.session}`}
                      >
                        <CompletionCircle done={dailyItem.done} onToggle={() => {}} disabled />
                        <span className={`text-sm flex-1 ${dailyItem.done ? "line-through text-muted-foreground" : "text-muted-foreground"}`}>
                          {dailyItem.done ? label : "Not logged"}
                        </span>
                        {dailyItem.done && <span className="text-[11px] text-primary font-medium">Done</span>}
                      </div>
                    ) : (
                      <button
                        className={`flex items-center gap-3.5 w-full text-left px-5 py-[18px] transition-transform duration-300 ${isCloseCTA ? "scale-[1.01]" : ""}`}
                        onClick={() => { setLocation(`/today/journal/${selectedDate}/${dailyItem.session}?returnTo=/today`); window.scrollTo(0, 0); }}
                        data-testid={`journal-row-${dailyItem.session}`}
                      >
                        <CompletionCircle done={dailyItem.done} onToggle={() => {}} />
                        <span className={`text-sm flex-1 ${isCloseCTA ? "font-semibold" : ""} ${dailyItem.done ? "line-through text-muted-foreground" : ""}`}>
                          {label}
                        </span>
                        {dailyItem.done && <span className="text-[11px] text-primary font-medium">Done</span>}
                      </button>
                    );
                  })()}

                  {/* ── Habit row ── */}
                  {dailyItem.kind === "habit" && (() => {
                    const habit = dailyItem.habit;
                    const timingLabel = TIMING_LABELS[habit.timing || "afternoon"] || "PM";
                    return (
                      <div className="flex items-center gap-3 px-5 py-[14px]" data-testid={`habit-item-${habit.id}`}>
                        <CompletionCircle
                          done={dailyItem.done}
                          onToggle={() => {
                            if (readOnly) return;
                            setHabitLevelMutation.mutate({ habitId: habit.id, level: dailyItem.done ? null : 2 });
                          }}
                          disabled={readOnly}
                          testId={`habit-level-${habit.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm ${dailyItem.done ? "line-through text-muted-foreground" : pastIncomplete ? "line-through decoration-muted-foreground/30 text-muted-foreground" : ""}`}>
                            {habit.name}
                          </span>
                          <div className="flex gap-[3px] mt-1.5">
                            {weekDays.map(dayStr => {
                              const lvl = streakMap.get(habit.id)?.get(dayStr) ?? null;
                              const isDayToday = dayStr === todayStr;
                              return (
                                <span
                                  key={dayStr}
                                  className={`h-[5px] w-[5px] rounded-full ${
                                    lvl !== null && lvl >= 1 ? "bg-primary"
                                    : isDayToday ? "ring-1 ring-border bg-transparent"
                                    : "bg-muted"
                                  } ${isDayToday && lvl !== null && lvl >= 1 ? "animate-dot-spring" : ""}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0">{timingLabel}</span>
                      </div>
                    );
                  })()}

                  {/* ── Focus item row ── */}
                  {dailyItem.kind === "focus" && (
                    <FocusItem
                      item={dailyItem.item}
                      weekStartDate={weekStartDate}
                      isToday={isToday}
                      onToggleDone={(id, currentlyDone) =>
                        setEisenhowerLevelMutation.mutate({ id, done: currentlyDone })
                      }
                    />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* ─── Quick tools ─────────────────────────────────────── */}
        <div className="flex gap-2">
          <button
            className="flex items-center justify-center gap-2 py-3 rounded-[10px] border border-border/40 bg-card hover:bg-muted/30 transition-colors flex-1 cursor-pointer"
            onClick={() => setContainmentOpen(true)}
          >
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Stuck?</span>
          </button>
          <button
            className="flex items-center justify-center gap-2 py-3 rounded-[10px] border border-border/40 bg-card hover:bg-muted/30 transition-colors flex-1 cursor-pointer"
            onClick={() => setFearOpen(true)}
          >
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Face a fear</span>
          </button>
        </div>
      </div>

      <ContainmentModal open={containmentOpen} onClose={() => setContainmentOpen(false)} />
      <FaceTheFear open={fearOpen} onClose={() => setFearOpen(false)} />
    </AppLayout>
  );
}
