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

  // Weekly calendar data
  const currentWeekStart = startOfWeek(todayDate, { weekStartsOn: 1 });
  const currentWeekStartStr = format(currentWeekStart, "yyyy-MM-dd");
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const { data: eisenhowerEntries = [] } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower/week", currentWeekStartStr],
    enabled: !!user,
  });

  const weekEndDate = addDays(currentWeekStart, 6);
  const weekLabel = format(currentWeekStart, "MMM d") + " – " + format(weekEndDate, "d");

  // Scheduled items grouped by day+block for the time-block grid
  const TIME_BLOCKS = ["morning", "midday", "afternoon", "evening"] as const;
  const BLOCK_LABELS: Record<string, string> = { morning: "8–11", midday: "11–2", afternoon: "2–5", evening: "5–8" };

  const scheduledItems = useMemo(() => {
    const items = eisenhowerEntries.filter(
      (e) => e.weekStart === currentWeekStartStr && (e.quadrant === "q1" || e.quadrant === "q2") && e.scheduledDate && e.scheduledStartTime
    );
    const grid: Record<string, EisenhowerEntry[]> = {};
    items.forEach((e) => {
      const key = `${e.scheduledDate}_${e.scheduledStartTime}`;
      if (!grid[key]) grid[key] = [];
      grid[key].push(e);
    });
    return { grid, hasAny: items.length > 0 };
  }, [eisenhowerEntries, currentWeekStartStr]);

  // Selected date data
  const { data: selectedDateCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions/" + selectedDate],
    enabled: !!user && !!selectedDate,
  });

  const selectedDateHabitLevelMap = useMemo(() => {
    const map = new Map<number, number>();
    selectedDateCompletions.forEach((hc) => {
      if (hc.completionLevel != null) {
        map.set(hc.habitId, hc.completionLevel);
      } else {
        const fallback = hc.status === "completed" ? 2 : hc.status === "minimum" ? 1 : hc.status === "skipped" ? 0 : null;
        if (fallback != null) map.set(hc.habitId, fallback);
      }
    });
    return map;
  }, [selectedDateCompletions]);

  const selectedDateHabitStatusMap = useMemo(() => {
    const map = new Map<number, string>();
    selectedDateCompletions.forEach((hc) => {
      map.set(hc.habitId, hc.status || "completed");
    });
    return map;
  }, [selectedDateCompletions]);

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
    if (level === null || level === undefined) {
      setSelectedDateHabitLevelMutation.mutate({ habitId: habit.id, level: 2, isBinary: false, date: selectedDate });
    } else if (level === 2) {
      setSelectedDateHabitLevelMutation.mutate({ habitId: habit.id, level: 1, isBinary: false, date: selectedDate });
    } else if (level === 1) {
      setSelectedDateHabitLevelMutation.mutate({ habitId: habit.id, level: 0, date: selectedDate });
    } else {
      setSelectedDateHabitLevelMutation.mutate({ habitId: habit.id, level: null, date: selectedDate });
    }
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

        {/* WEEKLY TIME-BLOCK CALENDAR */}
        <section data-testid="weekly-time-block">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] uppercase text-bark font-medium">This Week</p>
            <span className="text-[10px] text-muted-foreground">{weekLabel}</span>
          </div>

          {scheduledItems.hasAny ? (
            <div className="overflow-x-auto">
              <div className="min-w-[340px]">
                {/* Day headers */}
                <div className="grid grid-cols-[36px_repeat(7,1fr)] gap-px">
                  <div />
                  {weekDays.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const isToday = dateStr === todayStr;
                    return (
                      <div key={dateStr} className={`text-[10px] text-muted-foreground text-center py-0.5 ${isToday ? "bg-primary/5 rounded-t" : ""}`}>
                        {format(day, "EEE")}
                      </div>
                    );
                  })}
                </div>

                {/* Time block rows */}
                {TIME_BLOCKS.map((block) => (
                  <div key={block} className="grid grid-cols-[36px_repeat(7,1fr)] gap-px">
                    <div className="text-[10px] text-muted-foreground text-right pr-1.5 flex items-start pt-0.5">
                      {BLOCK_LABELS[block]}
                    </div>
                    {weekDays.map((day) => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const isToday = dateStr === todayStr;
                      const cellKey = `${dateStr}_${block}`;
                      const cellItems = scheduledItems.grid[cellKey] || [];
                      return (
                        <div
                          key={cellKey}
                          className={`min-h-[40px] border border-border/10 p-0.5 overflow-hidden flex flex-col gap-0.5 ${isToday ? "bg-primary/5" : ""}`}
                        >
                          {cellItems.map((item) => {
                            const dur = item.durationMinutes || 60;
                            const barH = dur <= 60 ? 18 : dur <= 120 ? 28 : 38;
                            const bgColor = item.status === "completed" ? "bg-emerald-500 text-white"
                              : item.status === "skipped" ? "bg-red-400 text-white"
                              : "bg-primary/20 text-foreground";
                            return (
                              <button
                                key={item.id}
                                onClick={() => setLocation("/eisenhower")}
                                className={`w-full rounded-sm text-[9px] overflow-hidden text-ellipsis whitespace-nowrap px-1 cursor-pointer flex items-center justify-between ${bgColor}`}
                                style={{ height: `${barH}px` }}
                                title={item.task}
                                data-testid={`block-item-${item.id}`}
                              >
                                <span className="truncate">{item.task}</span>
                                <span className="text-[8px] opacity-70 shrink-0 ml-0.5">{dur / 60}h</span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-3">
              <p className="text-[11px] text-muted-foreground">No blocks scheduled this week</p>
              <button
                onClick={() => setLocation("/eisenhower")}
                className="text-[11px] text-primary hover:underline mt-0.5 cursor-pointer"
              >
                Plan your week →
              </button>
            </div>
          )}
        </section>

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
                        const boxLabel = level === 2 ? "Done" : level === 1 ? "Min" : level === 0 ? "Skip" : "\u2014";
                        const boxClass =
                          status === "completed" ? "bg-emerald-500 border-emerald-600 text-white"
                          : status === "minimum" ? "bg-yellow-300 border-yellow-400 text-yellow-800 dark:bg-yellow-400/40 dark:border-yellow-400/60 dark:text-yellow-200"
                          : status === "skipped" ? "bg-red-400 border-red-500 text-white dark:bg-red-500/40 dark:border-red-500/60"
                          : "border-border text-muted-foreground";

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
