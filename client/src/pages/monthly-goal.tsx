import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Save, Target, CheckCircle, Heart, HelpCircle, Footprints, Gift, ChevronLeft, ChevronRight } from "lucide-react";
import type { MonthlyGoal } from "@shared/schema";

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function shiftMonth(monthKey: string, delta: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function MonthlyGoalPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey);

  const { data: goal, isLoading } = useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal", monthKey],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-goal?month=${monthKey}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user,
  });

  const [goalStatement, setGoalStatement] = useState("");
  const [successMarker, setSuccessMarker] = useState("");
  const [value, setValue] = useState("");
  const [why, setWhy] = useState("");
  const [nextConcreteStep, setNextConcreteStep] = useState("");
  const [prize, setPrize] = useState("");

  useEffect(() => {
    if (goal) {
      setGoalStatement(goal.goalStatement || "");
      setSuccessMarker(goal.successMarker || "");
      setValue(goal.value || "");
      setWhy(goal.why || "");
      setNextConcreteStep(goal.nextConcreteStep || "");
      setPrize(goal.prize || "");
    }
  }, [goal]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/monthly-goal", {
        monthKey,
        goalStatement: goalStatement.trim(),
        successMarker: successMarker.trim(),
        value: value.trim(),
        why: why.trim(),
        nextConcreteStep: nextConcreteStep.trim(),
        prize: prize.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-goal", monthKey] });
      toast({ title: "Saved", description: "Your monthly goal has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not save. Please try again.", variant: "destructive" });
    },
  });

  const hasChanges =
    goalStatement !== (goal?.goalStatement || "") ||
    successMarker !== (goal?.successMarker || "") ||
    value !== (goal?.value || "") ||
    why !== (goal?.why || "") ||
    nextConcreteStep !== (goal?.nextConcreteStep || "") ||
    prize !== (goal?.prize || "");

  const isCurrentMonth = monthKey === getCurrentMonthKey();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-12 max-w-2xl space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setMonthKey(k => shiftMonth(k, -1))}
              data-testid="button-prev-month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-serif text-3xl font-bold" data-testid="text-month-label">
              {formatMonthLabel(monthKey)}
            </h1>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setMonthKey(k => shiftMonth(k, 1))}
              data-testid="button-next-month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-muted-foreground text-lg">
            Set one clear, meaningful goal for this month. Keep it specific enough to measure, personal enough to care about.
          </p>
        </div>

        <div className="space-y-6">
          <Card className="overflow-visible" data-testid="card-goal-statement">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-serif text-lg">Goal Statement</CardTitle>
                  <CardDescription>What exactly will you accomplish this month?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={goalStatement}
                onChange={(e) => setGoalStatement(e.target.value)}
                placeholder="e.g. Run 3x per week for the whole month and complete a 5K by month-end"
                className="min-h-[80px] text-base"
                data-testid="input-goal-statement"
              />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-success-marker">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <CheckCircle className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-serif text-lg">Success Marker</CardTitle>
                  <CardDescription>How will you know it's done? Be specific and measurable.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={successMarker}
                onChange={(e) => setSuccessMarker(e.target.value)}
                placeholder="e.g. I'll have run at least 12 sessions and finished a 5K race or timed run under 30 min"
                className="min-h-[60px] text-base"
                data-testid="input-success-marker"
              />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-value">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Heart className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-serif text-lg">Which Value Does This Serve?</CardTitle>
                  <CardDescription>Link it to something you deeply care about.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. Health, Discipline, Self-respect"
                className="text-base"
                data-testid="input-value"
              />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-why">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <HelpCircle className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-serif text-lg">Why This, Why Now?</CardTitle>
                  <CardDescription>What makes this the right goal for right now?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder="e.g. I've been sedentary for too long and it's affecting my energy and confidence. Starting now gives me a full month before summer."
                className="min-h-[80px] text-base"
                data-testid="input-why"
              />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-next-step">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Footprints className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-serif text-lg">Next Concrete Step</CardTitle>
                  <CardDescription>What's the very next physical action? Something you can do in under 5 minutes.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Input
                value={nextConcreteStep}
                onChange={(e) => setNextConcreteStep(e.target.value)}
                placeholder="e.g. Lay out running clothes tonight before bed"
                className="text-base"
                data-testid="input-next-step"
              />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-prize">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Gift className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-serif text-lg">Prize</CardTitle>
                  <CardDescription>How will you reward yourself when you hit the goal?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Input
                value={prize}
                onChange={(e) => setPrize(e.target.value)}
                placeholder="e.g. New running shoes, or a day off to do whatever I want"
                className="text-base"
                data-testid="input-prize"
              />
            </CardContent>
          </Card>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!hasChanges || saveMutation.isPending}
              data-testid="button-save-goal"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save Goal"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
