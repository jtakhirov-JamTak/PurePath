import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { VoiceTextarea } from "@/components/voice-input";
import {
  Sun, Moon, Check, ArrowRight,
  Heart, Activity, HandHeart,
  Target, Minus, Pencil, Plus, SkipForward, X,
} from "lucide-react";
import { useLocation } from "wouter";
import { buildProcessUrl } from "@/hooks/use-return-to";
import { format, startOfWeek } from "date-fns";
import type { Purchase, Habit, HabitCompletion, Journal, EisenhowerEntry, MonthlyGoal, Task, CustomTool } from "@shared/schema";
import { ContainmentModal } from "@/components/tools/containment-modal";
import { MovementModal } from "@/components/tools/movement-modal";
import { CompassionModal } from "@/components/tools/compassion-modal";
import { CustomToolsCard, AddCustomToolModal, CustomToolExerciseModal } from "@/components/tools/custom-tool-modal";

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const CATEGORY_STYLES: Record<string, string> = {
  health: "bg-emerald-500",
  wealth: "bg-amber-500",
  relationships: "bg-rose-500",
  career: "bg-blue-500",
  mindfulness: "bg-violet-500",
  learning: "bg-cyan-500",
  leisure: "bg-orange-500",
};

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

  const cycleHabitMutation = useMutation({
    mutationFn: async ({ habitId, currentStatus }: { habitId: number; currentStatus: string | null }) => {
      let res;
      if (currentStatus === null) {
        res = await apiRequest("POST", "/api/habit-completions", { habitId, date: todayStr, status: "completed" });
      } else if (currentStatus === "completed") {
        res = await apiRequest("PATCH", `/api/habit-completions/${habitId}/${todayStr}`, { status: "skipped" });
      } else {
        res = await apiRequest("DELETE", `/api/habit-completions/${habitId}/${todayStr}`);
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
      const res = await apiRequest("PATCH", `/api/eisenhower/${id}`, { status: nextStatus });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update status");
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
                      jh.done ? "bg-primary border-primary" : jh.skipped ? "bg-muted border-muted-foreground/30" : "border-border"
                    }`}>
                      {jh.done && <Check className="h-3 w-3 text-primary-foreground" />}
                      {jh.skipped && <Minus className="h-3 w-3 text-muted-foreground" />}
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
                      {status === "completed" && (
                        <span className="text-xs text-muted-foreground">done</span>
                      )}
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
      <CompassionModal
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
