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
import {
  Sun, Moon, Pencil, Check, ArrowRight,
  Heart, Brain, Users, FileText, Minus,
  Target, Footprints, AlertTriangle,
  Shield, BookOpen, Activity, Wind,
} from "lucide-react";
import { useLocation } from "wouter";
import { format, startOfWeek, endOfWeek, addDays, isToday } from "date-fns";
import type { Purchase, Habit, HabitCompletion, Journal, EisenhowerEntry, IdentityDocument, MonthlyGoal, QuarterlyGoal } from "@shared/schema";

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  const weekEndDate = endOfWeek(today, { weekStartsOn: 1 });
  const weekStartStr = format(weekStartDate, "yyyy-MM-dd");
  const weekEndStr = format(weekEndDate, "yyyy-MM-dd");

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

  const { data: weekCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions/range", weekStartStr, weekEndStr],
    enabled: !!user,
  });

  const currentMonthKey = format(today, "yyyy-MM");
  const currentYear = today.getFullYear();

  const { data: monthlyGoal, isSuccess: monthlyGoalLoaded } = useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal", currentMonthKey],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-goal?month=${currentMonthKey}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user,
  });

  const quarterKeys = [`${currentYear}-Q1`, `${currentYear}-Q2`, `${currentYear}-Q3`, `${currentYear}-Q4`];
  const currentQuarterKey = `${currentYear}-Q${Math.ceil((today.getMonth() + 1) / 3)}`;

  const { data: q1Goal } = useQuery<QuarterlyGoal>({
    queryKey: ["/api/quarterly-goal", quarterKeys[0]],
    queryFn: async () => { const res = await fetch(`/api/quarterly-goal?quarter=${quarterKeys[0]}`, { credentials: "include" }); if (!res.ok) throw new Error("Failed"); return res.json(); },
    enabled: !!user,
  });
  const { data: q2Goal } = useQuery<QuarterlyGoal>({
    queryKey: ["/api/quarterly-goal", quarterKeys[1]],
    queryFn: async () => { const res = await fetch(`/api/quarterly-goal?quarter=${quarterKeys[1]}`, { credentials: "include" }); if (!res.ok) throw new Error("Failed"); return res.json(); },
    enabled: !!user,
  });
  const { data: q3Goal } = useQuery<QuarterlyGoal>({
    queryKey: ["/api/quarterly-goal", quarterKeys[2]],
    queryFn: async () => { const res = await fetch(`/api/quarterly-goal?quarter=${quarterKeys[2]}`, { credentials: "include" }); if (!res.ok) throw new Error("Failed"); return res.json(); },
    enabled: !!user,
  });
  const { data: q4Goal } = useQuery<QuarterlyGoal>({
    queryKey: ["/api/quarterly-goal", quarterKeys[3]],
    queryFn: async () => { const res = await fetch(`/api/quarterly-goal?quarter=${quarterKeys[3]}`, { credentials: "include" }); if (!res.ok) throw new Error("Failed"); return res.json(); },
    enabled: !!user,
  });

  const quarterlyGoals = [q1Goal, q2Goal, q3Goal, q4Goal];

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
    if (!h.cadence.split(",").includes(todayDayCode)) return false;
    if (h.startDate && todayStr < h.startDate) return false;
    if (h.endDate && todayStr > h.endDate) return false;
    return true;
  });
  const habitStatusMap = new Map<number, string>();
  habitCompletions.forEach((hc) => {
    habitStatusMap.set(hc.habitId, hc.status || "completed");
  });
  const completedCount = todaysHabits.filter((h) =>
    habitStatusMap.get(h.id) === "completed"
  ).length;
  const skippedCount = todaysHabits.filter((h) =>
    habitStatusMap.get(h.id) === "skipped"
  ).length;

  const todayJournals = journals.filter((j) => j.date === todayStr);
  const hasMorning = todayJournals.some((j) => j.session === "morning");
  const hasEvening = todayJournals.some((j) => j.session === "evening");

  const q2Items = eisenhowerEntries.filter((e) => {
    if (e.quadrant !== "q2") return false;
    if (!e.deadline) return false;
    return e.deadline === todayStr;
  });

  const thisWeekEntries = eisenhowerEntries.filter(e => e.weekStart === weekStartStr);

  const cycleHabitMutation = useMutation({
    mutationFn: async ({
      habitId,
      currentStatus,
    }: {
      habitId: number;
      currentStatus: string | null;
    }) => {
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
      queryClient.invalidateQueries({ queryKey: ["/api/habit-completions/range", weekStartStr, weekEndStr] });
    },
  });

  const saveIdentityField = useCallback(
    (fields: Partial<{ todayValue: string; todayIntention: string; todayReflection: string }>) => {
      return apiRequest("PUT", "/api/identity-document", {
        identity: identityDoc?.identity || "",
        vision: identityDoc?.vision || "",
        values: identityDoc?.values || "",
        todayValue: fields.todayValue ?? identityDoc?.todayValue ?? "",
        todayIntention: fields.todayIntention ?? identityDoc?.todayIntention ?? "",
        todayReflection: fields.todayReflection ?? identityDoc?.todayReflection ?? "",
      });
    },
    [identityDoc]
  );

  const todayValueMutation = useMutation({
    mutationFn: async (value: string) => saveIdentityField({ todayValue: value }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] }); },
  });

  const intentionMutation = useMutation({
    mutationFn: async (intention: string) => saveIdentityField({ todayIntention: intention }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] }); },
  });

  const reflectionMutation = useMutation({
    mutationFn: async (reflection: string) => saveIdentityField({ todayReflection: reflection }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] }); },
  });

  const valuesArray = identityDoc?.values
    ? identityDoc.values.split(",").map((v) => v.trim()).filter(Boolean)
    : [];
  const todayValue = identityDoc?.todayValue || null;

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

  if (authLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
          <Skeleton className="h-40 w-full" data-testid="skeleton-cta" />
          <Skeleton className="h-24 w-full" data-testid="skeleton-goals" />
          <Skeleton className="h-48 w-full" data-testid="skeleton-habits" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <YearVisionSection identityDoc={identityDoc} setLocation={setLocation} />

        <QuarterlyGoalsRow
          quarterlyGoals={quarterlyGoals}
          quarterKeys={quarterKeys}
          currentQuarterKey={currentQuarterKey}
          setLocation={setLocation}
        />

        <MonthlyPromiseCard goal={monthlyGoal} setLocation={setLocation} />

        <NorthStarStrip
          identityDoc={identityDoc}
          todayValue={todayValue}
          todayIntention={identityDoc?.todayIntention || ""}
          valuesArray={valuesArray}
          setLocation={setLocation}
          onSelectValue={(v) => todayValueMutation.mutate(v)}
          onSaveIntention={(text) => intentionMutation.mutate(text)}
          isSavingIntention={intentionMutation.isPending}
        />

        <DailyHabitsSection
          todaysHabits={todaysHabits}
          habitStatusMap={habitStatusMap}
          completedCount={completedCount}
          skippedCount={skippedCount}
          cycleHabitMutation={cycleHabitMutation}
          hasMorning={hasMorning}
          hasEvening={hasEvening}
          hasAccess={!!hasPhase12}
          todayStr={todayStr}
          setLocation={setLocation}
        />

        <WeeklyItemsSection
          thisWeekEntries={thisWeekEntries}
          q2Items={q2Items}
          weekStartDate={weekStartDate}
          today={today}
          journals={journals}
          weekCompletions={weekCompletions}
          habits={habits}
          setLocation={setLocation}
        />

        <EveningSection
          todayValue={todayValue}
          todayReflection={identityDoc?.todayReflection || ""}
          hasEvening={hasEvening}
          hasAccess={!!hasPhase12}
          todayStr={todayStr}
          setLocation={setLocation}
          onSaveReflection={(text) => reflectionMutation.mutate(text)}
          isSaving={reflectionMutation.isPending}
        />

        <RegulationLink setLocation={setLocation} />

        <LibraryLink setLocation={setLocation} />
      </div>
    </AppLayout>
  );
}

