import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { FlowBar } from "@/components/flow-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VoiceTextarea } from "@/components/voice-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Save, ChevronLeft, ChevronRight, Eye, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import type { MonthlyGoal, IdentityDocument } from "@shared/schema";

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

  const [, setLocation] = useLocation();

  const [value, setValue] = useState("");
  const [strengths, setStrengths] = useState("");
  const [advantage, setAdvantage] = useState("");
  const [goalWhat, setGoalWhat] = useState("");
  const [goalWhen, setGoalWhen] = useState("");
  const [goalWhere, setGoalWhere] = useState("");
  const [goalHow, setGoalHow] = useState("");
  const [prize, setPrize] = useState("");
  const [fun, setFun] = useState("");
  const [deadline, setDeadline] = useState("");
  const [successProof, setSuccessProof] = useState("");
  const [proofMetric, setProofMetric] = useState("");
  const [weeklyBehavior, setWeeklyBehavior] = useState("");
  const [bestResult, setBestResult] = useState("");
  const [innerObstacle, setInnerObstacle] = useState("");
  const [obstacleTrigger, setObstacleTrigger] = useState("");
  const [obstacleThought, setObstacleThought] = useState("");
  const [obstacleEmotion, setObstacleEmotion] = useState("");
  const [obstacleBehavior, setObstacleBehavior] = useState("");
  const [ifThenPlan1, setIfThenPlan1] = useState("");
  const [ifThenPlan2, setIfThenPlan2] = useState("");

  useEffect(() => {
    if (goal) {
      setValue(goal.value || "");
      setStrengths(goal.strengths || "");
      setAdvantage(goal.advantage || "");
      setGoalWhat(goal.goalWhat || "");
      setGoalWhen(goal.goalWhen || "");
      setGoalWhere(goal.goalWhere || "");
      setGoalHow(goal.goalHow || "");
      setPrize(goal.prize || "");
      setFun(goal.fun || "");
      setDeadline(goal.deadline || "");
      setSuccessProof(goal.successProof || "");
      setProofMetric(goal.proofMetric || "");
      setWeeklyBehavior(goal.weeklyBehavior || "");
      setBestResult(goal.bestResult || "");
      setInnerObstacle(goal.innerObstacle || "");
      setObstacleTrigger(goal.obstacleTrigger || "");
      setObstacleThought(goal.obstacleThought || "");
      setObstacleEmotion(goal.obstacleEmotion || "");
      setObstacleBehavior(goal.obstacleBehavior || "");
      setIfThenPlan1(goal.ifThenPlan1 || "");
      setIfThenPlan2(goal.ifThenPlan2 || "");
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
        blockingHabit: goal?.blockingHabit || "",
        habitAddress: goal?.habitAddress || "",
        prize: prize.trim(),
        fun: fun.trim(),
        deadline: deadline.trim(),
        goalStatement: goal?.goalStatement || goalWhat.trim(),
        successMarker: goal?.successMarker || "",
        why: goal?.why || "",
        nextConcreteStep: goal?.nextConcreteStep || "",
        successProof: successProof.trim(),
        proofMetric: proofMetric.trim(),
        weeklyBehavior: weeklyBehavior.trim(),
        bestResult: bestResult.trim(),
        innerObstacle: innerObstacle.trim(),
        obstacleTrigger: obstacleTrigger.trim(),
        obstacleThought: obstacleThought.trim(),
        obstacleEmotion: obstacleEmotion.trim(),
        obstacleBehavior: obstacleBehavior.trim(),
        ifThenPlan1: ifThenPlan1.trim(),
        ifThenPlan2: ifThenPlan2.trim(),
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

  const allFields = [value, strengths, advantage, goalWhat, goalWhen, goalWhere, goalHow, successProof, proofMetric, weeklyBehavior, bestResult, innerObstacle, obstacleTrigger, obstacleThought, obstacleEmotion, obstacleBehavior, ifThenPlan1, ifThenPlan2, prize, fun, deadline];
  const goalFields = [goal?.value, goal?.strengths, goal?.advantage, goal?.goalWhat, goal?.goalWhen, goal?.goalWhere, goal?.goalHow, goal?.successProof, goal?.proofMetric, goal?.weeklyBehavior, goal?.bestResult, goal?.innerObstacle, goal?.obstacleTrigger, goal?.obstacleThought, goal?.obstacleEmotion, goal?.obstacleBehavior, goal?.ifThenPlan1, goal?.ifThenPlan2, goal?.prize, goal?.fun, goal?.deadline];
  const hasChanges = allFields.some((f, i) => f !== (goalFields[i] || ""));

  const fieldLabels: [string, string][] = [
    [value, "What do I value?"],
    [strengths, "Strengths"],
    [advantage, "Advantage"],
    [goalWhat, "Goal: What?"],
    [goalWhen, "Goal: When?"],
    [goalWhere, "Goal: Where?"],
    [goalHow, "Goal: How?"],
    [successProof, "Success Proof"],
    [proofMetric, "Metric"],
    [weeklyBehavior, "Weekly Behavior"],
    [bestResult, "Best Result"],
    [innerObstacle, "Inner Obstacle"],
    [obstacleTrigger, "Trigger"],
    [obstacleThought, "Thought"],
    [obstacleEmotion, "Emotion"],
    [obstacleBehavior, "Behavior"],
    [ifThenPlan1, "IF-THEN Plan 1"],
    [ifThenPlan2, "IF-THEN Plan 2"],
    [prize, "Prize"],
    [fun, "How to have fun"],
    [deadline, "Deadline"],
  ];
  const missingFields = fieldLabels.filter(([v]) => !v.trim()).map(([, label]) => label);

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

  let cardNum = 0;
  const nextCard = () => { cardNum++; return cardNum; };

  return (
    <AppLayout>
      <FlowBar fallback="/plan" doneLabel="Done" />
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
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">{nextCard()}</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">What do I value?</CardTitle>
                  <CardDescription>What matters most to you right now? What value does this month serve?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VoiceTextarea
                value={value}
                onChange={(val) => setValue(val)}
                placeholder="e.g. Health, freedom, self-respect, growth, connection..."
                className="min-h-[70px] text-base"
                data-testid="input-value"
              />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-strengths">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">{nextCard()}</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">What am I already good at?</CardTitle>
                  <CardDescription>What do people compliment you on? What comes naturally to you?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VoiceTextarea
                value={strengths}
                onChange={(val) => setStrengths(val)}
                placeholder="e.g. I'm good at organizing things, people trust me easily, I learn fast when I care about something..."
                className="min-h-[70px] text-base"
                data-testid="input-strengths"
              />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-advantage">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">{nextCard()}</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">How can I use that to my advantage?</CardTitle>
                  <CardDescription>How can your strengths move you toward your vision?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VoiceTextarea
                value={advantage}
                onChange={(val) => setAdvantage(val)}
                placeholder="e.g. Since I learn fast, I can dedicate focused time to mastering one skill this month..."
                className="min-h-[70px] text-base"
                data-testid="input-advantage"
              />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-goal">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">{nextCard()}</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">Select a Goal</CardTitle>
                  <CardDescription>Be precise. A real goal answers all four.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">What?</Label>
                <VoiceTextarea value={goalWhat} onChange={(val) => setGoalWhat(val)} placeholder="e.g. Complete a 5K run" className="min-h-[60px] text-base" data-testid="input-goal-what" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">When?</Label>
                <VoiceTextarea value={goalWhen} onChange={(val) => setGoalWhen(val)} placeholder="e.g. By the last Sunday of this month" className="min-h-[60px] text-base" data-testid="input-goal-when" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Where?</Label>
                <VoiceTextarea value={goalWhere} onChange={(val) => setGoalWhere(val)} placeholder="e.g. At the park near my house" className="min-h-[60px] text-base" data-testid="input-goal-where" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">How?</Label>
                <VoiceTextarea value={goalHow} onChange={(val) => setGoalHow(val)} placeholder="e.g. Follow a Couch-to-5K plan" className="min-h-[60px] text-base" data-testid="input-goal-how" />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-deadline">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">{nextCard()}</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">Deadline</CardTitle>
                  <CardDescription>Set a specific date. One month is concrete and forces focus.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} data-testid="input-deadline" />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-success-proof">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">{nextCard()}</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">Success Proof</CardTitle>
                  <CardDescription>Observable proof a stranger would agree is real.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">The clearest proof of me achieving my goal is...</Label>
                <VoiceTextarea value={successProof} onChange={(val) => setSuccessProof(val)} placeholder="Observable proof \u2014 if a stranger saw it, they\u2019d agree it\u2019s real" className="min-h-[60px] text-base" data-testid="input-success-proof" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Metric (how measured)</Label>
                <VoiceTextarea value={proofMetric} onChange={(val) => setProofMetric(val)} placeholder="How will you measure this?" className="min-h-[60px] text-base" data-testid="input-proof-metric" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Weekly behavior that would cause it</Label>
                <VoiceTextarea value={weeklyBehavior} onChange={(val) => setWeeklyBehavior(val)} placeholder="What weekly action drives this result?" className="min-h-[60px] text-base" data-testid="input-weekly-behavior" />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-best-result">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">{nextCard()}</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">Best Result</CardTitle>
                  <CardDescription>Visualize the best possible outcome of achieving this proof point.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VoiceTextarea value={bestResult} onChange={(val) => setBestResult(val)} placeholder="If I achieve this proof point, the best result is..." className="min-h-[70px] text-base" data-testid="input-best-result" />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-inner-obstacle">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">{nextCard()}</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">Inner Obstacle</CardTitle>
                  <CardDescription>Identify the internal block \u2014 not external circumstances. Visualize the exact moment it happens.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">The main thing inside me that will block this is...</Label>
                <VoiceTextarea value={innerObstacle} onChange={(val) => setInnerObstacle(val)} placeholder="Name the inner obstacle (not external)" className="min-h-[60px] text-base" data-testid="input-inner-obstacle" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Trigger (situation)</Label>
                <VoiceTextarea value={obstacleTrigger} onChange={(val) => setObstacleTrigger(val)} placeholder="What specific situation triggers this?" className="min-h-[60px] text-base" data-testid="input-obstacle-trigger" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Thought (what I tell myself)</Label>
                <VoiceTextarea value={obstacleThought} onChange={(val) => setObstacleThought(val)} placeholder="What thought runs through my mind?" className="min-h-[60px] text-base" data-testid="input-obstacle-thought" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Emotion (what I feel)</Label>
                <VoiceTextarea value={obstacleEmotion} onChange={(val) => setObstacleEmotion(val)} placeholder="What emotion comes up?" className="min-h-[60px] text-base" data-testid="input-obstacle-emotion" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Behavior (what I do)</Label>
                <VoiceTextarea value={obstacleBehavior} onChange={(val) => setObstacleBehavior(val)} placeholder="What do I end up doing?" className="min-h-[60px] text-base" data-testid="input-obstacle-behavior" />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-if-then-plans">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">{nextCard()}</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">Implementation Plans</CardTitle>
                  <CardDescription>Write 2 IF-THEN plans. Small beats big. Immediate beats delayed.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Plan 1: IF... THEN...</Label>
                <VoiceTextarea value={ifThenPlan1} onChange={(val) => setIfThenPlan1(val)} placeholder="IF (specific trigger happens) THEN (I will do a small, immediate action)" className="min-h-[60px] text-base" data-testid="input-if-then-plan-1" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Plan 2: IF... THEN...</Label>
                <VoiceTextarea value={ifThenPlan2} onChange={(val) => setIfThenPlan2(val)} placeholder="IF (specific trigger happens) THEN (I will do a small, immediate action)" className="min-h-[60px] text-base" data-testid="input-if-then-plan-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-prize">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">{nextCard()}</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">Prize</CardTitle>
                  <CardDescription>What reward are you giving yourself when you hit this goal?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VoiceTextarea value={prize} onChange={(val) => setPrize(val)} placeholder="e.g. New running shoes, a weekend trip, a nice dinner out..." className="min-h-[60px] text-base" data-testid="input-prize" />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-fun">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">{nextCard()}</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">How can I have fun with this?</CardTitle>
                  <CardDescription>Happiness lives in the pursuit, not the arrival. Make it enjoyable.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VoiceTextarea value={fun} onChange={(val) => setFun(val)} placeholder="e.g. Run with a friend, try new routes, listen to a favorite podcast while running..." className="min-h-[60px] text-base" data-testid="input-fun" />
            </CardContent>
          </Card>

          {missingFields.length > 0 && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive font-medium">All fields are required. Please complete: {missingFields.join(", ")}.</p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!hasChanges || saveMutation.isPending || missingFields.length > 0}
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
