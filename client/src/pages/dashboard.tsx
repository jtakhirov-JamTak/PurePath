import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Sun, Moon, Pencil, Check, ArrowRight,
  Heart, Brain, Users, CircleDot, FileText,
} from "lucide-react";
import { useLocation } from "wouter";
import { format, startOfWeek, endOfWeek, addDays, isToday } from "date-fns";
import { Target, Footprints, AlertTriangle } from "lucide-react";
import type { Purchase, Habit, HabitCompletion, Journal, EisenhowerEntry, IdentityDocument, MonthlyGoal } from "@shared/schema";

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
  const { data: monthlyGoal } = useQuery<MonthlyGoal>({
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
  const todaysHabits = habits.filter((h) =>
    h.cadence.split(",").includes(todayDayCode)
  );
  const completedHabitIds = new Set(habitCompletions.map((hc) => hc.habitId));
  const completedCount = todaysHabits.filter((h) =>
    completedHabitIds.has(h.id)
  ).length;

  const todayJournals = journals.filter((j) => j.date === todayStr);
  const hasMorning = todayJournals.some((j) => j.session === "morning");
  const hasEvening = todayJournals.some((j) => j.session === "evening");

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const hasRecentJournal = journals.some((j) => {
    const jDate = new Date(j.date + "T00:00:00");
    return jDate >= threeDaysAgo;
  });
  const noJournalIn3Days = journals.length > 0 && !hasRecentJournal;

  const q2Items = eisenhowerEntries.filter((e) => {
    if (e.quadrant !== "q2") return false;
    if (!e.deadline) return false;
    return e.deadline === todayStr;
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      habitId,
      completed,
    }: {
      habitId: number;
      completed: boolean;
    }) => {
      if (completed) {
        await apiRequest("DELETE", `/api/habit-completions/${habitId}/${todayStr}`);
      } else {
        await apiRequest("POST", "/api/habit-completions", {
          habitId,
          date: todayStr,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/habit-completions", todayStr],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/habit-completions/range", weekStartStr, weekEndStr],
      });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] });
    },
  });

  const intentionMutation = useMutation({
    mutationFn: async (intention: string) => saveIdentityField({ todayIntention: intention }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] });
    },
  });

  const reflectionMutation = useMutation({
    mutationFn: async (reflection: string) => saveIdentityField({ todayReflection: reflection }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] });
    },
  });

  const valuesArray = identityDoc?.values
    ? identityDoc.values.split(",").map((v) => v.trim()).filter(Boolean)
    : [];
  const todayValue = identityDoc?.todayValue || null;

  if (authLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
          <Skeleton className="h-40 w-full" data-testid="skeleton-cta" />
          <Skeleton className="h-24 w-full" data-testid="skeleton-northstar" />
          <Skeleton className="h-32 w-full" data-testid="skeleton-q2" />
          <Skeleton className="h-48 w-full" data-testid="skeleton-habits" />
          <Skeleton className="h-20 w-full" data-testid="skeleton-calendar" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <NextStepCTA
          hasMorning={hasMorning}
          hasEvening={hasEvening}
          noJournalIn3Days={noJournalIn3Days}
          hasAccess={!!hasPhase12}
          todayStr={todayStr}
          setLocation={setLocation}
          userName={user?.firstName}
        />

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

        <MonthlyGoalCard goal={monthlyGoal} setLocation={setLocation} />

        <Q2FocusCard q2Items={q2Items} setLocation={setLocation} />

        <HabitsChecklist
          todaysHabits={todaysHabits}
          completedHabitIds={completedHabitIds}
          completedCount={completedCount}
          toggleMutation={toggleMutation}
        />

        <MiniCalendar
          weekStartDate={weekStartDate}
          today={today}
          journals={journals}
          weekCompletions={weekCompletions}
          habits={habits}
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

        <SupportSection setLocation={setLocation} />
      </div>
    </AppLayout>
  );
}

