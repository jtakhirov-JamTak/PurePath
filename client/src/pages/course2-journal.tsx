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
  Check, Minus
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

  const gridCols = "grid-cols-[160px_repeat(7,1fr)]";
  const cellH = "min-h-[36px]";

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
            <div className={`grid ${gridCols} border rounded-md overflow-hidden`}>

              {/* Header row */}
              <div className="bg-muted/40 p-2" />
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const isToday = dateStr === todayStr;
                return (
                  <div key={dateStr} className={`text-center py-2 border-l ${isToday ? "bg-primary/[0.06]" : "bg-muted/40"}`}>
                    <p className={`text-xs uppercase tracking-wide ${isToday ? "text-primary font-bold" : "text-muted-foreground font-medium"}`}>
                      {format(day, "EEE")}
                    </p>
                    <p className={`text-lg font-bold leading-tight ${isToday ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </p>
                  </div>
                );
              })}

              {/* Morning Journal row */}
              <LabelCell icon={<Sun className="h-4 w-4 text-amber-500" />} label="Morning Journal" />
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const done = journalsByDate.get(dateStr)?.morning || false;
                return (
                  <DayCell key={dateStr} dateStr={dateStr} todayStr={todayStr} cellH={cellH}>
                    <div
                      className="flex items-center justify-center h-full cursor-pointer hover-elevate rounded-md"
                      onClick={() => setLocation(`/journal/${dateStr}/morning`)}
                      data-testid={`row-morning-${dateStr}`}
                    >
                      {done ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <Minus className="h-3 w-3 text-muted-foreground/40" />}
                    </div>
                  </DayCell>
                );
              })}

              {/* Q2 items — each item gets its own row, shown only on its deadline day */}
              {q2Items.map((entry, idx) => (
                <ScheduledItemRow
                  key={entry.id}
                  entry={entry}
                  quadrantLabel={idx === 0 ? "Q2" : ""}
                  icon={idx === 0 ? <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 rounded px-1.5 py-0.5">Q2</span> : undefined}
                  days={days}
                  todayStr={todayStr}
                  cellH={cellH}
                  onToggle={(completed) => toggleEisenhowerMutation.mutate({ id: entry.id, completed })}
                />
              ))}

              {/* Q1 items — each item gets its own row, shown only on its deadline day */}
              {q1Items.map((entry, idx) => (
                <ScheduledItemRow
                  key={entry.id}
                  entry={entry}
                  quadrantLabel={idx === 0 ? "Q1" : ""}
                  icon={idx === 0 ? <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 rounded px-1.5 py-0.5">Q1</span> : undefined}
                  days={days}
                  todayStr={todayStr}
                  cellH={cellH}
                  onToggle={(completed) => toggleEisenhowerMutation.mutate({ id: entry.id, completed })}
                />
              ))}

              {/* Habit rows — each habit gets its own row */}
              {habits.map((habit) => {
                const scheduledDays = new Set(habit.cadence.split(","));
                const catDot = CATEGORY_DOTS[habit.category || "health"] || "bg-muted";
                return (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    catDot={catDot}
                    scheduledDays={scheduledDays}
                    days={days}
                    todayStr={todayStr}
                    cellH={cellH}
                    completionsByDate={completionsByDate}
                    onToggle={(completed, date) => toggleHabitMutation.mutate({ habitId: habit.id, completed, date })}
                  />
                );
              })}

              {/* Evening Journal row */}
              <LabelCell icon={<Moon className="h-4 w-4 text-indigo-500" />} label="Evening Journal" />
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const done = journalsByDate.get(dateStr)?.evening || false;
                return (
                  <DayCell key={dateStr} dateStr={dateStr} todayStr={todayStr} cellH={cellH}>
                    <div
                      className="flex items-center justify-center h-full cursor-pointer hover-elevate rounded-md"
                      onClick={() => setLocation(`/journal/${dateStr}/evening`)}
                      data-testid={`row-evening-${dateStr}`}
                    >
                      {done ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <Minus className="h-3 w-3 text-muted-foreground/40" />}
                    </div>
                  </DayCell>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function LabelCell({ icon, label, sublabel }: { icon: React.ReactNode; label: string; sublabel?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-t">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold truncate">{label}</p>
        {sublabel && <p className="text-[10px] text-muted-foreground truncate">{sublabel}</p>}
      </div>
    </div>
  );
}

function DayCell({ dateStr, todayStr, cellH, children }: { dateStr: string; todayStr: string; cellH: string; children: React.ReactNode }) {
  const isToday = dateStr === todayStr;
  return (
    <div className={`border-l border-t px-1.5 flex items-center justify-center ${cellH} ${isToday ? "bg-primary/[0.03]" : ""}`}>
      {children}
    </div>
  );
}

function ScheduledItemRow({
  entry,
  quadrantLabel,
  icon,
  days,
  todayStr,
  cellH,
  onToggle,
}: {
  entry: EisenhowerEntry;
  quadrantLabel: string;
  icon?: React.ReactNode;
  days: Date[];
  todayStr: string;
  cellH: string;
  onToggle: (completed: boolean) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-t">
        {icon && <div className="shrink-0">{icon}</div>}
        <div className="min-w-0 flex items-center gap-1.5 flex-1">
          {entry.blocksGoal && (
            <span className="text-[9px] text-destructive font-bold shrink-0">!</span>
          )}
          <p className={`text-xs truncate ${entry.completed ? "line-through text-muted-foreground" : ""}`}>
            {entry.task}
          </p>
        </div>
      </div>
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const isScheduledHere = entry.deadline === dateStr;
        return (
          <DayCell key={dateStr} dateStr={dateStr} todayStr={todayStr} cellH={cellH}>
            {isScheduledHere ? (
              <Checkbox
                className="h-4 w-4"
                checked={entry.completed || false}
                onCheckedChange={(v) => onToggle(!!v)}
                data-testid={`checkbox-eisenhower-${entry.id}`}
              />
            ) : (
              <span />
            )}
          </DayCell>
        );
      })}
    </>
  );
}

function HabitRow({
  habit,
  catDot,
  scheduledDays,
  days,
  todayStr,
  cellH,
  completionsByDate,
  onToggle,
}: {
  habit: Habit;
  catDot: string;
  scheduledDays: Set<string>;
  days: Date[];
  todayStr: string;
  cellH: string;
  completionsByDate: Map<string, Set<number>>;
  onToggle: (completed: boolean, date: string) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-t">
        <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${catDot}`} />
        <p className="text-xs truncate">{habit.name}</p>
      </div>
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayCode = DAY_CODES[day.getDay()];
        const isScheduled = scheduledDays.has(dayCode);
        const completedIds = completionsByDate.get(dateStr) || new Set<number>();
        const done = completedIds.has(habit.id);

        return (
          <DayCell key={dateStr} dateStr={dateStr} todayStr={todayStr} cellH={cellH}>
            {isScheduled ? (
              <Checkbox
                className="h-4 w-4"
                checked={done}
                onCheckedChange={(v) => onToggle(!!v, dateStr)}
                data-testid={`checkbox-habit-${habit.id}-${dateStr}`}
              />
            ) : (
              <span />
            )}
          </DayCell>
        );
      })}
    </>
  );
}
