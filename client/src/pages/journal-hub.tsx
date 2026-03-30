import { useState, useMemo } from "react";
import { AppLayout } from "@/components/app-layout";
import { Badge } from "@/components/ui/badge";
import { Sun, Moon, ChevronLeft, ChevronRight, X, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, getDaysInMonth, getDay, isSameMonth, addDays, startOfWeek } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { getDateHabits } from "@/lib/habit-filters";
import type { Journal, Habit, HabitCompletion, EisenhowerEntry, TriggerLog, AvoidanceLog, Decision, ContainmentLog } from "@shared/schema";
import { buildHabitLevelMap, buildHabitStatusMap, getHabitLabel, getCompletionBoxClass, getNextHabitLevel } from "@/lib/completion";
import { WeeklyProgress } from "@/components/dashboard/weekly-progress";
import type { ProgressMetrics } from "@/components/dashboard/weekly-progress";

export default function JournalHubPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const todayDate = new Date();
  const todayStr = format(todayDate, "yyyy-MM-dd");

  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(todayDate));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: journals = [] } = useQuery<Journal[]>({
    queryKey: ["/api/journals"],
    enabled: !!user,
  });

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: !!user,
  });

  // Progress bar data
  const weekStartDate = startOfWeek(todayDate, { weekStartsOn: 1 });
  const weekStartStr = format(weekStartDate, "yyyy-MM-dd");
  const weekEndStr = format(addDays(weekStartDate, 6), "yyyy-MM-dd");
  const monthStart = startOfMonth(todayDate);
  const monthEnd = endOfMonth(todayDate);
  const monthStartStr = format(monthStart, "yyyy-MM-dd");
  const monthEndStr = format(monthEnd, "yyyy-MM-dd");

  const { data: weekHabitCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions/range/" + weekStartStr + "/" + weekEndStr],
    enabled: !!user,
  });

  const { data: monthHabitCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions/range/" + monthStartStr + "/" + monthEndStr],
    enabled: !!user,
  });

  const { data: eisenhowerEntries = [] } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower"],
    enabled: !!user,
  });

  // Tool history data
  const { data: triggerLogs = [] } = useQuery<TriggerLog[]>({
    queryKey: ["/api/trigger-logs"],
    enabled: !!user,
  });
  const { data: avoidanceLogs = [] } = useQuery<AvoidanceLog[]>({
    queryKey: ["/api/avoidance-logs"],
    enabled: !!user,
  });
  const { data: decisionsList = [] } = useQuery<Decision[]>({
    queryKey: ["/api/decisions"],
    enabled: !!user,
  });
  const { data: containmentLogs = [] } = useQuery<ContainmentLog[]>({
    queryKey: ["/api/containment-logs"],
    enabled: !!user,
  });

  const [toolFilter, setToolFilter] = useState<"all" | "triggers" | "avoidance" | "decisions" | "containment">("all");
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [showAllTools, setShowAllTools] = useState(false);

  type ToolHistoryEntry = {
    id: string;
    type: "trigger" | "avoidance" | "decision" | "containment";
    date: string;
    createdAt: string;
    summary: string;
    details: { label: string; value: string }[];
  };

  const TOOL_COLORS: Record<string, string> = {
    trigger: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    avoidance: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    decision: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    containment: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  };

  const toolHistoryEntries = useMemo((): ToolHistoryEntry[] => {
    const entries: ToolHistoryEntry[] = [];

    triggerLogs.forEach(t => entries.push({
      id: `trigger-${t.id}`,
      type: "trigger",
      date: t.date,
      createdAt: t.createdAt?.toString() || t.date,
      summary: `${t.emotion || "Unknown"}${t.emotionIntensity ? ` (${t.emotionIntensity}/10)` : ""} — ${(t.triggerText || "").slice(0, 60)}`,
      details: [
        ...(t.triggerText ? [{ label: "Trigger", value: t.triggerText }] : []),
        ...(t.emotion ? [{ label: "Emotion", value: `${t.emotion}${t.emotionIntensity ? ` (${t.emotionIntensity}/10)` : ""}` }] : []),
        ...(t.urge ? [{ label: "Urge", value: `${t.urge}${t.urgeIntensity ? ` (${t.urgeIntensity}/10)` : ""}` }] : []),
        ...(t.actionTaken ? [{ label: "Action", value: t.actionTaken }] : []),
        ...(t.outcome ? [{ label: "Outcome", value: t.outcome }] : []),
        ...(t.recoveryTime ? [{ label: "Recovery", value: t.recoveryTime }] : []),
        ...(t.reflection ? [{ label: "Reflection", value: t.reflection }] : []),
      ],
    }));

    avoidanceLogs.forEach(a => entries.push({
      id: `avoidance-${a.id}`,
      type: "avoidance",
      date: a.date,
      createdAt: a.createdAt?.toString() || a.date,
      summary: `Avoiding: ${(a.avoidingWhat || "").slice(0, 60)}`,
      details: [
        ...(a.avoidingWhat ? [{ label: "Avoiding", value: a.avoidingWhat }] : []),
        ...(a.discomfort ? [{ label: "Discomfort", value: `${a.discomfort}/5` }] : []),
        ...(a.selectedValue ? [{ label: "Value", value: a.selectedValue }] : []),
        ...(a.anticipatedOutcome ? [{ label: "Anticipated outcome", value: a.anticipatedOutcome }] : []),
        ...(a.smallestExposure ? [{ label: "Smallest step", value: a.smallestExposure }] : []),
        ...(a.scheduledTime ? [{ label: "Scheduled", value: a.scheduledTime }] : []),
      ],
    }));

    decisionsList.forEach(d => entries.push({
      id: `decision-${d.id}`,
      type: "decision",
      date: d.weekStart,
      createdAt: d.createdAt?.toString() || d.weekStart,
      summary: `${(d.fear || "").slice(0, 40)}${d.decisionStatement ? " → " + d.decisionStatement.slice(0, 30) : ""}`,
      details: [
        ...(d.fear ? [{ label: "Fear", value: d.fear }] : []),
        ...(d.problemStatement ? [{ label: "Problem", value: d.problemStatement }] : []),
        ...(d.decisionStatement ? [{ label: "Decision", value: d.decisionStatement }] : []),
        ...(d.doorType ? [{ label: "Door type", value: d.doorType }] : []),
        ...(d.firstPhysicalStep ? [{ label: "First step", value: d.firstPhysicalStep }] : []),
      ],
    }));

    containmentLogs.forEach(c => entries.push({
      id: `containment-${c.id}`,
      type: "containment",
      date: c.date,
      createdAt: c.createdAt?.toString() || c.date,
      summary: `${c.branch === "overwhelmed" ? "Overwhelmed" : "Avoiding"}${c.emotion ? `: ${c.emotion}` : ""}`,
      details: [
        { label: "Branch", value: c.branch === "overwhelmed" ? "Overwhelmed" : "Avoiding" },
        ...(c.emotion ? [{ label: "Emotion", value: c.emotion }] : []),
        ...(c.emotionReason ? [{ label: "Because", value: c.emotionReason }] : []),
        ...(c.moveAction ? [{ label: "Move action", value: c.moveAction }] : []),
      ],
    }));

    entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return entries;
  }, [triggerLogs, avoidanceLogs, decisionsList, containmentLogs]);

  const filteredToolEntries = useMemo(() => {
    if (toolFilter === "all") return toolHistoryEntries;
    const typeMap = { triggers: "trigger", avoidance: "avoidance", decisions: "decision", containment: "containment" } as const;
    return toolHistoryEntries.filter(e => e.type === typeMap[toolFilter]);
  }, [toolHistoryEntries, toolFilter]);

  const visibleToolEntries = showAllTools ? filteredToolEntries : filteredToolEntries.slice(0, 20);

  // Previous week data for week-over-week comparison
  const prevWeekStartDate = addDays(weekStartDate, -7);
  const prevWeekStartStr = format(prevWeekStartDate, "yyyy-MM-dd");
  const prevWeekEndStr = format(addDays(prevWeekStartDate, 6), "yyyy-MM-dd");

  const { data: prevWeekHabitCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions/range/" + prevWeekStartStr + "/" + prevWeekEndStr],
    enabled: !!user,
  });

  // Shared lineage map for habit versioning
  const lineageMap = useMemo(() => {
    const map = new Map<string, number[]>();
    habits.forEach(h => {
      if (h.lineageId) {
        if (!map.has(h.lineageId)) map.set(h.lineageId, []);
        map.get(h.lineageId)!.push(h.id);
      }
    });
    return map;
  }, [habits]);

  function countHabits(dayStrs: string[], completions: HabitCompletion[]) {
    let completed = 0, scheduled = 0;
    for (const dayStr of dayStrs) {
      if (dayStr > todayStr) continue;
      const dayHabits = getDateHabits(habits, dayStr);
      dayHabits.forEach(h => {
        scheduled++;
        const siblingIds = h.lineageId ? (lineageMap.get(h.lineageId) || [h.id]) : [h.id];
        const hc = completions.find(c => siblingIds.includes(c.habitId) && c.date === dayStr);
        if (hc && hc.completionLevel != null && hc.completionLevel >= 1) completed++;
      });
    }
    return { completed, scheduled };
  }

  const progressMetrics: ProgressMetrics = useMemo(() => {
    const weekDayStrs: string[] = [];
    for (let d = 0; d < 7; d++) weekDayStrs.push(format(addDays(weekStartDate, d), "yyyy-MM-dd"));

    const monthDayStrs: string[] = [];
    let cursor = monthStart;
    while (cursor <= monthEnd) {
      monthDayStrs.push(format(cursor, "yyyy-MM-dd"));
      cursor = addDays(cursor, 1);
    }

    const weekHabits = countHabits(weekDayStrs, weekHabitCompletions);
    const monthHabits = countHabits(monthDayStrs, monthHabitCompletions);

    const weekQ2 = eisenhowerEntries.filter(e => e.quadrant === "q2" && e.blocksGoal && e.weekStart === weekStartStr);
    const monthQ2 = eisenhowerEntries.filter(e => e.quadrant === "q2" && e.blocksGoal && e.weekStart! >= monthStartStr && e.weekStart! <= monthEndStr);

    return {
      habitsCompletedWeek: weekHabits.completed,
      habitsScheduledWeek: weekHabits.scheduled,
      habitsCompletedMonth: monthHabits.completed,
      habitsScheduledMonth: monthHabits.scheduled,
      q2CompletedWeek: weekQ2.filter(e => e.status === "completed").length,
      q2TotalWeek: weekQ2.length,
      q2CompletedMonth: monthQ2.filter(e => e.status === "completed").length,
      q2TotalMonth: monthQ2.length,
    };
  }, [habits, weekHabitCompletions, monthHabitCompletions, eisenhowerEntries, weekStartDate, weekStartStr, todayStr, monthStartStr, monthEndStr, monthStart, monthEnd, lineageMap]);

  // Week-over-week comparison (only after 14+ days of journal data)
  const uniqueJournalDays = new Set(journals.map(j => j.date)).size;
  const hasEnoughHistory = uniqueJournalDays >= 14;

  const weekOverWeek = useMemo(() => {
    if (!hasEnoughHistory) return null;

    const prevWeekDayStrs: string[] = [];
    for (let d = 0; d < 7; d++) prevWeekDayStrs.push(format(addDays(prevWeekStartDate, d), "yyyy-MM-dd"));

    const thisWeekDayStrs: string[] = [];
    for (let d = 0; d < 7; d++) thisWeekDayStrs.push(format(addDays(weekStartDate, d), "yyyy-MM-dd"));

    const prevWeek = countHabits(prevWeekDayStrs, prevWeekHabitCompletions);
    const thisWeek = countHabits(thisWeekDayStrs, weekHabitCompletions);

    const prevPct = prevWeek.scheduled > 0 ? Math.round((prevWeek.completed / prevWeek.scheduled) * 100) : 0;
    const thisPct = thisWeek.scheduled > 0 ? Math.round((thisWeek.completed / thisWeek.scheduled) * 100) : 0;
    const delta = thisPct - prevPct;

    // Q2 comparison
    const prevQ2 = eisenhowerEntries.filter(e => e.quadrant === "q2" && e.blocksGoal && e.weekStart === prevWeekStartStr);
    const thisQ2 = eisenhowerEntries.filter(e => e.quadrant === "q2" && e.blocksGoal && e.weekStart === weekStartStr);
    const prevQ2Pct = prevQ2.length > 0 ? Math.round((prevQ2.filter(e => e.status === "completed").length / prevQ2.length) * 100) : null;
    const thisQ2Pct = thisQ2.length > 0 ? Math.round((thisQ2.filter(e => e.status === "completed").length / thisQ2.length) * 100) : null;

    return { prevPct, thisPct, delta, prevQ2Pct, thisQ2Pct, prevWeek, thisWeek };
  }, [hasEnoughHistory, prevWeekHabitCompletions, weekHabitCompletions, eisenhowerEntries, prevWeekStartDate, prevWeekStartStr, weekStartDate, weekStartStr, habits, todayStr, lineageMap]);

  // Selected date data
  const { data: selectedDateCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions/" + selectedDate],
    enabled: !!user && !!selectedDate,
  });

  const selectedDateHabitLevelMap = useMemo(() => buildHabitLevelMap(selectedDateCompletions), [selectedDateCompletions]);
  const selectedDateHabitStatusMap = useMemo(() => buildHabitStatusMap(selectedDateCompletions), [selectedDateCompletions]);

  const selectedDateHabits = useMemo(() => {
    if (!selectedDate) return [];
    return getDateHabits(habits, selectedDate);
  }, [habits, selectedDate]);

  const selectedDateJournals = useMemo(() => {
    if (!selectedDate) return { morning: false, evening: false };
    const dayJournals = journals.filter((j) => j.date === selectedDate);
    return {
      morning: dayJournals.some((j) => j.session === "morning"),
      evening: dayJournals.some((j) => j.session === "evening"),
    };
  }, [journals, selectedDate]);

  const setSelectedDateHabitLevelMutation = useToastMutation<{ habitId: number; level: number | null; skipReason?: string; isBinary?: boolean; date: string }>({
    mutationFn: async ({ habitId, level, skipReason, isBinary, date }) => {
      let res;
      if (level === null) {
        res = await apiRequest("DELETE", `/api/habit-completions/${habitId}/${date}`);
      } else {
        const status = (isBinary && level === 1) ? "completed" : level === 2 ? "completed" : level === 1 ? "minimum" : "skipped";
        const existing = selectedDateCompletions.some((hc) => hc.habitId === habitId);
        const payload: Record<string, unknown> = { status, completionLevel: level };
        if (skipReason) payload.skipReason = skipReason;
        if (existing) {
          res = await apiRequest("PATCH", `/api/habit-completions/${habitId}/${date}`, payload);
        } else {
          res = await apiRequest("POST", "/api/habit-completions", { habitId, date, ...payload });
        }
      }
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update habit status");
      }
    },
    invalidatePredicates: [(q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("/api/habit-completions/range/")],
    errorToast: "Could not update habit",
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/habit-completions/" + variables.date] });
    },
  });

  const cycleSelectedDateHabit = (habit: Habit) => {
    if (!selectedDate) return;
    const level = selectedDateHabitLevelMap.get(habit.id) ?? null;
    const nextLevel = getNextHabitLevel(level);
    setSelectedDateHabitLevelMutation.mutate({ habitId: habit.id, level: nextLevel, isBinary: false, date: selectedDate });
  };

  // Calendar heatmap data
  const isCurrentMonth = isSameMonth(selectedMonth, todayDate);
  const canGoForward = !isCurrentMonth;

  const monthJournalMap = useMemo(() => {
    const map = new Map<string, { morning: boolean; evening: boolean }>();
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const startStr = format(monthStart, "yyyy-MM-dd");
    const endStr = format(monthEnd, "yyyy-MM-dd");

    journals.forEach((j) => {
      if (j.date < startStr || j.date > endStr) return;
      if (!map.has(j.date)) map.set(j.date, { morning: false, evening: false });
      const entry = map.get(j.date)!;
      if (j.session === "morning") entry.morning = true;
      if (j.session === "evening") entry.evening = true;
    });
    return map;
  }, [journals, selectedMonth]);

  const calendarCells = useMemo(() => {
    const daysInMonth = getDaysInMonth(selectedMonth);
    const firstDay = startOfMonth(selectedMonth);
    // getDay: 0=Sun. Convert to Mon=0: (getDay()+6)%7
    const offset = (getDay(firstDay) + 6) % 7;

    const cells: Array<{ day: number; dateStr: string } | null> = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = addDays(firstDay, d - 1);
      cells.push({ day: d, dateStr: format(date, "yyyy-MM-dd") });
    }
    return cells;
  }, [selectedMonth]);

  // Month summary
  const daysElapsed = useMemo(() => {
    if (isCurrentMonth) return todayDate.getDate();
    return getDaysInMonth(selectedMonth);
  }, [selectedMonth, isCurrentMonth]);

  const daysJournaled = useMemo(() => {
    let count = 0;
    monthJournalMap.forEach((entry, dateStr) => {
      if (dateStr <= todayStr && (entry.morning || entry.evening)) count++;
    });
    return count;
  }, [monthJournalMap, todayStr]);

  return (
    <AppLayout>
      <div className="max-w-md mx-auto px-4 py-6 space-y-6" data-testid="proof-hub">
        <h1 className="text-sm font-medium" data-testid="proof-hub-title">Proof</h1>

        <WeeklyProgress progressMetrics={progressMetrics} />

        {/* Week-over-week comparison */}
        {weekOverWeek && (
          <section data-testid="week-over-week">
            <p className="text-[11px] uppercase tracking-wide text-bark font-medium mb-2">Week over Week</p>
            <div className="rounded-lg border border-border/40 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">This week</span>
                <span className="text-xs font-medium">{weekOverWeek.thisWeek.completed}/{weekOverWeek.thisWeek.scheduled} habits &middot; {weekOverWeek.thisPct}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Last week</span>
                <span className="text-xs font-medium">{weekOverWeek.prevWeek.completed}/{weekOverWeek.prevWeek.scheduled} habits &middot; {weekOverWeek.prevPct}%</span>
              </div>
              {weekOverWeek.thisQ2Pct !== null && weekOverWeek.prevQ2Pct !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Q2 focus</span>
                  <span className="text-xs font-medium">{weekOverWeek.thisQ2Pct}% vs {weekOverWeek.prevQ2Pct}%</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1.5 border-t border-border/30">
                <span className="text-xs text-muted-foreground">Trend</span>
                <span className={`text-xs font-semibold ${
                  weekOverWeek.delta > 5 ? "text-emerald-600 dark:text-emerald-400"
                  : weekOverWeek.delta < -5 ? "text-rose-500 dark:text-rose-400"
                  : "text-muted-foreground"
                }`}>
                  {weekOverWeek.delta > 5 ? "\u2191 Improving"
                    : weekOverWeek.delta < -5 ? "\u2193 Declining"
                    : "\u2192 Steady"}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* HISTORY section — Calendar Heatmap */}
        <section data-testid="journal-history-section">
          <p className="text-[11px] uppercase text-bark font-medium mb-2">History</p>

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3" data-testid="month-navigation">
            <button
              onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
              className="p-1 rounded hover:bg-muted cursor-pointer"
              data-testid="button-prev-month"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <span className="text-[13px] font-medium" data-testid="text-current-month">
              {format(selectedMonth, "MMMM yyyy")}
            </span>
            <button
              onClick={() => canGoForward && setSelectedMonth(addMonths(selectedMonth, 1))}
              className={`p-1 rounded ${canGoForward ? "hover:bg-muted cursor-pointer" : "opacity-30 cursor-default"}`}
              disabled={!canGoForward}
              data-testid="button-next-month"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-[2px] mb-[2px]">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div key={i} className="h-7 flex items-center justify-center text-[10px] text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-[2px]" data-testid="calendar-grid">
            {calendarCells.map((cell, i) => {
              if (!cell) return <div key={`empty-${i}`} className="h-7 w-7" />;

              const { day, dateStr } = cell;
              const isFuture = dateStr > todayStr;
              const isToday = dateStr === todayStr;
              const entry = monthJournalMap.get(dateStr);
              const hasBoth = entry?.morning && entry?.evening;
              const hasOne = entry && (entry.morning || entry.evening) && !hasBoth;
              const clickable = !isFuture;

              let bgClass: string;
              let textClass: string;

              if (isFuture) {
                bgClass = "";
                textClass = "text-muted-foreground/30";
              } else if (hasBoth) {
                bgClass = "bg-emerald-500 rounded-sm";
                textClass = "text-white";
              } else if (hasOne) {
                bgClass = "bg-emerald-500/40 rounded-sm";
                textClass = "text-foreground";
              } else {
                bgClass = "border border-border/30 rounded-sm";
                textClass = "text-foreground";
              }

              return (
                <button
                  key={dateStr}
                  onClick={clickable ? () => setSelectedDate(dateStr === selectedDate ? null : dateStr) : undefined}
                  className={`h-7 w-7 flex items-center justify-center text-[10px] ${bgClass} ${textClass} ${isToday ? "ring-1 ring-primary" : ""} ${dateStr === selectedDate ? "ring-2 ring-primary" : ""} ${clickable ? "cursor-pointer" : "cursor-default"}`}
                  disabled={!clickable}
                  data-testid={`cal-day-${dateStr}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Month summary */}
          <p className="text-[11px] text-muted-foreground mt-3" data-testid="text-month-summary">
            {daysJournaled} of {daysElapsed} days journaled
          </p>

          {/* Day detail panel */}
          {selectedDate && (
            <div className="mt-4 rounded-lg bg-bark/5 p-3" data-testid="day-detail-panel">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium" data-testid="day-detail-header">
                  {format(new Date(selectedDate + "T12:00:00"), "EEEE, MMM d")}
                </p>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-0.5 rounded hover:bg-muted cursor-pointer"
                  data-testid="button-close-detail"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>

              {!selectedDateJournals.morning && !selectedDateJournals.evening && selectedDateHabits.length === 0 ? (
                <p className="text-[11px] text-muted-foreground" data-testid="day-detail-empty">No activity on this day</p>
              ) : (
                <div className="space-y-1">
                  {/* Journal rows */}
                  <button
                    className="flex items-center gap-2 w-full py-1 text-left hover:bg-bark/5 rounded px-1 -mx-1"
                    onClick={() => setLocation(`/journal/${selectedDate}/morning`)}
                    data-testid="detail-morning-row"
                  >
                    <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="text-[11px] flex-1">Morning</span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 ${selectedDateJournals.morning ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}
                    >
                      {selectedDateJournals.morning ? "Completed" : "Not started"}
                    </Badge>
                  </button>

                  <button
                    className="flex items-center gap-2 w-full py-1 text-left hover:bg-bark/5 rounded px-1 -mx-1"
                    onClick={() => setLocation(`/journal/${selectedDate}/evening`)}
                    data-testid="detail-evening-row"
                  >
                    <Moon className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span className="text-[11px] flex-1">Evening</span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 ${selectedDateJournals.evening ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}
                    >
                      {selectedDateJournals.evening ? "Completed" : "Not started"}
                    </Badge>
                  </button>

                  {/* Habits section */}
                  {selectedDateHabits.length > 0 && (
                    <div className="pt-2 mt-1 border-t border-border/30" data-testid="detail-habits-section">
                      {selectedDateHabits.map((habit) => {
                        const level = selectedDateHabitLevelMap.get(habit.id) ?? null;
                        const status = selectedDateHabitStatusMap.get(habit.id) || null;
                        const boxLabel = getHabitLabel(level);
                        const boxClass = getCompletionBoxClass(status);

                        return (
                          <div key={habit.id} className="flex items-center gap-2.5 py-1.5" data-testid={`detail-habit-item-${habit.id}`}>
                            <button
                              onClick={() => cycleSelectedDateHabit(habit)}
                              className={`h-5 w-12 text-[10px] rounded-md border-2 shrink-0 font-medium cursor-pointer ${boxClass}`}
                              data-testid={`detail-habit-level-${habit.id}`}
                            >
                              {boxLabel}
                            </button>
                            <span className={`text-xs flex-1 ${
                              status === "completed" ? "line-through text-muted-foreground" : status === "skipped" ? "text-muted-foreground italic" : ""
                            }`}>
                              {habit.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Tool History */}
        <section data-testid="tool-history-section">
          <p className="text-[11px] uppercase text-bark font-medium mb-2">Tool History</p>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {(["all", "triggers", "avoidance", "decisions", "containment"] as const).map(f => (
              <button
                key={f}
                onClick={() => { setToolFilter(f); setExpandedEntry(null); }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium min-h-[32px] cursor-pointer transition-colors ${
                  toolFilter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                data-testid={`filter-${f}`}
              >
                {f === "all" ? `All (${toolHistoryEntries.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${toolHistoryEntries.filter(e => e.type === (f === "triggers" ? "trigger" : f === "decisions" ? "decision" : f)).length})`}
              </button>
            ))}
          </div>

          {filteredToolEntries.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No tool entries yet.</p>
          ) : (
            <div className="space-y-1.5">
              {visibleToolEntries.map(entry => {
                const isExpanded = expandedEntry === entry.id;
                return (
                  <button
                    key={entry.id}
                    onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                    className="w-full text-left rounded-lg bg-bark/5 px-3 py-2.5 cursor-pointer hover:bg-bark/10 transition-colors min-h-[44px]"
                    data-testid={`tool-entry-${entry.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 mt-0.5 ${TOOL_COLORS[entry.type]}`}>
                        {entry.type === "trigger" ? "Trigger" : entry.type === "avoidance" ? "Avoidance" : entry.type === "decision" ? "Decision" : "Containment"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{entry.summary}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(entry.date + "T12:00:00"), "MMM d, yyyy")}</p>
                      </div>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                    </div>
                    {isExpanded && (
                      <div className="mt-2 pt-2 border-t border-border/50 space-y-1.5">
                        {entry.details.map((d, i) => (
                          <div key={i} className="text-xs">
                            <span className="font-medium text-muted-foreground">{d.label}: </span>
                            <span className="text-foreground">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
              {filteredToolEntries.length > 20 && !showAllTools && (
                <button
                  onClick={() => setShowAllTools(true)}
                  className="w-full text-center text-xs text-primary hover:underline cursor-pointer py-2 min-h-[44px]"
                  data-testid="button-show-more-tools"
                >
                  Show all {filteredToolEntries.length} entries
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
