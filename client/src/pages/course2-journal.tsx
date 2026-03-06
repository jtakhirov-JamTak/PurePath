import React, { useState, useMemo } from "react";
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
import { useToast } from "@/hooks/use-toast";

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const CATEGORY_DOTS: Record<string, string> = {
  health: "bg-emerald-500",
  wealth: "bg-yellow-400",
  relationships: "bg-rose-500",
  "self-development": "bg-blue-500",
  happiness: "bg-slate-300 dark:bg-slate-400",
  career: "bg-blue-500",
  mindfulness: "bg-blue-500",
  learning: "bg-blue-500",
  leisure: "bg-slate-300 dark:bg-slate-400",
};

export default function Course2JournalPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
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
    staleTime: 0,
    refetchOnMount: "always",
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
    const map = new Map<string, Map<number, string>>();
    habitCompletions.forEach((hc) => {
      if (!map.has(hc.date)) map.set(hc.date, new Map());
      map.get(hc.date)!.set(hc.habitId, hc.status || "completed");
    });
    return map;
  }, [habitCompletions]);

  const setHabitLevelMutation = useMutation({
    mutationFn: async ({ habitId, level, date, isBinary }: { habitId: number; level: number | null; date: string; isBinary?: boolean }) => {
      let res;
      if (level === null) {
        res = await apiRequest("DELETE", `/api/habit-completions/${habitId}/${date}`);
      } else {
        const status = (isBinary && level === 1) ? "completed" : level === 2 ? "completed" : level === 1 ? "minimum" : "skipped";
        const existing = habitCompletions.some(hc => hc.habitId === habitId && hc.date === date);
        const payload: Record<string, unknown> = { status, completionLevel: level };
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habit-completions/range"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habit-completions"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not update habit", description: error.message, variant: "destructive" });
    },
  });

  const toggleEisenhowerMutation = useMutation({
    mutationFn: async ({ id, currentStatus, durationMinutes }: { id: number; currentStatus: string | null; durationMinutes?: number | null }) => {
      const nextStatus = currentStatus === null || currentStatus === undefined ? "completed" : currentStatus === "completed" ? "skipped" : null;
      const body: Record<string, unknown> = { status: nextStatus };
      if (nextStatus === "skipped" && durationMinutes) {
        body.startedOnTime = false;
        body.completedRequiredTime = false;
        body.timeShortMinutes = durationMinutes;
      }
      const res = await apiRequest("PATCH", `/api/eisenhower/${id}`, body);
      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.error || "Failed to update status");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not update status", description: error.message, variant: "destructive" });
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

  const eisenhowerByDate = useMemo(() => {
    const map = new Map<string, EisenhowerEntry[]>();
    [...q2Items, ...q1Items].forEach((e) => {
      const d = e.scheduledDate || e.deadline || "";
      if (!d) return;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(e);
    });
    return map;
  }, [q2Items, q1Items]);

  const [showExport, setShowExport] = useState(false);
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (exportStart) params.set("startDate", exportStart);
    if (exportEnd) params.set("endDate", exportEnd);
    const response = await fetch(`/api/journals/export?${params.toString()}`, { credentials: "include" });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journal-export${exportStart ? `-${exportStart}` : ""}${exportEnd ? `-to-${exportEnd}` : ""}.txt`;
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

  const gridCols = "grid-cols-[minmax(180px,auto)_repeat(7,1fr)]";
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
          <Button variant="outline" size="sm" onClick={() => setShowExport(!showExport)} data-testid="button-toggle-export">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
        </div>

        {showExport && (
          <div className="flex items-end gap-3 mb-4 flex-wrap p-3 border rounded-md bg-muted/30" data-testid="export-panel">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">From</label>
              <input
                type="date"
                value={exportStart}
                onChange={(e) => setExportStart(e.target.value)}
                className="block border rounded-md px-2 py-1.5 text-sm bg-background"
                data-testid="input-export-start"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">To</label>
              <input
                type="date"
                value={exportEnd}
                onChange={(e) => setExportEnd(e.target.value)}
                className="block border rounded-md px-2 py-1.5 text-sm bg-background"
                data-testid="input-export-end"
              />
            </div>
            <Button size="sm" onClick={handleExport} data-testid="button-export-download">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-x-auto">
          <div className="min-w-[960px]">
            <div className={`grid ${gridCols} border rounded-md overflow-hidden`}>

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

              <SectionHeaderRow gridCols={gridCols} label="Scheduled Items" days={days} todayStr={todayStr} />
              <LabelCell label="Scheduled Items" sublabel="Q1 & Q2" badge />
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const items = eisenhowerByDate.get(dateStr) || [];
                return (
                  <DayCell key={dateStr} dateStr={dateStr} todayStr={todayStr} cellH={items.length > 0 ? "" : cellH}>
                    {items.length > 0 ? (
                      <div className="space-y-1.5 py-2 w-full">
                        {items.map((entry) => (
                          <div key={entry.id} className="flex items-start gap-1.5 px-1" data-testid={`eisenhower-${entry.id}`}>
                            <button
                              role="checkbox"
                              aria-checked={entry.status === "completed" ? true : entry.status === "skipped" ? "mixed" : false}
                              aria-label={`${entry.task} - ${entry.status === "completed" ? "completed" : entry.status === "skipped" ? "skipped" : "not tracked"}. Click to cycle.`}
                              className={`mt-0.5 h-3.5 w-3.5 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                                entry.status === "completed" ? "bg-primary border-primary" : entry.status === "skipped" ? "bg-yellow-300 border-yellow-400 dark:bg-yellow-400/30 dark:border-yellow-400/50" : "border-border"
                              }`}
                              onClick={() => toggleEisenhowerMutation.mutate({ id: entry.id, currentStatus: entry.status || null, durationMinutes: entry.durationMinutes })}
                              data-testid={`eisenhower-cycle-${entry.id}`}
                            >
                              {entry.status === "completed" && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                              {entry.status === "skipped" && <Minus className="h-2.5 w-2.5 text-yellow-700 dark:text-yellow-300" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[11px] leading-tight ${entry.status === "completed" ? "line-through text-muted-foreground" : entry.status === "skipped" ? "text-muted-foreground italic" : ""}`}>
                                {entry.task}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className={`text-[10px] font-bold uppercase ${entry.quadrant === "q1" ? "text-orange-500" : "text-blue-500"}`}>
                                  {entry.quadrant}
                                </span>
                                {entry.scheduledTime && (
                                  <span className="text-[10px] text-muted-foreground font-medium">{entry.scheduledTime}</span>
                                )}
                                {entry.blocksGoal && (
                                  <span className="text-[10px] text-primary font-bold">Success Catalyst</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </DayCell>
                );
              })}

              <SectionHeaderRow gridCols={gridCols} label="Habits" days={days} todayStr={todayStr} />
              {(() => {
                const activeHabits = habits.filter(h => {
                  if (h.active === false) return false;
                  if (h.startDate && h.startDate > weekEndStr) return false;
                  if (h.endDate && h.endDate < weekStartStr) return false;
                  return true;
                });
                const morningHabits = activeHabits.filter(h => (h.timing || "afternoon") === "morning");
                const afternoonHabits = activeHabits.filter(h => {
                  const t = h.timing || "afternoon";
                  return t === "afternoon" || t === "daily";
                });
                const eveningHabits = activeHabits.filter(h => (h.timing || "afternoon") === "evening");

                const timingSubheader = (timing: string, label: string) => (
                  <React.Fragment key={`subheader-${timing}`}>
                    <div className="flex items-center px-3 py-0.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{label}</p>
                    </div>
                    {days.map((day) => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      return <div key={dateStr} className={dateStr === todayStr ? "bg-primary/5" : ""} />;
                    })}
                  </React.Fragment>
                );

                const journalRow = (session: "morning" | "evening") => {
                  const icon = session === "morning"
                    ? <Sun className="h-4 w-4 text-amber-500" />
                    : <Moon className="h-4 w-4 text-indigo-500" />;
                  const label = session === "morning" ? "Morning Journal" : "Evening Journal";
                  return (
                    <React.Fragment key={`journal-${session}`}>
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-t">
                        <div className="shrink-0">{icon}</div>
                        <p className="text-xs font-semibold leading-snug">{label}</p>
                      </div>
                      {days.map((day) => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const done = session === "morning"
                          ? journalsByDate.get(dateStr)?.morning || false
                          : journalsByDate.get(dateStr)?.evening || false;
                        return (
                          <DayCell key={dateStr} dateStr={dateStr} todayStr={todayStr} cellH={cellH}>
                            <div
                              className="flex items-center justify-center h-full cursor-pointer hover-elevate rounded-md"
                              onClick={() => setLocation(`/journal/${dateStr}/${session}`)}
                              data-testid={`row-${session}-${dateStr}`}
                            >
                              {done ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <Minus className="h-3 w-3 text-muted-foreground/40" />}
                            </div>
                          </DayCell>
                        );
                      })}
                    </React.Fragment>
                  );
                };

                const habitRow = (habit: Habit) => {
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
                      onSetLevel={(level, date) => setHabitLevelMutation.mutate({ habitId: habit.id, level, date, isBinary: habit.isBinary || false })}
                    />
                  );
                };

                return (
                  <>
                    {timingSubheader("morning", "Morning (6am–12pm)")}
                    {journalRow("morning")}
                    {morningHabits.map(habitRow)}
                    {afternoonHabits.length > 0 && timingSubheader("afternoon", "Afternoon (12–6pm)")}
                    {afternoonHabits.map(habitRow)}
                    {timingSubheader("evening", "Evening (6–9pm)")}
                    {eveningHabits.map(habitRow)}
                    {journalRow("evening")}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function SectionHeaderRow({ gridCols, label, days, todayStr }: { gridCols: string; label: string; days: Date[]; todayStr: string }) {
  return (
    <>
      <div className="flex items-center px-3 py-1.5 bg-muted/50 border-t">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const isToday = dateStr === todayStr;
        return (
          <div key={dateStr} className={`border-l border-t ${isToday ? "bg-primary/[0.03]" : "bg-muted/50"}`} />
        );
      })}
    </>
  );
}

