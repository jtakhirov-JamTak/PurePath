import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { FlowBar } from "@/components/flow-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { format, startOfWeek, addDays } from "date-fns";
import type { MonthlyGoal, IdentityDocument } from "@shared/schema";

const DEFAULT_OBSTACLES = ["Time", "Energy", "Avoidance", "Distraction", "Perfectionism"];

export default function MonthlyGoalPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState(1);
  const [showIdentity, setShowIdentity] = useState(false);

  // Form state
  const [goalWhat, setGoalWhat] = useState("");
  const [deadline, setDeadline] = useState("");
  const [goalHow, setGoalHow] = useState("");
  const [selectedObstacles, setSelectedObstacles] = useState<string[]>([]);
  const [customObstacle, setCustomObstacle] = useState("");
  const [ifThenPlan1, setIfThenPlan1] = useState("");
  const [nextConcreteStep, setNextConcreteStep] = useState("");
  const [goalWhen, setGoalWhen] = useState("");
  const [fun, setFun] = useState("");

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

  // Pre-fill from existing data
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (monthlyGoal && !initialized) {
      setGoalWhat(monthlyGoal.goalWhat || "");
      setDeadline(monthlyGoal.deadline || "");
      setGoalHow(monthlyGoal.goalHow || "");
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
      setFun(monthlyGoal.fun || "");
      setInitialized(true);
    }
  }, [monthlyGoal, initialized]);

  const identityStatement = identityDoc?.identity?.trim() || "";
  const strengths = identityDoc?.strengths?.trim() || "";
  const frictionChips = (identityDoc?.hurtingPatterns || "").split(",").map(s => s.trim()).filter(Boolean);
  const allObstacleChips = Array.from(new Set([...frictionChips, ...DEFAULT_OBSTACLES]));

  const toggleObstacle = (chip: string) => {
    setSelectedObstacles(prev =>
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
    );
  };

  const innerObstacleValue = [...selectedObstacles, customObstacle].filter(Boolean).join(", ");

  const saveMutation = useToastMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/monthly-goal", {
        monthKey: currentMonthKey,
        goalWhat,
        deadline,
        goalHow,
        innerObstacle: innerObstacleValue,
        ifThenPlan1,
        nextConcreteStep,
        goalWhen,
        fun,
        goalStatement: goalWhat,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to save goal");
      }

      // Auto-link monthly goal next step to This Week's Focus (skip if duplicate)
      if (nextConcreteStep && goalWhen) {
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = addDays(weekStart, 6);
        const whenDate = new Date(goalWhen + "T12:00:00");
        if (whenDate >= weekStart && whenDate <= weekEnd) {
          const weekStartStr = format(weekStart, "yyyy-MM-dd");
          const existingRes = await fetch(`/api/eisenhower`, { credentials: "include" });
          const existing: { task: string; weekStart: string }[] = existingRes.ok ? await existingRes.json() : [];
          const alreadyExists = existing.some(e => e.task === nextConcreteStep && e.weekStart === weekStartStr);
          if (!alreadyExists) {
            await apiRequest("POST", "/api/eisenhower", {
              task: nextConcreteStep,
              weekStart: weekStartStr,
              role: "",
              quadrant: "q1",
              blocksGoal: true,
              deadline: goalWhen,
            });
          }
        }
      }

      return res.json();
    },
    invalidateKeys: ["/api/monthly-goal", "/api/eisenhower"],
    successToast: { title: "Goal saved" },
    errorToast: "Could not save goal",
    onSuccess: () => {
      setLocation("/dashboard");
    },
  });

  const canNext = () => {
    switch (step) {
      case 1: return goalWhat.trim().length > 0;
      case 2: return selectedObstacles.length > 0 || customObstacle.trim().length > 0;
      case 3: return nextConcreteStep.trim().length > 0;
      case 4: return true;
      default: return false;
    }
  };

  return (
    <AppLayout>
      <FlowBar fallback="/plan" doneLabel="Done" />
      <div className="container mx-auto px-4 py-6 max-w-lg">
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-6 justify-center" data-testid="step-indicator">
          {[1, 2, 3, 4].map(s => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`h-2.5 w-2.5 rounded-full cursor-pointer ${
                s === step ? "bg-emerald-500" : s < step ? "bg-emerald-500/50" : "bg-muted"
              }`}
              data-testid={`step-dot-${s}`}
            />
          ))}
        </div>

        {/* Step 1: Set the Goal */}
        {step === 1 && (
          <div className="space-y-4" data-testid="step-1">
            <p className="text-[11px] uppercase tracking-wide text-bark font-medium">Set the Goal</p>

            {(identityStatement || strengths) && (
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
                  <div className="mt-1.5 border-l-[3px] border-l-[#6B4226] dark:border-l-[#A67B5B] bg-bark/5 rounded-r-md p-2.5 space-y-1">
                    {identityStatement && <p className="text-[10px] text-muted-foreground italic">{identityStatement}</p>}
                    {strengths && <p className="text-[10px] text-muted-foreground">{strengths}</p>}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium">What's your one goal this month?</label>
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
              <label className="text-xs font-medium">Where / how will this happen?</label>
              <Input
                value={goalHow}
                onChange={(e) => setGoalHow(e.target.value)}
                placeholder="Context — where, with whom, how"
                className="text-xs"
                data-testid="input-goal-how"
              />
            </div>

            <p className="text-[10px] text-muted-foreground italic">If you can't state it cleanly, it's a wish. Aim high.</p>
          </div>
        )}

        {/* Step 2: Face the Pattern */}
        {step === 2 && (
          <div className="space-y-4" data-testid="step-2">
            <p className="text-[11px] uppercase tracking-wide text-bark font-medium">Face the Pattern</p>

            {frictionChips.length > 0 && (
              <div className="border-l-[3px] border-l-[#6B4226] dark:border-l-[#A67B5B] bg-bark/5 rounded-r-md p-2.5">
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

        {/* Step 3: Lock the First Move */}
        {step === 3 && (
          <div className="space-y-4" data-testid="step-3">
            <p className="text-[11px] uppercase tracking-wide text-bark font-medium">Lock the First Move</p>

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
              <label className="text-xs font-medium">How can you make this easier or more enjoyable?</label>
              <Input
                value={fun}
                onChange={(e) => setFun(e.target.value)}
                placeholder="A reward, a partner, music, a bet..."
                className="text-xs"
                data-testid="input-fun"
              />
            </div>

            <p className="text-[10px] text-muted-foreground italic">An ounce of action beats a pound of thinking.</p>
          </div>
        )}

        {/* Step 4: Commit */}
        {step === 4 && (
          <div className="space-y-4" data-testid="step-4">
            <p className="text-[11px] uppercase tracking-wide text-bark font-medium">Commit</p>

            <div className="border-l-[3px] border-l-[#6B4226] dark:border-l-[#A67B5B] bg-bark/5 rounded-r-md p-3 space-y-1.5">
              {goalWhat && <p className="text-xs font-medium">{goalWhat}</p>}
              {deadline && <p className="text-[10px] text-muted-foreground">By: {format(new Date(deadline + "T00:00:00"), "MMM d, yyyy")}</p>}
              {goalHow && <p className="text-[10px] text-muted-foreground">How: {goalHow}</p>}
              {innerObstacleValue && <p className="text-[10px]">Obstacle: {innerObstacleValue}</p>}
              {ifThenPlan1 && <p className="text-[10px]">IF it happens → {ifThenPlan1}</p>}
              {nextConcreteStep && <p className="text-[10px]">Next step: {nextConcreteStep}</p>}
              {goalWhen && <p className="text-[10px]">When: {format(new Date(goalWhen + "T00:00:00"), "MMM d, yyyy")}</p>}
              {fun && <p className="text-[10px]">Make it easier: {fun}</p>}
            </div>

            <p className="text-[10px] text-bark italic">Read this aloud.</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          {step > 1 ? (
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setStep(s => s - 1)} data-testid="button-back">Back</Button>
          ) : <div />}

          {step < 4 ? (
            <Button size="sm" className="text-xs" disabled={!canNext()} onClick={() => setStep(s => s + 1)} data-testid="button-next">Next</Button>
          ) : (
            <Button
              size="sm"
              className="text-xs bg-emerald-600 hover:bg-emerald-700"
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
