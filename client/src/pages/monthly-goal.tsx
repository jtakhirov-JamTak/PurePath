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
import { Save, ChevronLeft, ChevronRight, Eye, Crosshair, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import type { MonthlyGoal, IdentityDocument, QuarterlyGoal } from "@shared/schema";

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

  const { data: identityDoc } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
    enabled: !!user,
  });

  const currentQuarterKey = (() => {
    const [y, m] = monthKey.split("-").map(Number);
    return `${y}-Q${Math.ceil(m / 3)}`;
  })();
  const { data: quarterlyGoal } = useQuery<QuarterlyGoal>({
    queryKey: ["/api/quarterly-goal", currentQuarterKey],
    queryFn: async () => {
      const res = await fetch(`/api/quarterly-goal?quarter=${currentQuarterKey}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user,
  });
  const [, setLocation] = useLocation();
  const quarterFocus = quarterlyGoal?.quarterlyFocus?.trim() || "";

  const [value, setValue] = useState("");
  const [strengths, setStrengths] = useState("");
  const [advantage, setAdvantage] = useState("");
  const [goalWhat, setGoalWhat] = useState("");
  const [goalWhen, setGoalWhen] = useState("");
  const [goalWhere, setGoalWhere] = useState("");
  const [goalHow, setGoalHow] = useState("");
  const [blockingHabit, setBlockingHabit] = useState("");
  const [habitAddress, setHabitAddress] = useState("");
  const [prize, setPrize] = useState("");
  const [fun, setFun] = useState("");

  useEffect(() => {
    if (goal) {
      setValue(goal.value || "");
      setStrengths(goal.strengths || "");
      setAdvantage(goal.advantage || "");
      setGoalWhat(goal.goalWhat || "");
      setGoalWhen(goal.goalWhen || "");
      setGoalWhere(goal.goalWhere || "");
      setGoalHow(goal.goalHow || "");
      setBlockingHabit(goal.blockingHabit || "");
      setHabitAddress(goal.habitAddress || "");
      setPrize(goal.prize || "");
      setFun(goal.fun || "");
    }
  }, [goal]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/monthly-goal", {
        monthKey,
        value: value.trim(),
        strengths: strengths.trim(),
        advantage: advantage.trim(),
        goalWhat: goalWhat.trim(),
        goalWhen: goalWhen.trim(),
        goalWhere: goalWhere.trim(),
        goalHow: goalHow.trim(),
        blockingHabit: blockingHabit.trim(),
        habitAddress: habitAddress.trim(),
        prize: prize.trim(),
        fun: fun.trim(),
        goalStatement: goal?.goalStatement || goalWhat.trim(),
        successMarker: goal?.successMarker || "",
        why: goal?.why || "",
        nextConcreteStep: goal?.nextConcreteStep || "",
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
    value !== (goal?.value || "") ||
    strengths !== (goal?.strengths || "") ||
    advantage !== (goal?.advantage || "") ||
    goalWhat !== (goal?.goalWhat || "") ||
    goalWhen !== (goal?.goalWhen || "") ||
    goalWhere !== (goal?.goalWhere || "") ||
    goalHow !== (goal?.goalHow || "") ||
    blockingHabit !== (goal?.blockingHabit || "") ||
    habitAddress !== (goal?.habitAddress || "") ||
    prize !== (goal?.prize || "") ||
    fun !== (goal?.fun || "");

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

  const hasVision = identityDoc?.vision?.trim();
  const hasIdentity = identityDoc?.identity?.trim();

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
            One goal, one month. Answer each question to build a goal that sticks.
          </p>
          {quarterFocus ? (
            <div
              className="mt-3 flex items-center gap-2 cursor-pointer hover-elevate rounded-md px-3 py-2 bg-muted/50"
              onClick={() => setLocation("/quarterly-goal")}
              data-testid="link-quarterly-from-monthly"
            >
              <Crosshair className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm text-muted-foreground">Quarterly focus:</span>
              <span className="text-sm font-medium">{quarterFocus}</span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground shrink-0" />
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setLocation("/quarterly-goal")}
              data-testid="button-set-quarterly-from-monthly"
            >
              <Crosshair className="h-3.5 w-3.5 mr-1.5" />
              Set Quarterly Focus First
            </Button>
          )}
        </div>

        {(hasVision || hasIdentity) && (
          <Card className="overflow-visible mb-8 border-primary/20" data-testid="card-vision-identity">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Eye className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-serif text-lg">Your Vision & Identity</CardTitle>
                  <CardDescription>Let this anchor every answer below</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {hasVision && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Vision</Label>
                  <p className="text-sm mt-1" data-testid="text-vision">{identityDoc?.vision}</p>
                </div>
              )}
              {hasIdentity && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Identity</Label>
                  <p className="text-sm mt-1" data-testid="text-identity">{identityDoc?.identity}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <Card className="overflow-visible" data-testid="card-value">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">1</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">What do I value?</CardTitle>
                  <CardDescription>What matters most to you right now? What value does this month serve?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. Health, freedom, self-respect, growth, connection..."
                className="min-h-[70px] text-base"
                data-testid="input-value"
              />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-strengths">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">2</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">What am I already good at?</CardTitle>
                  <CardDescription>What do people compliment you on? What comes naturally to you?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="e.g. I'm good at organizing things, people trust me easily, I learn fast when I care about something..."
                className="min-h-[70px] text-base"
                data-testid="input-strengths"
              />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-advantage">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">3</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">How can I use that to my advantage?</CardTitle>
                  <CardDescription>How can your strengths move you toward your vision?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={advantage}
                onChange={(e) => setAdvantage(e.target.value)}
                placeholder="e.g. Since I learn fast, I can dedicate focused time to mastering one skill this month..."
                className="min-h-[70px] text-base"
                data-testid="input-advantage"
              />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-goal">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">4</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">Select a Goal</CardTitle>
                  <CardDescription>Be precise. A real goal answers all four.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">What?</Label>
                <Textarea
                  value={goalWhat}
                  onChange={(e) => setGoalWhat(e.target.value)}
                  placeholder="e.g. Complete a 5K run"
                  className="min-h-[60px] text-base"
                  data-testid="input-goal-what"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">When?</Label>
                <Textarea
                  value={goalWhen}
                  onChange={(e) => setGoalWhen(e.target.value)}
                  placeholder="e.g. By the last Sunday of this month, running 3x per week"
                  className="min-h-[60px] text-base"
                  data-testid="input-goal-when"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Where?</Label>
                <Textarea
                  value={goalWhere}
                  onChange={(e) => setGoalWhere(e.target.value)}
                  placeholder="e.g. At the park near my house, mornings before work"
                  className="min-h-[60px] text-base"
                  data-testid="input-goal-where"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">How?</Label>
                <Textarea
                  value={goalHow}
                  onChange={(e) => setGoalHow(e.target.value)}
                  placeholder="e.g. Follow a Couch-to-5K plan, track with a running app, lay out clothes the night before"
                  className="min-h-[60px] text-base"
                  data-testid="input-goal-how"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-blocking-habit">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">5</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">What habit is blocking my goal?</CardTitle>
                  <CardDescription>Name it honestly. Then decide how to address it.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">The blocking habit</Label>
                <Textarea
                  value={blockingHabit}
                  onChange={(e) => setBlockingHabit(e.target.value)}
                  placeholder="e.g. Staying up too late scrolling my phone, so I'm too tired to exercise in the morning"
                  className="min-h-[60px] text-base"
                  data-testid="input-blocking-habit"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">How can I address it?</Label>
                <Textarea
                  value={habitAddress}
                  onChange={(e) => setHabitAddress(e.target.value)}
                  placeholder="e.g. Phone goes on airplane mode at 10 PM. Alarm is across the room."
                  className="min-h-[60px] text-base"
                  data-testid="input-habit-address"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-prize">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">6</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">Prize</CardTitle>
                  <CardDescription>What reward are you giving yourself when you hit this goal?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={prize}
                onChange={(e) => setPrize(e.target.value)}
                placeholder="e.g. New running shoes, a weekend trip, a nice dinner out..."
                className="min-h-[60px] text-base"
                data-testid="input-prize"
              />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-fun">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">7</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">How can I have fun with this?</CardTitle>
                  <CardDescription>Happiness lives in the pursuit, not the arrival. Make it enjoyable.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={fun}
                onChange={(e) => setFun(e.target.value)}
                placeholder="e.g. Run with a friend, try new routes, listen to a favorite podcast while running..."
                className="min-h-[60px] text-base"
                data-testid="input-fun"
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