function LabelCell({ icon, label, sublabel, badge }: { icon?: React.ReactNode; label: string; sublabel?: string; badge?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-t">
      {icon && <div className="shrink-0">{icon}</div>}
      <div>
        <p className="text-xs font-semibold leading-snug">{label}</p>
        {sublabel && <p className="text-[10px] text-muted-foreground leading-snug">{sublabel}</p>}
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

function HabitRow({
  habit,
  catDot,
  scheduledDays,
  days,
  todayStr,
  cellH,
  completionsByDate,
  onSetLevel,
}: {
  habit: Habit;
  catDot: string;
  scheduledDays: Set<string>;
  days: Date[];
  todayStr: string;
  cellH: string;
  completionsByDate: Map<string, Map<number, string>>;
  onSetLevel: (level: number | null, date: string) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-t">
        <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${catDot}`} />
        <p className="text-xs leading-snug">{habit.name}</p>
      </div>
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayCode = DAY_CODES[day.getDay()];
        const inRange = (!habit.startDate || dateStr >= habit.startDate) && (!habit.endDate || dateStr <= habit.endDate);
        const isScheduled = scheduledDays.has(dayCode) && inRange;
        const dateMap = completionsByDate.get(dateStr);
        const status = dateMap?.get(habit.id) || null;
        const isBin = habit.isBinary || false;
        const currentLevel = isBin
          ? (status === "completed" ? 1 : status === "skipped" ? 0 : null)
          : (status === "completed" ? 2 : status === "minimum" ? 1 : status === "skipped" ? 0 : null);
        const boxClass = status === "completed" ? "bg-emerald-500 border-emerald-600 text-white"
          : status === "minimum" ? "bg-yellow-300 border-yellow-400 text-yellow-800 dark:bg-yellow-400/40 dark:border-yellow-400/60 dark:text-yellow-200"
          : status === "skipped" ? "bg-red-400 border-red-500 text-white dark:bg-red-500/40 dark:border-red-500/60"
          : "border-muted-foreground/30 text-muted-foreground";

        const cycleLevel = () => {
          if (isBin) {
            if (currentLevel === null) onSetLevel(1, dateStr);
            else if (currentLevel === 1) onSetLevel(0, dateStr);
            else onSetLevel(null, dateStr);
          } else {
            if (currentLevel === null) onSetLevel(2, dateStr);
            else if (currentLevel === 2) onSetLevel(1, dateStr);
            else if (currentLevel === 1) onSetLevel(0, dateStr);
            else onSetLevel(null, dateStr);
          }
        };

        const boxLabel = isBin
          ? (currentLevel === 1 ? "Done" : currentLevel === 0 ? "Skip" : "—")
          : (currentLevel === 2 ? "Full" : currentLevel === 1 ? "Min" : currentLevel === 0 ? "Skip" : "—");

        return (
          <DayCell key={dateStr} dateStr={dateStr} todayStr={todayStr} cellH={cellH}>
            {isScheduled ? (
              <button
                onClick={cycleLevel}
                className={`h-5 w-12 text-[10px] rounded-md border-2 font-medium cursor-pointer ${boxClass}`}
                data-testid={`habit-status-${habit.id}-${dateStr}`}
              >
                {boxLabel}
              </button>
            ) : null}
          </DayCell>
        );
      })}
    </>
  );
}
