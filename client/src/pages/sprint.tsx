import { useState, useMemo } from "react";
import { PATTERN_LABELS } from "@/lib/display-names";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Target, Calendar, ArrowRight, ArrowLeft, AlertTriangle, ExternalLink, Check } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { PrecisionWizard, type PrecisionResult } from "@/components/precision-wizard";
import type { MonthlyGoal, AnnualCommitment, IdentityDocument, Habit } from "@shared/schema";

interface CompactSummary {
  sprintBehaviorRate: number;
  weeklyProofBehaviorRate: number;
  proofMovesIntended: number;
  proofMovesCompleted: number;
}

export default function SprintPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sprint, isLoading: sprintLoading } = useQuery<MonthlyGoal | null>({
    queryKey: ["/api/goal-sprint"],
    enabled: !!user,
  });
  const { data: annual } = useQuery<AnnualCommitment | null>({
    queryKey: ["/api/annual-commitment"],
    enabled: !!user,
  });
  const { data: identityDoc } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
    enabled: !!user,
  });
  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: !!user,
  });

  const weeklyProofBehavior = annual?.weeklyProofBehaviorHabitId
    ? habits.find(h => h.id === annual.weeklyProofBehaviorHabitId) ?? null
    : null;

  const sprintBehavior = useMemo(() =>
    habits.find(h => h.source === "sprint" && h.active) ?? null,
    [habits]
  );

  const remainingDays = sprint?.endDate
    ? Math.max(0, differenceInDays(new Date(sprint.endDate + "T12:00:00"), new Date()))
    : null;

  const [ritualOpen, setRitualOpen] = useState(false);
  const [createOnly, setCreateOnly] = useState(false);

  const openRitual = (createOnlyMode = false) => {
    setCreateOnly(createOnlyMode);
    setRitualOpen(true);
  };

  const handleRitualComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/goal-sprint"] });
    queryClient.invalidateQueries({ queryKey: ["/api/goal-sprints"] });
    queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
    queryClient.invalidateQueries({ queryKey: ["/api/annual-commitment"] });
    setRitualOpen(false);
    toast({ title: createOnly ? "Sprint created" : "Sprint ritual complete" });
  };

  // Loading
  if (authLoading || sprintLoading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AppLayout>
    );
  }

  // Empty state
  if (!sprint || sprint.sprintStatus !== "active") {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          <div className="text-center py-12 space-y-4">
            <Target className="h-10 w-10 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-semibold">No active sprint</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Start a Goal Sprint to commit to a focused cycle of 10-31 days.
            </p>
            <Button className="min-h-[44px]" onClick={() => openRitual(true)}>Create Sprint</Button>
          </div>
          <SprintRitualDialog
            open={ritualOpen}
            onClose={() => setRitualOpen(false)}
            sprint={null}
            annual={annual}
            identityDoc={identityDoc}
            onComplete={handleRitualComplete}
            createOnly
          />
        </div>
      </AppLayout>
    );
  }

  // Active sprint view
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="space-y-1">
          {annual?.domain && <p className="text-xs uppercase tracking-wider text-primary font-medium">{annual.domain}</p>}
          {annual?.personStatement && <p className="text-sm text-muted-foreground italic">{annual.personStatement}</p>}
          {annual?.proofMetric && <p className="text-xs text-muted-foreground">Metric: {annual.proofMetric}</p>}
        </div>

        {/* Sprint name + days */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{sprint.sprintName || sprint.goalStatement || "Current Sprint"}</p>
                {sprint.goalStatement && sprint.sprintName && (
                  <p className="text-xs text-muted-foreground mt-0.5">{sprint.goalStatement}</p>
                )}
              </div>
              {remainingDays !== null && (
                <div className="text-right shrink-0 ml-3">
                  <p className="text-2xl font-bold text-primary">{remainingDays}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">days left</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Review flag */}
        {sprint.needsSprintReview && (
          <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Sprint review needed</p>
              {sprint.needsSprintReviewReason && (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{sprint.needsSprintReviewReason}</p>
              )}
            </div>
          </div>
        )}

        {/* Weekly Proof Behavior */}
        {weeklyProofBehavior && (
          <div className="rounded-lg border-l-4 border-l-primary/60 bg-primary/[0.04] px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">Weekly Proof Behavior</p>
            <p className="text-sm font-medium mt-0.5">{weeklyProofBehavior.name}</p>
          </div>
        )}

        {/* Sprint behavior */}
        {sprintBehavior && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Sprint Behavior</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">{sprintBehavior.name}</p>
              {sprintBehavior.proofPatternWhen && (
                <div className="rounded bg-muted/40 px-3 py-2 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{PATTERN_LABELS.success}</p>
                  <p className="text-xs">When {sprintBehavior.proofPatternWhen}, I {sprintBehavior.proofPatternBehavior}. Outcome: {sprintBehavior.proofPatternOutcome}</p>
                </div>
              )}
              {sprintBehavior.shadowEmotions && (
                <div className="rounded bg-muted/40 px-3 py-2 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{PATTERN_LABELS.shadow}</p>
                  <p className="text-xs">Emotions: {sprintBehavior.shadowEmotions}</p>
                  {sprintBehavior.shadowEnvironment && <p className="text-xs">Environment: {sprintBehavior.shadowEnvironment}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Confidence + IF-THEN */}
        <div className="grid grid-cols-2 gap-3">
          {sprint.confidenceCheck != null && (
            <Card>
              <CardContent className="py-3 text-center">
                <p className="text-2xl font-bold">{sprint.confidenceCheck}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Confidence</p>
              </CardContent>
            </Card>
          )}
          {(sprint.ifThenPlan1 || sprint.ifThenPlan2) && (
            <Card>
              <CardContent className="py-3 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">IF-THEN Plans</p>
                {sprint.ifThenPlan1 && <p className="text-xs">{sprint.ifThenPlan1}</p>}
                {sprint.ifThenPlan2 && <p className="text-xs">{sprint.ifThenPlan2}</p>}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Milestones */}
        {(sprint.milestone1Text || sprint.milestone2Text) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Sprint Milestones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sprint.milestone1Text && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1">{sprint.milestone1Text}</span>
                  {sprint.milestone1TargetWeek && <span className="text-xs text-muted-foreground shrink-0">Week of {sprint.milestone1TargetWeek}</span>}
                </div>
              )}
              {sprint.milestone2Text && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1">{sprint.milestone2Text}</span>
                  {sprint.milestone2TargetWeek && <span className="text-xs text-muted-foreground shrink-0">Week of {sprint.milestone2TargetWeek}</span>}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Button className="w-full min-h-[44px]" onClick={() => openRitual()}>Start Sprint Ritual</Button>

        <SprintRitualDialog
          open={ritualOpen}
          onClose={() => setRitualOpen(false)}
          sprint={sprint}
          annual={annual}
          identityDoc={identityDoc}
          onComplete={handleRitualComplete}
          createOnly={createOnly}
        />
      </div>
    </AppLayout>
  );
}

// ═══════════════════════════════════════════════════════
// Sprint Ritual Dialog — owns its own form state
// ═══════════════════════════════════════════════════════

interface RitualProps {
  open: boolean;
  onClose: () => void;
  sprint: MonthlyGoal | null;
  annual: AnnualCommitment | null | undefined;
  identityDoc: IdentityDocument | undefined;
  onComplete: () => void;
  createOnly?: boolean;
}

function SprintRitualDialog({ open, onClose, sprint, annual, identityDoc, onComplete, createOnly }: RitualProps) {
  const { toast } = useToast();

  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(createOnly ? 3 : 1);

  // Part 1 — compact summary (fetched only when ritual is open)
  const { data: compactSummary } = useQuery<CompactSummary>({
    queryKey: ["/api/sprint/compact-summary", sprint?.startDate, sprint?.endDate],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/sprint/compact-summary?from=${sprint!.startDate}&to=${sprint!.endDate}`);
      return res.json();
    },
    enabled: !!sprint?.startDate && !!sprint?.endDate && open && !createOnly,
  });

  // Part 2 — Values Check
  const [livedValue, setLivedValue] = useState("");
  const [neglectedValue, setNeglectedValue] = useState("");

  // Part 3 — Close state
  const [closeAs, setCloseAs] = useState<"end" | "carry_forward" | "promote_to_habit">("end");
  const [newConfidence, setNewConfidence] = useState(annual?.confidenceCheck ?? 8);
  const [revisedIfThen1, setRevisedIfThen1] = useState(annual?.ifThenPlan1 ?? "");
  const [revisedIfThen2, setRevisedIfThen2] = useState(annual?.ifThenPlan2 ?? "");

  // Part 3 — New sprint
  const [newSprintName, setNewSprintName] = useState("");
  const [newGoalStatement, setNewGoalStatement] = useState("");
  const [newStartDate, setNewStartDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [newEndDate, setNewEndDate] = useState(format(addDays(new Date(), 22), "yyyy-MM-dd"));
  const [newMilestone1, setNewMilestone1] = useState("");
  const [newMilestone1Week, setNewMilestone1Week] = useState("");
  const [newMilestone2, setNewMilestone2] = useState("");
  const [newMilestone2Week, setNewMilestone2Week] = useState("");
  const [newBehaviorName, setNewBehaviorName] = useState("");
  const [precisionData, setPrecisionData] = useState<PrecisionResult | null>(null);
  const [showPrecision, setShowPrecision] = useState(false);
  const [newSprintConfidence, setNewSprintConfidence] = useState(8);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedValues = useMemo(() => {
    if (!identityDoc?.values) return [];
    try {
      const parsed = JSON.parse(identityDoc.values);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* fallback */ }
    return [];
  }, [identityDoc?.values]);

  const canComplete = newSprintName.trim() && newGoalStatement.trim() && newStartDate && newEndDate;

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      // Update annual commitment confidence + IF-THEN if changed
      if (!createOnly && annual) {
        const updates: Record<string, unknown> = {};
        if (newConfidence !== annual.confidenceCheck) updates.confidenceCheck = newConfidence;
        if (revisedIfThen1 && revisedIfThen1 !== annual.ifThenPlan1) updates.ifThenPlan1 = revisedIfThen1;
        if (revisedIfThen2 && revisedIfThen2 !== annual.ifThenPlan2) updates.ifThenPlan2 = revisedIfThen2;
        if (Object.keys(updates).length > 0) {
          await apiRequest("PUT", `/api/annual-commitment/${annual.id}`, updates);
        }
      }

      // Close current sprint (transactional on server — sprint + habit handled atomically)
      if (!createOnly && sprint?.monthKey) {
        await apiRequest("POST", `/api/goal-sprint/${sprint.monthKey}/close`, { closedAs: closeAs });
      }

      // Create new sprint
      const body: Record<string, unknown> = {
        sprintName: newSprintName.trim(),
        goalStatement: newGoalStatement.trim(),
        startDate: newStartDate,
        endDate: newEndDate,
        confidenceCheck: newSprintConfidence,
      };
      if (newMilestone1.trim()) { body.milestone1Text = newMilestone1.trim(); body.milestone1TargetWeek = newMilestone1Week || null; }
      if (newMilestone2.trim()) { body.milestone2Text = newMilestone2.trim(); body.milestone2TargetWeek = newMilestone2Week || null; }
      await apiRequest("POST", "/api/goal-sprint", body);

      // Create sprint behavior habit
      if (newBehaviorName.trim() && precisionData) {
        await apiRequest("POST", "/api/habits", {
          name: newBehaviorName.trim(),
          category: "growth",
          cadence: "mon,tue,wed,thu,fri",
          timing: "morning",
          source: "sprint",
          active: true,
          startDate: newStartDate,
          endDate: newEndDate,
          ...precisionData,
        });
      }

      onComplete();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message || "Something went wrong", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {createOnly ? "Create Sprint" : `Sprint Ritual — Part ${step} of 3`}
          </DialogTitle>
        </DialogHeader>

        {/* Part 1 — Close Sprint */}
        {!createOnly && step === 1 && (
          <div className="space-y-4 pt-2">
            <p className="text-sm font-medium">Sprint Summary</p>
            {compactSummary ? (
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center rounded-lg bg-muted/40 p-3">
                  <p className="text-lg font-bold">{compactSummary.sprintBehaviorRate}%</p>
                  <p className="text-[10px] text-muted-foreground">Sprint behavior</p>
                </div>
                <div className="text-center rounded-lg bg-muted/40 p-3">
                  <p className="text-lg font-bold">{compactSummary.weeklyProofBehaviorRate}%</p>
                  <p className="text-[10px] text-muted-foreground">Weekly proof</p>
                </div>
                <div className="text-center rounded-lg bg-muted/40 p-3">
                  <p className="text-lg font-bold">{compactSummary.proofMovesCompleted}/{compactSummary.proofMovesIntended}</p>
                  <p className="text-[10px] text-muted-foreground">Proof moves</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Loading summary...</p>
            )}
            {sprint?.startDate && sprint?.endDate && (
              <a href={`/proof?from=${sprint.startDate}&to=${sprint.endDate}`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline min-h-[44px]">
                See full evidence <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <div className="flex justify-end pt-2">
              <Button size="sm" className="min-h-[44px]" onClick={() => setStep(2)}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Part 2 — Values Check */}
        {!createOnly && step === 2 && (
          <div className="space-y-4 pt-2">
            <p className="text-sm font-medium">Values Check</p>
            {parsedValues.length > 0 ? (
              <div className="space-y-3">
                {parsedValues.map((v: any, i: number) => (
                  <div key={i} className="rounded-lg bg-muted/30 px-3 py-2">
                    <p className="text-sm font-medium">{v.value || v}</p>
                    {v.why && <p className="text-xs text-muted-foreground italic mt-0.5">{v.why}</p>}
                  </div>
                ))}
                <div className="space-y-2">
                  <Label className="text-sm">Which value did you live most?</Label>
                  <div className="flex flex-wrap gap-2">
                    {parsedValues.map((v: any, i: number) => {
                      const label = v.value || v;
                      return (
                        <button key={i} type="button" onClick={() => setLivedValue(label)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium min-h-[44px] transition-colors cursor-pointer ${
                            livedValue === label ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}>{label}</button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Which value did you neglect?</Label>
                  <div className="flex flex-wrap gap-2">
                    {parsedValues.map((v: any, i: number) => {
                      const label = v.value || v;
                      return (
                        <button key={i} type="button" onClick={() => setNeglectedValue(label)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium min-h-[44px] transition-colors cursor-pointer ${
                            neglectedValue === label ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}>{label}</button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No values set. Edit in the Me tab.</p>
            )}
            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button size="sm" className="min-h-[44px]" onClick={() => setStep(3)}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Part 3 — Refresh + New Sprint */}
        {(createOnly || step === 3) && (
          <div className="space-y-5 pt-2">
            {/* Close current sprint */}
            {!createOnly && sprint && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Close current sprint</p>
                <div className="space-y-2">
                  {(["end", "carry_forward", "promote_to_habit"] as const).map(opt => {
                    const disabled = opt === "carry_forward" && (sprint.carryForwardCount ?? 0) >= 1;
                    const labels: Record<string, string> = {
                      end: "End sprint",
                      carry_forward: "Carry forward (one more cycle)",
                      promote_to_habit: "Promote behavior to support habit",
                    };
                    return (
                      <button key={opt} type="button" disabled={disabled}
                        onClick={() => !disabled && setCloseAs(opt)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm min-h-[44px] transition-colors ${
                          closeAs === opt ? "border-primary bg-primary/5" : "border-border"
                        } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {labels[opt]}
                        {disabled && <span className="text-xs text-muted-foreground ml-1">(already carried forward)</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Confidence (0-10)</Label>
                  <input type="range" min={0} max={10} value={newConfidence}
                    onChange={e => setNewConfidence(Number(e.target.value))} className="w-full h-10" />
                  <p className="text-xs text-center text-muted-foreground">{newConfidence}/10</p>
                  {newConfidence < 8 && <p className="text-xs text-amber-600">Consider shrinking your Weekly Proof Behavior.</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Revise IF-THEN plans</Label>
                  <Input value={revisedIfThen1} onChange={e => setRevisedIfThen1(e.target.value)} placeholder="IF [trigger] THEN [action]" />
                  <Input value={revisedIfThen2} onChange={e => setRevisedIfThen2(e.target.value)} placeholder="IF [trigger] THEN [action]" />
                </div>
                {identityDoc?.acceptanceTruth && (
                  <div className="rounded-lg bg-muted/30 px-3 py-2">
                    <p className="text-xs text-muted-foreground mb-1">The truth you said you'd been avoiding:</p>
                    <p className="text-sm italic">{identityDoc.acceptanceTruth}</p>
                  </div>
                )}
                <hr className="border-border" />
              </div>
            )}

            {/* New sprint */}
            <div className="space-y-3">
              <p className="text-sm font-medium">New Sprint</p>
              <div className="space-y-2">
                <Label className="text-sm">Sprint name</Label>
                <Input value={newSprintName} onChange={e => setNewSprintName(e.target.value)}
                  placeholder="e.g. Build daily exercise habit" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Goal / commitment</Label>
                <Textarea value={newGoalStatement} onChange={e => setNewGoalStatement(e.target.value)}
                  placeholder="What are you committing to?" className="min-h-[60px] max-h-[100px] resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Start date</Label>
                  <Input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End date</Label>
                  <Input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} />
                </div>
              </div>

              {/* Milestones — stacked for mobile */}
              <div className="space-y-2">
                <Label className="text-sm">Sprint Milestones <span className="text-xs text-muted-foreground">(optional, up to 2)</span></Label>
                <div className="space-y-1">
                  <Input value={newMilestone1} onChange={e => setNewMilestone1(e.target.value)} placeholder="Milestone 1" />
                  <Input type="date" value={newMilestone1Week} onChange={e => setNewMilestone1Week(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Input value={newMilestone2} onChange={e => setNewMilestone2(e.target.value)} placeholder="Milestone 2" />
                  <Input type="date" value={newMilestone2Week} onChange={e => setNewMilestone2Week(e.target.value)} />
                </div>
              </div>

              {/* Sprint behavior */}
              <div className="space-y-2">
                <Label className="text-sm">Sprint support behavior</Label>
                <Input value={newBehaviorName} onChange={e => setNewBehaviorName(e.target.value)}
                  placeholder="e.g. Run for 20 minutes" />
                {newBehaviorName.trim() && !precisionData && !showPrecision && (
                  <Button variant="outline" size="sm" className="min-h-[44px]"
                    onClick={() => setShowPrecision(true)}>
                    Map success + shadow patterns
                  </Button>
                )}
                {showPrecision && !precisionData && (
                  <PrecisionWizard mode="full" behaviorName={newBehaviorName}
                    onComplete={data => { setPrecisionData(data); setShowPrecision(false); }}
                    onCancel={() => setShowPrecision(false)} />
                )}
                {precisionData && (
                  <div className="rounded-lg bg-primary/[0.04] px-3 py-2 flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-xs text-muted-foreground">Patterns mapped</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Sprint confidence (0-10)</Label>
                <input type="range" min={0} max={10} value={newSprintConfidence}
                  onChange={e => setNewSprintConfidence(Number(e.target.value))} className="w-full h-10" />
                <p className="text-xs text-center text-muted-foreground">{newSprintConfidence}/10</p>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              {!createOnly && (
                <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              )}
              <Button size="sm" className="min-h-[44px] ml-auto" disabled={!canComplete || isSubmitting}
                onClick={handleComplete}>
                {isSubmitting ? "Saving..." : createOnly ? "Create Sprint" : "Complete Ritual"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
