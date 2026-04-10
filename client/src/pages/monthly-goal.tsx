import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { FlowBar } from "@/components/flow-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VoiceTextarea } from "@/components/voice-input";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import type { MonthlyGoal, IdentityDocument, PatternProfile } from "@shared/schema";

const DEFAULT_OBSTACLES = ["Time", "Energy", "Avoidance", "Distraction", "Perfectionism"];
const CATEGORIES = ["health", "wealth", "relationships", "growth", "joy"];

export default function MonthlyGoalPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [showIdentity, setShowIdentity] = useState(false);

  // Form state
  const [goalWhat, setGoalWhat] = useState("");
  const [deadline, setDeadline] = useState("");
  const [goalHow1, setGoalHow1] = useState("");
  const [goalHow2, setGoalHow2] = useState("");
  const [goalHow3, setGoalHow3] = useState("");
  const [strengthsText, setStrengthsText] = useState("");
  const [selectedObstacles, setSelectedObstacles] = useState<string[]>([]);
  const [customObstacle, setCustomObstacle] = useState("");
  const [ifThenPlan1, setIfThenPlan1] = useState("");
  const [nextConcreteStep, setNextConcreteStep] = useState("");
  const [goalWhen, setGoalWhen] = useState("");
  const [eisenhowerTime, setEisenhowerTime] = useState("");
  const [eisenhowerCategory, setEisenhowerCategory] = useState("");

  const today = new Date();
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

  const { data: identityDoc } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
    enabled: !!user,
  });

  const { data: patternProfile } = useQuery<PatternProfile>({
    queryKey: ["/api/pattern-profile"],
    enabled: !!user,
  });

  // Pre-fill from existing data
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (monthlyGoal && !initialized) {
      setGoalWhat(monthlyGoal.goalWhat || "");
      setDeadline(monthlyGoal.deadline || "");
      // Parse 3 goalHow values from newline-joined string
      const howParts = (monthlyGoal.goalHow || "").split("\n");
      setGoalHow1(howParts[0] || "");
      setGoalHow2(howParts[1] || "");
      setGoalHow3(howParts[2] || "");
      if (monthlyGoal.innerObstacle) {
        const parts = monthlyGoal.innerObstacle.split(",").map(s => s.trim()).filter(Boolean);
        const known = parts.filter(p => DEFAULT_OBSTACLES.includes(p) || frictionChips.includes(p));
        const custom = parts.filter(p => !DEFAULT_OBSTACLES.includes(p) && !frictionChips.includes(p));
        setSelectedObstacles(known);
        setCustomObstacle(custom.join(", "));
      }
      setIfThenPlan1(monthlyGoal.ifThenPlan1 || "");
      setNextConcreteStep(monthlyGoal.nextConcreteStep || "");
      setGoalWhen(monthlyGoal.goalWhen || "");
      setStrengthsText(monthlyGoal.strengths || "");
      setInitialized(true);
    }
  }, [monthlyGoal, initialized]);

  // Pre-fill strengths from monthly goal data (user-entered on this page)
  const identityStatement = identityDoc?.identity?.trim() || "";
  const existingStrengths = strengthsText.trim();

  // Derive chips from pattern profile (structured fields)
  const helpingChips = patternProfile
    ? [patternProfile.helpingPattern1Behavior, patternProfile.helpingPattern2Behavior, patternProfile.helpingPattern3Behavior]
        .map(s => (s || "").trim()).filter(Boolean)
    : [];
  const frictionChips = patternProfile
    ? [patternProfile.hurtingPattern1Behavior, patternProfile.hurtingPattern2Behavior, patternProfile.hurtingPattern3Behavior]
        .map(s => (s || "").trim()).filter(Boolean)
    : [];
  const allObstacleChips = Array.from(new Set([...frictionChips, ...DEFAULT_OBSTACLES]));

  const toggleObstacle = (chip: string) => {
    setSelectedObstacles(prev =>
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
    );
  };

  const innerObstacleValue = [...selectedObstacles, customObstacle].filter(Boolean).join(", ");
  const goalHowJoined = [goalHow1, goalHow2, goalHow3].filter(Boolean).join("\n");

  const saveMutation = useToastMutation({
    mutationFn: async () => {
      // 1. Save monthly goal
      const res = await apiRequest("PUT", "/api/monthly-goal", {
        monthKey: currentMonthKey,
        goalWhat,
        deadline,
        goalHow: goalHowJoined,
        innerObstacle: innerObstacleValue,
        ifThenPlan1,
        nextConcreteStep,
        goalWhen,
        goalStatement: goalWhat,
        strengths: strengthsText.trim(),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to save goal");
      }

      // 2. Create Q1 eisenhower item if date + time provided (only on first save, not edits)
      if (!initialized && goalWhen && eisenhowerTime && nextConcreteStep.trim()) {
        const weekStart = format(
          startOfWeek(new Date(goalWhen + "T12:00:00"), { weekStartsOn: 1 }),
          "yyyy-MM-dd"
        );
        const eisRes = await apiRequest("POST", "/api/eisenhower", {
          task: nextConcreteStep.trim(),
          weekStart,
          quadrant: "q1",
          scheduledDate: goalWhen,
          scheduledStartTime: eisenhowerTime,
          category: eisenhowerCategory || null,
          blocksGoal: true,
          sortOrder: 0,
          isBinary: false,
        });
        if (!eisRes.ok) {
          toast({ title: "Note", description: "Goal saved but Q1 item could not be created (week may be full)." });
        }
      }

      return res.json();
    },
    invalidateKeys: ["/api/monthly-goal"],
    successToast: { title: "Goal saved" },
    errorToast: "Could not save goal",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
      setLocation("/today");
    },
  });

  const canNext = () => {
    switch (step) {
      case 1: return goalWhat.trim().length > 0;
      case 2: return strengthsText.trim().length > 0;
      case 3: return selectedObstacles.length > 0 || customObstacle.trim().length > 0;
      case 4: return nextConcreteStep.trim().length > 0;
      case 5: return true;
      default: return false;
    }
  };

  return (
    <AppLayout>
      <FlowBar fallback="/week" doneLabel="Done" />
      <div className="container mx-auto px-4 py-6 max-w-lg">
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-6 justify-center" data-testid="step-indicator">
          {[1, 2, 3, 4, 5].map(s => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`h-2.5 w-2.5 rounded-full cursor-pointer ${
                s === step ? "bg-primary" : s < step ? "bg-primary/50" : "bg-muted"
              }`}
              data-testid={`step-dot-${s}`}
            />
          ))}
        </div>

        {/* Step 1: Set the Goal */}
        {step === 1 && (
          <div className="space-y-4" data-testid="step-1">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Set the Goal</p>

            {(identityStatement || existingStrengths) && (
              <div>
                <button
                  onClick={() => setShowIdentity(!showIdentity)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  data-testid="toggle-identity"
                >
                  Show my identity
                  {showIdentity ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {showIdentity && (
                  <div className="mt-1.5 border-l-[3px] border-l-primary bg-muted/50 rounded-r-md p-2.5 space-y-1">
                    {identityStatement && <p className="text-[10px] text-muted-foreground italic">{identityStatement}</p>}
                    {existingStrengths && <p className="text-[10px] text-muted-foreground">{existingStrengths}</p>}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium">What's your one goal this month?</label>
              <p className="text-[10px] text-muted-foreground italic">Pause, close your eyes and imagine it vividly.</p>
              <Textarea
                value={goalWhat}
                onChange={(e) => setGoalWhat(e.target.value)}
                placeholder="Be specific — what, not 'be better at...'"
                rows={2}
                className="text-xs resize-none"
                data-testid="input-goal-what"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">By when?</label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="text-xs w-40"
                data-testid="input-deadline"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">How? (up to 3 approaches)</label>
              <Input
                value={goalHow1}
                onChange={(e) => setGoalHow1(e.target.value)}
                placeholder="Approach 1"
                className="text-xs"
                data-testid="input-goal-how-1"
              />
              <Input
                value={goalHow2}
                onChange={(e) => setGoalHow2(e.target.value)}
                placeholder="Approach 2"
                className="text-xs"
                data-testid="input-goal-how-2"
              />
              <Input
                value={goalHow3}
                onChange={(e) => setGoalHow3(e.target.value)}
                placeholder="Approach 3"
                className="text-xs"
                data-testid="input-goal-how-3"
              />
            </div>
          </div>
        )}

        {/* Step 2: Why I Can Do This */}
        {step === 2 && (
          <div className="space-y-4" data-testid="step-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Why I Can Do This</p>

            {helpingChips.length > 0 && (
              <div className="border-l-[3px] border-l-primary bg-primary/5 dark:bg-primary/10 rounded-r-md p-2.5">
                <p className="text-[10px] text-muted-foreground mb-1">Your helping patterns:</p>
                <div className="flex flex-wrap gap-1">
                  {helpingChips.map((chip, i) => (
                    <span key={i} className="text-[10px] text-primary dark:text-primary bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded-full">{chip}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Strengths</label>
              <p className="text-[10px] text-muted-foreground italic">
                Put time and energy where you outperform others with the same effort. Competitive advantage matters.
              </p>
              <VoiceTextarea
                value={strengthsText}
                onChange={setStrengthsText}
                placeholder="What do others consistently recognize in you?"
                className="min-h-[80px] resize-none text-xs"
                data-testid="input-strengths"
              />
            </div>
          </div>
        )}

        {/* Step 3: Main Obstacles */}
        {step === 3 && (
          <div className="space-y-4" data-testid="step-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Main Obstacles</p>

            {frictionChips.length > 0 && (
              <div className="border-l-[3px] border-l-primary bg-muted/50 rounded-r-md p-2.5">
                <p className="text-[10px] text-muted-foreground mb-1">Your friction points:</p>
                <div className="flex flex-wrap gap-1">
                  {frictionChips.map((chip, i) => (
                    <span key={i} className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{chip}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium">What's most likely to get in the way?</label>
              <div className="flex flex-wrap gap-1.5">
                {allObstacleChips.map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => toggleObstacle(chip)}
                    className={`rounded-full px-3 py-1 text-xs border transition-colors cursor-pointer ${
                      selectedObstacles.includes(chip)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                    data-testid={`obstacle-chip-${chip.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <Input
                value={customObstacle}
                onChange={(e) => setCustomObstacle(e.target.value)}
                placeholder="Other..."
                className="text-xs mt-1"
                data-testid="input-custom-obstacle"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">IF that happens, THEN I will ___</label>
              <Input
                value={ifThenPlan1}
                onChange={(e) => setIfThenPlan1(e.target.value)}
                placeholder="My pre-committed response..."
                className="text-xs"
                data-testid="input-if-then"
              />
            </div>

            <p className="text-[10px] text-muted-foreground italic">Patterns repeat unless interrupted.</p>
          </div>
        )}

        {/* Step 4: Lock the First Move */}
        {step === 4 && (
          <div className="space-y-4" data-testid="step-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Lock the First Move</p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">What's the next concrete step?</label>
              <Input
                value={nextConcreteStep}
                onChange={(e) => setNextConcreteStep(e.target.value)}
                placeholder="Something you can do in the next 48 hours"
                className="text-xs"
                data-testid="input-next-step"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">When will you do it?</label>
              <Input
                type="date"
                value={goalWhen}
                onChange={(e) => setGoalWhen(e.target.value)}
                className="text-xs w-40"
                data-testid="input-goal-when"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">What time?</label>
              <Input
                type="time"
                value={eisenhowerTime}
                onChange={(e) => setEisenhowerTime(e.target.value)}
                className="text-xs w-32"
                data-testid="input-eisenhower-time"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setEisenhowerCategory(eisenhowerCategory === cat ? "" : cat)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs border transition-colors cursor-pointer capitalize",
                      eisenhowerCategory === cat
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                    data-testid={`category-chip-${cat}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground italic">This will be added to your Q1 focus items.</p>
          </div>
        )}

        {/* Step 5: Commit */}
        {step === 5 && (
          <div className="space-y-4" data-testid="step-5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Commit</p>

            <div className="border-l-[3px] border-l-primary bg-muted/50 rounded-r-md p-3 space-y-1.5">
              {goalWhat && <p className="text-xs font-medium">{goalWhat}</p>}
              {deadline && <p className="text-[10px] text-muted-foreground">By: {format(new Date(deadline + "T00:00:00"), "MMM d, yyyy")}</p>}
              {goalHowJoined && <p className="text-[10px] text-muted-foreground">How: {[goalHow1, goalHow2, goalHow3].filter(Boolean).join(" · ")}</p>}
              {strengthsText.trim() && <p className="text-[10px]">Strengths: {strengthsText.trim()}</p>}
              {innerObstacleValue && <p className="text-[10px]">Obstacle: {innerObstacleValue}</p>}
              {ifThenPlan1 && <p className="text-[10px]">IF it happens → {ifThenPlan1}</p>}
              {nextConcreteStep && <p className="text-[10px]">Next step: {nextConcreteStep}</p>}
              {goalWhen && <p className="text-[10px]">When: {format(new Date(goalWhen + "T00:00:00"), "MMM d, yyyy")}{eisenhowerTime ? ` at ${eisenhowerTime}` : ""}</p>}
              {eisenhowerCategory && <p className="text-[10px] capitalize">Category: {eisenhowerCategory}</p>}
            </div>

            <p className="text-[10px] text-muted-foreground italic">Read this aloud.</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          {step > 1 ? (
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setStep(s => s - 1)} data-testid="button-back">Back</Button>
          ) : <div />}

          {step < 5 ? (
            <Button size="sm" className="text-xs" disabled={!canNext()} onClick={() => setStep(s => s + 1)} data-testid="button-next">Next</Button>
          ) : (
            <Button
              size="sm"
              className="text-xs bg-primary hover:bg-primary/90"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              data-testid="button-save"
            >
              {saveMutation.isPending ? "Saving..." : "Lock it in"}
              {!saveMutation.isPending && <Check className="h-3 w-3 ml-1" />}
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
