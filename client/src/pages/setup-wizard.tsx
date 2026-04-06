import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { buildIdentityDocPayload } from "@/lib/identity-helpers";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ArrowRight, Check, Sparkles, User, Target, Repeat, BookOpen } from "lucide-react";

const STEP_TITLES = [
  "Discovery Profile",
  "Identity Document",
  "Monthly Goal",
  "Starter Habits",
  "First Morning Journal",
];

const STEP_ICONS = [User, Sparkles, Target, Repeat, BookOpen];

interface HabitEntry {
  name: string;
}

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
      await apiRequest("PATCH", "/api/onboarding", { step: 5 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
      navigate("/dashboard");
    },
    onError: () => {
      toast({ title: "Could not skip setup", description: "Please try again.", variant: "destructive" });
    },
  });

  const goToStep = async (s: number) => {
    if (s > 0) {
      await updateOnboarding.mutateAsync(s);
    }
    setCurrentStep(s);
  };

  const advanceStep = async (nextStep: number) => {
    await updateOnboarding.mutateAsync(nextStep);
    setCurrentStep(nextStep);
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
      <div className="max-w-2xl mx-auto px-4 py-8">
        {step > 0 && step <= 5 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Step {step} of 5</span>
              <span className="text-sm text-muted-foreground">{STEP_TITLES[step - 1]}</span>
            </div>
            <Progress value={(step / 5) * 100} className="h-2" data-testid="progress-bar" />
          </div>
        )}

        {step === 0 && <WelcomeStep onBegin={() => goToStep(1)} onSkip={() => skipSetup.mutate()} isSkipping={skipSetup.isPending} />}
        {step === 1 && <DiscoveryStep onNext={() => advanceStep(2)} onBack={() => goToStep(0)} />}
        {step === 2 && <IdentityStep onNext={() => advanceStep(3)} onBack={() => goToStep(1)} />}
        {step === 3 && <MonthlyGoalStep onNext={() => advanceStep(4)} onBack={() => goToStep(2)} />}
        {step === 4 && <HabitsStep onNext={() => advanceStep(5)} onBack={() => goToStep(3)} />}
        {step === 5 && <JournalStep onComplete={async () => {
          await updateOnboarding.mutateAsync(5);
          navigate("/dashboard");
        }} onBack={() => goToStep(4)} />}
      </div>
    </AppLayout>
  );
}

