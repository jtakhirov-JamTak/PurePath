import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Grid3X3, Repeat, ListTodo, ArrowRight, Calendar, Footprints, Pencil, Crosshair } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, startOfWeek, endOfWeek } from "date-fns";
import type { EisenhowerEntry, Habit, MonthlyGoal, QuarterlyGoal } from "@shared/schema";

export default function PlanPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");

  const { data: eisenhowerEntries = [] } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower"],
    enabled: !!user,
  });

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: !!user,
  });

  const currentMonthKey = format(today, "yyyy-MM");
  const currentQuarterKey = `${today.getFullYear()}-Q${Math.ceil((today.getMonth() + 1) / 3)}`;

  const { data: monthlyGoal } = useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal", currentMonthKey],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-goal?month=${currentMonthKey}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: quarterlyGoal } = useQuery<QuarterlyGoal>({
    queryKey: ["/api/quarterly-goal", currentQuarterKey],
    queryFn: async () => {
      const res = await fetch(`/api/quarterly-goal?quarter=${currentQuarterKey}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user,
  });

  const goalDisplay = monthlyGoal?.goalWhat?.trim() || monthlyGoal?.goalStatement?.trim() || "";
  const hasGoal = goalDisplay.length > 0;
  const quarterFocus = quarterlyGoal?.quarterlyFocus?.trim() || "";
  const hasQuarterlyGoal = quarterFocus.length > 0;

  const thisWeekEntries = eisenhowerEntries.filter(e => e.weekStart === weekStartStr);
  const q2Items = thisWeekEntries.filter(e => e.quadrant === "q2");
  const completedQ2 = q2Items.filter(e => e.completed);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-10 max-w-2xl">
          <h1 className="font-serif text-3xl font-bold mb-3" data-testid="text-plan-title">Plan</h1>
          <p className="text-muted-foreground text-lg">
            Weekly planning hub — set priorities and align your habits with outcomes.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Week of {format(weekStart, "MMM d")} — {format(weekEnd, "MMM d, yyyy")}
          </p>
        </div>

        <div className="max-w-3xl space-y-6">
          <Card className="overflow-visible" data-testid="card-plan-quarterly-goal">
            <CardHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Crosshair className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="font-serif text-lg">Quarterly Focus</CardTitle>
                  <CardDescription>Your big-picture direction for the quarter</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {hasQuarterlyGoal ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium" data-testid="text-plan-quarterly-focus">{quarterFocus}</p>
                  {quarterlyGoal?.outcomeStatement && (
                    <p className="text-sm text-muted-foreground">Outcome: {quarterlyGoal.outcomeStatement}</p>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setLocation("/quarterly-goal")} data-testid="button-plan-edit-quarterly">
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit Quarterly Goal
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No quarterly focus set yet. Define your big-picture direction to guide your monthly goals.
                  </p>
                  <Button variant="default" onClick={() => setLocation("/quarterly-goal")} data-testid="button-plan-set-quarterly">
                    <Crosshair className="h-4 w-4 mr-2" />
                    Set Quarterly Focus
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-plan-monthly-goal">
            <CardHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="font-serif text-lg">Monthly Goal</CardTitle>
                  <CardDescription>Everything this week should move you toward this</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {hasGoal ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium" data-testid="text-plan-goal">{goalDisplay}</p>
                  {monthlyGoal?.blockingHabit && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Footprints className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>Blocking habit: {monthlyGoal.blockingHabit}</span>
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setLocation("/monthly-goal")} data-testid="button-plan-edit-goal">
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit Goal
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No monthly goal set yet. A clear goal gives direction to your weekly priorities and daily habits.
                  </p>
                  <Button variant="default" onClick={() => setLocation("/monthly-goal")} data-testid="button-plan-set-goal">
                    <Target className="h-4 w-4 mr-2" />
                    Set Monthly Goal
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-weekly-focus">
            <CardHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="font-serif text-lg">This Week's Q2 Focus</CardTitle>
                  <CardDescription>Your most important non-urgent outcomes</CardDescription>
                </div>
                {q2Items.length > 0 && (
                  <Badge variant="outline">{completedQ2.length}/{q2Items.length} done</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {q2Items.length > 0 ? (
                <div className="space-y-2">
                  {q2Items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 py-1.5" data-testid={`q2-item-${item.id}`}>
                      <div className={`h-2 w-2 rounded-full shrink-0 ${item.completed ? "bg-green-500" : "bg-primary"}`} />
                      <span className={`text-sm flex-1 ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                        {item.task}
                      </span>
                      {item.deadline && (
                        <span className="text-xs text-muted-foreground">{format(new Date(item.deadline), "EEE")}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No Q2 items planned this week yet.</p>
              )}
              <div className="mt-4">
                <Button variant="outline" onClick={() => setLocation("/eisenhower")} data-testid="button-open-eisenhower">
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Open Eisenhower Matrix
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-habits-overview">
            <CardHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Repeat className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="font-serif text-lg">Active Habits</CardTitle>
                  <CardDescription>Recurring habits aligned with your outcomes</CardDescription>
                </div>
                <Badge variant="outline">{habits.length} active</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {habits.length > 0 ? (
                <div className="space-y-2">
                  {habits.map(habit => (
                    <div key={habit.id} className="flex items-center gap-3 py-1.5" data-testid={`habit-plan-${habit.id}`}>
                      <div className="h-2 w-2 rounded-full shrink-0 bg-primary" />
                      <span className="text-sm flex-1">{habit.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">{habit.category}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No habits created yet.</p>
              )}
              <div className="mt-4">
                <Button variant="outline" onClick={() => setLocation("/habits")} data-testid="button-open-habits">
                  <Repeat className="h-4 w-4 mr-2" />
                  Manage Habits
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-tasks-overview">
            <CardHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <ListTodo className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="font-serif text-lg">Daily Tasks</CardTitle>
                  <CardDescription>Track up to 3 daily tasks with quadrant labels</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setLocation("/tasks")} data-testid="button-open-tasks">
                <ListTodo className="h-4 w-4 mr-2" />
                Manage Tasks
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground italic">
            Begin — to begin is half the work.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