function NextStepCTA({
  hasMorning,
  hasEvening,
  noJournalIn3Days,
  hasAccess,
  todayStr,
  setLocation,
  userName,
}: {
  hasMorning: boolean;
  hasEvening: boolean;
  noJournalIn3Days: boolean;
  hasAccess: boolean;
  todayStr: string;
  setLocation: (path: string) => void;
  userName?: string | null;
}) {
  if (!hasAccess) {
    return (
      <Card className="overflow-visible bg-primary/[0.03]" data-testid="card-next-step">
        <CardContent className="p-6">
          <p className="text-lg font-medium mb-2" data-testid="text-cta-title">
            Start your Inner Journey
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Unlock journaling, habits, and daily tools to build lasting change.
          </p>
          <Button
            onClick={() => setLocation("/checkout/phase12")}
            data-testid="button-unlock-access"
          >
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  let title: string;
  let subtitle: string | null = null;
  let buttonLabel: string;
  let buttonPath: string;
  let IconComponent = Sun;
  let iconClass = "text-amber-500";

  if (noJournalIn3Days) {
    title = "Welcome back! Do a 2-minute restart.";
    subtitle = "It does not matter how slowly you go as long as you do not stop.";
    buttonLabel = "Start Morning Check-in (2 min)";
    buttonPath = `/journal/${todayStr}/morning`;
    IconComponent = Sun;
    iconClass = "text-amber-500";
  } else if (!hasMorning) {
    title = userName ? `Good to see you, ${userName}` : "Ready for today";
    buttonLabel = "Start Morning Check-in (2 min)";
    buttonPath = `/journal/${todayStr}/morning`;
    IconComponent = Sun;
    iconClass = "text-amber-500";
  } else if (!hasEvening) {
    title = "Morning done — time to reflect";
    buttonLabel = "Start Evening Review (3 min)";
    buttonPath = `/journal/${todayStr}/evening`;
    IconComponent = Moon;
    iconClass = "text-indigo-500";
  } else {
    title = "Both sessions complete";
    buttonLabel = "Quick Check-in (2 min)";
    buttonPath = `/journal/${todayStr}/morning`;
    IconComponent = Check;
    iconClass = "text-green-500";
  }

  return (
    <Card className="overflow-visible bg-primary/[0.03]" data-testid="card-next-step">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 mt-1">
            <IconComponent className={`h-8 w-8 ${iconClass}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-medium mb-1" data-testid="text-cta-title">
              {title}
            </p>
            {subtitle && (
              <p className="text-sm text-muted-foreground italic mb-3" data-testid="text-cta-subtitle">
                {subtitle}
              </p>
            )}
            <Button
              onClick={() => {
                setLocation(buttonPath);
                window.scrollTo(0, 0);
              }}
              data-testid="button-next-step"
              className="mt-2"
            >
              {buttonLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
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
              <p className="text-xs text-muted-foreground">Define your identity, vision, and values to guide your practice</p>
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
                {identityDoc.identity.length > 100
                  ? identityDoc.identity.slice(0, 100) + "..."
                  : identityDoc.identity}
              </p>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setLocation("/identity")}
            data-testid="button-edit-northstar"
          >
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
            <Textarea
              value={localIntention}
              onChange={(e) => handleIntentionChange(e.target.value)}
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

function MonthlyGoalCard({
  goal,
  setLocation,
}: {
  goal: MonthlyGoal | undefined;
  setLocation: (path: string) => void;
}) {
  const goalDisplay = goal?.goalWhat?.trim() || goal?.goalStatement?.trim() || "";
  const hasGoal = goalDisplay.length > 0;

  if (!hasGoal) {
    return (
      <Card className="overflow-visible" data-testid="card-monthly-goal">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="font-serif text-lg">Monthly Goal</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            No goal set for this month. A clear goal gives every day direction.
          </p>
          <Button
            size="sm"
            onClick={() => setLocation("/monthly-goal")}
            data-testid="button-set-monthly-goal"
          >
            Set Goal
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-visible" data-testid="card-monthly-goal">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="font-serif text-lg">Goal Review</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Quick 2-min daily check-in</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/monthly-goal")}
          data-testid="button-edit-monthly-goal"
        >
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Edit
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-primary/[0.04] border border-primary/10 px-4 py-3">
          <p className="text-sm font-medium leading-relaxed" data-testid="text-goal-statement">{goalDisplay}</p>
          {goal?.goalWhen && (
            <p className="text-xs text-muted-foreground mt-1" data-testid="text-goal-when">{goal.goalWhen}</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3" data-testid="review-blocking">
            <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="h-3 w-3 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium">Does this block my goal?</p>
              {goal?.blockingHabit ? (
                <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-blocking-habit">Watch for: {goal.blockingHabit}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">Notice what pulls you off track today</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3" data-testid="review-next-step">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Footprints className="h-3 w-3 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">What's the next concrete step?</p>
              {goal?.goalHow ? (
                <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-goal-how">Plan: {goal.goalHow}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">One small action you can take today</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3" data-testid="review-enjoy">
            <div className="h-6 w-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Heart className="h-3 w-3 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium">How can I enjoy the process?</p>
              {goal?.fun ? (
                <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-goal-fun">{goal.fun}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">Happiness lives in the pursuit</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Q2FocusCard({
  q2Items,
  setLocation,
}: {
  q2Items: EisenhowerEntry[];
  setLocation: (path: string) => void;
}) {
  return (
    <Card className="overflow-visible" data-testid="card-q2-focus">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-serif">Today's Q2 Focus</CardTitle>
        <p className="text-xs italic text-muted-foreground">
          Begin — to begin is half the work
        </p>
      </CardHeader>
      <CardContent className="pb-4">
        {q2Items.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="text-no-q2">
            No Q2 items scheduled
          </p>
        ) : (
          <ul className="space-y-2">
            {q2Items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 text-sm cursor-pointer hover-elevate rounded-md px-2 py-1"
                onClick={() => setLocation("/eisenhower")}
                data-testid={`q2-item-${item.id}`}
              >
                <CircleDot
                  className={`h-3 w-3 shrink-0 ${
                    item.completed ? "text-green-500" : "text-muted-foreground"
                  }`}
                />
                <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                  {item.task}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function HabitsChecklist({
  todaysHabits,
  completedHabitIds,
  completedCount,
  toggleMutation,
}: {
  todaysHabits: Habit[];
  completedHabitIds: Set<number>;
  completedCount: number;
  toggleMutation: { mutate: (vars: { habitId: number; completed: boolean }) => void; isPending: boolean };
}) {
  return (
    <Card className="overflow-visible" data-testid="card-habits">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-base font-serif">Daily Habits</CardTitle>
          <span className="text-xs text-muted-foreground" data-testid="text-habits-progress">
            {completedCount}/{todaysHabits.length} completed
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {todaysHabits.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="text-no-habits">
            No habits scheduled for today
          </p>
        ) : (
          <ul className="space-y-2">
            {todaysHabits.map((habit) => {
              const done = completedHabitIds.has(habit.id);
              const catStyle =
                CATEGORY_STYLES[(habit.category as string) || "health"] ||
                CATEGORY_STYLES.health;
              return (
                <li
                  key={habit.id}
                  className="flex items-center gap-3"
                  data-testid={`habit-item-${habit.id}`}
                >
                  <Checkbox
                    checked={done}
                    onCheckedChange={() =>
                      toggleMutation.mutate({ habitId: habit.id, completed: done })
                    }
                    data-testid={`checkbox-habit-${habit.id}`}
                  />
                  <span className={`h-2 w-2 rounded-full shrink-0 ${catStyle}`} />
                  <span
                    className={`text-sm ${
                      done ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {habit.name}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function MiniCalendar({
  weekStartDate,
  today,
  journals,
  weekCompletions,
  habits,
}: {
  weekStartDate: Date;
  today: Date;
  journals: Journal[];
  weekCompletions: HabitCompletion[];
  habits: Habit[];
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));

  return (
    <Card className="overflow-visible" data-testid="card-mini-calendar">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-1">
          {days.map((day, i) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const dayCode = DAY_CODES[day.getDay()];
            const isTodayDay = isToday(day);

            const dayJournals = journals.filter((j) => j.date === dayStr);
            const hasMJ = dayJournals.some((j) => j.session === "morning");
            const hasEJ = dayJournals.some((j) => j.session === "evening");

            const dayHabits = habits.filter((h) =>
              h.cadence.split(",").includes(dayCode)
            );
            const dayCompleted = weekCompletions.filter(
              (hc) => hc.date === dayStr
            );
            const allHabitsDone =
              dayHabits.length > 0 &&
              dayHabits.every((h) =>
                dayCompleted.some((c) => c.habitId === h.id)
              );

            return (
              <div
                key={i}
                className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-md ${
                  isTodayDay ? "ring-2 ring-primary/50" : ""
                }`}
                data-testid={`calendar-day-${dayStr}`}
              >
                <span
                  className={`text-xs font-medium ${
                    isTodayDay ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {DAY_LABELS[i]}
                </span>
                <span
                  className={`text-sm font-medium ${
                    isTodayDay ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {format(day, "d")}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  {hasMJ && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-amber-500"
                      title="Morning journal"
                    />
                  )}
                  {hasEJ && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-indigo-500"
                      title="Evening journal"
                    />
                  )}
                  {allHabitsDone && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-green-500"
                      title="All habits done"
                    />
                  )}
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
          <div>
            <p className="text-base font-medium font-serif" data-testid="text-evening-title">Evening</p>
          </div>
        </div>

        {todayValue && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              How did you practice <span className="font-medium text-foreground">{todayValue}</span> today?
            </p>
            <Textarea
              value={localReflection}
              onChange={(e) => handleReflectionChange(e.target.value)}
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

        <div>
          <Button
            variant={hasEvening ? "outline" : "default"}
            onClick={() => {
              setLocation(`/journal/${todayStr}/evening`);
              window.scrollTo(0, 0);
            }}
            data-testid="button-evening-journal"
            className="w-full"
          >
            <Moon className="mr-2 h-4 w-4" />
            {hasEvening ? "Review Evening Journal" : "Start Evening Journal"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SupportSection({
  setLocation,
}: {
  setLocation: (path: string) => void;
}) {
  const items = [
    {
      title: "Emotional Containment (60 sec)",
      description: "feel \u2192 name \u2192 regulate \u2192 move",
      path: "/emotional-processing",
      icon: Heart,
      testId: "button-emotional",
    },
    {
      title: "Integrative Meditation",
      description: "quiet your mind, write one insight",
      path: "/meditation",
      icon: Brain,
      testId: "button-meditation",
    },
    {
      title: "EQ Module",
      description: "reflect on interactions",
      path: "/empathy",
      icon: Users,
      testId: "button-eq",
    },
    {
      title: "Identity Document",
      description: "revisit who you are becoming",
      path: "/identity",
      icon: FileText,
      testId: "button-identity",
    },
  ];

  return (
    <div data-testid="section-support">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Need support now?
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.testId}
              className="overflow-visible hover-elevate cursor-pointer"
              onClick={() => setLocation(item.path)}
              data-testid={item.testId}
            >
              <CardContent className="p-4">
                <Icon className="h-5 w-5 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
