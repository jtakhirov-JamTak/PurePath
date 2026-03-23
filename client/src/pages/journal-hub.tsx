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
import { getTodaysHabits, getDateHabits } from "@/lib/habit-filters";
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

  const { data: habitCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions", todayStr],
    enabled: !!user,
  });

  // Q2 weekly calendar data
  const currentWeekStart = startOfWeek(todayDate, { weekStartsOn: 1 });
  const currentWeekStartStr = format(currentWeekStart, "yyyy-MM-dd");
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const { data: eisenhowerEntries = [] } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower/week", currentWeekStartStr],
    enabled: !!user,
  });

  const q2Items = useMemo(
    () => eisenhowerEntries.filter((e) => e.quadrant === "q2" && e.weekStart === currentWeekStartStr),
    [eisenhowerEntries, currentWeekStartStr],
  );

  // Today's journals
  const todayJournals = journals.filter((j) => j.date === todayStr);
  const hasMorning = todayJournals.some((j) => j.session === "morning");
  const hasEvening = todayJournals.some((j) => j.session === "evening");

  // Today's scheduled habits (active, matching cadence, within date range, deduped, max 3)
  const todaysHabits = useMemo(() => getTodaysHabits(habits, todayStr), [habits, todayStr]);

  // Habit completion maps
  const habitLevelMap = new Map<number, number>();
  const habitStatusMap = new Map<number, string>();
  habitCompletions.forEach((hc) => {
    habitStatusMap.set(hc.habitId, hc.status || "completed");
    if (hc.completionLevel != null) {
      habitLevelMap.set(hc.habitId, hc.completionLevel);
    } else {
      const fallback = hc.status === "completed" ? 2 : hc.status === "minimum" ? 1 : hc.status === "skipped" ? 0 : null;
      if (fallback != null) habitLevelMap.set(hc.habitId, fallback);
    }
  });

  // Habit level cycling mutation
  const setHabitLevelMutation = useToastMutation<{ habitId: number; level: number | null; skipReason?: string; isBinary?: boolean }>({
    mutationFn: async ({ habitId, level, skipReason, isBinary }) => {
      let res;
      if (level === null) {
        res = await apiRequest("DELETE", `/api/habit-completions/${habitId}/${todayStr}`);
      } else {
        const status = (isBinary && level === 1) ? "completed" : level === 2 ? "completed" : level === 1 ? "minimum" : "skipped";
        const existing = habitCompletions.some((hc) => hc.habitId === habitId);
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

  const cycleHabit = (habit: Habit) => {
    const level = habitLevelMap.get(habit.id) ?? null;
    if (level === null || level === undefined) {
      setHabitLevelMutation.mutate({ habitId: habit.id, level: 2, isBinary: false });
    } else if (level === 2) {
      setHabitLevelMutation.mutate({ habitId: habit.id, level: 1, isBinary: false });
    } else if (level === 1) {
      setHabitLevelMutation.mutate({ habitId: habit.id, level: 0 });
    } else {
      setHabitLevelMutation.mutate({ habitId: habit.id, level: null });
    }
  };

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

        {/* TODAY section */}
        <section data-testid="journal-today-section">
          <p className="text-[11px] uppercase text-bark font-medium mb-1">Today</p>
          <p className="text-xs text-muted-foreground mb-3">{format(todayDate, "EEEE, MMM d")}</p>

          <div className="rounded-lg bg-bark/5 p-3 space-y-1" data-testid="journal-today-card">
            {/* Morning row */}
            <button
              className="flex items-center gap-2 w-full py-1 text-left hover:bg-bark/5 rounded px-1 -mx-1"
              onClick={() => setLocation(`/journal/${todayStr}/morning`)}
              data-testid="journal-morning-row"
            >
              <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="text-[11px] flex-1">Morning</span>
              <Badge
                variant="secondary"
                className={`text-[10px] px-1.5 py-0 ${hasMorning ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}
              >
                {hasMorning ? "Completed" : "Not started"}
              </Badge>
            </button>

            {/* Evening row */}
            <button
              className="flex items-center gap-2 w-full py-1 text-left hover:bg-bark/5 rounded px-1 -mx-1"
              onClick={() => setLocation(`/journal/${todayStr}/evening`)}
              data-testid="journal-evening-row"
            >
              <Moon className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span className="text-[11px] flex-1">Evening</span>
              <Badge
                variant="secondary"
                className={`text-[10px] px-1.5 py-0 ${hasEvening ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}
              >
                {hasEvening ? "Completed" : "Not started"}
              </Badge>
            </button>

            {/* Today's habits */}
            {todaysHabits.length > 0 && (
              <div className="pt-2 mt-1 border-t border-border/50" data-testid="journal-today-habits">
                {todaysHabits.map((habit) => {
                  const level = habitLevelMap.get(habit.id) ?? null;
                  const status = habitStatusMap.get(habit.id) || null;
                  const boxLabel = level === 2 ? "Done" : level === 1 ? "Min" : level === 0 ? "Skip" : "\u2014";
                  const boxClass =
                    status === "completed" ? "bg-emerald-500 border-emerald-600 text-white"
                    : status === "minimum" ? "bg-yellow-300 border-yellow-400 text-yellow-800 dark:bg-yellow-400/40 dark:border-yellow-400/60 dark:text-yellow-200"
                    : status === "skipped" ? "bg-red-400 border-red-500 text-white dark:bg-red-500/40 dark:border-red-500/60"
                    : "border-border text-muted-foreground";

                  return (
                    <div key={habit.id} className="flex items-center gap-2.5 py-1.5" data-testid={`habit-item-${habit.id}`}>
                      <button
                        onClick={() => cycleHabit(habit)}
                        className={`h-5 w-12 text-[10px] rounded-md border-2 shrink-0 font-medium cursor-pointer ${boxClass}`}
                        data-testid={`habit-level-${habit.id}`}
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
        </section>

        {/* THIS WEEK — Q2 calendar strip */}
        <section data-testid="q2-week-strip">
          <p className="text-[11px] uppercase text-bark font-medium mb-2">This Week</p>

          <div className="rounded-lg bg-bark/5 p-3">
            {/* Day abbreviations */}
            <div className="grid grid-cols-7 gap-0">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="text-[10px] text-muted-foreground text-center">{d}</div>
              ))}
            </div>

            {/* Date numbers */}
            <div className="grid grid-cols-7 gap-0 mt-0.5">
              {weekDays.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const isToday = dateStr === todayStr;
                return (
                  <div
                    key={dateStr}
                    className={`text-[10px] text-center leading-5 mx-auto w-5 h-5 flex items-center justify-center rounded-full ${isToday ? "ring-1 ring-primary" : ""}`}
                  >
                    {format(day, "d")}
                  </div>
                );
              })}
            </div>

            {/* Q2 items */}
            {q2Items.length > 0 ? (
              <div className="mt-2 space-y-1">
                {q2Items.map((item) => {
                  const barColor = item.status === "completed" || item.completed
                    ? "bg-emerald-500"
                    : "bg-muted";
                  return (
                    <button
                      key={item.id}
                      onClick={() => setLocation("/eisenhower")}
                      className="flex items-center gap-2 w-full group cursor-pointer"
                      data-testid={`q2-item-${item.id}`}
                    >
                      <span className="text-[11px] truncate w-20 text-left shrink-0">
                        {item.blocksGoal && <span className="text-amber-500 mr-0.5">★</span>}
                        {item.task}
                      </span>
                      <div className="flex-1 flex items-center">
                        <div className={`h-[2px] w-full rounded-full ${barColor}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2 text-center">
                <p className="text-[11px] text-muted-foreground">No Q2 items this week</p>
                <button
                  onClick={() => setLocation("/eisenhower")}
                  className="text-[11px] text-primary hover:underline mt-0.5 cursor-pointer"
                >
                  Plan your week →
                </button>
              </div>
            )}
          </div>
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
