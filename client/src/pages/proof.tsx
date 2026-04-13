import { useState, useMemo } from "react";
import { AppLayout } from "@/components/app-layout";
import { Sun, Moon, ChevronLeft, ChevronRight, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, getDaysInMonth, getDay, isSameMonth, addDays, startOfWeek } from "date-fns";
import { getDateHabits } from "@/lib/habit-filters";
import { buildHabitStatusMap } from "@/lib/completion";
import { CATEGORY_COLORS, CATEGORY_BADGE } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import type { Journal, Habit, HabitCompletion, EisenhowerEntry } from "@shared/schema";

export default function ProofPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const todayDate = new Date();
  const todayStr = format(todayDate, "yyyy-MM-dd");

  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(todayDate));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ─── Queries ─────────────────────────────────────────────────────
  const { isLoading: onboardingLoading } = useQuery<{ onboardingStep: number; onboardingComplete: boolean }>({
    queryKey: ["/api/onboarding"],
    enabled: !!user,
  });
  const { data: journals = [] } = useQuery<Journal[]>({ queryKey: ["/api/journals"], enabled: !!user });
  const { data: habits = [] } = useQuery<Habit[]>({ queryKey: ["/api/habits"], enabled: !!user });
  const { data: eisenhowerEntries = [] } = useQuery<EisenhowerEntry[]>({ queryKey: ["/api/eisenhower"], enabled: !!user });

  const { data: selectedDateCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions/" + selectedDate],
    enabled: !!user && !!selectedDate,
  });

  // ─── Selected date computed data ─────────────────────────────────
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

  // Focus items for selected date
  const selectedDateFocusItems = useMemo(() => {
    if (!selectedDate) return [];
    const weekStart = format(startOfWeek(new Date(selectedDate + "T12:00:00"), { weekStartsOn: 1 }), "yyyy-MM-dd");
    return eisenhowerEntries.filter(e =>
      e.weekStart === weekStart && e.scheduledDate === selectedDate &&
      (e.quadrant === "q1" || (e.quadrant === "q2" && e.blocksGoal))
    );
  }, [eisenhowerEntries, selectedDate]);

  // Sort: incomplete first (sink logic)
  const sortedFocusItems = useMemo(() => {
    const incomplete = selectedDateFocusItems.filter(e => e.status !== "completed");
    const complete = selectedDateFocusItems.filter(e => e.status === "completed");
    return [...incomplete, ...complete];
  }, [selectedDateFocusItems]);

  const sortedHabits = useMemo(() => {
    const incomplete = selectedDateHabits.filter(h => selectedDateHabitStatusMap.get(h.id) !== "completed");
    const complete = selectedDateHabits.filter(h => selectedDateHabitStatusMap.get(h.id) === "completed");
    return [...incomplete, ...complete];
  }, [selectedDateHabits, selectedDateHabitStatusMap]);

  // ─── Calendar heatmap data ───────────────────────────────────────
  const isCurrentMonth = isSameMonth(selectedMonth, todayDate);
  const canGoForward = !isCurrentMonth;

  const calMonthStart = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
  const calMonthEnd = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

  const { data: monthHabitCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions/range/" + calMonthStart + "/" + calMonthEnd],
    enabled: !!user,
  });

  const monthJournalMap = useMemo(() => {
    const map = new Map<string, { morning: boolean; evening: boolean }>();
    const ms = startOfMonth(selectedMonth);
    const me = endOfMonth(selectedMonth);
    const startStr = format(ms, "yyyy-MM-dd");
    const endStr = format(me, "yyyy-MM-dd");
    journals.forEach((j) => {
      if (j.date < startStr || j.date > endStr) return;
      if (!map.has(j.date)) map.set(j.date, { morning: false, evening: false });
      const entry = map.get(j.date)!;
      if (j.session === "morning") entry.morning = true;
      if (j.session === "evening") entry.evening = true;
    });
    return map;
  }, [journals, selectedMonth]);

  // Pre-index eisenhower entries by scheduledDate for O(1) lookup
  const eisenhowerByDate = useMemo(() => {
    const map = new Map<string, EisenhowerEntry[]>();
    eisenhowerEntries.forEach(e => {
      if (!e.scheduledDate) return;
      const key = e.scheduledDate;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [eisenhowerEntries]);

  // Per-day progress: journals + habits + focus items
  const monthProgressMap = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>();
    const daysInMonth = getDaysInMonth(selectedMonth);
    const firstDay = startOfMonth(selectedMonth);

    for (let d = 0; d < daysInMonth; d++) {
      const dateStr = format(addDays(firstDay, d), "yyyy-MM-dd");
      if (dateStr > todayStr) continue;

      const jEntry = monthJournalMap.get(dateStr);
      const hasMorn = jEntry?.morning ? 1 : 0;
      const hasEve = jEntry?.evening ? 1 : 0;

      const dayHabits = getDateHabits(habits, dateStr);
      const completedHabitIds = new Set(
        monthHabitCompletions.filter(hc => hc.date === dateStr && hc.status === "completed").map(hc => hc.habitId)
      );
      const habitsCompleted = dayHabits.filter(h => completedHabitIds.has(h.id)).length;

      const weekStart = format(startOfWeek(new Date(dateStr + "T12:00:00"), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const dayEntries = eisenhowerByDate.get(dateStr) || [];
      const dayFocus = dayEntries.filter(e =>
        e.weekStart === weekStart &&
        (e.quadrant === "q1" || (e.quadrant === "q2" && e.blocksGoal))
      );
      const focusCompleted = dayFocus.filter(e => e.status === "completed").length;

      const total = dayHabits.length + dayFocus.length + 2;
      const done = habitsCompleted + focusCompleted + hasMorn + hasEve;
      map.set(dateStr, { done, total });
    }
    return map;
  }, [selectedMonth, todayStr, monthJournalMap, habits, monthHabitCompletions, eisenhowerByDate]);

  const calendarCells = useMemo(() => {
    const daysInMonth = getDaysInMonth(selectedMonth);
    const firstDay = startOfMonth(selectedMonth);
    const offset = (getDay(firstDay) + 6) % 7;
    const cells: Array<{ day: number; dateStr: string } | null> = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, dateStr: format(addDays(firstDay, d - 1), "yyyy-MM-dd") });
    }
    return cells;
  }, [selectedMonth]);

  const daysElapsed = useMemo(() => {
    return isCurrentMonth ? todayDate.getDate() : getDaysInMonth(selectedMonth);
  }, [selectedMonth, isCurrentMonth]);

  const daysWithActivity = useMemo(() => {
    let count = 0;
    monthProgressMap.forEach((progress) => {
      if (progress.done > 0) count++;
    });
    return count;
  }, [monthProgressMap]);

  // ─── Loading / guard ─────────────────────────────────────────────
  if (authLoading || onboardingLoading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-[280px] w-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4" data-testid="proof-hub">

        {/* ─── HISTORY — Calendar Heatmap ───────────────────────── */}
        <section data-testid="journal-history-section">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">History</p>

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3" data-testid="month-navigation">
            <button onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))} className="p-2.5 rounded hover:bg-muted cursor-pointer" data-testid="button-prev-month">
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <span className="text-[13px] font-medium" data-testid="text-current-month">
              {format(selectedMonth, "MMMM yyyy")}
            </span>
            <button
              onClick={() => canGoForward && setSelectedMonth(addMonths(selectedMonth, 1))}
              className={`p-2.5 rounded ${canGoForward ? "hover:bg-muted cursor-pointer" : "opacity-30 cursor-default"}`}
              disabled={!canGoForward}
              data-testid="button-next-month"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-[2px]">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div key={i} className="h-10 flex items-center justify-center text-[11px] text-muted-foreground">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1" data-testid="calendar-grid">
            {calendarCells.map((cell, i) => {
              if (!cell) return <div key={`empty-${i}`} className="h-10" />;
              const { day, dateStr } = cell;
              const isFuture = dateStr > todayStr;
              const isToday = dateStr === todayStr;
              const progress = monthProgressMap.get(dateStr);
              const ratio = progress && progress.total > 0 ? progress.done / progress.total : 0;
              const allDone = progress ? progress.done === progress.total && progress.total > 0 : false;
              const clickable = !isFuture;

              let bgClass: string;
              let textClass: string;
              if (isFuture) { bgClass = ""; textClass = "text-muted-foreground/30"; }
              else if (allDone) { bgClass = "bg-primary rounded-md"; textClass = "text-primary-foreground"; }
              else if (ratio >= 0.75) { bgClass = "bg-primary/70 rounded-md"; textClass = "text-primary-foreground"; }
              else if (ratio >= 0.5) { bgClass = "bg-primary/40 rounded-md"; textClass = "text-foreground"; }
              else if (ratio >= 0.25) { bgClass = "bg-primary/20 rounded-md"; textClass = "text-foreground"; }
              else if (ratio > 0) { bgClass = "bg-[#B09340]/20 rounded-md"; textClass = "text-foreground"; }
              else { bgClass = "border border-border/50 rounded-md"; textClass = "text-foreground"; }

              return (
                <button
                  key={dateStr}
                  onClick={clickable ? () => setSelectedDate(dateStr === selectedDate ? null : dateStr) : undefined}
                  className={`h-10 flex items-center justify-center text-[11px] ${bgClass} ${textClass} ${isToday ? "ring-1 ring-primary animate-dot-pulse" : ""} ${dateStr === selectedDate ? "ring-2 ring-primary" : ""} ${clickable ? "cursor-pointer" : "cursor-default"}`}
                  disabled={!clickable}
                  data-testid={`cal-day-${dateStr}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Month summary */}
          <p className="text-xs text-muted-foreground mt-3" data-testid="text-month-summary">
            {daysWithActivity} of {daysElapsed} days active
          </p>

          {/* Day detail panel */}
          <AnimatePresence>
            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4 rounded-lg border border-border/60 p-3" data-testid="day-detail-panel">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium" data-testid="day-detail-header">
                      {format(new Date(selectedDate + "T12:00:00"), "EEEE, MMM d")}
                    </p>
                    <button onClick={() => setSelectedDate(null)} className="p-2 -mr-2 rounded hover:bg-muted cursor-pointer" data-testid="button-close-detail">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>

                  {!selectedDateJournals.morning && !selectedDateJournals.evening && selectedDateHabits.length === 0 && selectedDateFocusItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground" data-testid="day-detail-empty">No activity on this day</p>
                  ) : (
                    <div className="space-y-1">
                      {/* Morning journal */}
                      <button
                        className="flex items-center gap-2 w-full py-2.5 text-left hover:bg-muted/30 rounded px-1 -mx-1"
                        onClick={() => setLocation(`/today/journal/${selectedDate}/morning`)}
                        data-testid="detail-morning-row"
                      >
                        <Sun className="h-4 w-4 text-amber-500 shrink-0" />
                        <span className="text-xs flex-1">Morning</span>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded ${selectedDateJournals.morning ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary" : "bg-muted text-muted-foreground"}`}>
                          {selectedDateJournals.morning ? "Completed" : "Not started"}
                        </span>
                      </button>

                      {/* Focus items (read-only) */}
                      {sortedFocusItems.length > 0 && (
                        <div className="pt-2 mt-1 border-t border-border/30">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Focus</p>
                          {sortedFocusItems.map(item => {
                            const isDone = item.status === "completed";
                            return (
                              <div key={item.id} className={`flex items-center gap-2 py-2 ${isDone ? "opacity-50" : ""}`}>
                                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isDone ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
                                  {isDone && <Check className="h-3 w-3 text-primary-foreground" />}
                                </div>
                                {item.category && (
                                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${CATEGORY_BADGE[item.category] || "bg-muted text-muted-foreground"}`}>
                                    {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                                  </span>
                                )}
                                <span className={`text-xs flex-1 ${isDone ? "line-through text-muted-foreground" : ""}`}>
                                  {item.task}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Habits (read-only) */}
                      {sortedHabits.length > 0 && (
                        <div className="pt-2 mt-1 border-t border-border/30" data-testid="detail-habits-section">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Habits</p>
                          {sortedHabits.map(habit => {
                            const isDone = selectedDateHabitStatusMap.get(habit.id) === "completed";
                            return (
                              <div key={habit.id} className={`flex items-center gap-2 py-2 ${isDone ? "opacity-50" : ""}`} data-testid={`detail-habit-item-${habit.id}`}>
                                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isDone ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
                                  {isDone && <Check className="h-3 w-3 text-primary-foreground" />}
                                </div>
                                <span className={`h-2 w-2 rounded-full shrink-0 ${CATEGORY_COLORS[habit.category || "health"] || "bg-primary"}`} />
                                <span className={`text-xs flex-1 ${isDone ? "line-through text-muted-foreground" : ""}`}>
                                  {habit.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Evening journal */}
                      <button
                        className="flex items-center gap-2 w-full py-2.5 text-left hover:bg-muted/30 rounded px-1 -mx-1"
                        onClick={() => setLocation(`/today/journal/${selectedDate}/evening`)}
                        data-testid="detail-evening-row"
                      >
                        <Moon className="h-4 w-4 text-indigo-500 shrink-0" />
                        <span className="text-xs flex-1">Evening</span>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded ${selectedDateJournals.evening ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary" : "bg-muted text-muted-foreground"}`}>
                          {selectedDateJournals.evening ? "Completed" : "Not started"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </AppLayout>
  );
}