function YearVisionSection({
  identityDoc,
  setLocation,
}: {
  identityDoc?: IdentityDocument;
  setLocation: (path: string) => void;
}) {
  const yearVision = identityDoc?.yearVision?.trim() || "";

  return (
    <Card className="overflow-visible bg-primary/[0.03]" data-testid="card-year-vision">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">1-Year Vision</p>
              {yearVision ? (
                <p className="text-sm font-medium mt-1" data-testid="text-year-vision">{yearVision}</p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">Set your 1-year vision to guide everything below</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setLocation("/plan")} data-testid="button-edit-year-vision">
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function QuarterlyGoalsRow({
  quarterlyGoals,
  quarterKeys,
  currentQuarterKey,
  setLocation,
}: {
  quarterlyGoals: (QuarterlyGoal | undefined)[];
  quarterKeys: string[];
  currentQuarterKey: string;
  setLocation: (path: string) => void;
}) {
  const labels = ["Q1", "Q2", "Q3", "Q4"];

  return (
    <div className="grid grid-cols-4 gap-2" data-testid="row-quarterly-goals">
      {quarterlyGoals.map((goal, i) => {
        const isCurrent = quarterKeys[i] === currentQuarterKey;
        const focus = goal?.quarterlyFocus?.trim() || goal?.outcomeStatement?.trim() || "";
        return (
          <Card
            key={quarterKeys[i]}
            className={`overflow-visible cursor-pointer hover-elevate ${isCurrent ? "ring-2 ring-primary/50" : ""}`}
            onClick={() => setLocation("/quarterly-goal")}
            data-testid={`card-quarter-${labels[i].toLowerCase()}`}
          >
            <CardContent className="p-3">
              <Badge variant={isCurrent ? "default" : "outline"} className="text-xs mb-1.5">
                {labels[i]}
              </Badge>
              <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-quarter-${labels[i].toLowerCase()}`}>
                {focus || "Not set"}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function MonthlyPromiseCard({
  goal,
  setLocation,
}: {
  goal: MonthlyGoal | undefined;
  setLocation: (path: string) => void;
}) {
  const goalDisplay = goal?.goalWhat?.trim() || goal?.goalStatement?.trim() || "";
  const hasGoal = goalDisplay.length > 0;

  return (
    <Card className="overflow-visible" data-testid="card-monthly-promise">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Footprints className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Monthly Promise</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/monthly-goal")} data-testid="button-edit-monthly-promise">
            <Pencil className="h-3.5 w-3.5 mr-1" />
            {hasGoal ? "Edit" : "Set"}
          </Button>
        </div>
        {hasGoal ? (
          <div>
            <p className="text-sm font-medium" data-testid="text-monthly-promise">{goalDisplay}</p>
            {goal?.deadline && (
              <p className="text-xs text-muted-foreground mt-1" data-testid="text-monthly-deadline">
                <Target className="h-3 w-3 inline mr-1" />
                Deadline: {format(new Date(goal.deadline + "T00:00:00"), "MMM d, yyyy")}
              </p>
            )}
            {goal?.blockingHabit && (
              <p className="text-xs text-muted-foreground mt-1">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                Watch for: {goal.blockingHabit}
              </p>
            )}
            {goal?.goalHow && (
              <p className="text-xs text-muted-foreground mt-1">
                <Footprints className="h-3 w-3 inline mr-1" />
                Next step: {goal.goalHow}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No goal set this month. A clear promise gives each day direction.</p>
        )}
      </CardContent>
    </Card>
  );
}

function NorthStarStrip({
  identityDoc,
  todayValue,
  todayIntention,
  valuesArray,
  setLocation,
  onSelectValue,
  onSaveIntention,
  isSavingIntention,
}: {
  identityDoc?: IdentityDocument;
  todayValue: string | null;
  todayIntention: string;
  valuesArray: string[];
  setLocation: (path: string) => void;
  onSelectValue: (v: string) => void;
  onSaveIntention: (text: string) => void;
  isSavingIntention: boolean;
}) {
  const [localIntention, setLocalIntention] = useState(todayIntention);
  const [hasEditedIntention, setHasEditedIntention] = useState(false);
  const intentionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hasEditedIntention) {
      setLocalIntention(todayIntention);
    }
  }, [todayIntention, hasEditedIntention]);

  useEffect(() => {
    return () => {
      if (intentionDebounceRef.current) clearTimeout(intentionDebounceRef.current);
    };
  }, []);

  const handleIntentionChange = useCallback(
    (value: string) => {
      setLocalIntention(value);
      setHasEditedIntention(true);
      if (intentionDebounceRef.current) clearTimeout(intentionDebounceRef.current);
      intentionDebounceRef.current = setTimeout(() => {
        onSaveIntention(value);
        setHasEditedIntention(false);
      }, 1000);
    },
    [onSaveIntention]
  );

  const hasContent = identityDoc?.identity || identityDoc?.values;

  if (!hasContent) {
    return (
      <Card className="overflow-visible hover-elevate cursor-pointer" onClick={() => setLocation("/identity")} data-testid="card-north-star">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Set up your Identity Document</p>
              <p className="text-xs text-muted-foreground">Define your identity, vision, and values</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-visible" data-testid="card-north-star">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            {identityDoc?.identity && (
              <p className="text-sm" data-testid="text-identity">
                <span className="font-medium text-muted-foreground">Identity: </span>
                {identityDoc.identity.length > 100 ? identityDoc.identity.slice(0, 100) + "..." : identityDoc.identity}
              </p>
            )}
          </div>
          <Button size="icon" variant="ghost" onClick={() => setLocation("/identity")} data-testid="button-edit-northstar">
            <Pencil className="h-4 w-4" />
          </Button>
        </div>

        {valuesArray.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Today I practice:</p>
            <div className="flex flex-wrap gap-2">
              {valuesArray.map((v) => (
                <Badge
                  key={v}
                  variant={todayValue === v ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => onSelectValue(v)}
                  data-testid={`badge-select-value-${v}`}
                >
                  {v}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {todayValue && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              How will I practice <span className="font-medium text-foreground">{todayValue}</span> today?
            </p>
            <VoiceTextarea
              value={localIntention}
              onChange={(val) => handleIntentionChange(val)}
              placeholder={`My plan to practice ${todayValue} today...`}
              className="resize-none text-sm"
              rows={2}
              data-testid="textarea-intention"
            />
            {isSavingIntention && (
              <p className="text-xs text-muted-foreground" data-testid="text-saving-intention">Saving...</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DailyHabitsSection({
  todaysHabits,
  habitStatusMap,
  completedCount,
  skippedCount,
  cycleHabitMutation,
  hasMorning,
  hasEvening,
  hasAccess,
  todayStr,
  setLocation,
}: {
  todaysHabits: Habit[];
  habitStatusMap: Map<number, string>;
  completedCount: number;
  skippedCount: number;
  cycleHabitMutation: { mutate: (vars: { habitId: number; currentStatus: string | null }) => void; isPending: boolean };
  hasMorning: boolean;
  hasEvening: boolean;
  hasAccess: boolean;
  todayStr: string;
  setLocation: (path: string) => void;
}) {
  const journalItems = hasAccess ? [
    {
      id: "morning-journal",
      name: "Morning Journal",
      isDone: hasMorning,
      icon: Sun,
      iconClass: "text-amber-500",
      onClick: () => { setLocation(`/journal/${todayStr}/morning`); window.scrollTo(0, 0); },
    },
    {
      id: "evening-journal",
      name: "Evening Journal",
      isDone: hasEvening,
      icon: Moon,
      iconClass: "text-indigo-500",
      onClick: () => { setLocation(`/journal/${todayStr}/evening`); window.scrollTo(0, 0); },
    },
  ] : [];

  const totalItems = todaysHabits.length + journalItems.length;
  const totalDone = completedCount + journalItems.filter(j => j.isDone).length;

  return (
    <Card className="overflow-visible" data-testid="card-daily-habits">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-base font-serif">Daily Habits</CardTitle>
          <span className="text-xs text-muted-foreground" data-testid="text-habits-progress">
            {totalDone}/{totalItems} done{skippedCount > 0 ? ` · ${skippedCount} skipped` : ""}
          </span>
        </div>
        {totalItems > 0 && (
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${totalItems > 0 ? (totalDone / totalItems) * 100 : 0}%` }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="pb-4">
        <ul className="space-y-2">
          {journalItems.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 cursor-pointer"
              onClick={item.onClick}
              data-testid={`habit-item-${item.id}`}
            >
              <div className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${
                item.isDone ? "bg-primary border-primary" : "border-border"
              }`}>
                {item.isDone && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              <item.icon className={`h-4 w-4 ${item.iconClass} shrink-0`} />
              <span className={`text-sm ${item.isDone ? "line-through text-muted-foreground" : ""}`}>
                {item.name}
              </span>
              {!item.isDone && (
                <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto" />
              )}
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
                  aria-label={`${habit.name} - ${status === "completed" ? "completed" : status === "skipped" ? "skipped" : "not tracked"}. Click to cycle.`}
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
                {habit.motivatingReason && (
                  <span className="text-xs text-muted-foreground italic hidden sm:inline max-w-[120px] truncate" title={habit.motivatingReason}>
                    {habit.motivatingReason}
                  </span>
                )}
                {status === "skipped" && (
                  <span className="text-xs text-muted-foreground ml-auto">skipped</span>
                )}
              </li>
            );
          })}

          {totalItems === 0 && (
            <li>
              <p className="text-sm text-muted-foreground" data-testid="text-no-habits">
                No habits scheduled for today
              </p>
            </li>
          )}
        </ul>

        <div className="mt-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/habits")} data-testid="button-manage-habits">
            Manage Habits
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyItemsSection({
  thisWeekEntries,
  q2Items,
  weekStartDate,
  today,
  journals,
  weekCompletions,
  habits,
  setLocation,
}: {
  thisWeekEntries: EisenhowerEntry[];
  q2Items: EisenhowerEntry[];
  weekStartDate: Date;
  today: Date;
  journals: Journal[];
  weekCompletions: HabitCompletion[];
  habits: Habit[];
  setLocation: (path: string) => void;
}) {
  const queryClient = useQueryClient();
  const weekStartStr = format(weekStartDate, "yyyy-MM-dd");
  const weekEndStr = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const toggleMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: number; currentStatus: string | null }) => {
      const nextStatus = currentStatus === null || currentStatus === undefined ? "completed" : currentStatus === "completed" ? "skipped" : null;
      await apiRequest("PATCH", `/api/eisenhower/${id}`, { status: nextStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
    },
  });

  const weekQ2 = thisWeekEntries.filter(e => e.quadrant === "q2");
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));

  return (
    <Card className="overflow-visible" data-testid="card-weekly-items">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-base font-serif">This Week</CardTitle>
          <span className="text-xs text-muted-foreground">
            {format(weekStartDate, "MMM d")} — {format(endOfWeek(today, { weekStartsOn: 1 }), "MMM d")}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-4">
        {q2Items.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Today's Q2 Focus</p>
            <ul className="space-y-1.5">
              {q2Items.map((item) => (
                <li key={item.id} className="flex items-center gap-3" data-testid={`q2-item-${item.id}`}>
                  <button
                    role="checkbox"
                    aria-checked={item.status === "completed" ? true : item.status === "skipped" ? "mixed" : false}
                    aria-label={`${item.task} - ${item.status === "completed" ? "completed" : item.status === "skipped" ? "skipped" : "not tracked"}`}
                    className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                      item.status === "completed" ? "bg-primary border-primary" : item.status === "skipped" ? "bg-muted border-muted-foreground/30" : "border-border"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMutation.mutate({ id: item.id, currentStatus: item.status || null });
                    }}
                    data-testid={`q2-cycle-${item.id}`}
                  >
                    {item.status === "completed" && <Check className="h-3 w-3 text-primary-foreground" />}
                    {item.status === "skipped" && <Minus className="h-3 w-3 text-muted-foreground" />}
                  </button>
                  <span className={`text-sm ${
                    item.status === "completed" ? "line-through text-muted-foreground" : item.status === "skipped" ? "text-muted-foreground italic" : ""
                  }`}>{item.task}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {weekQ2.length > 0 && weekQ2.length !== q2Items.length && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Week's Q2 Items ({weekQ2.filter(e => e.completed).length}/{weekQ2.length} done)
            </p>
            <Button variant="outline" size="sm" onClick={() => setLocation("/eisenhower")} data-testid="button-open-eisenhower">
              Open Eisenhower Matrix
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between gap-1">
          {days.map((day, i) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const dayCode = DAY_CODES[day.getDay()];
            const isTodayDay = isToday(day);
            const dayJournals = journals.filter((j) => j.date === dayStr);
            const hasMJ = dayJournals.some((j) => j.session === "morning");
            const hasEJ = dayJournals.some((j) => j.session === "evening");
            const dayHabits = habits.filter((h) => h.cadence.split(",").includes(dayCode));
            const dayCompleted = weekCompletions.filter((hc) => hc.date === dayStr);
            const allHabitsDone = dayHabits.length > 0 && dayHabits.every((h) => dayCompleted.some((c) => c.habitId === h.id));

            return (
              <div
                key={i}
                className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-md ${isTodayDay ? "ring-2 ring-primary/50" : ""}`}
                data-testid={`calendar-day-${dayStr}`}
              >
                <span className={`text-xs font-medium ${isTodayDay ? "text-primary" : "text-muted-foreground"}`}>{DAY_LABELS[i]}</span>
                <span className={`text-sm font-medium ${isTodayDay ? "text-foreground" : "text-muted-foreground"}`}>{format(day, "d")}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  {hasMJ && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Morning journal" />}
                  {hasEJ && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" title="Evening journal" />}
                  {allHabitsDone && <span className="h-1.5 w-1.5 rounded-full bg-green-500" title="All habits done" />}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function EveningSection({
  todayValue,
  todayReflection,
  hasEvening,
  hasAccess,
  todayStr,
  setLocation,
  onSaveReflection,
  isSaving,
}: {
  todayValue: string | null;
  todayReflection: string;
  hasEvening: boolean;
  hasAccess: boolean;
  todayStr: string;
  setLocation: (path: string) => void;
  onSaveReflection: (text: string) => void;
  isSaving: boolean;
}) {
  const [localReflection, setLocalReflection] = useState(todayReflection);
  const [hasEdited, setHasEdited] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hasEdited) {
      setLocalReflection(todayReflection);
    }
  }, [todayReflection, hasEdited]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleReflectionChange = useCallback(
    (value: string) => {
      setLocalReflection(value);
      setHasEdited(true);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSaveReflection(value);
        setHasEdited(false);
      }, 1000);
    },
    [onSaveReflection]
  );

  if (!hasAccess) return null;

  return (
    <Card className="overflow-visible" data-testid="card-evening">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Moon className="h-5 w-5 text-indigo-500 shrink-0" />
          <p className="text-base font-medium font-serif" data-testid="text-evening-title">Evening</p>
        </div>

        {todayValue && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              How did you practice <span className="font-medium text-foreground">{todayValue}</span> today?
            </p>
            <VoiceTextarea
              value={localReflection}
              onChange={(val) => handleReflectionChange(val)}
              placeholder={`Describe how you practiced ${todayValue} today...`}
              className="resize-none text-sm"
              rows={3}
              data-testid="textarea-reflection"
            />
            {isSaving && (
              <p className="text-xs text-muted-foreground" data-testid="text-saving">Saving...</p>
            )}
          </div>
        )}

        {!todayValue && (
          <p className="text-sm text-muted-foreground" data-testid="text-no-value-selected">
            Select a value above to reflect on how you practiced it today.
          </p>
        )}

        <Button
          variant={hasEvening ? "outline" : "default"}
          onClick={() => { setLocation(`/journal/${todayStr}/evening`); window.scrollTo(0, 0); }}
          data-testid="button-evening-journal"
          className="w-full"
        >
          <Moon className="mr-2 h-4 w-4" />
          {hasEvening ? "Review Evening Journal" : "Start Evening Journal"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function RegulationLink({ setLocation }: { setLocation: (path: string) => void }) {
  return (
    <Card
      className="overflow-visible hover-elevate cursor-pointer"
      onClick={() => setLocation("/regulation")}
      data-testid="card-regulation-link"
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
            <Shield className="h-5 w-5 text-rose-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Regulation Now</p>
            <p className="text-xs text-muted-foreground">
              Emotional containment, breathwork, micro-movement
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-muted-foreground" />
            <Wind className="h-3.5 w-3.5 text-muted-foreground" />
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

function LibraryLink({ setLocation }: { setLocation: (path: string) => void }) {
  return (
    <Card
      className="overflow-visible hover-elevate cursor-pointer"
      onClick={() => setLocation("/tools")}
      data-testid="card-library-link"
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Library</p>
            <p className="text-xs text-muted-foreground">
              Guides, frameworks, and self-development tools
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}
