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
import { useTimer, formatTime } from "@/hooks/use-timer";
import {
  Sun, Moon, Check, ArrowRight,
  Heart, Activity, HandHeart,
  Target, Minus, Play, Pause, RotateCcw,
  Pencil, Plus, Trash2, Footprints,
} from "lucide-react";
import { useLocation } from "wouter";
import { format, startOfWeek, endOfWeek } from "date-fns";
import type { Purchase, Habit, HabitCompletion, Journal, EisenhowerEntry, IdentityDocument, MonthlyGoal, Task } from "@shared/schema";

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

  const completedHabits = todaysHabits.filter(h => habitStatusMap.get(h.id) === "completed").length;
  const totalHabits = todaysHabits.length;
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

        {todaysHabits.length > 0 && (
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

        {todaysHabits.length === 0 && (
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
                {todayQ2Items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3" data-testid={`q2-block-${item.id}`}>
                    <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-sm flex-1">{item.task}</span>
                    {item.scheduledTime && (
                      <span className="text-xs text-muted-foreground">{item.scheduledTime}</span>
                    )}
                    {item.durationMinutes && (
                      <Badge variant="outline" className="text-[10px]">{item.durationMinutes}m</Badge>
                    )}
                  </li>
                ))}
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
                <span className="text-xs">Compassion</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ContainmentModal open={quickToolOpen === "containment"} onClose={() => setQuickToolOpen(null)} />
      <MovementModal open={quickToolOpen === "movement"} onClose={() => setQuickToolOpen(null)} />
      <CompassionModal
        open={quickToolOpen === "compassion"}
        onClose={() => setQuickToolOpen(null)}
        todayStr={todayStr}
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

const CONTAINMENT_STEPS = [
  { label: "FEEL", instruction: "Notice the emotion in your body. Throat, chest, jaw. Don't push it away.", duration: 15 },
  { label: "NAME", instruction: "Label the emotion: angry, sad, anxious, frustrated, hurt, scared.", duration: 0 },
  { label: "REGULATE", instruction: "Take 3 slow breaths. In through your nose, out through your mouth.", duration: 20 },
  { label: "MOVE", instruction: "Choose one small action: stand up, stretch, drink water, write one sentence.", duration: 0 },
];

function ContainmentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const timer = useTimer(CONTAINMENT_STEPS[0].duration);
  const [emotionName, setEmotionName] = useState("");
  const [moveAction, setMoveAction] = useState("");
  const queryClient = useQueryClient();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const addTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      return apiRequest("POST", "/api/tasks", {
        title,
        date: todayStr,
        time: format(new Date(), "HH:mm"),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const currentStep = CONTAINMENT_STEPS[step];
  const isLastStep = step === CONTAINMENT_STEPS.length - 1;

  const goNext = () => {
    if (isLastStep) {
      if (moveAction.trim()) {
        addTaskMutation.mutate(moveAction.trim());
      }
      resetAndClose();
      return;
    }
    const nextStep = step + 1;
    setStep(nextStep);
    const nextDuration = CONTAINMENT_STEPS[nextStep].duration;
    if (nextDuration > 0) {
      timer.setDuration(nextDuration);
    }
  };

  const resetAndClose = () => {
    setStep(0);
    setEmotionName("");
    setMoveAction("");
    timer.setDuration(CONTAINMENT_STEPS[0].duration);
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
              <div className="flex flex-col items-center gap-3">
                <div className="relative h-24 w-24">
                  <svg className="h-24 w-24 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
                    <circle
                      cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6"
                      className="text-primary transition-all duration-1000"
                      strokeDasharray={`${2 * Math.PI * 54}`}
                      strokeDashoffset={`${2 * Math.PI * 54 * (1 - timer.progress / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-mono font-bold" data-testid="text-containment-timer">{formatTime(timer.seconds)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!timer.isRunning ? (
                    <Button size="sm" onClick={timer.start} disabled={timer.seconds === 0} data-testid="button-containment-start">
                      <Play className="h-4 w-4 mr-1" />
                      {timer.isComplete ? "Done" : "Start"}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={timer.pause} data-testid="button-containment-pause">
                      <Pause className="h-4 w-4 mr-1" />
                      Pause
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={timer.reset} data-testid="button-containment-reset">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {["Angry", "Sad", "Anxious", "Frustrated", "Hurt", "Scared"].map(e => (
                  <Badge
                    key={e}
                    variant={emotionName === e ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setEmotionName(e)}
                    data-testid={`badge-emotion-${e.toLowerCase()}`}
                  >
                    {e}
                  </Badge>
                ))}
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
            <Button
              size="sm"
              onClick={goNext}
              disabled={currentStep.duration > 0 && !timer.isComplete && timer.seconds > 0}
              data-testid="button-containment-next"
            >
              {isLastStep ? (moveAction.trim() ? "Add to Tasks & Done" : "Done") : "Next"}
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const MOVEMENT_SUGGESTIONS = [
  "Walk around for 2 minutes",
  "Stretch your arms and legs",
  "Do 10 arm raises",
  "Wash your hands or face",
  "Stand and shake your body",
];

function MovementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const timer = useTimer(120);

  const resetAndClose = () => {
    timer.setDuration(120);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
      <DialogContent className="sm:max-w-md" data-testid="modal-movement">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            Micro Movement
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-28 w-28">
              <svg className="h-28 w-28 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
                <circle
                  cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6"
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

            <div className="flex items-center gap-2">
              {[60, 120, 180].map(d => (
                <Button
                  key={d}
                  variant={timer.totalSeconds === d ? "default" : "outline"}
                  size="sm"
                  onClick={() => timer.setDuration(d)}
                  data-testid={`button-movement-duration-${d}`}
                >
                  {formatTime(d)}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Suggestions</p>
            <ul className="space-y-1.5">
              {MOVEMENT_SUGGESTIONS.map((s, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-sm text-muted-foreground">{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={resetAndClose} data-testid="button-movement-close">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CompassionModal({
  open,
  onClose,
  todayStr,
}: {
  open: boolean;
  onClose: () => void;
  todayStr: string;
}) {
  const queryClient = useQueryClient();
  const [whatsGoingOn, setWhatsGoingOn] = useState("");
  const [lovedOneResponse, setLovedOneResponse] = useState("");
  const [selfResponse, setSelfResponse] = useState("");
  const [saved, setSaved] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const content = [
        whatsGoingOn ? `What's going on: ${whatsGoingOn}` : "",
        lovedOneResponse ? `To a loved one: ${lovedOneResponse}` : "",
        selfResponse ? `To myself: ${selfResponse}` : "",
      ].filter(Boolean).join("\n");
      return apiRequest("PUT", "/api/journals", {
        date: todayStr,
        session: "morning",
        reflections: content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journals"] });
      setSaved(true);
    },
  });

  const resetAndClose = () => {
    setWhatsGoingOn("");
    setLovedOneResponse("");
    setSelfResponse("");
    setSaved(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
      <DialogContent className="sm:max-w-md" data-testid="modal-compassion">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <HandHeart className="h-5 w-5 text-violet-500" />
            Self-Compassion
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1.5">What's going on? <span className="text-muted-foreground font-normal">(optional)</span></p>
              <VoiceTextarea
                value={whatsGoingOn}
                onChange={setWhatsGoingOn}
                placeholder="Briefly describe the situation..."
                rows={2}
                className="resize-none text-sm"
                data-testid="textarea-compassion-situation"
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-1.5">What would you say to a loved one in this situation?</p>
              <VoiceTextarea
                value={lovedOneResponse}
                onChange={setLovedOneResponse}
                placeholder="Imagine someone you care about is going through this..."
                rows={2}
                className="resize-none text-sm"
                data-testid="textarea-compassion-loved-one"
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-1.5">Now say that to yourself, as that loved one.</p>
              <VoiceTextarea
                value={selfResponse}
                onChange={setSelfResponse}
                placeholder="Speak to yourself with the same care..."
                rows={2}
                className="resize-none text-sm"
                data-testid="textarea-compassion-self"
              />
            </div>
          </div>

          <div className="flex justify-between items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saved || saveMutation.isPending || (!lovedOneResponse.trim() && !selfResponse.trim())}
              data-testid="button-compassion-save"
            >
              {saved ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Saved to Journal
                </>
              ) : (
                "Save to Journal"
              )}
            </Button>
            <Button size="sm" onClick={resetAndClose} data-testid="button-compassion-done">
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