function WelcomeStep({ onBegin, onSkip, isSkipping }: { onBegin: () => void; onSkip: () => void; isSkipping: boolean }) {
  return (
    <div className="text-center space-y-8 py-12">
      <div className="space-y-3">
        <h1 className="text-lg font-medium" data-testid="text-welcome-heading">Welcome to Proof Arc</h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto" data-testid="text-welcome-subtext">
          Let's set up your daily system using what you created in the workshop. This takes about 10 minutes.
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
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
            data-testid="link-skip-setup"
          >
            {isSkipping ? "Skipping..." : "Skip setup"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DiscoveryStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { toast } = useToast();
  const [values, setValues] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: existing, isLoading } = useQuery<any>({
    queryKey: ["/api/identity-document"],
  });

  useEffect(() => {
    if (existing) {
      setValues(existing.values || "");
    }
  }, [existing]);

  const save = async () => {
    setSaving(true);
    try {
      await apiRequest("PUT", "/api/identity-document", buildIdentityDocPayload(existing, {
        values,
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] });
      return true;
    } catch (error: any) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const saved = await save();
    if (saved) onNext();
  };

  if (isLoading) {
    return <StepLoader />;
  }

  return (
    <StepShell
      heading="Your Values"
      subtext="Enter what you discovered in the workshop."
      onBack={onBack}
      onNext={handleNext}
      saving={saving}
    >
      <div className="space-y-4">
        <FieldGroup label="Core Values">
          <Textarea
            placeholder="Your 2 core values and 1 aspirational value, with reasons"
            value={values}
            onChange={(e) => setValues(e.target.value)}
            rows={4}
            data-testid="input-core-values"
          />
        </FieldGroup>
        <p className="text-xs text-muted-foreground italic">
          Patterns and strengths can be added on your Pattern Profile after setup.
        </p>
      </div>
    </StepShell>
  );
}

function IdentityStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { toast } = useToast();
  const [vision, setVision] = useState("");
  const [identityStatement, setIdentityStatement] = useState("");
  const [relational, setRelational] = useState("");
  const [purpose, setPurpose] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: existing, isLoading } = useQuery<any>({
    queryKey: ["/api/identity-document"],
  });

  useEffect(() => {
    if (existing) {
      setVision(existing.vision || "");
      setIdentityStatement(existing.identity || "");
      setRelational(existing.othersWillSee || "");
      setPurpose(existing.purpose || "");
    }
  }, [existing]);

  const save = async () => {
    setSaving(true);
    try {
      await apiRequest("PUT", "/api/identity-document", {
        vision,
        identity: identityStatement,
        othersWillSee: relational,
        purpose,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] });
      return true;
    } catch (error: any) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const saved = await save();
    if (saved) onNext();
  };

  if (isLoading) {
    return <StepLoader />;
  }

  return (
    <StepShell
      heading="Your Identity Document"
      subtext="Who you're choosing to become — from the workshop."
      onBack={onBack}
      onNext={handleNext}
      saving={saving}
    >
      <div className="space-y-4">
        <FieldGroup label="Vision">
          <Textarea
            placeholder="Your 5-year vision"
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            rows={3}
            data-testid="input-vision"
          />
        </FieldGroup>
        <FieldGroup label="Identity Statement">
          <Textarea
            placeholder="Who you're choosing to become in 1-2 sentences"
            value={identityStatement}
            onChange={(e) => setIdentityStatement(e.target.value)}
            rows={2}
            data-testid="input-identity-statement"
          />
        </FieldGroup>
        <FieldGroup label="Relational Intention">
          <Textarea
            placeholder="How you want others to experience you"
            value={relational}
            onChange={(e) => setRelational(e.target.value)}
            rows={2}
            data-testid="input-relational"
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

function MonthlyGoalStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { toast } = useToast();
  const monthKey = format(new Date(), "yyyy-MM");
  const [goalStatement, setGoalStatement] = useState("");
  const [why, setWhy] = useState("");
  const [weeklyBehavior, setWeeklyBehavior] = useState("");
  const [innerObstacle, setInnerObstacle] = useState("");
  const [ifThenPlan1, setIfThenPlan1] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: existing, isLoading } = useQuery<any>({
    queryKey: ["/api/monthly-goal"],
  });

  useEffect(() => {
    if (existing) {
      setGoalStatement(existing.goalStatement || "");
      setWhy(existing.why || "");
      setWeeklyBehavior(existing.weeklyBehavior || "");
      setInnerObstacle(existing.innerObstacle || "");
      setIfThenPlan1(existing.ifThenPlan1 || "");
    }
  }, [existing]);

  const save = async () => {
    setSaving(true);
    try {
      await apiRequest("PUT", "/api/monthly-goal", {
        monthKey,
        goalStatement,
        why,
        weeklyBehavior,
        innerObstacle,
        ifThenPlan1,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-goal"] });
      return true;
    } catch (error: any) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const saved = await save();
    if (saved) onNext();
  };

  if (isLoading) {
    return <StepLoader />;
  }

  return (
    <StepShell
      heading="Your First Monthly Goal"
      subtext="The goal you set in the workshop. You can refine it later."
      onBack={onBack}
      onNext={handleNext}
      saving={saving}
    >
      <div className="space-y-4">
        <FieldGroup label="Goal">
          <Textarea
            placeholder="What are you working toward this month?"
            value={goalStatement}
            onChange={(e) => setGoalStatement(e.target.value)}
            rows={2}
            data-testid="input-goal-statement"
          />
        </FieldGroup>
        <FieldGroup label="Why it matters">
          <Textarea
            placeholder="Why is this important to you?"
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            rows={2}
            data-testid="input-why"
          />
        </FieldGroup>
        <FieldGroup label="Weekly behavior">
          <Textarea
            placeholder="What will you do each week to make progress?"
            value={weeklyBehavior}
            onChange={(e) => setWeeklyBehavior(e.target.value)}
            rows={2}
            data-testid="input-weekly-behavior"
          />
        </FieldGroup>
        <FieldGroup label="Inner obstacle">
          <Textarea
            placeholder="What inside you might block this?"
            value={innerObstacle}
            onChange={(e) => setInnerObstacle(e.target.value)}
            rows={2}
            data-testid="input-inner-obstacle"
          />
        </FieldGroup>
        <FieldGroup label="IF-THEN plan">
          <Textarea
            placeholder="IF [trigger] THEN [small action]"
            value={ifThenPlan1}
            onChange={(e) => setIfThenPlan1(e.target.value)}
            rows={2}
            data-testid="input-if-then-plan"
          />
        </FieldGroup>
      </div>
    </StepShell>
  );
}

function HabitsStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { toast } = useToast();
  const [habits, setHabits] = useState<HabitEntry[]>([
    { name: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const { data: existingHabits } = useQuery<any[]>({
    queryKey: ["/api/habits"],
  });

  useEffect(() => {
    if (existingHabits && !hydrated) {
      const active = existingHabits.filter((h: any) => h.active);
      if (active.length > 0) {
        setHabits(active.slice(0, 3).map((h: any) => ({
          name: h.name,
        })));
      }
      setHydrated(true);
    }
  }, [existingHabits, hydrated]);

  const addHabit = () => {
    if (habits.length < 3) {
      setHabits([...habits, { name: "" }]);
    }
  };

  const updateHabit = (index: number, field: keyof HabitEntry, value: string) => {
    const updated = [...habits];
    updated[index] = { ...updated[index], [field]: value };
    setHabits(updated);
  };

  const removeHabit = (index: number) => {
    if (habits.length > 1) {
      setHabits(habits.filter((_, i) => i !== index));
    }
  };

  const save = async () => {
    const validHabits = habits.filter((h) => h.name.trim());
    if (validHabits.length === 0) {
      return true;
    }
    const existingNames = new Set(
      (existingHabits || []).filter((h: any) => h.active).map((h: any) => h.name.toLowerCase())
    );
    const newHabits = validHabits.filter((h) => !existingNames.has(h.name.trim().toLowerCase()));
    if (newHabits.length === 0) {
      return true;
    }
    setSaving(true);
    try {
      for (const habit of newHabits) {
        await apiRequest("POST", "/api/habits", {
          name: habit.name.trim(),
          timing: "afternoon",
          cadence: "mon,tue,wed,thu,fri,sat,sun",
          category: "health",
          startDate: format(new Date(), "yyyy-MM-dd"),
          isBinary: false,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      return true;
    } catch (error: any) {
      toast({ title: "Error saving habits", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const saved = await save();
    if (saved) onNext();
  };

  return (
    <StepShell
      heading="Your Starter Habits"
      subtext="Start with 2-3 habits aligned with your identity statement. You can add more later."
      onBack={onBack}
      onNext={handleNext}
      saving={saving}
    >
      <div className="space-y-4">
        {habits.map((habit, i) => (
          <Card key={i}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Habit {i + 1}</span>
                {habits.length > 1 && (
                  <button
                    onClick={() => removeHabit(i)}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    data-testid={`button-remove-habit-${i}`}
                  >
                    Remove
                  </button>
                )}
              </div>
              <Input
                placeholder="Habit name"
                value={habit.name}
                onChange={(e) => updateHabit(i, "name", e.target.value)}
                data-testid={`input-habit-name-${i}`}
              />
            </CardContent>
          </Card>
        ))}
        {habits.length < 3 && (
          <Button
            variant="outline"
            size="sm"
            onClick={addHabit}
            className="w-full"
            data-testid="button-add-habit"
          >
            Add another
          </Button>
        )}
      </div>
    </StepShell>
  );
}

function JournalStep({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const { toast } = useToast();
  const [gratitude, setGratitude] = useState("");
  const [intention, setIntention] = useState("");
  const [saving, setSaving] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const save = async () => {
    setSaving(true);
    try {
      await apiRequest("POST", "/api/journals", {
        date: today,
        session: "morning",
        gratitude,
        intentions: intention,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/journals"] });
      return true;
    } catch (error: any) {
      toast({ title: "Error saving journal", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    const saved = await save();
    if (saved) {
      await onComplete();
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </div>
      <div className="space-y-2 text-center">
        <h2 className="text-base font-medium" data-testid="text-step-heading">Your First Morning Journal</h2>
        <p className="text-muted-foreground" data-testid="text-step-subtext">Start your daily practice right now.</p>
      </div>
      <div className="space-y-4">
        <FieldGroup label="Gratitude">
          <Textarea
            placeholder="What are you grateful for today?"
            value={gratitude}
            onChange={(e) => setGratitude(e.target.value)}
            rows={3}
            data-testid="input-gratitude"
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

function StepShell({
  heading,
  subtext,
  onBack,
  onNext,
  saving,
  children,
}: {
  heading: string;
  subtext: string;
  onBack: () => void;
  onNext: () => void;
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </div>
      <div className="space-y-2 text-center">
        <h2 className="text-base font-medium" data-testid="text-step-heading">{heading}</h2>
        <p className="text-muted-foreground" data-testid="text-step-subtext">{subtext}</p>
      </div>
      {children}
      <Button onClick={onNext} disabled={saving} className="w-full" size="lg" data-testid="button-next">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
        {saving ? "Saving..." : "Next"}
      </Button>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
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
