import { useState, useMemo } from "react";
import { AppLayout } from "@/components/app-layout";
import { Badge } from "@/components/ui/badge";
import { Sun, Moon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, getDaysInMonth, getDay, isSameMonth, addDays, startOfWeek } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { getDateHabits } from "@/lib/habit-filters";
import type { Journal, Habit, HabitCompletion, EisenhowerEntry } from "@shared/schema";
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

  const progressMetrics: ProgressMetrics = useMemo(() => {
    const lineageMap = new Map<string, number[]>();
    habits.forEach(h => {
      if (h.lineageId) {
        if (!lineageMap.has(h.lineageId)) lineageMap.set(h.lineageId, []);
        lineageMap.get(h.lineageId)!.push(h.id);
      }
    });

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

    const weekQ2 = eisenhowerEntries.filter(e => e.quadrant === "q2" && e.weekStart === weekStartStr);
    const monthQ2 = eisenhowerEntries.filter(e => e.quadrant === "q2" && e.weekStart! >= monthStartStr && e.weekStart! <= monthEndStr);

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
  }, [habits, weekHabitCompletions, monthHabitCompletions, eisenhowerEntries, weekStartDate, weekStartStr, todayStr, monthStartStr, monthEndStr, monthStart, monthEnd]);

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
      </div>
    </AppLayout>
  );
}
