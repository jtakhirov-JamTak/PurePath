import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Sun, Moon, Check, ArrowRight, ChevronDown,
  Heart, Shield, BedDouble, Activity, Footprints, Clock,
  Target, Minus, Pencil, Plus, X, AlertTriangle,
  Brain, Pause, Flame, Trophy,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { buildProcessUrl } from "@/hooks/use-return-to";
import { format, startOfWeek, addDays } from "date-fns";
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

function parseTimeEstimateMinutes(est: string | null | undefined): number | null {
  if (!est) return null;
  const lower = est.toLowerCase().trim();
  const hMatch = lower.match(/(\d+)\s*h/);
  const mMatch = lower.match(/(\d+)\s*m/);
  let total = 0;
  if (hMatch) total += parseInt(hMatch[1]) * 60;
  if (mMatch) total += parseInt(mMatch[1]);
  return total > 0 ? total : null;
}

function formatTime24to12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const DELAY_REASONS = [
  "Low Capacity (sleep / fatigue / depleted)",
  "Distraction / Poor Environment",
  "Unexpected Interruption",
  "Overcommitted / Too Many Tasks",
  "Avoidance (emotion-driven)",
  "Forgot / No Cue",
  "Unclear Next Step",
  "Low Motivation / Value Disconnect",
  "Intentional Deprioritization",
  "Other",
];

const MINUTE_INCREMENTS = [15, 30, 45, 60, 75, 90, 105, 120];

