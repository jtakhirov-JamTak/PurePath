import { useState, useMemo } from "react";
import { AppLayout } from "@/components/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Check, Minus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Journal, Habit, HabitCompletion } from "@shared/schema";

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export default function JournalHubPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const todayDate = new Date();
  const todayStr = format(todayDate, "yyyy-MM-dd");
  const todayDayCode = DAY_CODES[todayDate.getDay()];

  const [visibleDays, setVisibleDays] = useState(30);

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

  // Today's journals
  const todayJournals = journals.filter((j) => j.date === todayStr);
  const hasMorning = todayJournals.some((j) => j.session === "morning");
  const hasEvening = todayJournals.some((j) => j.session === "evening");

  // Today's scheduled habits (active, matching cadence, within date range, deduped, max 3)
  const todaysHabits = useMemo(() => {
    const scheduled = habits.filter((h) => {
      if (!h.active) return false;
      if (!h.cadence.split(",").includes(todayDayCode)) return false;
      if (h.startDate && todayStr < h.startDate) return false;
      if (h.endDate && todayStr > h.endDate) return false;
      return true;
    });
    const byLineage = new Map<string, (typeof habits)[0]>();
    scheduled.forEach((h) => {
      const key = h.lineageId || String(h.id);
      const existing = byLineage.get(key);
      if (!existing || (h.active && !existing.active)) byLineage.set(key, h);
    });
    const deduped = Array.from(byLineage.values());
    if (deduped.length > 3) {
      deduped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return deduped.slice(0, 3);
    }
    return deduped;
  }, [habits, todayDayCode, todayStr]);

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
  const setHabitLevelMutation = useMutation({
    mutationFn: async ({ habitId, level, skipReason, isBinary }: { habitId: number; level: number | null; skipReason?: string; isBinary?: boolean }) => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habit-completions", todayStr] });
      queryClient.invalidateQueries({ queryKey: ["/api/habit-completions/range"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not update habit", description: error.message, variant: "destructive" });
    },
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

  // History: group journals by date, sorted descending
  const historyDates = useMemo(() => {
    const map = new Map<string, { morning: boolean; evening: boolean }>();
    journals.forEach((j) => {
      if (j.date === todayStr) return; // Skip today
      if (!map.has(j.date)) map.set(j.date, { morning: false, evening: false });
      const entry = map.get(j.date)!;
      if (j.session === "morning") entry.morning = true;
      if (j.session === "evening") entry.evening = true;
    });

    // Also include dates without entries for the last N days
    const dates = new Set<string>(map.keys());
    for (let i = 1; i <= visibleDays; i++) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      const ds = format(d, "yyyy-MM-dd");
      dates.add(ds);
      if (!map.has(ds)) map.set(ds, { morning: false, evening: false });
    }

    const sorted = Array.from(dates).sort((a, b) => b.localeCompare(a)).slice(0, visibleDays);
    return sorted.map((date) => ({ date, ...map.get(date)! }));
  }, [journals, todayStr, visibleDays]);

  return (
    <AppLayout>
      <div className="max-w-md mx-auto px-4 py-6 space-y-6" data-testid="journal-hub">
        <h1 className="text-sm font-medium" data-testid="journal-hub-title">Journal</h1>

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

        {/* HISTORY section */}
        <section data-testid="journal-history-section">
          <p className="text-[11px] uppercase text-bark font-medium mb-2">History</p>

          <div className="space-y-0">
            {historyDates.map(({ date, morning, evening }) => (
              <div key={date} className="py-2 border-b border-border/30" data-testid={`history-date-${date}`}>
                <p className="text-xs font-medium mb-1">
                  {format(new Date(date + "T12:00:00"), "MMMM d, yyyy")}
                </p>
                <div className="space-y-0.5 pl-1">
                  <button
                    className="flex items-center gap-2 w-full py-1 text-left hover:bg-muted/50 rounded px-1 -mx-1"
                    onClick={() => setLocation(`/journal/${date}/morning`)}
                    data-testid={`history-morning-${date}`}
                  >
                    <Sun className="h-3 w-3 text-amber-500 shrink-0" />
                    <span className="text-[11px] flex-1">Morning</span>
                    {morning ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Minus className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    className="flex items-center gap-2 w-full py-1 text-left hover:bg-muted/50 rounded px-1 -mx-1"
                    onClick={() => setLocation(`/journal/${date}/evening`)}
                    data-testid={`history-evening-${date}`}
                  >
                    <Moon className="h-3 w-3 text-indigo-500 shrink-0" />
                    <span className="text-[11px] flex-1">Evening</span>
                    {evening ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Minus className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 text-xs text-muted-foreground"
            onClick={() => setVisibleDays((d) => d + 30)}
            data-testid="show-more-history"
          >
            Show more
          </Button>
        </section>
      </div>
    </AppLayout>
  );
}
