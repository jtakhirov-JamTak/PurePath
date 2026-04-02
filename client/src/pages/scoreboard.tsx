import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { FlowBar } from "@/components/flow-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { VoiceTextarea } from "@/components/voice-input";
import { VisionCard } from "@/components/vision-card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { IdentityDocument, MonthlyGoal } from "@shared/schema";
import { buildIdentityDocPayload } from "@/lib/identity-helpers";

const DOMAINS = ["Health", "Wealth", "Relationships", "Growth", "Joy"];
const TOTAL_STEPS = 5;

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

  // Wizard state
  const [step, setStep] = useState(1);
  const [domain, setDomain] = useState("");
  const [scene, setScene] = useState("");
  const [proofPoint, setProofPoint] = useState("");
  const [metric, setMetric] = useState("");
  const [obstacle, setObstacle] = useState("");
  const [obstacleTrigger, setObstacleTrigger] = useState("");
  const [ifTrigger, setIfTrigger] = useState("");
  const [ifAction, setIfAction] = useState("");
  const [saved, setSaved] = useState(false);

  // Pre-populate from existing data
  useEffect(() => {
    if (doc) {
      setDomain(doc.visionDomain || "");
      setScene(doc.yearVision || "");
    }
  }, [doc]);

  useEffect(() => {
    if (goal) {
      setProofPoint(goal.successProof || "");
      setMetric(goal.proofMetric || "");
      setObstacle(goal.innerObstacle || "");
      setObstacleTrigger(goal.obstacleTrigger || "");
      // Parse existing ifThenPlan1 into trigger/action if it follows the format
      const plan = goal.ifThenPlan1 || "";
      const match = plan.match(/^If (.+?), then I will (.+)$/i);
      if (match) {
        setIfTrigger(match[1]);
        setIfAction(match[2]);
      } else if (plan) {
        setIfAction(plan);
      }
    }
  }, [goal]);

  const formattedPlan = ifTrigger && ifAction
    ? `If ${ifTrigger}, then I will ${ifAction}`
    : "";

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        apiRequest("PUT", "/api/identity-document", buildIdentityDocPayload(doc, {
          yearVision: scene.trim(),
          visionDomain: domain.toLowerCase(),
        })),
        apiRequest("PUT", "/api/monthly-goal", {
          monthKey: currentMonth,
          goalStatement: goal?.goalStatement || "",
          nextConcreteStep: goal?.nextConcreteStep || "",
          goalWhat: goal?.goalWhat || "",
          goalWhen: goal?.goalWhen || "",
          goalHow: goal?.goalHow || "",
          deadline: goal?.deadline || "",
          innerObstacle: obstacle.trim(),
          obstacleTrigger: obstacleTrigger.trim(),
          obstacleThought: goal?.obstacleThought || "",
          obstacleEmotion: goal?.obstacleEmotion || "",
          obstacleBehavior: goal?.obstacleBehavior || "",
          successProof: proofPoint.trim(),
          proofMetric: metric.trim(),
          weeklyBehavior: goal?.weeklyBehavior || "",
          ifThenPlan1: formattedPlan,
          ifThenPlan2: goal?.ifThenPlan2 || "",
          fun: goal?.fun || "",
          value: goal?.value || "",
          why: goal?.why || "",
          successMarker: goal?.successMarker || "",
          prize: goal?.prize || "",
          strengths: goal?.strengths || "",
          advantage: goal?.advantage || "",
          goalWhere: goal?.goalWhere || "",
          blockingHabit: goal?.blockingHabit || "",
          habitAddress: goal?.habitAddress || "",
          bestResult: goal?.bestResult || "",
        }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-goal"] });
      toast({ title: "Vision saved", description: "Your 1-year vision has been locked in." });
      setSaved(true);
    },
    onError: () => {
      toast({ title: "Error", description: "Could not save. Please try again.", variant: "destructive" });
    },
  });

  const canNext = () => {
    if (step === 1) return !!domain;
    if (step === 2) return !!scene.trim();
    if (step === 3) return !!proofPoint.trim();
    if (step === 4) return !!obstacle.trim();
    if (step === 5) return !!ifTrigger.trim() && !!ifAction.trim();
    return false;
  };

  const isLoading = docLoading || goalLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-12 max-w-2xl space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      </AppLayout>
    );
  }

  // After save — show the action card
  if (saved) {
    return (
      <AppLayout>
        <FlowBar fallback="/profile" doneLabel="Done" />
        <div className="container mx-auto px-4 py-12 max-w-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <h1 className="text-base font-medium">Vision Locked In</h1>
            <p className="text-sm text-muted-foreground">This will surface on Tuesday and Friday mornings.</p>
          </div>
          <VisionCard
            domain={domain}
            scene={scene}
            proofPoint={proofPoint}
            metric={metric}
            ifThenPlan={formattedPlan}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <FlowBar fallback="/profile" doneLabel="Done" />
      <div className="container mx-auto px-4 py-12 max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-base font-medium" data-testid="text-page-title">1-Year Vision</h1>
          <p className="text-sm text-muted-foreground mt-1">Step {step} of {TOTAL_STEPS}</p>
        </div>

        {/* Step indicator dots */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                i + 1 === step ? "bg-primary" : i + 1 < step ? "bg-emerald-500" : "bg-border"
              )}
            />
          ))}
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && (
              <Card data-testid="step-domain">
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Choose one domain</Label>
                    <p className="text-xs text-muted-foreground">Focus on one area. You can revisit other domains later.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {DOMAINS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDomain(d.toLowerCase())}
                        className={cn(
                          "rounded-lg border px-4 py-3 text-sm font-medium text-left transition-colors",
                          domain === d.toLowerCase()
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card data-testid="step-scene">
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      One year from now, if you actually followed through, what is the best visible result?
                    </Label>
                    <p className="text-xs text-muted-foreground italic">
                      Pause, close your eyes and imagine it vividly. Then write one sentence.
                    </p>
                  </div>
                  <VoiceTextarea
                    value={scene}
                    onChange={setScene}
                    placeholder="The best visible result in one year..."
                    className="min-h-[100px] resize-none"
                    data-testid="textarea-scene"
                  />
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card data-testid="step-proof">
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Proof point</Label>
                    <p className="text-xs text-muted-foreground">
                      Observable — if a stranger saw it, they'd agree it's real.
                    </p>
                  </div>
                  <VoiceTextarea
                    value={proofPoint}
                    onChange={setProofPoint}
                    placeholder="What evidence would prove this is real?"
                    className="min-h-[80px] resize-none"
                    data-testid="textarea-proof"
                  />
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Metric — put a number on it</Label>
                    <Input
                      value={metric}
                      onChange={(e) => setMetric(e.target.value)}
                      placeholder="e.g. 10 clients, 180 lbs, 3x/week"
                      className="text-sm"
                      data-testid="input-metric"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 4 && (
              <Card data-testid="step-obstacle">
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      The main thing inside me that will prevent this is ______.
                    </Label>
                    <p className="text-xs text-muted-foreground italic">
                      Visualize the exact real moment it happens.
                    </p>
                  </div>
                  <VoiceTextarea
                    value={obstacle}
                    onChange={setObstacle}
                    placeholder="The inner obstacle (trigger, emotion, behavior)..."
                    className="min-h-[80px] resize-none"
                    data-testid="textarea-obstacle"
                  />
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">What triggers it?</Label>
                    <Input
                      value={obstacleTrigger}
                      onChange={(e) => setObstacleTrigger(e.target.value)}
                      placeholder="The situation or cue that activates this..."
                      className="text-sm"
                      data-testid="input-obstacle-trigger"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 5 && (
              <Card data-testid="step-ifthen">
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">If-Then Plan</Label>
                    <p className="text-xs text-muted-foreground">
                      Your action must be visible, immediate, and low-friction (under 2 minutes).
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">If this happens...</Label>
                      <Input
                        value={ifTrigger}
                        onChange={(e) => setIfTrigger(e.target.value)}
                        placeholder={obstacleTrigger || "The trigger moment..."}
                        className="text-sm"
                        data-testid="input-if-trigger"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Then I will...</Label>
                      <Input
                        value={ifAction}
                        onChange={(e) => setIfAction(e.target.value)}
                        placeholder="A 2-minute, visible action..."
                        className="text-sm"
                        data-testid="input-if-action"
                      />
                    </div>
                  </div>
                  {ifTrigger && ifAction && (
                    <div className="rounded-md bg-muted/50 px-3 py-2 text-sm italic text-foreground/80">
                      If {ifTrigger}, then I will {ifAction}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="flex-1">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!canNext() || saveMutation.isPending}
              className="flex-1"
              data-testid="button-save-vision"
            >
              {saveMutation.isPending ? "Saving..." : "Save & Finish"}
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
