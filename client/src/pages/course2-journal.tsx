import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sun, Moon, Download, ChevronLeft, ChevronRight,
  Check, Repeat, Grid3X3, AlertTriangle
} from "lucide-react";
import { useLocation } from "wouter";
import { format, addWeeks, subWeeks, startOfWeek, addDays } from "date-fns";
import type { Journal, Habit, HabitCompletion, EisenhowerEntry } from "@shared/schema";
import { HABIT_CATEGORIES, type HabitCategory } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const CATEGORY_DOTS: Record<string, string> = {
  health: "bg-emerald-500",
  wealth: "bg-amber-500",
  relationships: "bg-rose-500",
  career: "bg-blue-500",
  mindfulness: "bg-violet-500",
  learning: "bg-cyan-500",
};

export default function Course2JournalPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekEnd = addDays(weekStart, 6);
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const days = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < 7; i++) result.push(addDays(weekStart, i));
    return result;
  }, [weekStart]);

  const { data: journals = [], isLoading: journalsLoading } = useQuery<Journal[]>({
    queryKey: ["/api/journals"],
    enabled: !!user,
  });

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: !!user,
  });

  const { data: eisenhowerEntries = [] } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower"],
    enabled: !!user,
  });

  const { data: habitCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions/range", weekStartStr, weekEndStr],
    enabled: !!user,
  });

  const journalsByDate = useMemo(() => {
    const map = new Map<string, { morning: boolean; evening: boolean }>();
    journals.forEach((j) => {
      if (!map.has(j.date)) map.set(j.date, { morning: false, evening: false });
      const d = map.get(j.date)!;
      if (j.session === "morning") d.morning = true;
      if (j.session === "evening") d.evening = true;
    });
    return map;
  }, [journals]);

  const completionsByDate = useMemo(() => {
    const map = new Map<string, Set<number>>();
    habitCompletions.forEach((hc) => {
      if (!map.has(hc.date)) map.set(hc.date, new Set());
      map.get(hc.date)!.add(hc.habitId);
    });
    return map;
  }, [habitCompletions]);

  const toggleHabitMutation = useMutation({
    mutationFn: async ({ habitId, completed, date }: { habitId: number; completed: boolean; date: string }) => {
      if (completed) {
        await apiRequest("POST", "/api/habit-completions", { habitId, date });
      } else {
        await apiRequest("DELETE", `/api/habit-completions/${habitId}/${date}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habit-completions/range"] });
    },
  });

  const toggleEisenhowerMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      await apiRequest("PATCH", `/api/eisenhower/${id}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
    },
  });

  const q2Items = useMemo(
    () => eisenhowerEntries.filter((e) => e.quadrant === "q2" && e.weekStart === weekStartStr),
    [eisenhowerEntries, weekStartStr]
  );
  const q1Items = useMemo(
    () => eisenhowerEntries.filter((e) => e.quadrant === "q1" && e.weekStart === weekStartStr),
    [eisenhowerEntries, weekStartStr]
  );

  const handleDownloadAll = async () => {
    const response = await fetch("/api/journals/export", { credentials: "include" });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-journals.txt";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (journalsLoading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 h-full flex flex-col">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="ghost" onClick={() => setWeekStart((w) => subWeeks(w, 1))} data-testid="button-prev-week">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-serif text-xl font-bold" data-testid="text-week-label">
              {format(weekStart, "MMM d")} — {format(weekEnd, "MMM d, yyyy")}
            </h1>
            <Button size="icon" variant="ghost" onClick={() => setWeekStart((w) => addWeeks(w, 1))} data-testid="button-next-week">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadAll} data-testid="button-download-all">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
        </div>

        <div className="flex-1 overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[900px]">
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const isToday = dateStr === todayStr;
              const dayCode = DAY_CODES[day.getDay()];
              const dayJournals = journalsByDate.get(dateStr);
              const hasMorning = dayJournals?.morning || false;
              const hasEvening = dayJournals?.evening || false;
              const dayHabits = habits.filter((h) => h.cadence.split(",").includes(dayCode));
              const completedIds = completionsByDate.get(dateStr) || new Set<number>();

              return (
                <div
                  key={dateStr}
                  className={`rounded-lg border p-3 flex flex-col gap-1.5 ${isToday ? "border-primary/50 bg-primary/[0.03]" : "bg-card"}`}
                  data-testid={`day-column-${dateStr}`}
                >
                  <div className={`text-center pb-2 border-b mb-1 ${isToday ? "border-primary/30" : ""}`}>
                    <p className={`text-xs uppercase tracking-wide ${isToday ? "text-primary font-bold" : "text-muted-foreground font-medium"}`}>
                      {format(day, "EEE")}
                    </p>
                    <p className={`text-lg font-bold leading-tight ${isToday ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </p>
                  </div>

                  <CellRow
                    icon={<Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                    label="Morning"
                    done={hasMorning}
                    onClick={() => setLocation(`/journal/${dateStr}/morning`)}
                    testId={`row-morning-${dateStr}`}
                  />

                  {q2Items.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 pt-1">
                        <Grid3X3 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Q2</span>
                      </div>
                      {q2Items.map((entry) => (
                        <div key={entry.id} className="flex items-start gap-1.5 py-0.5" data-testid={`eisenhower-${entry.id}-${dateStr}`}>
                          <Checkbox
                            className="mt-0.5 h-3.5 w-3.5"
                            checked={entry.completed || false}
                            onCheckedChange={(v) => toggleEisenhowerMutation.mutate({ id: entry.id, completed: !!v })}
                            data-testid={`checkbox-eisenhower-${entry.id}`}
                          />
                          <span className={`text-xs leading-tight flex-1 ${entry.completed ? "line-through text-muted-foreground" : ""}`}>
                            {entry.task}
                          </span>
                          {entry.blocksGoal && (
                            <span className="text-[9px] text-destructive font-medium">!</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {q1Items.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 pt-1">
                        <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Q1</span>
                      </div>
                      {q1Items.map((entry) => (
                        <div key={entry.id} className="flex items-start gap-1.5 py-0.5" data-testid={`eisenhower-q1-${entry.id}-${dateStr}`}>
                          <Checkbox
                            className="mt-0.5 h-3.5 w-3.5"
                            checked={entry.completed || false}
                            onCheckedChange={(v) => toggleEisenhowerMutation.mutate({ id: entry.id, completed: !!v })}
                            data-testid={`checkbox-eisenhower-q1-${entry.id}`}
                          />
                          <span className={`text-xs leading-tight flex-1 ${entry.completed ? "line-through text-muted-foreground" : ""}`}>
                            {entry.task}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {dayHabits.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 pt-1">
                        <Repeat className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Habits</span>
                      </div>
                      {dayHabits.map((habit) => {
                        const done = completedIds.has(habit.id);
                        return (
                          <div key={habit.id} className="flex items-start gap-1.5 py-0.5" data-testid={`habit-${habit.id}-${dateStr}`}>
                            <Checkbox
                              className="mt-0.5 h-3.5 w-3.5"
                              checked={done}
                              onCheckedChange={(v) => toggleHabitMutation.mutate({ habitId: habit.id, completed: !!v, date: dateStr })}
                              data-testid={`checkbox-habit-${habit.id}-${dateStr}`}
                            />
                            <div className={`h-2 w-2 rounded-full shrink-0 mt-1 ${CATEGORY_DOTS[habit.category || "health"] || "bg-muted"}`} />
                            <span className={`text-xs leading-tight flex-1 ${done ? "line-through text-muted-foreground" : ""}`}>
                              {habit.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <CellRow
                    icon={<Moon className="h-3.5 w-3.5 text-indigo-500 shrink-0" />}
                    label="Evening"
                    done={hasEvening}
                    onClick={() => setLocation(`/journal/${dateStr}/evening`)}
                    testId={`row-evening-${dateStr}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function CellRow({
  icon,
  label,
  done,
  onClick,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  done: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <div
      className="flex items-center gap-1.5 py-1.5 px-1.5 rounded-md cursor-pointer hover-elevate"
      onClick={onClick}
      data-testid={testId}
    >
      {icon}
      <span className="text-xs flex-1">{label}</span>
      {done && <Check className="h-3 w-3 text-green-600 dark:text-green-400 shrink-0" />}
    </div>
  );
}
