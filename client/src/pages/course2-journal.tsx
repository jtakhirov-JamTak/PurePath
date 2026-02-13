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

  const allHabitsByDay = useMemo(() => {
    const map = new Map<string, Habit[]>();
    days.forEach((day) => {
      const dc = DAY_CODES[day.getDay()];
      map.set(format(day, "yyyy-MM-dd"), habits.filter((h) => h.cadence.split(",").includes(dc)));
    });
    return map;
  }, [days, habits]);

  const maxHabitCount = useMemo(() => {
    let max = 0;
    allHabitsByDay.forEach((h) => { if (h.length > max) max = h.length; });
    return max;
  }, [allHabitsByDay]);

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

  const gridCols = "grid-cols-[140px_repeat(7,1fr)]";

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
          <div className="min-w-[960px]">

            <div className={`grid ${gridCols} gap-px`}>
              <div />
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const isToday = dateStr === todayStr;
                return (
                  <div key={dateStr} className={`text-center py-2 rounded-t-md ${isToday ? "bg-primary/[0.06]" : ""}`}>
                    <p className={`text-xs uppercase tracking-wide ${isToday ? "text-primary font-bold" : "text-muted-foreground font-medium"}`}>
                      {format(day, "EEE")}
                    </p>
                    <p className={`text-lg font-bold leading-tight ${isToday ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="border rounded-md overflow-hidden">
              <CalendarGridRow
                gridCols={gridCols}
                label="Morning Journal"
                icon={<Sun className="h-4 w-4 text-amber-500" />}
                days={days}
                todayStr={todayStr}
                renderCell={(day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const done = journalsByDate.get(dateStr)?.morning || false;
                  return (
                    <div
                      className="flex items-center justify-center h-full cursor-pointer hover-elevate rounded-md py-2"
                      onClick={() => setLocation(`/journal/${dateStr}/morning`)}
                      data-testid={`row-morning-${dateStr}`}
                    >
                      {done ? (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  );
                }}
              />

              {q2Items.length > 0 && (
                <CalendarGridRow
                  gridCols={gridCols}
                  label="Q2 Items"
                  sublabel="Important, Not Urgent"
                  icon={<Grid3X3 className="h-4 w-4 text-blue-500" />}
                  days={days}
                  todayStr={todayStr}
                  borderTop
                  renderCell={() => (
                    <div className="space-y-1 py-1.5">
                      {q2Items.map((entry) => (
                        <div key={entry.id} className="flex items-start gap-1.5" data-testid={`eisenhower-${entry.id}`}>
                          <Checkbox
                            className="mt-0.5 h-3.5 w-3.5 shrink-0"
                            checked={entry.completed || false}
                            onCheckedChange={(v) => toggleEisenhowerMutation.mutate({ id: entry.id, completed: !!v })}
                            data-testid={`checkbox-eisenhower-${entry.id}`}
                          />
                          <span className={`text-[11px] leading-tight ${entry.completed ? "line-through text-muted-foreground" : ""}`}>
                            {entry.task}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                />
              )}

              {q1Items.length > 0 && (
                <CalendarGridRow
                  gridCols={gridCols}
                  label="Q1 Items"
                  sublabel="Urgent & Important"
                  icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
                  days={days}
                  todayStr={todayStr}
                  borderTop
                  renderCell={() => (
                    <div className="space-y-1 py-1.5">
                      {q1Items.map((entry) => (
                        <div key={entry.id} className="flex items-start gap-1.5" data-testid={`eisenhower-q1-${entry.id}`}>
                          <Checkbox
                            className="mt-0.5 h-3.5 w-3.5 shrink-0"
                            checked={entry.completed || false}
                            onCheckedChange={(v) => toggleEisenhowerMutation.mutate({ id: entry.id, completed: !!v })}
                            data-testid={`checkbox-eisenhower-q1-${entry.id}`}
                          />
                          <span className={`text-[11px] leading-tight ${entry.completed ? "line-through text-muted-foreground" : ""}`}>
                            {entry.task}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                />
              )}

              {maxHabitCount > 0 && (
                <CalendarGridRow
                  gridCols={gridCols}
                  label="Habits"
                  icon={<Repeat className="h-4 w-4 text-violet-500" />}
                  days={days}
                  todayStr={todayStr}
                  borderTop
                  renderCell={(day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const dayHabits = allHabitsByDay.get(dateStr) || [];
                    const completedIds = completionsByDate.get(dateStr) || new Set<number>();
                    if (dayHabits.length === 0) {
                      return <div className="py-2 text-center"><span className="text-xs text-muted-foreground">—</span></div>;
                    }
                    return (
                      <div className="space-y-1 py-1.5">
                        {dayHabits.map((habit) => {
                          const done = completedIds.has(habit.id);
                          return (
                            <div key={habit.id} className="flex items-start gap-1.5" data-testid={`habit-${habit.id}-${dateStr}`}>
                              <Checkbox
                                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                                checked={done}
                                onCheckedChange={(v) => toggleHabitMutation.mutate({ habitId: habit.id, completed: !!v, date: dateStr })}
                                data-testid={`checkbox-habit-${habit.id}-${dateStr}`}
                              />
                              <div className={`h-2 w-2 rounded-full shrink-0 mt-1 ${CATEGORY_DOTS[habit.category || "health"] || "bg-muted"}`} />
                              <span className={`text-[11px] leading-tight flex-1 ${done ? "line-through text-muted-foreground" : ""}`}>
                                {habit.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }}
                />
              )}

              <CalendarGridRow
                gridCols={gridCols}
                label="Evening Journal"
                icon={<Moon className="h-4 w-4 text-indigo-500" />}
                days={days}
                todayStr={todayStr}
                borderTop
                renderCell={(day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const done = journalsByDate.get(dateStr)?.evening || false;
                  return (
                    <div
                      className="flex items-center justify-center h-full cursor-pointer hover-elevate rounded-md py-2"
                      onClick={() => setLocation(`/journal/${dateStr}/evening`)}
                      data-testid={`row-evening-${dateStr}`}
                    >
                      {done ? (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  );
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function CalendarGridRow({
  gridCols,
  label,
  sublabel,
  icon,
  days,
  todayStr,
  borderTop,
  renderCell,
}: {
  gridCols: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  days: Date[];
  todayStr: string;
  borderTop?: boolean;
  renderCell: (day: Date) => React.ReactNode;
}) {
  return (
    <div className={`grid ${gridCols} ${borderTop ? "border-t" : ""}`}>
      <div className="flex items-start gap-2 p-3 bg-muted/30">
        <div className="shrink-0 mt-0.5">{icon}</div>
        <div>
          <p className="text-xs font-semibold leading-tight">{label}</p>
          {sublabel && <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{sublabel}</p>}
        </div>
      </div>
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const isToday = dateStr === todayStr;
        return (
          <div
            key={dateStr}
            className={`px-2 border-l ${isToday ? "bg-primary/[0.03]" : ""}`}
            data-testid={`cell-${label.toLowerCase().replace(/\s+/g, "-")}-${dateStr}`}
          >
            {renderCell(day)}
          </div>
        );
      })}
    </div>
  );
}
