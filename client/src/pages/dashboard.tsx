import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { VoiceTextarea } from "@/components/voice-input";
import {
  Sun, Moon, Check, ArrowRight,
  Heart, Shield,
  Target, Minus, Pencil, Plus, X, AlertTriangle,
} from "lucide-react";
import { useLocation } from "wouter";
import { buildProcessUrl } from "@/hooks/use-return-to";
import { format, startOfWeek } from "date-fns";
import type { Purchase, Habit, HabitCompletion, Journal, EisenhowerEntry, MonthlyGoal, Task, CustomTool } from "@shared/schema";
import { ContainmentModal } from "@/components/tools/containment-modal";
import { TriggerLogModal } from "@/components/tools/trigger-log-modal";
import { AvoidanceToolModal } from "@/components/tools/avoidance-tool-modal";
import { CustomToolsCard, AddCustomToolModal, CustomToolExerciseModal } from "@/components/tools/custom-tool-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SKIP_REASONS = [
  "Low Capacity (sleep / fatigue / depleted)",
  "High System Load",
  "Avoidance (emotion-driven)",
  "Forgot / No Cue",
  "Unclear Next Step",
  "Overcommitted / Too Many Tasks",
  "Distraction / Poor Environment",
  "Unexpected Interruption",
  "Low Motivation / Value Disconnect",
  "Intentional Deprioritization",
];

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const CATEGORY_STYLES: Record<string, string> = {
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

function Q2TimeTracker({ item, onSave }: {
  item: EisenhowerEntry;
  onSave: (fields: { scheduledStartTime?: string | null; actualStartTime?: string | null; durationMinutes?: number | null; actualDuration?: number | null }) => void;
}) {
  const [sched, setSched] = useState(item.scheduledStartTime || "");
  const [actual, setActual] = useState(item.actualStartTime || "");
  const [planned, setPlanned] = useState(item.durationMinutes ? String(item.durationMinutes) : "");
  const [actualDur, setActualDur] = useState(item.actualDuration ? String(item.actualDuration) : "");
  const [dirty, setDirty] = useState(false);

  return (
    <div className="ml-14 grid grid-cols-2 gap-2 py-1" data-testid={`q2-time-${item.id}`}>
      <div>
        <label className="text-[10px] text-muted-foreground">Scheduled Start</label>
        <Input type="time" value={sched} onChange={(e) => { setSched(e.target.value); setDirty(true); }} className="h-7 text-xs" data-testid={`q2-sched-start-${item.id}`} />
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground">Actual Start</label>
        <Input type="time" value={actual} onChange={(e) => { setActual(e.target.value); setDirty(true); }} className="h-7 text-xs" data-testid={`q2-actual-start-${item.id}`} />
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground">Planned (min)</label>
        <Input type="number" value={planned} onChange={(e) => { setPlanned(e.target.value); setDirty(true); }} className="h-7 text-xs" min="1" data-testid={`q2-planned-dur-${item.id}`} />
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground">Actual (min)</label>
        <Input type="number" value={actualDur} onChange={(e) => { setActualDur(e.target.value); setDirty(true); }} className="h-7 text-xs" min="1" data-testid={`q2-actual-dur-${item.id}`} />
      </div>
      {dirty && (
        <div className="col-span-2 flex justify-end">
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => {
            onSave({
              scheduledStartTime: sched || null,
              actualStartTime: actual || null,
              durationMinutes: planned ? parseInt(planned) : null,
              actualDuration: actualDur ? parseInt(actualDur) : null,
            });
            setDirty(false);
          }} data-testid={`q2-time-save-${item.id}`}>
            Save Times
          </Button>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const weekStartDate = startOfWeek(today, { weekStartsOn: 1 });
  const weekStartStr = format(weekStartDate, "yyyy-MM-dd");

  const { data: purchases } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
    enabled: !!user,
  });

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: !!user,
  });

  const { data: habitCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions", todayStr],
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: journals = [] } = useQuery<Journal[]>({
    queryKey: ["/api/journals"],
    enabled: !!user,
  });

  const { data: eisenhowerEntries = [] } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower"],
    enabled: !!user,
  });

  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: !!user,
  });

  const currentMonthKey = format(today, "yyyy-MM");

  const { data: monthlyGoal, isSuccess: monthlyGoalLoaded } = useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal", currentMonthKey],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-goal?month=${currentMonthKey}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user,
  });

  const hasPhase12 = purchases?.some(
    (p) =>
      p.courseType === "phase12" ||
      p.courseType === "allinone" ||
      p.courseType === "course1" ||
      p.courseType === "course2" ||
      p.courseType === "bundle"
  );

  const todayDayCode = DAY_CODES[today.getDay()];
  const todaysHabits = habits.filter((h) => {
    if (!h.active) return false;
    if (!h.cadence.split(",").includes(todayDayCode)) return false;
    if (h.startDate && todayStr < h.startDate) return false;
    if (h.endDate && todayStr > h.endDate) return false;
    return true;
  });

  const habitStatusMap = new Map<number, string>();
  habitCompletions.forEach((hc) => {
    habitStatusMap.set(hc.habitId, hc.status || "completed");
  });

  const todayJournals = journals.filter((j) => j.date === todayStr);
  const hasMorning = todayJournals.some((j) => j.session === "morning");
  const hasEvening = todayJournals.some((j) => j.session === "evening");

  const todayTasks = allTasks.filter(t => t.date === todayStr).slice(0, 3);

  const todayQ2Items = eisenhowerEntries.filter((e) => {
    if (e.quadrant !== "q2") return false;
    if (e.scheduledDate) return e.scheduledDate === todayStr;
    if (e.deadline) return e.deadline === todayStr;
    return false;
  });

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const overdueItems = eisenhowerEntries.filter((e) => {
    if (e.status === "completed" || e.status === "minimum" || e.status === "skipped" || e.completed) return false;
    if (e.quadrant !== "q1" && e.quadrant !== "q2") return false;
    const itemDate = e.scheduledDate || e.deadline;
    if (!itemDate) return false;
    if (itemDate > todayStr) return false;
    if (itemDate < todayStr) return true;
    if (e.scheduledStartTime) {
      const [h, m] = e.scheduledStartTime.split(":").map(Number);
      const scheduledTime = new Date(today);
      scheduledTime.setHours(h, m, 0, 0);
      return scheduledTime < oneHourAgo;
    }
    if (e.scheduledTime) {
      const match = e.scheduledTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (match) {
        let h = parseInt(match[1]);
        const m = parseInt(match[2]);
        const ampm = match[3].toUpperCase();
        if (ampm === "PM" && h !== 12) h += 12;
        if (ampm === "AM" && h === 12) h = 0;
        const scheduledTime = new Date(today);
        scheduledTime.setHours(h, m, 0, 0);
        return scheduledTime < oneHourAgo;
      }
    }
    return false;
  });

  const setHabitLevelMutation = useMutation({
    mutationFn: async ({ habitId, level, skipReason }: { habitId: number; level: number | null; skipReason?: string }) => {
      let res;
      if (level === null) {
        res = await apiRequest("DELETE", `/api/habit-completions/${habitId}/${todayStr}`);
      } else {
        const status = level === 2 ? "completed" : level === 1 ? "minimum" : "skipped";
        const existing = habitCompletions.some(hc => hc.habitId === habitId);
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

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, { completed: !completed });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update task");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not update task", description: error.message, variant: "destructive" });
    },
  });

  const setEisenhowerLevelMutation = useMutation({
    mutationFn: async ({ id, level, skipReason, scheduledStartTime, actualStartTime, durationMinutes, actualDuration }: {
      id: number; level: number | null; skipReason?: string;
      scheduledStartTime?: string | null; actualStartTime?: string | null;
      durationMinutes?: number | null; actualDuration?: number | null;
    }) => {
      let status: string | null;
      if (level === null) { status = null; }
      else if (level === 0) { status = "skipped"; }
      else if (level === 1) { status = "minimum"; }
      else { status = "completed"; }
      const body: Record<string, unknown> = { status, completionLevel: level };
      if (skipReason) body.skipReason = skipReason;
      if (scheduledStartTime !== undefined) body.scheduledStartTime = scheduledStartTime;
      if (actualStartTime !== undefined) body.actualStartTime = actualStartTime;
      if (durationMinutes !== undefined) body.durationMinutes = durationMinutes;
      if (actualDuration !== undefined) body.actualDuration = actualDuration;
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

  const isGoalComplete = (g: MonthlyGoal | undefined) => {
    if (!g) return false;
    const requiredFields = [g.value, g.strengths, g.advantage, g.goalWhat, g.goalWhen, g.goalWhere, g.goalHow, g.successProof, g.proofMetric, g.weeklyBehavior, g.bestResult, g.innerObstacle, g.obstacleTrigger, g.obstacleThought, g.obstacleEmotion, g.obstacleBehavior, g.ifThenPlan1, g.ifThenPlan2, g.prize, g.fun, g.deadline];
    return requiredFields.every(f => f && f.trim().length > 0);
  };

  const redirectedRef = useRef(false);
  useEffect(() => {
    if (monthlyGoalLoaded && !isGoalComplete(monthlyGoal) && !redirectedRef.current) {
      redirectedRef.current = true;
      setLocation(buildProcessUrl("/goal-wizard", "/dashboard"));
    }
  }, [monthlyGoalLoaded, monthlyGoal, setLocation]);

  const [quickToolOpen, setQuickToolOpen] = useState<string | null>(null);
  const [showAddCustomTool, setShowAddCustomTool] = useState(false);
  const [customToolExercise, setCustomToolExercise] = useState<CustomTool | null>(null);
  const [habitSkipDialog, setHabitSkipDialog] = useState<{ habitId: number } | null>(null);
  const [eisenhowerSkipDialog, setEisenhowerSkipDialog] = useState<{ id: number } | null>(null);

  const { data: customTools = [] } = useQuery<CustomTool[]>({
    queryKey: ["/api/custom-tools"],
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
          <Skeleton className="h-24 w-full" data-testid="skeleton-header" />
          <Skeleton className="h-48 w-full" data-testid="skeleton-habits" />
          <Skeleton className="h-32 w-full" data-testid="skeleton-tasks" />
        </div>
      </AppLayout>
    );
  }

  const currentHour = new Date().getHours();
  const morningSkipped = !hasMorning && currentHour >= 12;

  const journalHabitItems = hasPhase12 ? [
    { id: -1, name: "Morning Journal", isMorning: true, done: hasMorning, skipped: morningSkipped },
    { id: -2, name: "Evening Journal", isMorning: false, done: hasEvening, skipped: false },
  ] : [];

  const completedHabits = todaysHabits.filter(h => habitStatusMap.get(h.id) === "completed").length + journalHabitItems.filter(j => j.done).length;
  const totalHabits = todaysHabits.length + journalHabitItems.length;
  const goalDisplay = monthlyGoal?.goalWhat?.trim() || monthlyGoal?.goalStatement?.trim() || "";

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap" data-testid="today-header">
          <div>
            <h1 className="font-serif text-2xl font-bold" data-testid="text-today-title">
              {format(today, "EEEE, MMM d")}
            </h1>
            {goalDisplay && (
              <p className="text-sm text-muted-foreground mt-0.5" data-testid="text-monthly-promise">
                <Target className="h-3 w-3 inline mr-1" />
                {goalDisplay}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!hasMorning && hasPhase12 && (
              <Button
                size="sm"
                onClick={() => { setLocation(`/journal/${todayStr}/morning`); window.scrollTo(0, 0); }}
                data-testid="button-morning-journal"
              >
                <Sun className="h-4 w-4 mr-1" />
                Morning
              </Button>
            )}
            {hasMorning && !hasEvening && hasPhase12 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setLocation(`/journal/${todayStr}/evening`); window.scrollTo(0, 0); }}
                data-testid="button-evening-journal"
              >
                <Moon className="h-4 w-4 mr-1" />
                Evening
              </Button>
            )}
          </div>
        </div>

        {(todaysHabits.length > 0 || journalHabitItems.length > 0) && (
          <Card className="overflow-visible" data-testid="card-daily-habits">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-base font-serif">Due Today</CardTitle>
                <span className="text-xs text-muted-foreground" data-testid="text-habits-progress">
                  {completedHabits}/{totalHabits} done
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 0}%` }}
                />
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <ul className="space-y-2">
                {journalHabitItems.map((jh) => (
                  <li key={jh.id} className="flex items-center gap-3" data-testid={`journal-habit-${jh.isMorning ? "morning" : "evening"}`}>
                    <div className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${
                      jh.done ? "bg-primary border-primary" : jh.skipped ? "bg-yellow-300 border-yellow-400 dark:bg-yellow-400/30 dark:border-yellow-400/50" : "border-border"
                    }`}>
                      {jh.done && <Check className="h-3 w-3 text-primary-foreground" />}
                      {jh.skipped && <Minus className="h-3 w-3 text-yellow-700 dark:text-yellow-300" />}
                    </div>
                    <span className="h-2 w-2 rounded-full shrink-0 bg-violet-400" />
                    <button
                      className={`text-sm flex-1 text-left hover:underline ${jh.done ? "line-through text-muted-foreground" : jh.skipped ? "text-muted-foreground italic" : ""}`}
                      onClick={() => {
                        const session = jh.isMorning ? "morning" : "evening";
                        setLocation(`/journal/${todayStr}/${session}`);
                        window.scrollTo(0, 0);
                      }}
                      data-testid={`button-journal-habit-${jh.isMorning ? "morning" : "evening"}`}
                    >
                      {jh.name}
                    </button>
                    {jh.done && <span className="text-xs text-muted-foreground">done</span>}
                    {jh.skipped && <span className="text-xs text-muted-foreground">skipped</span>}
                  </li>
                ))}
                {todaysHabits.map((habit) => {
                  const status = habitStatusMap.get(habit.id) || null;
                  const catStyle = CATEGORY_STYLES[(habit.category as string) || "health"] || CATEGORY_STYLES.health;
                  return (
                    <li key={habit.id} className="flex items-center gap-3" data-testid={`habit-item-${habit.id}`}>
                      <Select
                        value={status === "completed" ? "2" : status === "minimum" ? "1" : status === "skipped" ? "0" : "clear_value"}
                        onValueChange={(v) => {
                          if (v === "clear_value") {
                            setHabitLevelMutation.mutate({ habitId: habit.id, level: null });
                          } else if (v === "0") {
                            setHabitSkipDialog({ habitId: habit.id });
                          } else {
                            setHabitLevelMutation.mutate({ habitId: habit.id, level: Number(v) });
                          }
                        }}
                      >
                        <SelectTrigger
                          className={`h-5 w-12 text-[10px] px-1 rounded-md border-2 shrink-0 ${
                            status === "completed" ? "bg-emerald-500 border-emerald-600 text-white"
                            : status === "minimum" ? "bg-yellow-300 border-yellow-400 text-yellow-800 dark:bg-yellow-400/40 dark:border-yellow-400/60 dark:text-yellow-200"
                            : status === "skipped" ? "bg-red-400 border-red-500 text-white dark:bg-red-500/40 dark:border-red-500/60"
                            : "border-border"
                          }`}
                          data-testid={`habit-level-${habit.id}`}
                        >
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="clear_value">—</SelectItem>
                          <SelectItem value="2">2 – Full</SelectItem>
                          <SelectItem value="1">1 – Min</SelectItem>
                          <SelectItem value="0">0 – Skip</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className={`h-2 w-2 rounded-full shrink-0 ${catStyle}`} />
                      <span className={`text-sm flex-1 ${
                        status === "completed" ? "line-through text-muted-foreground" : status === "skipped" ? "text-muted-foreground italic" : ""
                      }`}>
                        {habit.name}
                      </span>
                      {status === "skipped" && (
                        <span className="text-xs text-muted-foreground">skipped</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {todaysHabits.length === 0 && journalHabitItems.length === 0 && (
          <Card className="overflow-visible" data-testid="card-no-habits">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground" data-testid="text-no-habits">No habits due today.</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setLocation(buildProcessUrl("/habits", "/dashboard"))} data-testid="button-add-habits">
                <Plus className="h-4 w-4 mr-1" />
                Set up habits
              </Button>
            </CardContent>
          </Card>
        )}

        {todayTasks.length > 0 && (
          <Card className="overflow-visible" data-testid="card-today-tasks">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-base font-serif">Top Tasks</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setLocation("/tasks")} data-testid="button-manage-tasks">
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <ul className="space-y-2">
                {todayTasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-3" data-testid={`task-item-${task.id}`}>
                    <button
                      className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                        task.completed ? "bg-primary border-primary" : "border-border"
                      }`}
                      onClick={() => toggleTaskMutation.mutate({ id: task.id, completed: task.completed || false })}
                      data-testid={`task-toggle-${task.id}`}
                    >
                      {task.completed && <Check className="h-3 w-3 text-primary-foreground" />}
                    </button>
                    <span className={`text-sm flex-1 ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </span>
                    {task.quadrant && (
                      <Badge variant="outline" className="text-[10px]">{task.quadrant.toUpperCase()}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {overdueItems.length > 0 && (
          <Card className="overflow-visible border-red-300 dark:border-red-500/50 bg-red-50/50 dark:bg-red-950/20" data-testid="card-overdue">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <CardTitle className="text-base font-serif text-red-700 dark:text-red-400">Overdue</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <ul className="space-y-2">
                {overdueItems.map((item) => {
                  const roleDot = CATEGORY_STYLES[(item.role as string) || "health"] || CATEGORY_STYLES.health;
                  return (
                    <li key={item.id} className="flex items-center gap-3" data-testid={`overdue-item-${item.id}`}>
                      <Select
                        value={item.completionLevel != null ? String(item.completionLevel) : "clear_value"}
                        onValueChange={(v) => {
                          if (v === "clear_value") {
                            setEisenhowerLevelMutation.mutate({ id: item.id, level: null });
                          } else if (v === "0") {
                            setEisenhowerSkipDialog({ id: item.id });
                          } else {
                            setEisenhowerLevelMutation.mutate({ id: item.id, level: Number(v) });
                          }
                        }}
                      >
                        <SelectTrigger
                          className={`h-5 w-12 text-[10px] px-1 rounded-md border-2 shrink-0 ${
                            item.completionLevel === 2 ? "bg-emerald-500 border-emerald-600 text-white"
                            : item.completionLevel === 1 ? "bg-yellow-300 border-yellow-400 text-yellow-800"
                            : item.completionLevel === 0 ? "bg-red-400 border-red-500 text-white"
                            : "border-red-300 dark:border-red-500/50"
                          }`}
                          data-testid={`overdue-level-${item.id}`}
                        >
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="clear_value">—</SelectItem>
                          <SelectItem value="2">2 – Full</SelectItem>
                          <SelectItem value="1">1 – Min</SelectItem>
                          <SelectItem value="0">0 – Skip</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className={`h-2 w-2 rounded-full shrink-0 ${roleDot}`} />
                      <span className="text-sm flex-1">{item.task}</span>
                      <Badge variant="outline" className="text-[10px] border-red-300 text-red-600 dark:text-red-400">{item.quadrant?.toUpperCase()}</Badge>
                      {(item.scheduledDate || item.deadline) && (
                        <span className="text-xs text-red-500 dark:text-red-400">
                          {item.scheduledDate || item.deadline}
                        </span>
                      )}
                      {item.scheduledTime && (
                        <span className="text-xs text-muted-foreground">{item.scheduledTime}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {todayQ2Items.length > 0 && (
          <Card className="overflow-visible" data-testid="card-q2-blocks">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-serif">Scheduled Q2 Blocks</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ul className="space-y-2">
                {todayQ2Items.map((item) => {
                  const status = item.status || null;
                  const roleDot = CATEGORY_STYLES[(item.role as string) || "health"] || CATEGORY_STYLES.health;
                  return (
                    <li key={item.id} className="flex flex-col gap-1" data-testid={`q2-block-${item.id}`}>
                      <div className="flex items-center gap-3">
                      <Select
                        value={item.completionLevel != null ? String(item.completionLevel) : "clear_value"}
                        onValueChange={(v) => {
                          if (v === "clear_value") {
                            setEisenhowerLevelMutation.mutate({ id: item.id, level: null });
                          } else if (v === "0") {
                            setEisenhowerSkipDialog({ id: item.id });
                          } else {
                            setEisenhowerLevelMutation.mutate({ id: item.id, level: Number(v) });
                          }
                        }}
                      >
                        <SelectTrigger
                          className={`h-5 w-12 text-[10px] px-1 rounded-md border-2 shrink-0 ${
                            item.completionLevel === 2 ? "bg-emerald-500 border-emerald-600 text-white"
                            : item.completionLevel === 1 ? "bg-yellow-300 border-yellow-400 text-yellow-800 dark:bg-yellow-400/40 dark:border-yellow-400/60 dark:text-yellow-200"
                            : item.completionLevel === 0 ? "bg-red-400 border-red-500 text-white dark:bg-red-500/40 dark:border-red-500/60"
                            : "border-border"
                          }`}
                          data-testid={`q2-level-${item.id}`}
                        >
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="clear_value">—</SelectItem>
                          <SelectItem value="2">2 – Full</SelectItem>
                          <SelectItem value="1">1 – Min</SelectItem>
                          <SelectItem value="0">0 – Skip</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className={`h-2 w-2 rounded-full shrink-0 ${roleDot}`} />
                      <span className={`text-sm flex-1 ${
                        status === "completed" ? "line-through text-muted-foreground"
                        : status === "skipped" ? "text-muted-foreground italic"
                        : ""
                      }`}>{item.task}</span>
                      {item.scheduledTime && (
                        <span className="text-xs text-muted-foreground">{item.scheduledTime}</span>
                      )}
                      {item.durationMinutes && (
                        <Badge variant="outline" className="text-[10px]">{item.durationMinutes}m</Badge>
                      )}
                      {status && (
                        <span className="text-xs text-muted-foreground">{status}</span>
                      )}
                      </div>
                      {(item.completionLevel === 1 || item.completionLevel === 2) && (
                        <Q2TimeTracker item={item} onSave={(fields) => {
                          setEisenhowerLevelMutation.mutate({ id: item.id, level: item.completionLevel!, ...fields });
                        }} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        <JournalQuickEntry
          todayStr={todayStr}
          hasMorning={hasMorning}
          hasEvening={hasEvening}
          hasAccess={!!hasPhase12}
          setLocation={setLocation}
        />

        <Card className="overflow-visible" data-testid="card-quick-tools">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-serif">Quick Tools</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1.5 h-auto py-3"
                onClick={() => setQuickToolOpen("containment")}
                data-testid="button-tool-containment"
              >
                <Heart className="h-5 w-5 text-rose-500" />
                <span className="text-xs">Containment</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1.5 h-auto py-3"
                onClick={() => setQuickToolOpen("trigger")}
                data-testid="button-tool-trigger"
              >
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="text-xs">Trigger Log</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1.5 h-auto py-3"
                onClick={() => setQuickToolOpen("avoidance")}
                data-testid="button-tool-avoidance"
              >
                <Shield className="h-5 w-5 text-blue-500" />
                <span className="text-xs">Avoidance</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <CustomToolsCard
          customTools={customTools}
          onAdd={() => setShowAddCustomTool(true)}
          onUse={(tool) => setCustomToolExercise(tool)}
        />
      </div>

      <ContainmentModal open={quickToolOpen === "containment"} onClose={() => setQuickToolOpen(null)} />
      <TriggerLogModal open={quickToolOpen === "trigger"} onClose={() => setQuickToolOpen(null)} />
      <AvoidanceToolModal open={quickToolOpen === "avoidance"} onClose={() => setQuickToolOpen(null)} />
      <AddCustomToolModal
        open={showAddCustomTool}
        onClose={() => setShowAddCustomTool(false)}
        existingCount={customTools.filter(t => t.active).length}
      />
      <CustomToolExerciseModal
        open={!!customToolExercise}
        onClose={() => setCustomToolExercise(null)}
        tool={customToolExercise}
      />

      <Dialog open={!!habitSkipDialog} onOpenChange={(open) => { if (!open) setHabitSkipDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Why was this skipped?</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {SKIP_REASONS.map((reason, i) => (
              <button
                key={i}
                className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-muted transition-colors"
                onClick={() => {
                  if (habitSkipDialog) {
                    setHabitLevelMutation.mutate({ habitId: habitSkipDialog.habitId, level: 0, skipReason: reason });
                    setHabitSkipDialog(null);
                  }
                }}
                data-testid={`habit-skip-reason-${i}`}
              >
                {reason}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!eisenhowerSkipDialog} onOpenChange={(open) => { if (!open) setEisenhowerSkipDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Why was this skipped?</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {SKIP_REASONS.map((reason, i) => (
              <button
                key={i}
                className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-muted transition-colors"
                onClick={() => {
                  if (eisenhowerSkipDialog) {
                    setEisenhowerLevelMutation.mutate({ id: eisenhowerSkipDialog.id, level: 0, skipReason: reason });
                    setEisenhowerSkipDialog(null);
                  }
                }}
                data-testid={`eisenhower-skip-reason-${i}`}
              >
                {reason}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function JournalQuickEntry({
  todayStr,
  hasMorning,
  hasEvening,
  hasAccess,
  setLocation,
}: {
  todayStr: string;
  hasMorning: boolean;
  hasEvening: boolean;
  hasAccess: boolean;
  setLocation: (path: string) => void;
}) {
  const queryClient = useQueryClient();
  const [quickNote, setQuickNote] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { toast: journalToast } = useToast();

  const saveMutation = useMutation({
    mutationFn: async (note: string) => {
      const session = hasMorning ? "evening" : "morning";
      const res = await apiRequest("PUT", "/api/journals", {
        date: todayStr,
        session,
        reflections: note,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to save journal");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journals"] });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: (error: Error) => {
      setSaveStatus("idle");
      journalToast({ title: "Could not save journal", description: error.message, variant: "destructive" });
    },
  });

  const handleNoteChange = useCallback((value: string) => {
    setQuickNote(value);
    setSaveStatus("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value.trim()) {
        saveMutation.mutate(value);
      } else {
        setSaveStatus("idle");
      }
    }, 1500);
  }, [saveMutation]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!hasAccess) return null;

  return (
    <Card className="overflow-visible" data-testid="card-journal-quick">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-base font-serif">
            {hasMorning ? "Evening Thought" : "Morning Thought"}
          </CardTitle>
          <div className="flex items-center gap-2">
            {saveStatus === "saving" && (
              <span className="text-xs text-muted-foreground" data-testid="text-save-status">Saving...</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-xs text-green-600 dark:text-green-400" data-testid="text-save-status">
                <Check className="h-3 w-3 inline mr-0.5" />
                Saved
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const session = hasMorning ? "evening" : "morning";
                setLocation(`/journal/${todayStr}/${session}`);
                window.scrollTo(0, 0);
              }}
              data-testid="button-expand-journal"
            >
              Expand
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <VoiceTextarea
          value={quickNote}
          onChange={handleNoteChange}
          placeholder={hasMorning ? "What's on your mind this evening?" : "Set your intention for today..."}
          rows={2}
          className="resize-none text-sm"
          data-testid="textarea-quick-journal"
        />
      </CardContent>
    </Card>
  );
}
