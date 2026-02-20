import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { VoiceTextarea } from "@/components/voice-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useTimer, formatTime } from "@/hooks/use-timer";
import {
  Sun, Moon, Check, ArrowRight,
  Heart, Activity, HandHeart,
  Target, Minus, Play, Pause, RotateCcw,
  Pencil, Plus, Trash2, Footprints, X, SkipForward,
  Sparkles, Zap, Flame, Settings, Download,
  Frown, Meh, Smile, SmilePlus, Laugh,
} from "lucide-react";
import { useLocation } from "wouter";
import { format, startOfWeek, endOfWeek } from "date-fns";
import type { Purchase, Habit, HabitCompletion, Journal, EisenhowerEntry, IdentityDocument, MonthlyGoal, Task, CustomTool, ToolUsageLog } from "@shared/schema";

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const CATEGORY_STYLES: Record<string, string> = {
  health: "bg-emerald-500",
  wealth: "bg-amber-500",
  relationships: "bg-rose-500",
  career: "bg-blue-500",
  mindfulness: "bg-violet-500",
  learning: "bg-cyan-500",
};

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

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

  const { data: identityDoc } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
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

  const cycleHabitMutation = useMutation({
    mutationFn: async ({ habitId, currentStatus }: { habitId: number; currentStatus: string | null }) => {
      if (currentStatus === null) {
        await apiRequest("POST", "/api/habit-completions", { habitId, date: todayStr, status: "completed" });
      } else if (currentStatus === "completed") {
        await apiRequest("PATCH", `/api/habit-completions/${habitId}/${todayStr}`, { status: "skipped" });
      } else {
        await apiRequest("DELETE", `/api/habit-completions/${habitId}/${todayStr}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habit-completions", todayStr] });
      queryClient.invalidateQueries({ queryKey: ["/api/habit-completions/range"] });
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      return apiRequest("PATCH", `/api/tasks/${id}`, { completed: !completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const cycleEisenhowerMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: number; currentStatus: string | null }) => {
      let nextStatus: string | null;
      if (!currentStatus) {
        nextStatus = "completed";
      } else if (currentStatus === "completed") {
        nextStatus = "skipped";
      } else if (currentStatus === "skipped") {
        nextStatus = "cancelled";
      } else {
        nextStatus = null;
      }
      return apiRequest("PATCH", `/api/eisenhower/${id}`, { status: nextStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
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
      setLocation("/goal-wizard");
    }
  }, [monthlyGoalLoaded, monthlyGoal, setLocation]);

  const [quickToolOpen, setQuickToolOpen] = useState<string | null>(null);
  const [showAddCustomTool, setShowAddCustomTool] = useState(false);
  const [customToolExercise, setCustomToolExercise] = useState<CustomTool | null>(null);

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

  const journalHabitItems = hasPhase12 ? [
    { id: -1, name: "Morning Journal", isMorning: true, done: hasMorning },
    { id: -2, name: "Evening Journal", isMorning: false, done: hasEvening },
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
                      jh.done ? "bg-primary border-primary" : "border-border"
                    }`}>
                      {jh.done && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span className="h-2 w-2 rounded-full shrink-0 bg-violet-400" />
                    <button
                      className={`text-sm flex-1 text-left hover:underline ${jh.done ? "line-through text-muted-foreground" : ""}`}
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
                  </li>
                ))}
                {todaysHabits.map((habit) => {
                  const status = habitStatusMap.get(habit.id) || null;
                  const catStyle = CATEGORY_STYLES[(habit.category as string) || "health"] || CATEGORY_STYLES.health;
                  return (
                    <li key={habit.id} className="flex items-center gap-3" data-testid={`habit-item-${habit.id}`}>
                      <button
                        role="checkbox"
                        aria-checked={status === "completed" ? true : status === "skipped" ? "mixed" : false}
                        className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                          status === "completed" ? "bg-primary border-primary" : status === "skipped" ? "bg-muted border-muted-foreground/30" : "border-border"
                        }`}
                        onClick={() => cycleHabitMutation.mutate({ habitId: habit.id, currentStatus: status })}
                        data-testid={`habit-cycle-${habit.id}`}
                      >
                        {status === "completed" && <Check className="h-3 w-3 text-primary-foreground" />}
                        {status === "skipped" && <Minus className="h-3 w-3 text-muted-foreground" />}
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
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setLocation("/habits")} data-testid="button-add-habits">
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

        {todayQ2Items.length > 0 && (
          <Card className="overflow-visible" data-testid="card-q2-blocks">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-serif">Scheduled Q2 Blocks</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ul className="space-y-2">
                {todayQ2Items.map((item) => {
                  const status = item.status || null;
                  return (
                    <li key={item.id} className="flex items-center gap-3" data-testid={`q2-block-${item.id}`}>
                      <button
                        role="checkbox"
                        aria-checked={status === "completed" ? true : status ? "mixed" : false}
                        className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                          status === "completed" ? "bg-primary border-primary"
                          : status === "skipped" ? "bg-muted border-muted-foreground/30"
                          : status === "cancelled" ? "bg-destructive/15 border-destructive/40"
                          : "border-border"
                        }`}
                        onClick={() => cycleEisenhowerMutation.mutate({ id: item.id, currentStatus: status })}
                        data-testid={`q2-cycle-${item.id}`}
                      >
                        {status === "completed" && <Check className="h-3 w-3 text-primary-foreground" />}
                        {status === "skipped" && <SkipForward className="h-3 w-3 text-muted-foreground" />}
                        {status === "cancelled" && <X className="h-3 w-3 text-destructive" />}
                      </button>
                      <span className={`text-sm flex-1 ${
                        status === "completed" ? "line-through text-muted-foreground"
                        : status === "skipped" ? "text-muted-foreground italic"
                        : status === "cancelled" ? "line-through text-muted-foreground/60"
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
                onClick={() => setQuickToolOpen("movement")}
                data-testid="button-tool-movement"
              >
                <Activity className="h-5 w-5 text-emerald-500" />
                <span className="text-xs">Movement</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1.5 h-auto py-3"
                onClick={() => setQuickToolOpen("compassion")}
                data-testid="button-tool-compassion"
              >
                <HandHeart className="h-5 w-5 text-violet-500" />
                <span className="text-xs">Loved One</span>
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
      <MovementModal open={quickToolOpen === "movement"} onClose={() => setQuickToolOpen(null)} />
      <LovedOneMirrorModal
        open={quickToolOpen === "compassion"}
        onClose={() => setQuickToolOpen(null)}
        todayStr={todayStr}
      />
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

  const saveMutation = useMutation({
    mutationFn: async (note: string) => {
      const session = hasMorning ? "evening" : "morning";
      return apiRequest("PUT", "/api/journals", {
        date: todayStr,
        session,
        reflections: note,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journals"] });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
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

const MOOD_LEVELS = [
  { level: 1, icon: Frown, label: "Very Low", color: "text-red-500" },
  { level: 2, icon: Frown, label: "Low", color: "text-orange-500" },
  { level: 3, icon: Meh, label: "Neutral", color: "text-yellow-500" },
  { level: 4, icon: Smile, label: "Good", color: "text-lime-500" },
  { level: 5, icon: Laugh, label: "Great", color: "text-emerald-500" },
];

function MoodCheckIn({
  phase,
  mood,
  setMood,
  emotion,
  setEmotion,
  onContinue,
  label,
  saving = false,
}: {
  phase: "before" | "after";
  mood: number | null;
  setMood: (v: number) => void;
  emotion: string;
  setEmotion: (v: string) => void;
  onContinue: () => void;
  label: string;
  saving?: boolean;
}) {
  return (
    <div className="space-y-4" data-testid={`mood-checkin-${phase}`}>
      <p className="text-sm font-medium text-center">
        {phase === "before" ? "How are you feeling right now?" : "How do you feel after the exercise?"}
      </p>
      <div className="flex justify-center gap-3">
        {MOOD_LEVELS.map((m) => {
          const Icon = m.icon;
          const selected = mood === m.level;
          return (
            <button
              key={m.level}
              onClick={() => setMood(m.level)}
              className={`flex flex-col items-center gap-1 p-2 rounded-md transition-all ${
                selected ? "bg-primary/10 ring-2 ring-primary" : "hover-elevate"
              }`}
              data-testid={`mood-${phase}-${m.level}`}
            >
              <Icon className={`h-7 w-7 ${selected ? m.color : "text-muted-foreground"}`} />
              <span className={`text-[10px] ${selected ? "font-medium" : "text-muted-foreground"}`}>{m.label}</span>
            </button>
          );
        })}
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground text-center">Name one emotion you're feeling</p>
        <Input
          value={emotion}
          onChange={(e) => setEmotion(e.target.value)}
          placeholder="e.g. anxious, hopeful, drained..."
          className="text-center text-sm"
          data-testid={`input-emotion-${phase}`}
        />
        <div className="flex flex-wrap gap-1.5 justify-center">
          {(phase === "before"
            ? ["Anxious", "Sad", "Frustrated", "Overwhelmed", "Angry", "Numb"]
            : ["Calmer", "Lighter", "Hopeful", "Relieved", "Grounded", "Same"]
          ).map(e => (
            <Badge
              key={e}
              variant={emotion.toLowerCase() === e.toLowerCase() ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setEmotion(e)}
              data-testid={`badge-emotion-${phase}-${e.toLowerCase()}`}
            >
              {e}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={onContinue}
          disabled={!mood || !emotion.trim() || saving}
          data-testid={`button-mood-${phase}-continue`}
        >
          {saving ? "Saving..." : phase === "before" ? "Start Exercise" : "Done"}
          {!saving && <ArrowRight className="ml-1 h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
}

function useMoodTracking(toolName: string) {
  const [phase, setPhase] = useState<"before" | "exercise" | "after" | "done">("before");
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [emotionBefore, setEmotionBefore] = useState("");
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [emotionAfter, setEmotionAfter] = useState("");
  const [logId, setLogId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const qc = useQueryClient();

  const startExercise = async () => {
    if (!moodBefore || !emotionBefore.trim()) return;
    setSaving(true);
    try {
      const res = await apiRequest("POST", "/api/tool-usage", {
        toolName,
        moodBefore,
        emotionBefore: emotionBefore.trim(),
        date: todayStr,
        completed: false,
      });
      const data = await res.json();
      setLogId(data.id);
      qc.invalidateQueries({ queryKey: ["/api/tool-usage"] });
      setPhase("exercise");
    } catch (e) {
      console.error("Failed to create tool usage log:", e);
    } finally {
      setSaving(false);
    }
  };

  const finishExercise = () => {
    setPhase("after");
  };

  const completeTracking = async () => {
    if (!moodAfter || !emotionAfter.trim() || !logId) return;
    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/tool-usage/${logId}`, {
        moodAfter,
        emotionAfter: emotionAfter.trim(),
        completed: true,
      });
      qc.invalidateQueries({ queryKey: ["/api/tool-usage"] });
      setPhase("done");
    } catch (e) {
      console.error("Failed to update tool usage log:", e);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setPhase("before");
    setMoodBefore(null);
    setEmotionBefore("");
    setMoodAfter(null);
    setEmotionAfter("");
    setLogId(null);
    setSaving(false);
  };

  return {
    phase, moodBefore, setMoodBefore, emotionBefore, setEmotionBefore,
    moodAfter, setMoodAfter, emotionAfter, setEmotionAfter,
    startExercise, finishExercise, completeTracking, reset, saving,
  };
}

const CONTAINMENT_STEPS = [
  { label: "FEEL", instruction: "Close your eyes. Notice where the emotion lives in your body - throat, chest, stomach, jaw. Don't push it away, just observe.", duration: 15 },
  { label: "LABEL", instruction: "Name the emotion using this sentence:", duration: 0 },
  { label: "REGULATE", instruction: "Take slow breaths. In through your nose (4 counts), hold (4 counts), out through your mouth (6 counts).", duration: 20 },
  { label: "MOVE", instruction: "Choose one small action to shift your state: stand up, stretch, drink water, or write one sentence.", duration: 0 },
];

function TimerCircle({ timer, color, testId }: { timer: ReturnType<typeof useTimer>; color: string; testId: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-24 w-24">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6"
            className={`${color} transition-all duration-1000`}
            strokeDasharray={`${2 * Math.PI * 54}`}
            strokeDashoffset={`${2 * Math.PI * 54 * (1 - timer.progress / 100)}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-mono font-bold" data-testid={testId}>{formatTime(timer.seconds)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!timer.isRunning ? (
          <Button size="sm" onClick={timer.start} disabled={timer.seconds === 0} data-testid={`${testId}-start`}>
            <Play className="h-4 w-4 mr-1" />
            {timer.isComplete ? "Done" : "Start"}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={timer.pause} data-testid={`${testId}-pause`}>
            <Pause className="h-4 w-4 mr-1" />
            Pause
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={timer.reset} data-testid={`${testId}-reset`}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => timer.addTime(15)} data-testid={`${testId}-add15`}>
          <Plus className="h-3 w-3 mr-1" />
          15s
        </Button>
      </div>
    </div>
  );
}

function ContainmentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const timer = useTimer(CONTAINMENT_STEPS[0].duration);
  const [emotionName, setEmotionName] = useState("");
  const [becauseText, setBecauseText] = useState("");
  const [validationChip, setValidationChip] = useState<string>("");
  const [moveAction, setMoveAction] = useState("");
  const qc = useQueryClient();
  const mood = useMoodTracking("Containment");

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const addTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      return apiRequest("POST", "/api/tasks", {
        title, date: todayStr, time: format(new Date(), "HH:mm"),
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/tasks"] }); },
  });

  const currentStep = CONTAINMENT_STEPS[step];
  const isLastStep = step === CONTAINMENT_STEPS.length - 1;

  const canAdvance = () => {
    if (currentStep.duration > 0 && !timer.isComplete && timer.seconds > 0) return false;
    if (step === 1 && !emotionName) return false;
    return true;
  };

  const goNext = () => {
    if (isLastStep) {
      if (moveAction.trim()) addTaskMutation.mutate(moveAction.trim());
      mood.finishExercise();
      return;
    }
    const nextStep = step + 1;
    setStep(nextStep);
    const nextDuration = CONTAINMENT_STEPS[nextStep].duration;
    if (nextDuration > 0) timer.setDuration(nextDuration);
  };

  const resetAndClose = () => {
    setStep(0); setEmotionName(""); setBecauseText(""); setValidationChip(""); setMoveAction("");
    timer.setDuration(CONTAINMENT_STEPS[0].duration);
    mood.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
      <DialogContent className="sm:max-w-md" data-testid="modal-containment">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" />
            Emotional Containment
          </DialogTitle>
        </DialogHeader>

        {mood.phase === "before" ? (
          <MoodCheckIn
            phase="before"
            mood={mood.moodBefore}
            setMood={mood.setMoodBefore}
            emotion={mood.emotionBefore}
            setEmotion={mood.setEmotionBefore}
            onContinue={mood.startExercise}
            label="Containment"
            saving={mood.saving}
          />
        ) : mood.phase === "after" || mood.phase === "done" ? (
          mood.phase === "done" ? (
            <div className="text-center space-y-3 py-4" data-testid="mood-done">
              <Check className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-medium">Exercise complete</p>
              <p className="text-xs text-muted-foreground">Your mood check-in has been saved.</p>
              <Button size="sm" onClick={resetAndClose} data-testid="button-mood-done-close">Close</Button>
            </div>
          ) : (
            <MoodCheckIn
              phase="after"
              mood={mood.moodAfter}
              setMood={mood.setMoodAfter}
              emotion={mood.emotionAfter}
              setEmotion={mood.setEmotionAfter}
              onContinue={() => { mood.completeTracking(); }}
              label="Containment"
              saving={mood.saving}
            />
          )
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              {CONTAINMENT_STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>

            <div className="text-center space-y-3">
              <Badge variant="secondary" className="text-sm">{currentStep.label}</Badge>
              <p className="text-sm text-muted-foreground">{currentStep.instruction}</p>

              {currentStep.duration > 0 && (
                <TimerCircle timer={timer} color="text-primary" testId="text-containment-timer" />
              )}

              {step === 1 && (
                <div className="space-y-3 text-left">
                  <div className="space-y-2">
                    <Input
                      value={emotionName}
                      onChange={(e) => setEmotionName(e.target.value)}
                      placeholder="Type your emotion..."
                      className="text-center text-sm"
                      data-testid="input-emotion-name"
                    />
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {["Angry", "Sad", "Anxious", "Frustrated", "Hurt", "Scared"].map(e => (
                        <Badge
                          key={e}
                          variant={emotionName.toLowerCase() === e.toLowerCase() ? "default" : "outline"}
                          className="cursor-pointer text-xs"
                          onClick={() => setEmotionName(e)}
                          data-testid={`badge-emotion-${e.toLowerCase()}`}
                        >
                          {e}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">Tap a suggestion or type your own</p>
                  </div>
                  {emotionName && (
                    <div className="space-y-2 text-center">
                      <p className="text-sm font-medium">
                        "I feel <span className="text-primary">{emotionName.toLowerCase()}</span> because..."
                      </p>
                      <Textarea
                        value={becauseText}
                        onChange={(e) => setBecauseText(e.target.value)}
                        placeholder="...describe briefly what triggered this"
                        rows={2}
                        className="text-sm resize-none"
                        data-testid="input-because-text"
                      />
                      <Badge
                        variant={validationChip === "it makes sense" ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setValidationChip(validationChip === "it makes sense" ? "" : "it makes sense")}
                        data-testid="badge-validation-it-makes-sense"
                      >
                        ...and it makes sense to feel this way
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-2">
                  <Textarea
                    value={moveAction}
                    onChange={(e) => setMoveAction(e.target.value)}
                    placeholder="What small action will you take?"
                    rows={2}
                    className="text-sm resize-none"
                    data-testid="input-move-action"
                  />
                  <p className="text-xs text-muted-foreground">This will be added to today's tasks</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={resetAndClose} data-testid="button-containment-close">
                Close
              </Button>
              <Button size="sm" onClick={goNext} disabled={!canAdvance()} data-testid="button-containment-next">
                {isLastStep ? (moveAction.trim() ? "Add to Tasks & Done" : "Done") : "Next"}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const MOVEMENT_OPTIONS = [
  { label: "5-minute walk", type: "timer" as const, duration: 300, icon: Footprints },
  { label: "20 air squats", type: "counter" as const, target: 20, icon: Activity },
  { label: "20 jumping jacks", type: "counter" as const, target: 20, icon: Activity },
  { label: "Make your bed", type: "timer" as const, duration: 120, icon: Target },
  { label: "5-minute errand", type: "timer" as const, duration: 300, icon: ArrowRight },
];

function MovementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const timer = useTimer(300);
  const [selected, setSelected] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const mood = useMoodTracking("Micro Movement");

  const resetAndClose = () => {
    timer.setDuration(300);
    setSelected(null);
    setCount(0);
    mood.reset();
    onClose();
  };

  const selectOption = (idx: number) => {
    const opt = MOVEMENT_OPTIONS[idx];
    setSelected(idx);
    setCount(0);
    if (opt.type === "timer") {
      timer.setDuration(opt.duration);
      setTimeout(() => timer.start(), 50);
    }
  };

  const option = selected !== null ? MOVEMENT_OPTIONS[selected] : null;
  const counterDone = option?.type === "counter" && count >= (option.target || 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
      <DialogContent className="sm:max-w-md" data-testid="modal-movement">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            Micro Movement
          </DialogTitle>
        </DialogHeader>

        {mood.phase === "before" ? (
          <MoodCheckIn
            phase="before"
            mood={mood.moodBefore}
            setMood={mood.setMoodBefore}
            emotion={mood.emotionBefore}
            setEmotion={mood.setEmotionBefore}
            onContinue={mood.startExercise}
            label="Movement"
            saving={mood.saving}
          />
        ) : mood.phase === "after" || mood.phase === "done" ? (
          mood.phase === "done" ? (
            <div className="text-center space-y-3 py-4" data-testid="mood-done">
              <Check className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-medium">Exercise complete</p>
              <p className="text-xs text-muted-foreground">Your mood check-in has been saved.</p>
              <Button size="sm" onClick={resetAndClose} data-testid="button-mood-done-close">Close</Button>
            </div>
          ) : (
            <MoodCheckIn
              phase="after"
              mood={mood.moodAfter}
              setMood={mood.setMoodAfter}
              emotion={mood.emotionAfter}
              setEmotion={mood.setEmotionAfter}
              onContinue={() => { mood.completeTracking(); }}
              label="Movement"
              saving={mood.saving}
            />
          )
        ) : (
          <div className="space-y-4">
            {selected === null ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center mb-3">Tap to start immediately</p>
                {MOVEMENT_OPTIONS.map((opt, idx) => {
                  const Icon = opt.icon;
                  return (
                    <Button
                      key={idx}
                      variant="outline"
                      className="w-full justify-start gap-3 h-auto py-3"
                      onClick={() => selectOption(idx)}
                      data-testid={`button-movement-option-${idx}`}
                    >
                      <Icon className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="text-sm">{opt.label}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px]">
                        {opt.type === "timer" ? formatTime(opt.duration) : `${opt.target} reps`}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
            ) : option?.type === "timer" ? (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm font-medium">{option.label}</p>
                <div className="relative h-28 w-28">
                  <svg className="h-28 w-28 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
                    <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6"
                      className="text-emerald-500 transition-all duration-1000"
                      strokeDasharray={`${2 * Math.PI * 54}`}
                      strokeDashoffset={`${2 * Math.PI * 54 * (1 - timer.progress / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-mono font-bold" data-testid="text-movement-timer">{formatTime(timer.seconds)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!timer.isRunning ? (
                    <Button onClick={timer.start} disabled={timer.seconds === 0} data-testid="button-movement-start">
                      <Play className="h-4 w-4 mr-1" />
                      {timer.isComplete ? "Done" : "Start"}
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={timer.pause} data-testid="button-movement-pause">
                      <Pause className="h-4 w-4 mr-1" />
                      Pause
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={timer.reset} data-testid="button-movement-reset">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
                {timer.isComplete && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Well done!</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm font-medium">{option?.label}</p>
                <div className="text-center">
                  <span className="text-5xl font-mono font-bold" data-testid="text-movement-counter">{count}</span>
                  <span className="text-lg text-muted-foreground">/{option?.target}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="lg"
                    onClick={() => setCount(c => Math.min(c + 1, option?.target || 20))}
                    disabled={counterDone}
                    data-testid="button-movement-increment"
                  >
                    <Plus className="h-5 w-5 mr-1" />
                    Count
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setCount(0)} data-testid="button-movement-count-reset">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
                {counterDone && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Well done!</p>
                )}
              </div>
            )}

            <div className="flex justify-between items-center gap-2">
              {selected !== null && (
                <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setCount(0); timer.reset(); }} data-testid="button-movement-back">
                  Back
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selected !== null && (timer.isComplete || counterDone)) {
                    mood.finishExercise();
                  } else {
                    resetAndClose();
                  }
                }}
                className="ml-auto"
                data-testid="button-movement-close"
              >
                {selected !== null && (timer.isComplete || counterDone) ? "Finish" : "Close"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function convertPronouns(text: string): string {
  return text
    .replace(/\byou're\b/gi, "I'm")
    .replace(/\byou are\b/gi, "I am")
    .replace(/\byour\b/gi, "my")
    .replace(/\byours\b/gi, "mine")
    .replace(/\byou\b/gi, "I")
    .replace(/\byourself\b/gi, "myself");
}

function LovedOneMirrorModal({
  open,
  onClose,
  todayStr,
}: {
  open: boolean;
  onClose: () => void;
  todayStr: string;
}) {
  const qc = useQueryClient();
  const [situation, setSituation] = useState("");
  const [lovedOneMsg, setLovedOneMsg] = useState("");
  const [selfMsg, setSelfMsg] = useState("");
  const [convertToggle, setConvertToggle] = useState(false);
  const [saved, setSaved] = useState(false);
  const [taskAdded, setTaskAdded] = useState(false);
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);
  const [nextStepInput, setNextStepInput] = useState("");
  const [showNextStepPrompt, setShowNextStepPrompt] = useState(false);
  const mood = useMoodTracking("Self-Compassion");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const content = [
        situation ? `Situation: ${situation}` : "",
        lovedOneMsg ? `To a loved one: ${lovedOneMsg}` : "",
        selfMsg ? `To myself: ${selfMsg}` : "",
      ].filter(Boolean).join("\n");
      return apiRequest("PUT", "/api/journals", {
        date: todayStr,
        session: "morning",
        reflections: content,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/journals"] });
      setSaved(true);
    },
  });

  const addTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      return apiRequest("POST", "/api/tasks", {
        title,
        date: todayStr,
        time: "09:00",
        quadrant: "q2",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/tasks"] });
      setTaskAdded(true);
      setShowNextStepPrompt(false);
    },
  });

  const resetAndClose = () => {
    setSituation(""); setLovedOneMsg(""); setSelfMsg("");
    setConvertToggle(false); setSaved(false); setTaskAdded(false);
    setShowCopyConfirm(false); setNextStepInput(""); setShowNextStepPrompt(false);
    mood.reset();
    onClose();
  };

  const handleCopyToSelf = () => {
    if (selfMsg.trim()) {
      setShowCopyConfirm(true);
    } else {
      const msg = convertToggle ? convertPronouns(lovedOneMsg) : lovedOneMsg;
      setSelfMsg(msg);
    }
  };

  const confirmCopy = (mode: "replace" | "append") => {
    const msg = convertToggle ? convertPronouns(lovedOneMsg) : lovedOneMsg;
    if (mode === "replace") {
      setSelfMsg(msg);
    } else {
      setSelfMsg((prev) => prev + "\n" + msg);
    }
    setShowCopyConfirm(false);
  };

  const handleAddNextStep = () => {
    const match = lovedOneMsg.match(/let's just do (.+?) for/i) || lovedOneMsg.match(/let's just do (.+)/i);
    if (match) {
      addTaskMutation.mutate(match[1].trim());
    } else {
      setShowNextStepPrompt(true);
    }
  };

  const insertChip = (text: string) => {
    setLovedOneMsg((prev) => prev ? prev + " " + text : text);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" data-testid="modal-compassion">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <HandHeart className="h-5 w-5 text-violet-500" />
            Loved One Mirror
          </DialogTitle>
        </DialogHeader>

        {mood.phase === "before" ? (
          <MoodCheckIn
            phase="before"
            mood={mood.moodBefore}
            setMood={mood.setMoodBefore}
            emotion={mood.emotionBefore}
            setEmotion={mood.setEmotionBefore}
            onContinue={mood.startExercise}
            label="Compassion"
            saving={mood.saving}
          />
        ) : mood.phase === "after" || mood.phase === "done" ? (
          mood.phase === "done" ? (
            <div className="text-center space-y-3 py-4" data-testid="mood-done">
              <Check className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-medium">Exercise complete</p>
              <p className="text-xs text-muted-foreground">Your mood check-in has been saved.</p>
              <Button size="sm" onClick={resetAndClose} data-testid="button-mood-done-close">Close</Button>
            </div>
          ) : (
            <MoodCheckIn
              phase="after"
              mood={mood.moodAfter}
              setMood={mood.setMoodAfter}
              emotion={mood.emotionAfter}
              setEmotion={mood.setEmotionAfter}
              onContinue={() => { mood.completeTracking(); }}
              label="Compassion"
              saving={mood.saving}
            />
          )
        ) : (
          <>
            <p className="text-xs text-muted-foreground -mt-2">Treat yourself like you would a loved one.</p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground">What's going on? <span className="text-xs">(optional)</span></p>
                <VoiceTextarea
                  value={situation}
                  onChange={setSituation}
                  placeholder="Briefly describe the situation..."
                  rows={1}
                  className="resize-none text-sm"
                  data-testid="textarea-mirror-situation"
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium">What would you say to a loved one in this exact situation?</p>
                <VoiceTextarea
                  value={lovedOneMsg}
                  onChange={setLovedOneMsg}
                  placeholder="Imagine someone you deeply care about is going through this..."
                  rows={3}
                  className="resize-none text-sm"
                  data-testid="textarea-mirror-loved-one"
                />
                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    variant="outline"
                    className="cursor-pointer text-xs"
                    onClick={() => insertChip("Of course you feel this. It makes sense because ___.")}
                    data-testid="chip-validate"
                  >
                    Validate
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-pointer text-xs"
                    onClick={() => insertChip("You're not broken. I'm with you.")}
                    data-testid="chip-kindness"
                  >
                    Kindness
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-pointer text-xs"
                    onClick={() => insertChip("Let's just do ___ for 2 minutes.")}
                    data-testid="chip-next-step"
                  >
                    Next step
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyToSelf}
                  disabled={!lovedOneMsg.trim()}
                  data-testid="button-mirror-copy"
                >
                  <ArrowRight className="h-3 w-3 mr-1" />
                  Copy to myself
                </Button>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={convertToggle}
                    onChange={(e) => setConvertToggle(e.target.checked)}
                    className="rounded"
                    data-testid="checkbox-convert-pronouns"
                  />
                  <span className="text-xs text-muted-foreground">Convert to I/me wording</span>
                </label>
              </div>

              {showCopyConfirm && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm">
                  <span className="text-xs text-muted-foreground">You already have text below.</span>
                  <Button variant="outline" size="sm" onClick={() => confirmCopy("replace")} data-testid="button-copy-replace">Replace</Button>
                  <Button variant="outline" size="sm" onClick={() => confirmCopy("append")} data-testid="button-copy-append">Append</Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowCopyConfirm(false)}>Cancel</Button>
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-sm font-medium">Now say that to yourself as if you're that loved one.</p>
                <VoiceTextarea
                  value={selfMsg}
                  onChange={setSelfMsg}
                  placeholder="Speak to yourself with the same warmth..."
                  rows={3}
                  className="resize-none text-sm"
                  data-testid="textarea-mirror-self"
                />
              </div>

              {showNextStepPrompt && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                  <Input
                    value={nextStepInput}
                    onChange={(e) => setNextStepInput(e.target.value)}
                    placeholder="What's a 2-minute next step?"
                    className="text-sm flex-1"
                    data-testid="input-mirror-next-step"
                  />
                  <Button
                    size="sm"
                    onClick={() => addTaskMutation.mutate(nextStepInput.trim())}
                    disabled={!nextStepInput.trim() || addTaskMutation.isPending}
                    data-testid="button-add-next-step-confirm"
                  >
                    Add
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={saved || saveMutation.isPending || (!lovedOneMsg.trim() && !selfMsg.trim())}
                  data-testid="button-mirror-save"
                >
                  {saved ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Saved
                    </>
                  ) : (
                    "Save to journal"
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddNextStep}
                  disabled={taskAdded || addTaskMutation.isPending}
                  data-testid="button-mirror-add-task"
                >
                  {taskAdded ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Added
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3 mr-1" />
                      Add next step to Today
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => mood.finishExercise()}
                  className="ml-auto"
                  data-testid="button-mirror-close"
                >
                  Finish
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const CUSTOM_TOOL_ICONS: Record<string, typeof Sparkles> = {
  Sparkles, Zap, Flame, Heart, Target, HandHeart, Activity,
};

function CustomToolsCard({
  customTools,
  onAdd,
  onUse,
}: {
  customTools: CustomTool[];
  onAdd: () => void;
  onUse: (tool: CustomTool) => void;
}) {
  const qc = useQueryClient();
  const activeTools = customTools.filter(t => t.active);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/custom-tools/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/custom-tools"] }); },
  });

  return (
    <Card className="overflow-visible" data-testid="card-custom-tools">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base font-serif">My Tools</CardTitle>
        <Badge variant="secondary" className="text-[10px]">{activeTools.length}/3</Badge>
      </CardHeader>
      <CardContent className="pb-4">
        {activeTools.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">Add custom tools from your GPT course</p>
            <Button variant="outline" size="sm" onClick={onAdd} data-testid="button-add-first-custom-tool">
              <Plus className="h-3 w-3 mr-1" />
              Add Tool
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {activeTools.map((tool) => {
              const Icon = CUSTOM_TOOL_ICONS[tool.icon || "Sparkles"] || Sparkles;
              return (
                <div key={tool.id} className="flex items-center gap-2" data-testid={`custom-tool-${tool.id}`}>
                  <Button
                    variant="outline"
                    className="flex-1 justify-start gap-2 h-auto py-2"
                    onClick={() => onUse(tool)}
                    data-testid={`button-use-custom-tool-${tool.id}`}
                  >
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex flex-col items-start">
                      <span className="text-sm">{tool.name}</span>
                      {tool.description && (
                        <span className="text-[10px] text-muted-foreground line-clamp-1">{tool.description}</span>
                      )}
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(tool.id)}
                    data-testid={`button-delete-custom-tool-${tool.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
            {activeTools.length < 3 && (
              <Button variant="ghost" size="sm" onClick={onAdd} className="w-full" data-testid="button-add-custom-tool">
                <Plus className="h-3 w-3 mr-1" />
                Add Tool
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddCustomToolModal({
  open,
  onClose,
  existingCount,
}: {
  open: boolean;
  onClose: () => void;
  existingCount: number;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [icon, setIcon] = useState("Sparkles");

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/custom-tools", {
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        icon,
        active: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/custom-tools"] });
      resetAndClose();
    },
  });

  const resetAndClose = () => {
    setName(""); setDescription(""); setInstructions(""); setIcon("Sparkles");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
      <DialogContent className="sm:max-w-md" data-testid="modal-add-custom-tool">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Custom Tool
          </DialogTitle>
        </DialogHeader>

        {existingCount >= 3 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">You already have 3 active tools. Remove one to add another.</p>
            <Button variant="ghost" size="sm" onClick={resetAndClose} className="mt-3">Close</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Tool Name</p>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 5-4-3-2-1 Grounding"
                className="text-sm"
                data-testid="input-custom-tool-name"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Description <span className="text-xs text-muted-foreground">(optional)</span></p>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the tool"
                className="text-sm"
                data-testid="input-custom-tool-description"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Instructions</p>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Step-by-step instructions for the exercise..."
                rows={4}
                className="text-sm resize-none"
                data-testid="input-custom-tool-instructions"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Icon</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CUSTOM_TOOL_ICONS).map(([key, Icon]) => (
                  <button
                    key={key}
                    onClick={() => setIcon(key)}
                    className={`p-2 rounded-md ${icon === key ? "bg-primary/10 ring-2 ring-primary" : "hover-elevate"}`}
                    data-testid={`icon-option-${key.toLowerCase()}`}
                  >
                    <Icon className={`h-5 w-5 ${icon === key ? "text-primary" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={resetAndClose} data-testid="button-cancel-custom-tool">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => createMutation.mutate()}
                disabled={!name.trim() || !instructions.trim() || createMutation.isPending}
                data-testid="button-save-custom-tool"
              >
                Add Tool
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CustomToolExerciseModal({
  open,
  onClose,
  tool,
}: {
  open: boolean;
  onClose: () => void;
  tool: CustomTool | null;
}) {
  const mood = useMoodTracking(tool?.name || "Custom Tool");

  const resetAndClose = () => {
    mood.reset();
    onClose();
  };

  if (!tool) return null;

  const Icon = CUSTOM_TOOL_ICONS[tool.icon || "Sparkles"] || Sparkles;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto" data-testid="modal-custom-tool-exercise">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {tool.name}
          </DialogTitle>
        </DialogHeader>

        {mood.phase === "before" ? (
          <MoodCheckIn
            phase="before"
            mood={mood.moodBefore}
            setMood={mood.setMoodBefore}
            emotion={mood.emotionBefore}
            setEmotion={mood.setEmotionBefore}
            onContinue={mood.startExercise}
            label={tool.name}
            saving={mood.saving}
          />
        ) : mood.phase === "after" || mood.phase === "done" ? (
          mood.phase === "done" ? (
            <div className="text-center space-y-3 py-4" data-testid="mood-done">
              <Check className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-medium">Exercise complete</p>
              <p className="text-xs text-muted-foreground">Your mood check-in has been saved.</p>
              <Button size="sm" onClick={resetAndClose} data-testid="button-mood-done-close">Close</Button>
            </div>
          ) : (
            <MoodCheckIn
              phase="after"
              mood={mood.moodAfter}
              setMood={mood.setMoodAfter}
              emotion={mood.emotionAfter}
              setEmotion={mood.setEmotionAfter}
              onContinue={() => { mood.completeTracking(); }}
              label={tool.name}
              saving={mood.saving}
            />
          )
        ) : (
          <div className="space-y-4">
            {tool.description && (
              <p className="text-sm text-muted-foreground">{tool.description}</p>
            )}
            <div className="space-y-2 p-3 rounded-md bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Instructions</p>
              <p className="text-sm whitespace-pre-wrap">{tool.instructions}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={resetAndClose} data-testid="button-custom-exercise-cancel">
                Cancel
              </Button>
              <Button size="sm" onClick={() => mood.finishExercise()} data-testid="button-custom-exercise-done">
                Done
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
