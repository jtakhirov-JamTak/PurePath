import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sun, Moon, Download, ChevronLeft, ChevronRight,
  Check, Repeat, Grid3X3, AlertTriangle
} from "lucide-react";
import { useLocation } from "wouter";
import { format, addWeeks, subWeeks, startOfWeek, addDays, isSameDay } from "date-fns";
import type { Journal, Habit, HabitCompletion, EisenhowerEntry } from "@shared/schema";
import { HABIT_CATEGORIES, type HabitCategory } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const CATEGORY_STYLES: Record<string, { dot: string }> = {
  health: { dot: "bg-emerald-500" },
  wealth: { dot: "bg-amber-500" },
  relationships: { dot: "bg-rose-500" },
  career: { dot: "bg-blue-500" },
  mindfulness: { dot: "bg-violet-500" },
  learning: { dot: "bg-cyan-500" },
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
        <div className="container mx-auto px-4 py-12 max-w-3xl space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="ghost" onClick={() => setWeekStart((w) => subWeeks(w, 1))} data-testid="button-prev-week">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-serif text-2xl font-bold" data-testid="text-week-label">
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

        <div className="space-y-6">
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const isToday = dateStr === todayStr;
            const dayCode = DAY_CODES[day.getDay()];
            const dayJournals = journalsByDate.get(dateStr);
            const hasMorning = dayJournals?.morning || false;
            const hasEvening = dayJournals?.evening || false;
            const dayHabits = habits.filter((h) => h.cadence.split(",").includes(dayCode));
            const completedIds = completionsByDate.get(dateStr) || new Set<number>();

            const totalItems = 2 + dayHabits.length + (isThisWeekDay(day, q2Items) ? q2Items.length : 0) + (isThisWeekDay(day, q1Items) ? q1Items.length : 0);

            return (
              <div key={dateStr} data-testid={`day-column-${dateStr}`}>
                <div className={`flex items-center gap-3 mb-3 pb-2 border-b ${isToday ? "border-primary/40" : ""}`}>
                  <span className={`font-serif text-lg font-bold ${isToday ? "text-primary" : ""}`}>
                    {format(day, "EEE, MMM d")}
                  </span>
                  {isToday && <Badge className="shrink-0 text-xs">Today</Badge>}
                </div>

                <div className="space-y-2 pl-2">
                  <JournalRow
                    session="morning"
                    done={hasMorning}
                    dateStr={dateStr}
                    setLocation={setLocation}
                  />

                  {q2Items.length > 0 && (
                    <>
                      <SectionLabel icon={<Grid3X3 className="h-3.5 w-3.5" />} label="Q2" />
                      {q2Items.map((entry) => (
                        <EisenhowerRow
                          key={entry.id}
                          entry={entry}
                          onToggle={(completed) => toggleEisenhowerMutation.mutate({ id: entry.id, completed })}
                        />
                      ))}
                    </>
                  )}

                  {q1Items.length > 0 && (
                    <>
                      <SectionLabel icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Q1" />
                      {q1Items.map((entry) => (
                        <EisenhowerRow
                          key={entry.id}
                          entry={entry}
                          onToggle={(completed) => toggleEisenhowerMutation.mutate({ id: entry.id, completed })}
                        />
                      ))}
                    </>
                  )}

                  {dayHabits.length > 0 && (
                    <>
                      <SectionLabel icon={<Repeat className="h-3.5 w-3.5" />} label="Habits" />
                      {dayHabits.map((habit) => {
                        const done = completedIds.has(habit.id);
                        const catStyle = CATEGORY_STYLES[habit.category || "health"];
                        return (
                          <div key={habit.id} className="flex items-center gap-3 py-1.5 px-2 rounded-md" data-testid={`habit-${habit.id}-${dateStr}`}>
                            <Checkbox
                              checked={done}
                              onCheckedChange={(v) => toggleHabitMutation.mutate({ habitId: habit.id, completed: !!v, date: dateStr })}
                              data-testid={`checkbox-habit-${habit.id}-${dateStr}`}
                            />
                            <div className={`h-2 w-2 rounded-full shrink-0 ${catStyle?.dot || "bg-muted"}`} />
                            <span className={`text-sm flex-1 ${done ? "line-through text-muted-foreground" : ""}`}>
                              {habit.name}
                            </span>
                          </div>
                        );
                      })}
                    </>
                  )}

                  <JournalRow
                    session="evening"
                    done={hasEvening}
                    dateStr={dateStr}
                    setLocation={setLocation}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

function isThisWeekDay(day: Date, items: EisenhowerEntry[]) {
  return true;
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 pt-1">
      {icon}
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

function JournalRow({
  session,
  done,
  dateStr,
  setLocation,
}: {
  session: "morning" | "evening";
  done: boolean;
  dateStr: string;
  setLocation: (path: string) => void;
}) {
  const isMorning = session === "morning";
  return (
    <div
      className="flex items-center gap-3 py-2 px-2 rounded-md cursor-pointer hover-elevate"
      onClick={() => setLocation(`/journal/${dateStr}/${session}`)}
      data-testid={`row-${session}-${dateStr}`}
    >
      {isMorning ? (
        <Sun className="h-4 w-4 text-amber-500 shrink-0" />
      ) : (
        <Moon className="h-4 w-4 text-indigo-500 shrink-0" />
      )}
      <span className="text-sm flex-1">{isMorning ? "Morning Journal" : "Evening Journal"}</span>
      {done ? (
        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
          <Check className="h-3 w-3 mr-1" />
          Done
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      )}
    </div>
  );
}

function EisenhowerRow({
  entry,
  onToggle,
}: {
  entry: EisenhowerEntry;
  onToggle: (completed: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5 px-2 rounded-md" data-testid={`eisenhower-${entry.id}`}>
      <Checkbox
        checked={entry.completed || false}
        onCheckedChange={(v) => onToggle(!!v)}
        data-testid={`checkbox-eisenhower-${entry.id}`}
      />
      <span className={`text-sm flex-1 ${entry.completed ? "line-through text-muted-foreground" : ""}`}>
        {entry.task}
      </span>
      {entry.blocksGoal && (
        <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
          Blocks Goal
        </Badge>
      )}
    </div>
  );
}