function Q2TimeTracker({ item, onSave }: {
  item: EisenhowerEntry;
  onSave: (fields: Record<string, unknown>) => void;
}) {
  const [onTime, setOnTime] = useState<boolean | null>(item.startedOnTime ?? null);
  const [delayMin, setDelayMin] = useState<number | null>(item.delayMinutes ?? null);
  const [delayRsn, setDelayRsn] = useState(item.delayReason || "");
  const [completedTime, setCompletedTime] = useState<boolean | null>(item.completedRequiredTime ?? null);
  const [shortMin, setShortMin] = useState<number | null>(item.timeShortMinutes ?? null);
  const [dirty, setDirty] = useState(false);

  const derivedMinutes = item.durationMinutes || parseTimeEstimateMinutes(item.timeEstimate);

  return (
    <div className="ml-14 space-y-2 py-1" data-testid={`q2-time-${item.id}`}>
      {item.scheduledStartTime && (
        <p className="text-[10px] text-muted-foreground">Scheduled: {item.scheduledStartTime}</p>
      )}
      {(derivedMinutes || item.timeEstimate) && (
        <p className="text-[10px] text-muted-foreground">Required: {derivedMinutes ? `${derivedMinutes} min` : item.timeEstimate}</p>
      )}
      <div>
        <label className="text-[10px] text-muted-foreground block mb-1">Did you start on time?</label>
        <div className="flex gap-1">
          <Button size="sm" variant={onTime === true ? "default" : "outline"} className="h-6 text-xs px-3"
            onClick={() => { setOnTime(true); setDelayMin(null); setDelayRsn(""); setDirty(true); }}
            data-testid={`q2-ontime-yes-${item.id}`}
          >Yes</Button>
          <Button size="sm" variant={onTime === false ? "destructive" : "outline"} className="h-6 text-xs px-3"
            onClick={() => { setOnTime(false); setDirty(true); }}
            data-testid={`q2-ontime-no-${item.id}`}
          >No</Button>
        </div>
      </div>
      {onTime === false && (
        <>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">How many minutes delay?</label>
            <Select value={delayMin != null ? String(delayMin) : ""} onValueChange={(v) => { setDelayMin(Number(v)); setDirty(true); }}>
              <SelectTrigger className="h-7 text-xs w-32" data-testid={`q2-delay-min-${item.id}`}>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {MINUTE_INCREMENTS.map(m => (
                  <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">Reason for delay?</label>
            <Select value={delayRsn} onValueChange={(v) => { setDelayRsn(v); setDirty(true); }}>
              <SelectTrigger className="h-7 text-xs" data-testid={`q2-delay-reason-${item.id}`}>
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {DELAY_REASONS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      <div>
        <label className="text-[10px] text-muted-foreground block mb-1">Did you complete required time?</label>
        <div className="flex gap-1">
          <Button size="sm" variant={completedTime === true ? "default" : "outline"} className="h-6 text-xs px-3"
            onClick={() => { setCompletedTime(true); setShortMin(null); setDirty(true); }}
            data-testid={`q2-completed-yes-${item.id}`}
          >Yes</Button>
          <Button size="sm" variant={completedTime === false ? "destructive" : "outline"} className="h-6 text-xs px-3"
            onClick={() => { setCompletedTime(false); setDirty(true); }}
            data-testid={`q2-completed-no-${item.id}`}
          >No</Button>
        </div>
      </div>
      {completedTime === false && (
        <div>
          <label className="text-[10px] text-muted-foreground block mb-1">How many minutes less?</label>
          <Select value={shortMin != null ? String(shortMin) : ""} onValueChange={(v) => { setShortMin(Number(v)); setDirty(true); }}>
            <SelectTrigger className="h-7 text-xs w-32" data-testid={`q2-short-min-${item.id}`}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {MINUTE_INCREMENTS.map(m => (
                <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {dirty && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => {
            onSave({
              startedOnTime: onTime,
              delayMinutes: onTime === false ? delayMin : null,
              delayReason: onTime === false ? (delayRsn || null) : null,
              completedRequiredTime: completedTime,
              timeShortMinutes: completedTime === false ? shortMin : null,
            });
            setDirty(false);
          }} data-testid={`q2-time-save-${item.id}`}>
            Save
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

  const { data: onboarding, isLoading: onboardingLoading } = useQuery<{ onboardingStep: number; onboardingComplete: boolean }>({
    queryKey: ["/api/onboarding"],
    enabled: !!user,
  });

  const { data: purchases } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
    enabled: !!user,
  });

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: !!user,
  });

  const weekEndStr = format(addDays(weekStartDate, 6), "yyyy-MM-dd");

  const { data: habitCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions", todayStr],
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: weekHabitCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions/range", weekStartStr, weekEndStr],
    enabled: !!user,
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
  const habitLevelMap = new Map<number, number>();
  habitCompletions.forEach((hc) => {
    habitStatusMap.set(hc.habitId, hc.status || "completed");
    if (hc.completionLevel != null) {
      habitLevelMap.set(hc.habitId, hc.completionLevel);
    } else {
      const fallback = hc.status === "completed" ? 2 : hc.status === "minimum" ? 1 : hc.status === "skipped" ? 0 : null;
      if (fallback != null) habitLevelMap.set(hc.habitId, fallback);
    }
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
    mutationFn: async ({ habitId, level, skipReason, isBinary }: { habitId: number; level: number | null; skipReason?: string; isBinary?: boolean }) => {
      let res;
      if (level === null) {
        res = await apiRequest("DELETE", `/api/habit-completions/${habitId}/${todayStr}`);
      } else {
        const status = (isBinary && level === 1) ? "completed" : level === 2 ? "completed" : level === 1 ? "minimum" : "skipped";
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
    mutationFn: async ({ id, level, skipReason, scheduledStartTime, actualStartTime, durationMinutes, actualDuration, isBinary,
      startedOnTime, delayMinutes, delayReason, completedRequiredTime, timeShortMinutes }: {
      id: number; level: number | null; skipReason?: string; isBinary?: boolean;
      scheduledStartTime?: string | null; actualStartTime?: string | null;
      durationMinutes?: number | null; actualDuration?: number | null;
      startedOnTime?: boolean | null; delayMinutes?: number | null; delayReason?: string | null;
      completedRequiredTime?: boolean | null; timeShortMinutes?: number | null;
    }) => {
      let status: string | null;
      if (level === null) { status = null; }
      else if (level === 0) { status = "skipped"; }
      else if (isBinary && level === 1) { status = "completed"; }
      else if (level === 1) { status = "minimum"; }
      else { status = "completed"; }
      const body: Record<string, unknown> = { status, completionLevel: level };
      if (skipReason) body.skipReason = skipReason;
      if (scheduledStartTime !== undefined) body.scheduledStartTime = scheduledStartTime;
      if (actualStartTime !== undefined) body.actualStartTime = actualStartTime;
      if (durationMinutes !== undefined) body.durationMinutes = durationMinutes;
      if (actualDuration !== undefined) body.actualDuration = actualDuration;
      if (startedOnTime !== undefined) body.startedOnTime = startedOnTime;
      if (delayMinutes !== undefined) body.delayMinutes = delayMinutes;
      if (delayReason !== undefined) body.delayReason = delayReason;
      if (completedRequiredTime !== undefined) body.completedRequiredTime = completedRequiredTime;
      if (timeShortMinutes !== undefined) body.timeShortMinutes = timeShortMinutes;
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
  const [eisenhowerSkipDialog, setEisenhowerSkipDialog] = useState<{ id: number; durationMinutes?: number | null; timeEstimate?: string | null } | null>(null);
  const [stillnessOpen, setStillnessOpen] = useState(false);
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set());
  const [stillnessSeconds, setStillnessSeconds] = useState(600);
  const [stillnessRunning, setStillnessRunning] = useState(false);
  const stillnessRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (stillnessRunning && stillnessSeconds > 0) {
      stillnessRef.current = setInterval(() => {
        setStillnessSeconds(prev => {
          if (prev <= 1) {
            setStillnessRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (stillnessRef.current) clearInterval(stillnessRef.current); };
  }, [stillnessRunning, stillnessSeconds]);

  const { data: customTools = [] } = useQuery<CustomTool[]>({
    queryKey: ["/api/custom-tools"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!onboardingLoading && onboarding && !onboarding.onboardingComplete) {
      window.location.href = "/setup";
    }
  }, [onboarding, onboardingLoading]);

  if (authLoading || onboardingLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 min-w-0 space-y-6">
              <Skeleton className="h-24 w-full" data-testid="skeleton-header" />
              <Skeleton className="h-48 w-full" data-testid="skeleton-habits" />
              <Skeleton className="h-32 w-full" data-testid="skeleton-tasks" />
            </div>
            <div className="w-full md:w-72 md:flex-shrink-0">
              <Skeleton className="h-64 w-full" data-testid="skeleton-progress" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (onboarding && !onboarding.onboardingComplete) {
    return null;
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

  const progressMetrics = useMemo(() => {
    const weekDays: Date[] = [];
    for (let d = 0; d < 7; d++) weekDays.push(addDays(weekStartDate, d));
    const weekDayStrs = weekDays.map(d => format(d, "yyyy-MM-dd"));
    const pastDayStrs = weekDayStrs.filter(d => d <= todayStr);

    let sleepWins = 0;
    let sleepNights = 0;
    const sleepDetails: { date: string; hours: number; isWin: boolean }[] = [];
    for (const dayStr of pastDayStrs) {
      const mj = journals.find(j => j.date === dayStr && j.session === "morning");
      if (mj && mj.content) {
        try {
          const c = JSON.parse(mj.content);
          if (c.sleepHours) {
            sleepNights++;
            const hrs = parseFloat(c.sleepHours);
            const isWin = !isNaN(hrs) && hrs >= 7 && hrs <= 9;
            if (isWin) sleepWins++;
            sleepDetails.push({ date: dayStr, hours: hrs, isWin });
          }
        } catch {}
      }
    }

    let consistencyPoints = 0;
    let consistencyMax = 0;
    const habitTracker: Record<number, { name: string; scheduled: number; completed: number; points: number; maxPoints: number }> = {};
    for (const dayStr of pastDayStrs) {
      const day = new Date(dayStr + "T12:00:00");
      const dayCode = DAY_CODES[day.getDay()];
      const scheduledHabits = habits.filter(h => {
        if (!h.active) return false;
        if (!h.cadence.split(",").includes(dayCode)) return false;
        if (h.startDate && dayStr < h.startDate) return false;
        if (h.endDate && dayStr > h.endDate) return false;
        return true;
      });
      scheduledHabits.forEach(h => {
        const maxPts = h.isBinary ? 1 : 2;
        consistencyMax += maxPts;
        if (!habitTracker[h.id]) habitTracker[h.id] = { name: h.name, scheduled: 0, completed: 0, points: 0, maxPoints: 0 };
        habitTracker[h.id].scheduled++;
        habitTracker[h.id].maxPoints += maxPts;
        const hc = weekHabitCompletions.find(c => c.habitId === h.id && c.date === dayStr);
        if (hc) {
          if (h.isBinary) {
            if (hc.completionLevel === 1) { consistencyPoints += 1; habitTracker[h.id].points += 1; habitTracker[h.id].completed++; }
          } else {
            if (hc.completionLevel === 2) { consistencyPoints += 2; habitTracker[h.id].points += 2; habitTracker[h.id].completed++; }
            else if (hc.completionLevel === 1) { consistencyPoints += 1; habitTracker[h.id].points += 1; }
          }
        }
      });
    }
    const habitSummaries = Object.values(habitTracker);
    const weekEisenhower = eisenhowerEntries.filter(e =>
      (e.quadrant === "q1" || e.quadrant === "q2") && e.weekStart === weekStartStr
    );
    const q1ItemDetails: { task: string; points: number; maxPoints: number }[] = [];
    weekEisenhower.filter(e => e.quadrant === "q1").forEach(e => {
      const maxPts = e.isBinary ? 1 : 2;
      consistencyMax += maxPts;
      let earned = 0;
      if (e.isBinary) {
        if (e.completionLevel === 1) { consistencyPoints += 1; earned = 1; }
      } else {
        if (e.completionLevel === 2) { consistencyPoints += 2; earned = 2; }
        else if (e.completionLevel === 1) { consistencyPoints += 1; earned = 1; }
      }
      q1ItemDetails.push({ task: e.task, points: earned, maxPoints: maxPts });
    });
    const consistencyPct = consistencyMax > 0 ? Math.round((consistencyPoints / consistencyMax) * 100) : 0;

    const firstStepItems = weekEisenhower.filter(e => e.quadrant === "q1" && e.role === "self-development");
    const firstStepStarted = firstStepItems.filter(e => e.completionLevel != null && e.completionLevel >= 1).length;
    const firstStepCompleted = firstStepItems.filter(e =>
      e.isBinary ? e.completionLevel === 1 : e.completionLevel === 2
    ).length;
    const firstStepDetails = firstStepItems.map(e => ({
      task: e.task,
      completionLevel: e.completionLevel ?? 0,
      isBinary: !!e.isBinary,
      status: (e.isBinary ? e.completionLevel === 1 : e.completionLevel === 2) ? "done" as const
        : (e.completionLevel != null && e.completionLevel >= 1) ? "started" as const
        : "pending" as const,
    }));

    const q2Items = weekEisenhower.filter(e => e.quadrant === "q2");
    const q2PlannedMin = q2Items.reduce((sum, e) => sum + (e.durationMinutes || parseTimeEstimateMinutes(e.timeEstimate) || 0), 0);
    const q2ActualMin = q2Items.reduce((sum, e) => {
      const planned = e.durationMinutes || parseTimeEstimateMinutes(e.timeEstimate) || 0;
      if (e.completedRequiredTime === true) return sum + planned;
      if (e.completedRequiredTime === false && e.timeShortMinutes != null) return sum + Math.max(0, planned - e.timeShortMinutes);
      if (e.actualDuration != null) return sum + e.actualDuration;
      return sum;
    }, 0);
    const q2Details = q2Items.map(e => {
      const planned = e.durationMinutes || parseTimeEstimateMinutes(e.timeEstimate) || 0;
      let actual = 0;
      if (e.completedRequiredTime === true) actual = planned;
      else if (e.completedRequiredTime === false && e.timeShortMinutes != null) actual = Math.max(0, planned - e.timeShortMinutes);
      else if (e.actualDuration != null) actual = e.actualDuration;
      return {
        task: e.task,
        plannedMin: planned,
        actualMin: actual,
        status: e.status || (e.completed ? "completed" : "pending"),
      };
    });

    return {
      sleepWins, sleepNights, sleepDetails,
      consistencyPoints, consistencyMax, consistencyPct, habitSummaries, q1ItemDetails,
      firstStepTotal: firstStepItems.length, firstStepStarted, firstStepCompleted, firstStepDetails,
      q2ActualMin, q2PlannedMin, q2Details,
    };
  }, [journals, habits, weekHabitCompletions, eisenhowerEntries, weekStartDate, weekStartStr, todayStr]);

  const getProgressColor = (pct: number) => {
    if (pct >= 66) return "bg-emerald-500";
    if (pct >= 33) return "bg-amber-400";
    return "bg-rose-400";
  };

  const toggleMetric = (key: string) => {
    setExpandedMetrics(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr + "T12:00:00");
      if (isNaN(d.getTime())) return "—";
      return format(d, "EEE");
    } catch { return "—"; }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 min-w-0 space-y-5">
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
                  const level = habitLevelMap.get(habit.id) ?? null;
                  const catStyle = CATEGORY_STYLES[(habit.category as string) || "health"] || CATEGORY_STYLES.health;
                  const isBin = habit.isBinary || false;
                  const cycleHabit = () => {
                    if (isBin) {
                      if (level === null || level === undefined) {
                        setHabitLevelMutation.mutate({ habitId: habit.id, level: 1, isBinary: true });
                      } else if (level === 1) {
                        setHabitSkipDialog({ habitId: habit.id });
                      } else {
                        setHabitLevelMutation.mutate({ habitId: habit.id, level: null });
                      }
                    } else {
                      if (level === null || level === undefined) {
                        setHabitLevelMutation.mutate({ habitId: habit.id, level: 2, isBinary: false });
                      } else if (level === 2) {
                        setHabitLevelMutation.mutate({ habitId: habit.id, level: 1, isBinary: false });
                      } else if (level === 1) {
                        setHabitSkipDialog({ habitId: habit.id });
                      } else {
                        setHabitLevelMutation.mutate({ habitId: habit.id, level: null });
                      }
                    }
                  };
                  const boxLabel = isBin
                    ? (level === 1 ? "Done" : level === 0 ? "Skip" : "—")
                    : (level === 2 ? "Full" : level === 1 ? "Min" : level === 0 ? "Skip" : "—");
                  const boxClass =
                    (status === "completed" || (isBin && level === 1)) ? "bg-emerald-500 border-emerald-600 text-white"
                    : status === "minimum" ? "bg-yellow-300 border-yellow-400 text-yellow-800 dark:bg-yellow-400/40 dark:border-yellow-400/60 dark:text-yellow-200"
                    : status === "skipped" ? "bg-red-400 border-red-500 text-white dark:bg-red-500/40 dark:border-red-500/60"
                    : "border-border text-muted-foreground";
                  return (
                    <li key={habit.id} className="flex items-center gap-3" data-testid={`habit-item-${habit.id}`}>
                      <button
                        onClick={cycleHabit}
                        className={`h-5 w-12 text-[10px] rounded-md border-2 shrink-0 font-medium cursor-pointer ${boxClass}`}
                        data-testid={`habit-level-${habit.id}`}
                      >
                        {boxLabel}
                      </button>
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
                  const isBin = item.isBinary || false;
                  const lvl = item.completionLevel ?? null;
                  const cycleOverdue = () => {
                    if (isBin) {
                      if (lvl === null) setEisenhowerLevelMutation.mutate({ id: item.id, level: 1, isBinary: true });
                      else if (lvl === 1) setEisenhowerSkipDialog({ id: item.id, durationMinutes: item.durationMinutes, timeEstimate: item.timeEstimate });
                      else setEisenhowerLevelMutation.mutate({ id: item.id, level: null });
                    } else {
                      if (lvl === null) setEisenhowerLevelMutation.mutate({ id: item.id, level: 2 });
                      else if (lvl === 2) setEisenhowerLevelMutation.mutate({ id: item.id, level: 1 });
                      else if (lvl === 1) setEisenhowerSkipDialog({ id: item.id, durationMinutes: item.durationMinutes, timeEstimate: item.timeEstimate });
                      else setEisenhowerLevelMutation.mutate({ id: item.id, level: null });
                    }
                  };
                  const boxLabel = isBin
                    ? (lvl === 1 ? "Done" : lvl === 0 ? "Skip" : "—")
                    : (lvl === 2 ? "Full" : lvl === 1 ? "Min" : lvl === 0 ? "Skip" : "—");
                  const boxClass =
                    (lvl === 2 || (isBin && lvl === 1)) ? "bg-emerald-500 border-emerald-600 text-white"
                    : lvl === 1 ? "bg-yellow-300 border-yellow-400 text-yellow-800"
                    : lvl === 0 ? "bg-red-400 border-red-500 text-white"
                    : "border-red-300 dark:border-red-500/50 text-muted-foreground";
                  return (
                    <li key={item.id} className="flex flex-col gap-1" data-testid={`overdue-item-${item.id}`}>
                      <div className="flex items-center gap-3">
                      <button
                        onClick={cycleOverdue}
                        className={`h-5 w-12 text-[10px] rounded-md border-2 shrink-0 font-medium cursor-pointer ${boxClass}`}
                        data-testid={`overdue-level-${item.id}`}
                      >
                        {boxLabel}
                      </button>
                      <span className={`h-2 w-2 rounded-full shrink-0 ${roleDot}`} />
                      <span className="text-sm flex-1">{item.task}</span>
                      <Badge variant="outline" className="text-[10px] border-red-300 text-red-600 dark:text-red-400">{item.quadrant?.toUpperCase()}</Badge>
                      {(item.scheduledDate || item.deadline) && (
                        <span className="text-xs text-red-500 dark:text-red-400">
                          {item.scheduledDate || item.deadline}
                        </span>
                      )}
                      {(item.scheduledTime || item.scheduledStartTime) && (
                        <span className="text-xs text-muted-foreground">{item.scheduledTime || formatTime24to12(item.scheduledStartTime!)}</span>
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
                  const isBin = item.isBinary || false;
                  const lvl = item.completionLevel ?? null;
                  const cycleQ2 = () => {
                    if (isBin) {
                      if (lvl === null) setEisenhowerLevelMutation.mutate({ id: item.id, level: 1, isBinary: true });
                      else if (lvl === 1) setEisenhowerSkipDialog({ id: item.id, durationMinutes: item.durationMinutes, timeEstimate: item.timeEstimate });
                      else setEisenhowerLevelMutation.mutate({ id: item.id, level: null });
                    } else {
                      if (lvl === null) setEisenhowerLevelMutation.mutate({ id: item.id, level: 2 });
                      else if (lvl === 2) setEisenhowerLevelMutation.mutate({ id: item.id, level: 1 });
                      else if (lvl === 1) setEisenhowerSkipDialog({ id: item.id, durationMinutes: item.durationMinutes, timeEstimate: item.timeEstimate });
                      else setEisenhowerLevelMutation.mutate({ id: item.id, level: null });
                    }
                  };
                  const boxLabel = isBin
                    ? (lvl === 1 ? "Done" : lvl === 0 ? "Skip" : "—")
                    : (lvl === 2 ? "Full" : lvl === 1 ? "Min" : lvl === 0 ? "Skip" : "—");
                  const boxClass =
                    (lvl === 2 || (isBin && lvl === 1)) ? "bg-emerald-500 border-emerald-600 text-white"
                    : lvl === 1 ? "bg-yellow-300 border-yellow-400 text-yellow-800 dark:bg-yellow-400/40 dark:border-yellow-400/60 dark:text-yellow-200"
                    : lvl === 0 ? "bg-red-400 border-red-500 text-white dark:bg-red-500/40 dark:border-red-500/60"
                    : "border-border text-muted-foreground";
                  return (
                    <li key={item.id} className="flex flex-col gap-1" data-testid={`q2-block-${item.id}`}>
                      <div className="flex items-center gap-3">
                      <button
                        onClick={cycleQ2}
                        className={`h-5 w-12 text-[10px] rounded-md border-2 shrink-0 font-medium cursor-pointer ${boxClass}`}
                        data-testid={`q2-level-${item.id}`}
                      >
                        {boxLabel}
                      </button>
                      <span className={`h-2 w-2 rounded-full shrink-0 ${roleDot}`} />
                      <span className={`text-sm flex-1 ${
                        status === "completed" ? "line-through text-muted-foreground"
                        : status === "skipped" ? "text-muted-foreground italic"
                        : ""
                      }`}>{item.task}</span>
                      {(item.scheduledTime || item.scheduledStartTime) && (
                        <span className="text-xs text-muted-foreground">{item.scheduledTime || formatTime24to12(item.scheduledStartTime!)}</span>
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

        <Card className="overflow-visible" data-testid="card-foundational-tools">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-serif">Foundational Tools</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1.5 h-auto py-3"
                onClick={() => setLocation("/empathy")}
                data-testid="button-tool-eq-module"
              >
                <Brain className="h-5 w-5 text-emerald-500" />
                <span className="text-xs">EQ Module</span>
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
                onClick={() => setLocation("/meditation")}
                data-testid="button-tool-meditation"
              >
                <Brain className="h-5 w-5 text-purple-500" />
                <span className="text-xs">Meditation</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1.5 h-auto py-3"
                onClick={() => { setStillnessOpen(true); setStillnessSeconds(600); setStillnessRunning(false); }}
                data-testid="button-tool-stillness"
              >
                <Pause className="h-5 w-5 text-slate-500" />
                <span className="text-xs">Stillness</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <JournalQuickEntry
          todayStr={todayStr}
          hasMorning={hasMorning}
          hasEvening={hasEvening}
          hasAccess={!!hasPhase12}
          setLocation={setLocation}
        />

        <CustomToolsCard
          customTools={customTools}
          onAdd={() => setShowAddCustomTool(true)}
          onUse={(tool) => setCustomToolExercise(tool)}
        />
      </div>

      <div className="w-full md:w-72 md:flex-shrink-0">
        <div className="md:sticky md:top-6 space-y-4">
          <Card className="overflow-visible border-2 border-emerald-200 dark:border-emerald-800" data-testid="card-progress-dashboard">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base font-serif">Weekly Progress</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pb-4 space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 space-y-2" data-testid="metric-sleep-wins">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleMetric("sleep")} data-testid="toggle-sleep-details">
                  <div className="flex items-center gap-2">
                    <BedDouble className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs font-semibold">Sleep Wins</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold" data-testid="text-sleep-wins">
                      {progressMetrics.sleepWins}/{progressMetrics.sleepNights}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${expandedMetrics.has("sleep") ? "rotate-180" : ""}`} />
                  </div>
                </div>
                <Progress
                  value={progressMetrics.sleepNights > 0 ? (progressMetrics.sleepWins / progressMetrics.sleepNights) * 100 : 0}
                  className="h-2"
                  indicatorClassName={getProgressColor(progressMetrics.sleepNights > 0 ? (progressMetrics.sleepWins / progressMetrics.sleepNights) * 100 : 0)}
                />
                <p className="text-[10px] text-muted-foreground">Nights in 7–9h window</p>
                {expandedMetrics.has("sleep") && (
                  <div className="pt-1 space-y-1 border-t border-border/50">
                    {progressMetrics.sleepDetails.length === 0 && (
                      <p className="text-[10px] text-muted-foreground italic">No sleep data logged yet</p>
                    )}
                    {progressMetrics.sleepDetails.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{formatShortDate(s.date)}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{s.hours}h</span>
                          {s.isWin ? <Check className="h-3 w-3 text-emerald-500" /> : <X className="h-3 w-3 text-rose-400" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-muted/50 p-3 space-y-2" data-testid="metric-consistency">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleMetric("consistency")} data-testid="toggle-consistency-details">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-xs font-semibold">Consistency</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold" data-testid="text-consistency">
                      {progressMetrics.consistencyPct}%
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${expandedMetrics.has("consistency") ? "rotate-180" : ""}`} />
                  </div>
                </div>
                <Progress
                  value={progressMetrics.consistencyPct}
                  className="h-2"
                  indicatorClassName={getProgressColor(progressMetrics.consistencyPct)}
                />
                <p className="text-[10px] text-muted-foreground">
                  {progressMetrics.consistencyPoints}/{progressMetrics.consistencyMax} pts earned
                </p>
                {expandedMetrics.has("consistency") && (
                  <div className="pt-1 space-y-1 border-t border-border/50 max-h-48 overflow-y-auto">
                    {progressMetrics.habitSummaries.length === 0 && progressMetrics.q1ItemDetails.length === 0 && (
                      <p className="text-[10px] text-muted-foreground italic">No items tracked yet</p>
                    )}
                    {progressMetrics.habitSummaries.length > 0 && (
                      <>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide pt-0.5">Habits</p>
                        {progressMetrics.habitSummaries.map((h, i) => (
                          <div key={`h-${i}`} className="flex items-center justify-between text-[11px] gap-2">
                            <span className="text-muted-foreground truncate flex-1 min-w-0">{h.name}</span>
                            <span className={`font-medium flex-shrink-0 ${h.completed === h.scheduled ? "text-emerald-600" : h.completed > 0 ? "text-amber-500" : "text-muted-foreground"}`}>
                              {h.completed}/{h.scheduled}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                    {progressMetrics.q1ItemDetails.length > 0 && (
                      <>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide pt-1">Q1 Items</p>
                        {progressMetrics.q1ItemDetails.map((q, i) => (
                          <div key={`q-${i}`} className="flex items-center justify-between text-[11px] gap-2">
                            <span className="text-muted-foreground truncate flex-1 min-w-0">{q.task}</span>
                            <span className={`font-medium flex-shrink-0 ${q.points === q.maxPoints ? "text-emerald-600" : q.points > 0 ? "text-amber-500" : "text-muted-foreground"}`}>
                              {q.points}/{q.maxPoints}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-muted/50 p-3 space-y-2" data-testid="metric-first-steps">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleMetric("firstSteps")} data-testid="toggle-first-steps-details">
                  <div className="flex items-center gap-2">
                    <Footprints className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-semibold">First-Step Starts</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold" data-testid="text-first-steps">
                      {progressMetrics.firstStepStarted}/{progressMetrics.firstStepTotal}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${expandedMetrics.has("firstSteps") ? "rotate-180" : ""}`} />
                  </div>
                </div>
                <Progress
                  value={progressMetrics.firstStepTotal > 0 ? (progressMetrics.firstStepStarted / progressMetrics.firstStepTotal) * 100 : 0}
                  className="h-2"
                  indicatorClassName={getProgressColor(progressMetrics.firstStepTotal > 0 ? (progressMetrics.firstStepStarted / progressMetrics.firstStepTotal) * 100 : 0)}
                />
                <p className="text-[10px] text-muted-foreground">
                  {progressMetrics.firstStepCompleted} fully done
                </p>
                {expandedMetrics.has("firstSteps") && (
                  <div className="pt-1 space-y-1 border-t border-border/50">
                    {progressMetrics.firstStepDetails.length === 0 && (
                      <p className="text-[10px] text-muted-foreground italic">No Q1 self-dev items this week</p>
                    )}
                    {progressMetrics.firstStepDetails.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] gap-2">
                        <span className="text-muted-foreground truncate flex-1 min-w-0">{f.task}</span>
                        <span className={`flex-shrink-0 font-medium ${f.status === "done" ? "text-emerald-600" : f.status === "started" ? "text-amber-500" : "text-muted-foreground"}`}>
                          {f.status === "done" ? "Done" : f.status === "started" ? "Started" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-muted/50 p-3 space-y-2" data-testid="metric-q2-focus">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleMetric("q2")} data-testid="toggle-q2-details">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-semibold">Q2 Focus</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold" data-testid="text-q2-focus">
                      {progressMetrics.q2ActualMin}/{progressMetrics.q2PlannedMin}m
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${expandedMetrics.has("q2") ? "rotate-180" : ""}`} />
                  </div>
                </div>
                <Progress
                  value={progressMetrics.q2PlannedMin > 0 ? Math.min((progressMetrics.q2ActualMin / progressMetrics.q2PlannedMin) * 100, 100) : 0}
                  className="h-2"
                  indicatorClassName={getProgressColor(progressMetrics.q2PlannedMin > 0 ? Math.min((progressMetrics.q2ActualMin / progressMetrics.q2PlannedMin) * 100, 100) : 0)}
                />
                <p className="text-[10px] text-muted-foreground">Actual vs planned minutes</p>
                {expandedMetrics.has("q2") && (
                  <div className="pt-1 space-y-1 border-t border-border/50">
                    {progressMetrics.q2Details.length === 0 && (
                      <p className="text-[10px] text-muted-foreground italic">No Q2 items this week</p>
                    )}
                    {progressMetrics.q2Details.map((q, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] gap-2">
                        <span className="text-muted-foreground truncate flex-1 min-w-0">{q.task}</span>
                        <span className={`flex-shrink-0 font-medium ${q.status === "completed" ? "text-emerald-600" : q.status === "skipped" ? "text-rose-400" : "text-muted-foreground"}`}>
                          {q.actualMin}/{q.plannedMin}m
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
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
                    const mins = eisenhowerSkipDialog.durationMinutes || parseTimeEstimateMinutes(eisenhowerSkipDialog.timeEstimate);
                    const timeFields = mins
                      ? { startedOnTime: false, completedRequiredTime: false, timeShortMinutes: mins }
                      : {};
                    setEisenhowerLevelMutation.mutate({ id: eisenhowerSkipDialog.id, level: 0, skipReason: reason, ...timeFields });
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

      <Dialog open={stillnessOpen} onOpenChange={(open) => {
        if (!open) { setStillnessOpen(false); setStillnessRunning(false); }
      }}>
        <DialogContent className="max-w-sm text-center" data-testid="dialog-stillness">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif">Stillness Exercise</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              Be still for 10 minutes. When thinking, say to yourself:
            </p>
            <p className="text-base font-medium px-4">
              "This is just my nervous system, not my identity."
            </p>
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-28 h-28 rounded-full border-4 border-slate-200 dark:border-slate-700 flex items-center justify-center" data-testid="stillness-timer-circle">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 112 112">
                  <circle
                    cx="56" cy="56" r="52"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-emerald-500"
                    strokeDasharray={2 * Math.PI * 52}
                    strokeDashoffset={2 * Math.PI * 52 * (stillnessSeconds / 600)}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-2xl font-bold tabular-nums" data-testid="text-stillness-time">
                  {Math.floor(stillnessSeconds / 60)}:{String(stillnessSeconds % 60).padStart(2, "0")}
                </span>
              </div>
              <div className="flex gap-3">
                {!stillnessRunning && stillnessSeconds > 0 && (
                  <Button
                    onClick={() => setStillnessRunning(true)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    data-testid="button-stillness-start"
                  >
                    {stillnessSeconds < 600 ? "Resume" : "Begin"}
                  </Button>
                )}
                {stillnessRunning && (
                  <Button
                    variant="outline"
                    onClick={() => setStillnessRunning(false)}
                    data-testid="button-stillness-pause"
                  >
                    Pause
                  </Button>
                )}
                {stillnessSeconds === 0 && (
                  <Button
                    onClick={() => { setStillnessSeconds(600); setStillnessRunning(false); }}
                    data-testid="button-stillness-reset"
                  >
                    Reset
                  </Button>
                )}
              </div>
              {stillnessSeconds === 0 && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium" data-testid="text-stillness-complete">
                  <Check className="h-4 w-4 inline mr-1" />
                  Well done. Stillness complete.
                </p>
              )}
            </div>
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
