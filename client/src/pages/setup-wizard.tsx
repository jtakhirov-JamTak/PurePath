import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, addDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { buildIdentityDocPayload } from "@/lib/identity-helpers";
import { PrecisionWizard, type PrecisionResult } from "@/components/precision-wizard";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, ArrowLeft, ArrowRight, Check, Sparkles, User, Target,
  Heart, DollarSign, Users, TrendingUp, Smile, Eye, Trophy,
  Zap, Gauge, Shield, RotateCcw, AlertTriangle, GitBranch,
  Star, Sun, Calendar, BookOpen,
} from "lucide-react";
import { SeasonBackground } from "@/components/season-background";
import { getWizardBackground } from "@/lib/sprint-background";

const STEP_TITLES = [
  "Core Identity",
  "Annual Commitment",
  "Best-State Calibration",
  "First Goal Sprint",
  "First Weekly Plan",
  "First Morning Proof",
];

const STEP_ICONS = [User, Sparkles, Star, Target, Calendar, BookOpen];

const DOMAINS = [
  { key: "health", label: "Health", icon: Heart, color: "text-emerald-500" },
  { key: "wealth", label: "Wealth", icon: DollarSign, color: "text-yellow-500" },
  { key: "relationships", label: "Relationships", icon: Users, color: "text-rose-500" },
  { key: "growth", label: "Growth", icon: TrendingUp, color: "text-blue-500" },
  { key: "joy", label: "Joy", icon: Smile, color: "text-amber-500" },
] as const;

const WEEKDAYS = [
  { key: "mon", label: "M" },
  { key: "tue", label: "T" },
  { key: "wed", label: "W" },
  { key: "thu", label: "T" },
  { key: "fri", label: "F" },
  { key: "sat", label: "S" },
  { key: "sun", label: "S" },
] as const;

const BEST_STATE_EMOTIONS = [
  "confident", "focused", "calm", "energized",
  "grateful", "creative", "connected", "joyful",
  "determined", "peaceful", "curious", "empowered",
] as const;

const VALUE_LABELS = ["Core Value 1", "Core Value 2", "Aspirational Value"];

const SUB_STEP_TRANSITION = { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 }, transition: { duration: 0.15 } };

function scrollToTop() { window.scrollTo({ top: 0, behavior: "smooth" }); }

function precisionToProfile(result: PrecisionResult, patternNum: 1 | 2): Record<string, string> {
  return {
    [`helpingPattern${patternNum}Condition`]: result.proofPatternWhen,
    [`helpingPattern${patternNum}Behavior`]: result.proofPatternBehavior,
    [`helpingPattern${patternNum}Outcome`]: result.proofPatternOutcome,
    [`helpingPattern${patternNum}Impact`]: result.proofPatternImpact,
    [`hurtingPattern${patternNum}Emotions`]: result.shadowEmotions,
    [`hurtingPattern${patternNum}Environment`]: result.shadowEnvironment,
    [`hurtingPattern${patternNum}Behavior`]: result.shadowBehavior,
    [`hurtingPattern${patternNum}Outcome`]: result.shadowOutcome,
  };
}

function profileToPrecision(profile: any, patternNum: 1 | 2): PrecisionResult | null {
  const condition = profile[`helpingPattern${patternNum}Condition`];
  if (!condition) return null;
  return {
    proofPatternWhen: condition,
    proofPatternBehavior: profile[`helpingPattern${patternNum}Behavior`] || "",
    proofPatternOutcome: profile[`helpingPattern${patternNum}Outcome`] || "",
    proofPatternImpact: profile[`helpingPattern${patternNum}Impact`] || "",
    shadowEmotions: profile[`hurtingPattern${patternNum}Emotions`] || "",
    shadowEnvironment: profile[`hurtingPattern${patternNum}Environment`] || "",
    shadowBehavior: profile[`hurtingPattern${patternNum}Behavior`] || "",
    shadowOutcome: profile[`hurtingPattern${patternNum}Outcome`] || "",
  };
}

// --- Main component ---

export default function SetupWizardPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: onboarding, isLoading } = useQuery<{
    onboardingStep: number;
    onboardingComplete: boolean;
  }>({
    queryKey: ["/api/onboarding"],
  });

  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const step = currentStep ?? onboarding?.onboardingStep ?? 0;

  // Warn on accidental navigation away during setup
  useEffect(() => {
    if (step === 0) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [step]);

  const updateOnboarding = useMutation({
    mutationFn: async (s: number) => {
      await apiRequest("PATCH", "/api/onboarding", { step: s });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
    },
    onError: () => {
      toast({ title: "Could not save progress", description: "Please try again.", variant: "destructive" });
    },
  });

  const skipSetup = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/onboarding", { step: 6 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
      navigate("/today");
    },
    onError: () => {
      toast({ title: "Could not skip setup", description: "Please try again.", variant: "destructive" });
    },
  });

  const goToStep = async (s: number) => {
    if (s > 0) await updateOnboarding.mutateAsync(s);
    setCurrentStep(s);
    scrollToTop();
  };

  const advanceStep = async (nextStep: number) => {
    await updateOnboarding.mutateAsync(nextStep);
    setCurrentStep(nextStep);
    scrollToTop();
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SeasonBackground src={getWizardBackground(step)}>
        <div className="max-w-2xl mx-auto px-4 py-8">
          {step > 0 && step <= 6 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Step {step} of 6</span>
                <span className="text-sm text-muted-foreground">{STEP_TITLES[step - 1]}</span>
              </div>
              <Progress value={(step / 6) * 100} className="h-2" data-testid="progress-bar" />
            </div>
          )}

          <AnimatePresence mode="wait">
          <motion.div key={step} {...SUB_STEP_TRANSITION}>
          {step === 0 && <WelcomeStep onBegin={() => goToStep(1)} onSkip={() => skipSetup.mutate()} isSkipping={skipSetup.isPending} />}
          {step === 1 && <CoreIdentityStep onNext={() => advanceStep(2)} onBack={() => goToStep(0)} />}
          {step === 2 && <AnnualCommitmentStep onNext={() => advanceStep(3)} onBack={() => goToStep(1)} />}
          {step === 3 && <BestStateCalibrationStep onNext={() => advanceStep(4)} onBack={() => goToStep(2)} />}
          {step === 4 && <GoalSprintStep onNext={() => advanceStep(5)} onBack={() => goToStep(3)} />}
          {step === 5 && <WeeklyPlanStep onNext={() => advanceStep(6)} onBack={() => goToStep(4)} />}
          {step === 6 && <MorningProofStep onComplete={async () => {
            try { await apiRequest("POST", "/api/workshop-seed/generate"); } catch { /* 409 expected if exists */ }
            navigate("/today");
          }} onBack={() => goToStep(5)} />}
          </motion.div>
          </AnimatePresence>
        </div>
      </SeasonBackground>
    </AppLayout>
  );
}

