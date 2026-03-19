import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { FlowBar } from "@/components/flow-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VoiceTextarea } from "@/components/voice-input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Save, Target, ShieldAlert, Zap } from "lucide-react";
import { format } from "date-fns";
import type { IdentityDocument, MonthlyGoal } from "@shared/schema";

export default function ScoreboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentMonth = format(new Date(), "yyyy-MM");

  const { data: doc, isLoading: docLoading } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
    enabled: !!user,
  });

  const { data: goal, isLoading: goalLoading } = useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal"],
    enabled: !!user,
  });

  const [yearVision, setYearVision] = useState("");
  const [successProof, setSuccessProof] = useState("");
  const [proofMetric, setProofMetric] = useState("");
  const [weeklyBehavior, setWeeklyBehavior] = useState("");
  const [innerObstacle, setInnerObstacle] = useState("");
  const [obstacleTrigger, setObstacleTrigger] = useState("");
  const [obstacleThought, setObstacleThought] = useState("");
  const [obstacleEmotion, setObstacleEmotion] = useState("");
  const [obstacleBehavior, setObstacleBehavior] = useState("");
  const [ifThenPlan1, setIfThenPlan1] = useState("");
  const [ifThenPlan2, setIfThenPlan2] = useState("");

  useEffect(() => {
    if (doc) {
      setYearVision(doc.yearVision || "");
    }
  }, [doc]);

  useEffect(() => {
    if (goal) {
      setSuccessProof(goal.successProof || "");
      setProofMetric(goal.proofMetric || "");
      setWeeklyBehavior(goal.weeklyBehavior || "");
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
      await Promise.all([
        apiRequest("PUT", "/api/identity-document", {
          yearVision: yearVision.trim(),
          identity: doc?.identity || "",
          vision: doc?.vision || "",
          values: doc?.values || "",
          purpose: doc?.purpose || "",
          yearVisualization: doc?.yearVisualization || "",
          todayValue: doc?.todayValue || "",
          todayIntention: doc?.todayIntention || "",
          todayReflection: doc?.todayReflection || "",
          visionBoardMain: doc?.visionBoardMain || "",
          visionBoardLeft: doc?.visionBoardLeft || "",
          visionBoardRight: doc?.visionBoardRight || "",
          othersWillSee: doc?.othersWillSee || "",
          beYourself: doc?.beYourself || "",
          strengths: doc?.strengths || "",
          helpingPatterns: doc?.helpingPatterns || "",
          hurtingPatterns: doc?.hurtingPatterns || "",
          stressResponses: doc?.stressResponses || "",
        }),
        apiRequest("PUT", "/api/monthly-goal", {
          monthKey: currentMonth,
          goalStatement: goal?.goalStatement || "",
          successMarker: goal?.successMarker || "",
          value: goal?.value || "",
          why: goal?.why || "",
          nextConcreteStep: goal?.nextConcreteStep || "",
          prize: goal?.prize || "",
          strengths: goal?.strengths || "",
          advantage: goal?.advantage || "",
          goalWhat: goal?.goalWhat || "",
          goalWhen: goal?.goalWhen || "",
          goalWhere: goal?.goalWhere || "",
          goalHow: goal?.goalHow || "",
          blockingHabit: goal?.blockingHabit || "",
          habitAddress: goal?.habitAddress || "",
          fun: goal?.fun || "",
          deadline: goal?.deadline || "",
          bestResult: goal?.bestResult || "",
          successProof: successProof.trim(),
          proofMetric: proofMetric.trim(),
          weeklyBehavior: weeklyBehavior.trim(),
          innerObstacle: innerObstacle.trim(),
          obstacleTrigger: obstacleTrigger.trim(),
          obstacleThought: obstacleThought.trim(),
          obstacleEmotion: obstacleEmotion.trim(),
          obstacleBehavior: obstacleBehavior.trim(),
          ifThenPlan1: ifThenPlan1.trim(),
          ifThenPlan2: ifThenPlan2.trim(),
        }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-goal"] });
      toast({ title: "Saved", description: "Your 1-Year Scoreboard has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not save. Please try again.", variant: "destructive" });
    },
  });

  const hasChanges =
    yearVision !== (doc?.yearVision || "") ||
    successProof !== (goal?.successProof || "") ||
    proofMetric !== (goal?.proofMetric || "") ||
    weeklyBehavior !== (goal?.weeklyBehavior || "") ||
    innerObstacle !== (goal?.innerObstacle || "") ||
    obstacleTrigger !== (goal?.obstacleTrigger || "") ||
    obstacleThought !== (goal?.obstacleThought || "") ||
    obstacleEmotion !== (goal?.obstacleEmotion || "") ||
    obstacleBehavior !== (goal?.obstacleBehavior || "") ||
    ifThenPlan1 !== (goal?.ifThenPlan1 || "") ||
    ifThenPlan2 !== (goal?.ifThenPlan2 || "");

  const isLoading = docLoading || goalLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-12 max-w-2xl space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <FlowBar fallback="/plan" doneLabel="Done" />
      <div className="container mx-auto px-4 py-12 max-w-2xl space-y-6">
        <div>
          <h1 className="text-base font-medium" data-testid="text-page-title">1-Year Scoreboard</h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-subtitle">
            Your realistic 1-year outcome and execution plan
          </p>
        </div>

        <Card className="overflow-visible" data-testid="card-year-vision">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm">1-Year Vision</CardTitle>
                <CardDescription>What does the next year look like if you follow through?</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <VoiceTextarea
              value={yearVision}
              onChange={setYearVision}
              placeholder="In one year, I am the kind of person who ______"
              className="min-h-[120px] resize-none"
              data-testid="textarea-year-vision"
            />
          </CardContent>
        </Card>

        <Card className="overflow-visible" data-testid="card-proof-points">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm">Proof Points</CardTitle>
                <CardDescription>How you'll know you're on track.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Success Proof</label>
              <VoiceTextarea
                value={successProof}
                onChange={setSuccessProof}
                placeholder="What evidence will prove you've succeeded?"
                rows={3}
                className="resize-none text-sm"
                data-testid="textarea-success-proof"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Proof Metric</label>
              <VoiceTextarea
                value={proofMetric}
                onChange={setProofMetric}
                placeholder="What number or metric will you track?"
                rows={2}
                className="resize-none text-sm"
                data-testid="textarea-proof-metric"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Weekly Behavior</label>
              <VoiceTextarea
                value={weeklyBehavior}
                onChange={setWeeklyBehavior}
                placeholder="What must you do every week to stay on track?"
                rows={2}
                className="resize-none text-sm"
                data-testid="textarea-weekly-behavior"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-visible" data-testid="card-inner-obstacles">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                <ShieldAlert className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm">Inner Obstacles</CardTitle>
                <CardDescription>The patterns that get in your way.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Core Inner Obstacle</label>
              <VoiceTextarea
                value={innerObstacle}
                onChange={setInnerObstacle}
                placeholder="What internal barrier most often stops you?"
                rows={2}
                className="resize-none text-sm"
                data-testid="textarea-inner-obstacle"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Trigger</label>
              <VoiceTextarea
                value={obstacleTrigger}
                onChange={setObstacleTrigger}
                placeholder="What situation or cue activates this obstacle?"
                rows={2}
                className="resize-none text-sm"
                data-testid="textarea-obstacle-trigger"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Thought Pattern</label>
              <VoiceTextarea
                value={obstacleThought}
                onChange={setObstacleThought}
                placeholder="What do you tell yourself when triggered?"
                rows={2}
                className="resize-none text-sm"
                data-testid="textarea-obstacle-thought"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Emotional Response</label>
              <VoiceTextarea
                value={obstacleEmotion}
                onChange={setObstacleEmotion}
                placeholder="What emotion comes up?"
                rows={2}
                className="resize-none text-sm"
                data-testid="textarea-obstacle-emotion"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Resulting Behavior</label>
              <VoiceTextarea
                value={obstacleBehavior}
                onChange={setObstacleBehavior}
                placeholder="What do you end up doing (or avoiding)?"
                rows={2}
                className="resize-none text-sm"
                data-testid="textarea-obstacle-behavior"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-visible" data-testid="card-if-then-plans">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm">IF-THEN Plans</CardTitle>
                <CardDescription>Pre-committed responses when obstacles appear.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Plan 1</label>
              <VoiceTextarea
                value={ifThenPlan1}
                onChange={setIfThenPlan1}
                placeholder="IF [trigger happens], THEN I will [specific action]..."
                rows={3}
                className="resize-none text-sm"
                data-testid="textarea-if-then-1"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Plan 2</label>
              <VoiceTextarea
                value={ifThenPlan2}
                onChange={setIfThenPlan2}
                placeholder="IF [trigger happens], THEN I will [specific action]..."
                rows={3}
                className="resize-none text-sm"
                data-testid="textarea-if-then-2"
              />
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !hasChanges}
          className="w-full"
          data-testid="button-save-scoreboard"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Scoreboard"}
        </Button>
      </div>
    </AppLayout>
  );
}
