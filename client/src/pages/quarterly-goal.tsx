import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Save, ChevronLeft, ChevronRight, Target, Pencil, ArrowRight } from "lucide-react";
import type { QuarterlyGoal, MonthlyGoal } from "@shared/schema";
import { Link } from "wouter";

function getCurrentQuarterKey() {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${q}`;
}

function formatQuarterLabel(key: string) {
  const [year, quarter] = key.split("-");
  return `${quarter} ${year}`;
}

function shiftQuarter(key: string, delta: number) {
  const [yearStr, qStr] = key.split("-");
  let year = parseInt(yearStr);
  let q = parseInt(qStr.replace("Q", ""));
  q += delta;
  while (q > 4) { q -= 4; year++; }
  while (q < 1) { q += 4; year--; }
  return `${year}-Q${q}`;
}

function getMonthsInQuarter(quarterKey: string): string[] {
  const [yearStr, qStr] = quarterKey.split("-");
  const year = yearStr;
  const q = parseInt(qStr.replace("Q", ""));
  const startMonth = (q - 1) * 3 + 1;
  return [
    `${year}-${String(startMonth).padStart(2, "0")}`,
    `${year}-${String(startMonth + 1).padStart(2, "0")}`,
    `${year}-${String(startMonth + 2).padStart(2, "0")}`,
  ];
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function QuarterlyGoalPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [quarterKey, setQuarterKey] = useState(getCurrentQuarterKey);

  const monthKeys = getMonthsInQuarter(quarterKey);

  const { data: goal, isLoading } = useQuery<QuarterlyGoal>({
    queryKey: ["/api/quarterly-goal", quarterKey],
    queryFn: async () => {
      const res = await fetch(`/api/quarterly-goal?quarter=${quarterKey}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: monthGoal1 } = useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal", monthKeys[0]],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-goal?month=${monthKeys[0]}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: monthGoal2 } = useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal", monthKeys[1]],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-goal?month=${monthKeys[1]}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: monthGoal3 } = useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal", monthKeys[2]],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-goal?month=${monthKeys[2]}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user,
  });

  const monthlyGoals = [monthGoal1, monthGoal2, monthGoal3];

  const [quarterlyFocus, setQuarterlyFocus] = useState("");
  const [outcomeStatement, setOutcomeStatement] = useState("");
  const [measurementPlan, setMeasurementPlan] = useState("");
  const [baseline, setBaseline] = useState("");
  const [target, setTarget] = useState("");
  const [prize, setPrize] = useState("");

  useEffect(() => {
    if (goal) {
      setQuarterlyFocus(goal.quarterlyFocus || "");
      setOutcomeStatement(goal.outcomeStatement || "");
      setMeasurementPlan(goal.measurementPlan || "");
      setBaseline(goal.baseline || "");
      setTarget(goal.target || "");
      setPrize(goal.prize || "");
    }
  }, [goal]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/quarterly-goal", {
        quarterKey,
        quarterlyFocus: quarterlyFocus.trim(),
        outcomeStatement: outcomeStatement.trim(),
        measurementPlan: measurementPlan.trim(),
        baseline: baseline.trim(),
        target: target.trim(),
        prize: prize.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quarterly-goal", quarterKey] });
      toast({ title: "Saved", description: "Your quarterly goal has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not save. Please try again.", variant: "destructive" });
    },
  });

  const hasChanges =
    quarterlyFocus !== (goal?.quarterlyFocus || "") ||
    outcomeStatement !== (goal?.outcomeStatement || "") ||
    measurementPlan !== (goal?.measurementPlan || "") ||
    baseline !== (goal?.baseline || "") ||
    target !== (goal?.target || "") ||
    prize !== (goal?.prize || "");

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
              onClick={() => setQuarterKey(k => shiftQuarter(k, -1))}
              data-testid="button-prev-quarter"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-serif text-3xl font-bold" data-testid="text-quarter-label">
              {formatQuarterLabel(quarterKey)}
            </h1>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setQuarterKey(k => shiftQuarter(k, 1))}
              data-testid="button-next-quarter"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-muted-foreground text-lg">
            One quarter, one focus. Define your lever and break it into months.
          </p>
        </div>

        <div className="space-y-6">
          <Card className="overflow-visible" data-testid="card-focus">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">1</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">Quarterly Focus</CardTitle>
                  <CardDescription>What's the one lever you're pulling this quarter?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={quarterlyFocus}
                onChange={(e) => setQuarterlyFocus(e.target.value)}
                placeholder="e.g. Improve emotional intelligence, build a side project, get physically fit..."
                className="min-h-[70px] text-base"
                data-testid="input-quarterlyFocus"
              />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-outcome">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">2</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">Outcome</CardTitle>
                  <CardDescription>What changes by the end of this quarter?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={outcomeStatement}
                onChange={(e) => setOutcomeStatement(e.target.value)}
                placeholder="e.g. I can regulate emotions in real-time and have built 3 meaningful relationships..."
                className="min-h-[70px] text-base"
                data-testid="input-outcomeStatement"
              />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-measurement">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">3</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">How Will You Measure It?</CardTitle>
                  <CardDescription>Define how you'll know you're making progress.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Measurement Plan</Label>
                <Textarea
                  value={measurementPlan}
                  onChange={(e) => setMeasurementPlan(e.target.value)}
                  placeholder="e.g. Weekly journaling reflection score, number of deep conversations..."
                  className="min-h-[70px] text-base"
                  data-testid="input-measurementPlan"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Baseline (where you are now)</Label>
                <Textarea
                  value={baseline}
                  onChange={(e) => setBaseline(e.target.value)}
                  placeholder="e.g. Currently score 3/10 on emotional awareness..."
                  className="min-h-[70px] text-base"
                  data-testid="input-baseline"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Target (where you want to be)</Label>
                <Textarea
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="e.g. Score 7/10 by end of quarter..."
                  className="min-h-[70px] text-base"
                  data-testid="input-target"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-prize">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">4</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">Prize</CardTitle>
                  <CardDescription>What reward awaits you at the end of this quarter?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={prize}
                onChange={(e) => setPrize(e.target.value)}
                placeholder="e.g. A weekend trip, new equipment, a celebration dinner..."
                className="min-h-[70px] text-base"
                data-testid="input-prize"
              />
            </CardContent>
          </Card>

          <div className="mt-10 mb-4">
            <h2 className="font-serif text-2xl font-bold mb-1">Monthly Breakdown</h2>
            <p className="text-muted-foreground">Break your quarterly focus into three monthly goals.</p>
          </div>

          {monthKeys.map((mk, idx) => {
            const mg = monthlyGoals[idx];
            const goalText = mg?.goalWhat?.trim() || mg?.goalStatement?.trim();
            return (
              <Card key={mk} className="overflow-visible" data-testid={`card-month-${idx}`}>
                <CardHeader>
                  <CardTitle className="font-serif text-lg">{formatMonthLabel(mk)}</CardTitle>
                </CardHeader>
                <CardContent>
                  {goalText ? (
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm flex-1" data-testid={`text-month-goal-${idx}`}>{goalText}</p>
                      <Link href="/monthly-goal">
                        <Button variant="outline" size="sm" data-testid={`button-edit-month-${idx}`}>
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground" data-testid={`text-month-goal-${idx}`}>No goal set</p>
                      <Link href="/monthly-goal">
                        <Button variant="outline" size="sm" data-testid={`button-set-month-${idx}`}>
                          <ArrowRight className="h-3 w-3 mr-1" />
                          Set Goal
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!hasChanges || saveMutation.isPending}
              data-testid="button-save-quarterly"
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