// --- Welcome ---

function WelcomeStep({ onBegin, onSkip, isSkipping }: { onBegin: () => void; onSkip: () => void; isSkipping: boolean }) {
  return (
    <div className="text-center space-y-8 py-12">
      <div className="space-y-3">
        <h1 className="text-lg font-medium" data-testid="text-welcome-heading">Welcome to The Leaf</h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto" data-testid="text-welcome-subtext">
          Let's set up your daily system using what you created in the workshop. This takes about 15 minutes.
        </p>
      </div>

      <Card className="max-w-sm mx-auto">
        <CardContent className="pt-6">
          <ul className="space-y-3 text-left">
            {STEP_TITLES.map((title, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <li key={i} className="flex items-center gap-3" data-testid={`text-step-preview-${i}`}>
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm">{title}</span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button size="lg" onClick={onBegin} data-testid="button-begin">
          Let's Begin
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <div>
          <button
            onClick={onSkip}
            disabled={isSkipping}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors min-h-[44px] px-4 py-2 inline-flex items-center"
            data-testid="link-skip-setup"
          >
            {isSkipping ? "Skipping..." : "Skip setup"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Step 1: Core Identity ---

function parseValuesJson(raw: string): { value: string; why: string }[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 3) return parsed;
  } catch { /* fall through */ }
  return [{ value: raw || "", why: "" }, { value: "", why: "" }, { value: "", why: "" }];
}

function CoreIdentityStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { toast } = useToast();
  const [entries, setEntries] = useState([
    { value: "", why: "" }, { value: "", why: "" }, { value: "", why: "" },
  ]);
  const [identityStatement, setIdentityStatement] = useState("");
  const [vision, setVision] = useState("");
  const [purpose, setPurpose] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: existing, isLoading } = useQuery<any>({ queryKey: ["/api/identity-document"] });

  useEffect(() => {
    if (existing) {
      setEntries(parseValuesJson(existing.values || ""));
      setIdentityStatement(existing.identity || "");
      setVision(existing.vision || "");
      setPurpose(existing.purpose || "");
    }
  }, [existing]);

  const updateEntry = (idx: number, field: "value" | "why", val: string) => {
    setEntries(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  const handleNext = async () => {
    setSaving(true);
    try {
      await apiRequest("PUT", "/api/identity-document", buildIdentityDocPayload(existing, {
        values: JSON.stringify(entries.map(e => ({ value: e.value.trim(), why: e.why.trim() }))),
        identity: identityStatement,
        vision,
        purpose,
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] });
      onNext();
    } catch (error: any) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <StepLoader />;

  return (
    <StepShell heading="Core Identity" subtext="Three things from the workshop. This is the foundation." onBack={onBack} onNext={handleNext} saving={saving}>
      <div className="space-y-4">
        {entries.map((entry, i) => (
          <FieldGroup key={i} label={VALUE_LABELS[i]}>
            <Input
              placeholder={i < 2 ? "A core value I live by..." : "A value I'm growing into..."}
              value={entry.value}
              onChange={(e) => updateEntry(i, "value", e.target.value)}
              data-testid={`input-value-${i}`}
            />
            <Input
              placeholder="Why this matters to me..."
              value={entry.why}
              onChange={(e) => updateEntry(i, "why", e.target.value)}
              className="mt-1.5"
              data-testid={`input-value-why-${i}`}
            />
          </FieldGroup>
        ))}
        <FieldGroup label="Identity Statement">
          <Textarea
            placeholder='I am [X, Y, Z] — written in present tense'
            value={identityStatement}
            onChange={(e) => setIdentityStatement(e.target.value)}
            rows={2}
            data-testid="input-identity-statement"
          />
        </FieldGroup>
        <FieldGroup label="Vision">
          <Textarea
            placeholder="My vision is... (specific, five-year, concrete)"
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            rows={3}
            data-testid="input-vision"
          />
        </FieldGroup>
        <FieldGroup label="Purpose">
          <Textarea
            placeholder="What you're contributing and why"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={2}
            data-testid="input-purpose"
          />
        </FieldGroup>
      </div>
    </StepShell>
  );
}

// --- Step 2: Annual Commitment ---

type AnnualSubStep = "domain" | "visualization" | "scoreboard" | "behavior" | "precision" | "confidence" | "obstacle" | "avoidance" | "trigger" | "ifthen";
const ANNUAL_SUB_STEPS: AnnualSubStep[] = ["domain", "visualization", "scoreboard", "behavior", "precision", "confidence", "obstacle", "avoidance", "trigger", "ifthen"];

function AnnualCommitmentStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { toast } = useToast();
  const [sub, setSub] = useState<AnnualSubStep>("domain");
  const subIdx = ANNUAL_SUB_STEPS.indexOf(sub);

  // 2a
  const [domain, setDomain] = useState("");
  // 2b
  const [visualization, setVisualization] = useState("");
  // 2c
  const [personStatement, setPersonStatement] = useState("");
  const [proofPoint, setProofPoint] = useState("");
  const [proofMetric, setProofMetric] = useState("");
  // 2d
  const [behaviorName, setBehaviorName] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>(["mon", "tue", "wed", "thu", "fri"]);
  // precision
  const [precisionResult, setPrecisionResult] = useState<PrecisionResult | null>(null);
  // 2e
  const [confidenceCheck, setConfidenceCheck] = useState(7);
  // 2f
  const [obstacle, setObstacle] = useState("");
  // 2g
  const [loopStory, setLoopStory] = useState("");
  const [loopAvoidance, setLoopAvoidance] = useState("");
  const [loopCost, setLoopCost] = useState("");
  const [loopCommitment, setLoopCommitment] = useState("");
  const [loopBehavior, setLoopBehavior] = useState("");
  // 2h
  const [trigTrigger, setTrigTrigger] = useState("");
  const [trigInterpretation, setTrigInterpretation] = useState("");
  const [trigEmotion, setTrigEmotion] = useState("");
  const [trigUrge, setTrigUrge] = useState("");
  const [trigBehavior, setTrigBehavior] = useState("");
  const [trigOutcome, setTrigOutcome] = useState("");
  // 2i
  const [ifThenPlan1, setIfThenPlan1] = useState("");
  const [ifThenPlan2, setIfThenPlan2] = useState("");

  const [saving, setSaving] = useState(false);

  // Load existing data
  const { data: existingCommitment } = useQuery<any>({ queryKey: ["/api/annual-commitment"] });
  const { data: existingProfile } = useQuery<any>({ queryKey: ["/api/pattern-profile"] });
  const { data: existingHabits } = useQuery<any[]>({ queryKey: ["/api/habits"] });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    if (existingCommitment === undefined || existingProfile === undefined || existingHabits === undefined) return;
    if (existingCommitment) {
      setDomain(existingCommitment.domain || "");
      setVisualization(existingCommitment.visualization || "");
      setPersonStatement(existingCommitment.personStatement || "");
      setProofPoint(existingCommitment.proofPoint || "");
      setProofMetric(existingCommitment.proofMetric || "");
      setConfidenceCheck(existingCommitment.confidenceCheck ?? 7);
      setObstacle(existingCommitment.obstacle || "");
      setIfThenPlan1(existingCommitment.ifThenPlan1 || "");
      setIfThenPlan2(existingCommitment.ifThenPlan2 || "");
    }
    if (existingProfile) {
      setLoopStory(existingProfile.repeatingLoopStory || "");
      setLoopAvoidance(existingProfile.repeatingLoopAvoidance || "");
      setLoopCost(existingProfile.repeatingLoopCost || "");
      setLoopCommitment(existingProfile.repeatingLoopCommitment || "");
      setLoopBehavior(existingProfile.repeatingLoopBehavior || "");
      setTrigTrigger(existingProfile.triggerPatternTrigger || "");
      setTrigInterpretation(existingProfile.triggerPatternInterpretation || "");
      setTrigEmotion(existingProfile.triggerPatternEmotion || "");
      setTrigUrge(existingProfile.triggerPatternUrge || "");
      setTrigBehavior(existingProfile.triggerPatternBehavior || "");
      setTrigOutcome(existingProfile.triggerPatternOutcome || "");
      const p1 = profileToPrecision(existingProfile, 1);
      if (p1) setPrecisionResult(p1);
    }
    if (existingHabits) {
      const annualHabit = existingHabits.find((h: any) => h.source === "annual" && h.active);
      if (annualHabit) {
        setBehaviorName(annualHabit.name || "");
        if (annualHabit.cadence) setSelectedDays(annualHabit.cadence.split(","));
      }
    }
    setHydrated(true);
  }, [existingCommitment, existingProfile, existingHabits, hydrated]);

  const toggleDay = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const subBack = () => {
    if (subIdx === 0) { onBack(); return; }
    setSub(ANNUAL_SUB_STEPS[subIdx - 1]);
    scrollToTop();
  };

  const subNext = () => {
    if (sub === "ifthen") { saveAll(); return; }
    setSub(ANNUAL_SUB_STEPS[subIdx + 1]);
    scrollToTop();
  };

  const saveAll = async () => {
    if (!precisionResult) {
      toast({ title: "Pattern map required", description: "Please complete the precision wizard.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // 1. Create or update annual commitment (update if already exists to avoid duplicates)
      let commitment: any;
      if (existingCommitment?.id) {
        const res = await apiRequest("PUT", `/api/annual-commitment/${existingCommitment.id}`, {
          domain, personStatement, proofPoint, proofMetric, visualization,
          confidenceCheck, obstacle, ifThenPlan1, ifThenPlan2,
        });
        commitment = await res.json();
      } else {
        const res = await apiRequest("POST", "/api/annual-commitment", {
          domain, personStatement, proofPoint, proofMetric, visualization,
          confidenceCheck, obstacle, ifThenPlan1, ifThenPlan2,
        });
        commitment = await res.json();
      }

      // 2. Create or update annual habit
      const existingAnnual = (existingHabits || []).find((h: any) => h.source === "annual" && h.active);
      let habitId: number;
      if (existingAnnual) {
        await apiRequest("PATCH", `/api/habits/${existingAnnual.id}`, {
          name: behaviorName.trim(),
          cadence: selectedDays.join(","),
          category: domain || "health",
          source: "annual",
          endDate: `${new Date().getFullYear()}-12-31`,
          ...precisionResult,
        });
        habitId = existingAnnual.id;
      } else {
        const habitRes = await apiRequest("POST", "/api/habits", {
          name: behaviorName.trim(),
          cadence: selectedDays.join(","),
          category: domain || "health",
          timing: "morning",
          source: "annual",
          startDate: format(new Date(), "yyyy-MM-dd"),
          endDate: `${new Date().getFullYear()}-12-31`,
          isBinary: false,
          ...precisionResult,
        });
        const habit = await habitRes.json();
        habitId = habit.id;
      }

      // 3. Link habit to commitment
      await apiRequest("PUT", `/api/annual-commitment/${commitment.id}`, {
        weeklyProofBehaviorHabitId: habitId,
      });

      // 4. Partial update pattern profile
      await apiRequest("PATCH", "/api/pattern-profile", {
        ...precisionToProfile(precisionResult, 1),
        repeatingLoopStory: loopStory,
        repeatingLoopAvoidance: loopAvoidance,
        repeatingLoopCost: loopCost,
        repeatingLoopCommitment: loopCommitment,
        repeatingLoopBehavior: loopBehavior,
        triggerPatternTrigger: trigTrigger,
        triggerPatternInterpretation: trigInterpretation,
        triggerPatternEmotion: trigEmotion,
        triggerPatternUrge: trigUrge,
        triggerPatternBehavior: trigBehavior,
        triggerPatternOutcome: trigOutcome,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/annual-commitment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pattern-profile"] });
      onNext();
    } catch (error: any) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Precision wizard sub-step: no parent nav, wizard handles its own
  if (sub === "precision") {
    return (
      <div className="space-y-4">
        <SubStepDots current={subIdx} total={ANNUAL_SUB_STEPS.length} />
        <div className="text-center space-y-1 mb-4">
          <h2 className="text-base font-medium">Map Your Patterns</h2>
          <p className="text-sm text-muted-foreground">Map the success and shadow patterns for your weekly proof behavior.</p>
        </div>
        {precisionResult ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="py-6 text-center space-y-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-medium">Patterns mapped</p>
                <p className="text-xs text-muted-foreground">{behaviorName}</p>
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={subBack}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button size="sm" className="min-h-[44px]" onClick={subNext}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        ) : (
          <PrecisionWizard
            mode="full"
            behaviorName={behaviorName}
            onComplete={(data) => { setPrecisionResult(data); subNext(); }}
            onCancel={subBack}
          />
        )}
      </div>
    );
  }

  // All other sub-steps
  const canNext = (() => {
    switch (sub) {
      case "domain": return !!domain;
      case "visualization": return visualization.trim().length > 0;
      case "scoreboard": return personStatement.trim().length > 0;
      case "behavior": return behaviorName.trim().length > 0 && selectedDays.length > 0;
      case "confidence": return true;
      case "obstacle": return true;
      case "avoidance": return true;
      case "trigger": return true;
      case "ifthen": return true;
      default: return true;
    }
  })();

  return (
    <div className="space-y-4">
      <SubStepDots current={subIdx} total={ANNUAL_SUB_STEPS.length} />

      <AnimatePresence mode="wait">
      <motion.div key={sub} {...SUB_STEP_TRANSITION}>

      {sub === "domain" && (
        <SubStepShell icon={Heart} heading="One Domain, One Year" subtext="If you could create unmistakable proof in only one area, which one?">
          <div className="grid grid-cols-1 gap-2">
            {DOMAINS.map(d => {
              const Icon = d.icon;
              const selected = domain === d.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDomain(d.key)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all min-h-[48px] ${
                    selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50"
                  }`}
                  data-testid={`domain-${d.key}`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${selected ? "text-primary" : d.color}`} />
                  <span className={`text-sm font-medium ${selected ? "text-primary" : ""}`}>{d.label}</span>
                </button>
              );
            })}
          </div>
        </SubStepShell>
      )}

      {sub === "visualization" && (
        <SubStepShell icon={Eye} heading="See Your Future Self" subtext="Close your eyes. One year from now. Write the scene.">
          <div className="space-y-3 text-xs text-muted-foreground">
            <p>Morning: what do you do automatically that used to require effort?</p>
            <p>Midday: a hard moment happens — how do you handle it?</p>
            <p>Evening: what did you follow through on that the old you would have avoided?</p>
            <p>Freeze frame: what single moment captures the transformation?</p>
          </div>
          <Textarea
            value={visualization}
            onChange={e => setVisualization(e.target.value)}
            placeholder="Write the scene..."
            rows={6}
            data-testid="input-visualization"
          />
        </SubStepShell>
      )}

      {sub === "scoreboard" && (
        <SubStepShell icon={Trophy} heading="Your Scoreboard" subtext="Make it specific and measurable.">
          <FieldGroup label="Person Statement">
            <Textarea
              value={personStatement}
              onChange={e => setPersonStatement(e.target.value)}
              placeholder="In 12 months, I am the kind of person who ___"
              rows={2}
              data-testid="input-person-statement"
            />
          </FieldGroup>
          <FieldGroup label="Observable Proof">
            <Input
              value={proofPoint}
              onChange={e => setProofPoint(e.target.value)}
              placeholder="Others can verify this — what will they see?"
              data-testid="input-proof-point"
            />
          </FieldGroup>
          <FieldGroup label="Success Metric">
            <Input
              value={proofMetric}
              onChange={e => setProofMetric(e.target.value)}
              placeholder="Precise number: ___"
              data-testid="input-proof-metric"
            />
          </FieldGroup>
        </SubStepShell>
      )}

      {sub === "behavior" && (
        <SubStepShell icon={Zap} heading="Weekly Proof Behavior" subtext="One primary behavior you'll do every week to prove this commitment.">
          <FieldGroup label="Behavior">
            <Input
              value={behaviorName}
              onChange={e => setBehaviorName(e.target.value)}
              placeholder="e.g. Run 3 miles, Write 500 words..."
              data-testid="input-behavior-name"
            />
          </FieldGroup>
          <FieldGroup label="Which days?">
            <div className="flex gap-1.5 justify-center">
              {WEEKDAYS.map((d, i) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDay(d.key)}
                  className={`w-11 h-11 rounded-full text-xs font-medium transition-all ${
                    selectedDays.includes(d.key)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  data-testid={`day-${d.key}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </FieldGroup>
        </SubStepShell>
      )}

      {sub === "confidence" && (
        <SubStepShell icon={Gauge} heading="Confidence Check" subtext="How confident are you, 0-10, that you can sustain this weekly for 4 weeks?">
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-4xl font-bold text-primary">{confidenceCheck}</span>
              <span className="text-sm text-muted-foreground ml-1">/ 10</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              value={confidenceCheck}
              onChange={e => setConfidenceCheck(Number(e.target.value))}
              className="w-full h-10 accent-primary"
              data-testid="input-confidence"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Not at all</span>
              <span>Completely</span>
            </div>
            {confidenceCheck < 8 && (
              <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardContent className="py-3">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    Consider shrinking your behavior to something you're 8+ confident about. Smaller and sustainable beats ambitious and abandoned.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </SubStepShell>
      )}

      {sub === "obstacle" && (
        <SubStepShell icon={Shield} heading="The Inner Obstacle" subtext="Picture the exact moment that prevents this. What inside you is most likely to block it?">
          <Textarea
            value={obstacle}
            onChange={e => setObstacle(e.target.value)}
            placeholder="The one thing inside me that will try to stop this is..."
            rows={3}
            data-testid="input-obstacle"
          />
        </SubStepShell>
      )}

      {sub === "avoidance" && (
        <SubStepShell icon={RotateCcw} heading="Face the Truth" subtext="Your repeating avoidance loop — the pattern you keep running.">
          <FieldGroup label="The story I keep telling myself is...">
            <Textarea value={loopStory} onChange={e => setLoopStory(e.target.value)} placeholder="The story I tell myself..." rows={2} data-testid="input-loop-story" />
          </FieldGroup>
          <FieldGroup label="What this story helps me avoid is...">
            <Textarea value={loopAvoidance} onChange={e => setLoopAvoidance(e.target.value)} placeholder="What I'm avoiding..." rows={2} data-testid="input-loop-avoidance" />
          </FieldGroup>
          <FieldGroup label="The cost of keeping it is...">
            <Textarea value={loopCost} onChange={e => setLoopCost(e.target.value)} placeholder="What it costs me..." rows={2} data-testid="input-loop-cost" />
          </FieldGroup>
          <FieldGroup label="The commitment I make is...">
            <Textarea value={loopCommitment} onChange={e => setLoopCommitment(e.target.value)} placeholder="I commit to..." rows={2} data-testid="input-loop-commitment" />
          </FieldGroup>
          <FieldGroup label="The specific behavior that would prove it is...">
            <Textarea value={loopBehavior} onChange={e => setLoopBehavior(e.target.value)} placeholder="The behavior that proves this..." rows={2} data-testid="input-loop-behavior" />
          </FieldGroup>
        </SubStepShell>
      )}

      {sub === "trigger" && (
        <SubStepShell icon={AlertTriangle} heading="Map the Trigger" subtext="Your repeating trigger pattern — the chain reaction.">
          <FieldGroup label="When [trigger] happens...">
            <Input value={trigTrigger} onChange={e => setTrigTrigger(e.target.value)} placeholder="When this happens..." data-testid="input-trig-trigger" />
          </FieldGroup>
          <FieldGroup label="The story I tell myself is...">
            <Input value={trigInterpretation} onChange={e => setTrigInterpretation(e.target.value)} placeholder="I tell myself..." data-testid="input-trig-interpretation" />
          </FieldGroup>
          <FieldGroup label="I feel...">
            <Input value={trigEmotion} onChange={e => setTrigEmotion(e.target.value)} placeholder="The emotion I feel..." data-testid="input-trig-emotion" />
          </FieldGroup>
          <FieldGroup label="I feel the urge to...">
            <Input value={trigUrge} onChange={e => setTrigUrge(e.target.value)} placeholder="The urge to..." data-testid="input-trig-urge" />
          </FieldGroup>
          <FieldGroup label="I do...">
            <Input value={trigBehavior} onChange={e => setTrigBehavior(e.target.value)} placeholder="What I actually do..." data-testid="input-trig-behavior" />
          </FieldGroup>
          <FieldGroup label="The outcome is...">
            <Input value={trigOutcome} onChange={e => setTrigOutcome(e.target.value)} placeholder="What happens as a result..." data-testid="input-trig-outcome" />
          </FieldGroup>
        </SubStepShell>
      )}

      {sub === "ifthen" && (
        <SubStepShell icon={GitBranch} heading="Build IF-THEN Plans" subtext="Small actions you can do while stressed. Use the trigger you just mapped.">
          <FieldGroup label="Plan 1">
            <Textarea
              value={ifThenPlan1}
              onChange={e => setIfThenPlan1(e.target.value)}
              placeholder="IF [specific trigger] THEN [small immediate action]"
              rows={2}
              data-testid="input-if-then-1"
            />
          </FieldGroup>
          <FieldGroup label="Plan 2">
            <Textarea
              value={ifThenPlan2}
              onChange={e => setIfThenPlan2(e.target.value)}
              placeholder="IF [specific trigger] THEN [small immediate action]"
              rows={2}
              data-testid="input-if-then-2"
            />
          </FieldGroup>
        </SubStepShell>
      )}

      </motion.div>
      </AnimatePresence>

      {/* Sub-step navigation */}
      <div className="flex items-center justify-between pt-2 sticky bottom-0 bg-background/95 backdrop-blur-sm pb-4">
        <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={subBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button size="sm" className="min-h-[44px]" disabled={!canNext || saving} onClick={subNext}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
          {sub === "ifthen" ? (saving ? "Saving..." : "Complete Step 2") : <>Next <ArrowRight className="h-4 w-4 ml-1" /></>}
        </Button>
      </div>
    </div>
  );
}

// --- Step 3: Best-State Calibration ---

type BestStateSubStep = "examples" | "emotions" | "environments" | "success2" | "shadow2ask" | "shadow2";
const BEST_STATE_SUB_STEPS: BestStateSubStep[] = ["examples", "emotions", "environments", "success2", "shadow2ask", "shadow2"];

function BestStateCalibrationStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { toast } = useToast();
  const [sub, setSub] = useState<BestStateSubStep>("examples");
  const subIdx = BEST_STATE_SUB_STEPS.indexOf(sub);

  // 3a
  const [examples, setExamples] = useState(["", "", ""]);
  // 3b
  const [bestEmotions, setBestEmotions] = useState<string[]>([]);
  // 3c
  const [environments, setEnvironments] = useState(["", "", ""]);
  // 3d
  const [successPattern2, setSuccessPattern2] = useState<PrecisionResult | null>(null);
  // 3e
  const [wantsShadow2, setWantsShadow2] = useState<boolean | null>(null);
  const [shadowPattern2, setShadowPattern2] = useState<PrecisionResult | null>(null);

  const [saving, setSaving] = useState(false);

  const { data: existingProfile } = useQuery<any>({ queryKey: ["/api/pattern-profile"] });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || existingProfile === undefined) return;
    if (existingProfile) {
      if (existingProfile.bestStateExamplesJson) {
        try {
          const parsed = JSON.parse(existingProfile.bestStateExamplesJson);
          if (Array.isArray(parsed) && parsed.length === 3) setExamples(parsed);
        } catch { /* ignore */ }
      }
      if (existingProfile.bestStateEmotions) {
        setBestEmotions(existingProfile.bestStateEmotions.split(",").filter(Boolean));
      }
      if (existingProfile.bestStateEnvironments) {
        try {
          const parsed = JSON.parse(existingProfile.bestStateEnvironments);
          if (Array.isArray(parsed) && parsed.length === 3) setEnvironments(parsed);
        } catch { /* ignore */ }
      }
      const p2success = profileToPrecision(existingProfile, 2);
      if (p2success) setSuccessPattern2(p2success);
      if (existingProfile.hurtingPattern2Emotions) {
        setWantsShadow2(true);
        setShadowPattern2({
          proofPatternWhen: "", proofPatternBehavior: "", proofPatternOutcome: "", proofPatternImpact: "",
          shadowEmotions: existingProfile.hurtingPattern2Emotions,
          shadowEnvironment: existingProfile.hurtingPattern2Environment || "",
          shadowBehavior: existingProfile.hurtingPattern2Behavior || "",
          shadowOutcome: existingProfile.hurtingPattern2Outcome || "",
        });
      }
    }
    setHydrated(true);
  }, [existingProfile, hydrated]);

  const updateExample = (idx: number, val: string) => {
    setExamples(prev => { const u = [...prev]; u[idx] = val; return u; });
  };

  const updateEnvironment = (idx: number, val: string) => {
    setEnvironments(prev => { const u = [...prev]; u[idx] = val; return u; });
  };

  const toggleEmotion = (e: string) => {
    setBestEmotions(prev => {
      if (prev.includes(e)) return prev.filter(x => x !== e);
      if (prev.length >= 3) return prev;
      return [...prev, e];
    });
  };

  const subBack = () => {
    if (sub === "shadow2" && !wantsShadow2) { setSub("shadow2ask"); scrollToTop(); return; }
    if (subIdx === 0) { onBack(); return; }
    setSub(BEST_STATE_SUB_STEPS[subIdx - 1]);
    scrollToTop();
  };

  const subNext = () => {
    if (sub === "shadow2ask" && !wantsShadow2) { saveAll(); return; }
    if (sub === "shadow2") { saveAll(); return; }
    setSub(BEST_STATE_SUB_STEPS[subIdx + 1]);
    scrollToTop();
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const patternData: Record<string, string> = {
        bestStateExamplesJson: JSON.stringify(examples),
        bestStateEmotions: bestEmotions.join(","),
        bestStateEnvironments: JSON.stringify(environments),
      };

      if (successPattern2) {
        const mapped = precisionToProfile(successPattern2, 2);
        Object.assign(patternData, {
          helpingPattern2Condition: mapped.helpingPattern2Condition,
          helpingPattern2Behavior: mapped.helpingPattern2Behavior,
          helpingPattern2Outcome: mapped.helpingPattern2Outcome,
          helpingPattern2Impact: mapped.helpingPattern2Impact,
        });
      }

      if (shadowPattern2) {
        const mapped = precisionToProfile(shadowPattern2, 2);
        Object.assign(patternData, {
          hurtingPattern2Emotions: mapped.hurtingPattern2Emotions,
          hurtingPattern2Environment: mapped.hurtingPattern2Environment,
          hurtingPattern2Behavior: mapped.hurtingPattern2Behavior,
          hurtingPattern2Outcome: mapped.hurtingPattern2Outcome,
        });
      }

      await apiRequest("PATCH", "/api/pattern-profile", patternData);
      queryClient.invalidateQueries({ queryKey: ["/api/pattern-profile"] });
      onNext();
    } catch (error: any) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Precision wizard sub-steps
  if (sub === "success2") {
    return (
      <div className="space-y-4">
        <SubStepDots current={subIdx} total={BEST_STATE_SUB_STEPS.length} />
        <div className="text-center space-y-1 mb-4">
          <h2 className="text-base font-medium">Your Best-State Behavior</h2>
          <p className="text-sm text-muted-foreground">Based on what you wrote, what is the one behavior that keeps you at your best?</p>
        </div>
        {successPattern2 ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="py-6 text-center space-y-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-medium">Success pattern mapped</p>
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={subBack}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button size="sm" className="min-h-[44px]" onClick={subNext}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        ) : (
          <PrecisionWizard
            mode="success_only"
            behaviorName="Best-state behavior"
            onComplete={(data) => { setSuccessPattern2(data); subNext(); }}
            onCancel={subBack}
          />
        )}
      </div>
    );
  }

  if (sub === "shadow2") {
    return (
      <div className="space-y-4">
        <SubStepDots current={subIdx} total={BEST_STATE_SUB_STEPS.length} />
        <div className="text-center space-y-1 mb-4">
          <h2 className="text-base font-medium">Shadow Pattern 2</h2>
          <p className="text-sm text-muted-foreground">Map the behavior that pulls you out of your best state.</p>
        </div>
        {shadowPattern2 ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="py-6 text-center space-y-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-medium">Shadow pattern mapped</p>
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={subBack}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button size="sm" className="min-h-[44px]" disabled={saving} onClick={saveAll}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                {saving ? "Saving..." : "Complete Step 3"}
              </Button>
            </div>
          </div>
        ) : (
          <PrecisionWizard
            mode="shadow_only"
            behaviorName="Opposite of best-state"
            onComplete={(data) => { setShadowPattern2(data); }}
            onCancel={() => { setWantsShadow2(false); setSub("shadow2ask"); }}
          />
        )}
      </div>
    );
  }

  const canNext = (() => {
    switch (sub) {
      case "examples": return examples.some(e => e.trim().length > 0);
      case "emotions": return bestEmotions.length > 0;
      case "environments": return environments.some(e => e.trim().length > 0);
      case "shadow2ask": return wantsShadow2 !== null;
      default: return true;
    }
  })();

  return (
    <div className="space-y-4">
      <SubStepDots current={subIdx} total={BEST_STATE_SUB_STEPS.length} />

      <AnimatePresence mode="wait">
      <motion.div key={sub} {...SUB_STEP_TRANSITION}>

      {sub === "examples" && (
        <SubStepShell icon={Star} heading="When You're at Your Best" subtext="Write 3 scenarios: when I'm at my best, this happens.">
          {examples.map((ex, i) => (
            <FieldGroup key={i} label={`Scenario ${i + 1}`}>
              <Textarea
                value={ex}
                onChange={e => updateExample(i, e.target.value)}
                placeholder={`When I'm at my best, ${i === 0 ? "I..." : i === 1 ? "my relationships..." : "my work..."}`}
                rows={2}
                data-testid={`input-example-${i}`}
              />
            </FieldGroup>
          ))}
        </SubStepShell>
      )}

      {sub === "emotions" && (
        <SubStepShell icon={Sun} heading="Best-State Emotions" subtext="What 1-3 emotions are you feeling when you're at your best?">
          <div className="flex flex-wrap gap-2">
            {BEST_STATE_EMOTIONS.map(e => {
              const selected = bestEmotions.includes(e);
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => toggleEmotion(e)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[44px] min-w-[44px] ${
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  } ${!selected && bestEmotions.length >= 3 ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                  disabled={!selected && bestEmotions.length >= 3}
                  data-testid={`emotion-${e}`}
                >
                  {e}
                </button>
              );
            })}
          </div>
        </SubStepShell>
      )}

      {sub === "environments" && (
        <SubStepShell icon={Eye} heading="Best-State Environment" subtext="What behaviors, environments, or situations create those emotions?">
          {environments.map((env, i) => (
            <FieldGroup key={i} label={`Environment ${i + 1}`}>
              <Input
                value={env}
                onChange={e => updateEnvironment(i, e.target.value)}
                placeholder="Specific behavior, place, or routine..."
                data-testid={`input-environment-${i}`}
              />
            </FieldGroup>
          ))}
        </SubStepShell>
      )}

      {sub === "shadow2ask" && (
        <SubStepShell icon={Shield} heading="Shadow Pattern" subtext="Is there a clear opposite — a behavior that pulls you out of your best state?">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setWantsShadow2(true); }}
              className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all min-h-[48px] ${
                wantsShadow2 === true ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50"
              }`}
              data-testid="shadow2-yes"
            >
              Yes, map it
            </button>
            <button
              type="button"
              onClick={() => { setWantsShadow2(false); }}
              className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all min-h-[48px] ${
                wantsShadow2 === false ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50"
              }`}
              data-testid="shadow2-no"
            >
              Skip for now
            </button>
          </div>
        </SubStepShell>
      )}

      </motion.div>
      </AnimatePresence>

      {/* Sub-step navigation */}
      <div className="flex items-center justify-between pt-2 sticky bottom-0 bg-background/95 backdrop-blur-sm pb-4">
        <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={subBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button size="sm" className="min-h-[44px]" disabled={!canNext || saving} onClick={subNext}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
          {(sub === "shadow2ask" && !wantsShadow2) ? (saving ? "Saving..." : "Complete Step 3") : <>Next <ArrowRight className="h-4 w-4 ml-1" /></>}
        </Button>
      </div>
    </div>
  );
}

// --- Step 4: First Goal Sprint (simplified for batch 1) ---

function GoalSprintStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { toast } = useToast();
  const [sprintName, setSprintName] = useState("");
  const [goalStatement, setGoalStatement] = useState("");
  const [durationDays, setDurationDays] = useState(30);
  const [saving, setSaving] = useState(false);

  const { data: existingSprint, isLoading } = useQuery<any>({ queryKey: ["/api/goal-sprint"] });

  useEffect(() => {
    if (existingSprint) {
      setSprintName(existingSprint.sprintName || "");
      setGoalStatement(existingSprint.goalStatement || "");
    }
  }, [existingSprint]);

  const handleNext = async () => {
    if (!sprintName.trim() || !goalStatement.trim()) {
      toast({ title: "Required", description: "Sprint name and goal are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const endDate = format(addDays(new Date(), durationDays), "yyyy-MM-dd");

      await apiRequest("POST", "/api/goal-sprint", {
        sprintName: sprintName.trim(),
        goalStatement: goalStatement.trim(),
        startDate: existingSprint?.startDate || today,
        endDate: existingSprint?.endDate || endDate,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/goal-sprint"] });
      onNext();
    } catch (error: any) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <StepLoader />;

  return (
    <StepShell heading="Your First Goal Sprint" subtext={`A focused ${durationDays}-day commitment cycle.`} onBack={onBack} onNext={handleNext} saving={saving}>
      <div className="space-y-4">
        <FieldGroup label="Sprint Name">
          <Input
            value={sprintName}
            onChange={e => setSprintName(e.target.value)}
            placeholder="e.g. Launch running habit, Ship side project..."
            data-testid="input-sprint-name"
          />
        </FieldGroup>
        <FieldGroup label="Goal">
          <Textarea
            value={goalStatement}
            onChange={e => setGoalStatement(e.target.value)}
            placeholder="What are you working toward in this sprint?"
            rows={3}
            data-testid="input-goal-statement"
          />
        </FieldGroup>
        <FieldGroup label={`Duration: ${durationDays} days`}>
          <input
            type="range"
            min={10}
            max={31}
            value={durationDays}
            onChange={e => setDurationDays(Number(e.target.value))}
            className="w-full h-10 accent-primary"
            data-testid="input-duration"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>10 days</span>
            <span>31 days</span>
          </div>
        </FieldGroup>
      </div>
    </StepShell>
  );
}

// --- Step 5: First Weekly Plan (simplified placeholder for batch 1) ---

function WeeklyPlanStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      </div>
      <div className="space-y-4 text-center py-8">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Calendar className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-base font-medium">Weekly Planning</h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Your weekly planning ritual will be available from the Week tab. Each week, you'll sort your tasks into Handle, Protect, and Not This Week.
        </p>
      </div>
      <Button onClick={onNext} className="w-full" size="lg" data-testid="button-next">
        Continue <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

// --- Step 6: First Morning Proof (simplified for batch 1) ---

function MorningProofStep({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const { toast } = useToast();
  const [proofMove, setProofMove] = useState("");
  const [intention, setIntention] = useState("");
  const [saving, setSaving] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: identityDoc } = useQuery<any>({ queryKey: ["/api/identity-document"] });

  const values = (() => {
    try {
      const parsed = JSON.parse(identityDoc?.values || "[]");
      if (Array.isArray(parsed)) return parsed.filter((v: any) => v.value?.trim());
    } catch { /* ignore */ }
    return [];
  })();

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const todayValue = values.length > 0 ? values[dayOfYear % values.length] : null;

  const handleComplete = async () => {
    setSaving(true);
    try {
      await apiRequest("POST", "/api/journals", {
        date: today,
        session: "morning",
        proofMove: proofMove.trim() || null,
        intentions: intention.trim() || null,
        selectedValueKey: todayValue ? `value-${values.indexOf(todayValue)}` : null,
        selectedValueLabel: todayValue?.value || null,
        selectedValueWhySnapshot: todayValue?.why || null,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/journals"] });
      await onComplete();
    } catch (error: any) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      </div>
      <div className="space-y-2 text-center">
        <h2 className="text-base font-medium" data-testid="text-step-heading">Your First Morning Proof</h2>
        <p className="text-muted-foreground" data-testid="text-step-subtext">Start your daily practice right now.</p>
      </div>

      {todayValue && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Today's value</p>
            <p className="text-sm font-medium">{todayValue.value}</p>
            {todayValue.why && <p className="text-xs text-muted-foreground mt-1">{todayValue.why}</p>}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <FieldGroup label="Proof Move">
          <Textarea
            placeholder="What is the one thing you'll do today to prove who you're becoming?"
            value={proofMove}
            onChange={(e) => setProofMove(e.target.value)}
            rows={3}
            data-testid="input-proof-move"
          />
        </FieldGroup>
        <FieldGroup label="Intention">
          <Textarea
            placeholder="What is your intention for today?"
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            rows={3}
            data-testid="input-intention"
          />
        </FieldGroup>
      </div>
      <Button onClick={handleComplete} disabled={saving} className="w-full" size="lg" data-testid="button-complete-setup">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
        Complete Setup
      </Button>
    </div>
  );
}

// --- Shared components ---

function StepShell({ heading, subtext, onBack, onNext, saving, children }: {
  heading: string; subtext: string; onBack: () => void; onNext: () => void; saving: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      </div>
      <div className="space-y-2 text-center">
        <h2 className="text-base font-medium" data-testid="text-step-heading">{heading}</h2>
        <p className="text-muted-foreground" data-testid="text-step-subtext">{subtext}</p>
      </div>
      {children}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm pt-2 pb-4">
        <Button onClick={onNext} disabled={saving} className="w-full" size="lg" data-testid="button-next">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
          {saving ? "Saving..." : "Next"}
        </Button>
      </div>
    </div>
  );
}

function SubStepShell({ icon: Icon, heading, subtext, children }: {
  icon: React.ElementType; heading: string; subtext: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-base font-medium">{heading}</h2>
        <p className="text-sm text-muted-foreground">{subtext}</p>
      </div>
      {children}
    </div>
  );
}

function SubStepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex justify-center gap-1.5 mb-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === current ? "w-6 bg-primary" : i < current ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function StepLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
