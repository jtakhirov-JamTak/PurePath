import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { VoiceTextarea } from "@/components/voice-input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ArrowRight, ArrowLeft, Check, Sparkles, Crosshair, Eye, Timer } from "lucide-react";
import type { MonthlyGoal } from "@shared/schema";

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

interface WizardStep {
  title: string;
  part: 1 | 2;
  content: string;
  fields?: { label: string; key: string; type?: string; placeholder?: string }[];
  visualization?: { prompt: string; seconds: number };
}

const STEPS: WizardStep[] = [
  {
    title: "Do You Have a Goal?",
    part: 1,
    content: "Ask yourself: Do you have a goal? How precise is it? If the goal is vague, you are not serious. Precision creates direction; vagueness creates drift.",
  },
  {
    title: "Know Your Strengths",
    part: 1,
    content: "Ask yourself: What am I already good at? What do people consistently compliment me on? What do they notice without being prompted? If others struggle with something that you handle naturally \u2014 that\u2019s a signal. This is your competitive advantage. Put time and energy where you outperform others with the same effort.",
    fields: [
      { label: "What am I already good at?", key: "strengths" },
      { label: "How can I use that to my advantage?", key: "advantage" },
    ],
  },
  {
    title: "Select One Goal, Precisely Defined",
    part: 1,
    content: "Be focused on one goal. Divided attention kills momentum. Get brutally precise. A real goal answers what, when, where, and how.",
    fields: [
      { label: "What?", key: "goalWhat" },
      { label: "When?", key: "goalWhen" },
      { label: "Where?", key: "goalWhere" },
      { label: "How?", key: "goalHow" },
    ],
  },
  {
    title: "Time Horizon",
    part: 1,
    content: "Use one-month goals. One month is concrete, imaginable, and forces focus. Review daily. Rewrite the goal. Keep a visual cue. Repetition sustains urgency and excitement.",
    fields: [
      { label: "Deadline", key: "deadline", type: "date" },
    ],
  },
  {
    title: "Success Proof",
    part: 1,
    content: "Make your goal observable. If a stranger saw it, they\u2019d agree it\u2019s real. Vague outcomes feel good but produce nothing. Define proof that is undeniable, measurable, and tied to a weekly behavior you control.",
    fields: [
      { label: "The clearest proof of me achieving my goal is...", key: "successProof", placeholder: "Observable proof \u2014 if a stranger saw it, they\u2019d agree it\u2019s real" },
      { label: "Metric (how measured)", key: "proofMetric", placeholder: "How will you measure this?" },
      { label: "Weekly behavior that would cause it", key: "weeklyBehavior", placeholder: "What weekly action drives this result?" },
    ],
  },
  {
    title: "Best Result",
    part: 1,
    content: "If I achieve this proof point, the best result is what? Connecting your goal to a vivid, emotional outcome fuels motivation. Take a moment to truly feel what success looks like.",
    fields: [
      { label: "If I achieve this proof point, the best result is...", key: "bestResult", placeholder: "Describe the best possible outcome vividly" },
    ],
    visualization: {
      prompt: "Pause, close your eyes and imagine it vividly.",
      seconds: 15,
    },
  },
  {
    title: "Inner Obstacle",
    part: 1,
    content: "Now identify the inner obstacle \u2014 not external. Not bad luck, other people, or circumstances. The thing inside you that will get in the way. Be honest. Visualize the exact real moment it happens.",
    fields: [
      { label: "The main thing inside me that will block this is...", key: "innerObstacle", placeholder: "Name the inner obstacle (not external)" },
      { label: "Trigger (situation that activates it)", key: "obstacleTrigger", placeholder: "What specific situation triggers this?" },
      { label: "Thought (what I tell myself)", key: "obstacleThought", placeholder: "What thought runs through my mind?" },
      { label: "Emotion (what I feel)", key: "obstacleEmotion", placeholder: "What emotion comes up?" },
      { label: "Behavior (what I do)", key: "obstacleBehavior", placeholder: "What do I end up doing?" },
    ],
  },
  {
    title: "Implementation Plans",
    part: 1,
    content: "Write 2 plans to address your inner obstacle. Use the IF-THEN format: IF a specific trigger happens, THEN you will do a small, immediate action. Small beats big. Immediate beats delayed.",
    fields: [
      { label: "Plan 1: IF... THEN...", key: "ifThenPlan1", placeholder: "IF (specific trigger happens) THEN (I will do a small, immediate action)" },
      { label: "Plan 2: IF... THEN...", key: "ifThenPlan2", placeholder: "IF (specific trigger happens) THEN (I will do a small, immediate action)" },
    ],
  },
  {
    title: "Direction Over Perfection",
    part: 1,
    content: "The wrong goal is better than no goal. You must be on your way somewhere \u2014 even if the destination is imperfect. Goals are guidance systems. They provide direction, momentum and meaning. Even the wrong goal builds skills, reveals insights, and creates new connections. Action always pays.",
  },
  {
    title: "Purify Your Mind",
    part: 2,
    content: "Remove false narratives that you have about yourself that are negative. Transform from being problem-focused to solution-focused.",
  },
  {
    title: "You Deserve to Be Happy",
    part: 2,
    content: "Happiness requires the fundamental layer of self-love. Self-love shows up in choices. You don\u2019t chase goals you don\u2019t believe you deserve. Avoiding pursuit of the life you want usually reflects low self-belief or an internal block. Self-honesty and discipline are the clearest expressions of self-love. Honest assessment of yourself hurts briefly, then unlocks clarity. Discipline is an act of service to yourself and proof that you care about yourself.",
    fields: [
      { label: "What do I value?", key: "value" },
    ],
  },
  {
    title: "Stay Humble",
    part: 2,
    content: "Keep your ego balanced, so that you have enough humility to listen and learn from others, while also having enough confidence to act.",
  },
  {
    title: "Enjoy the Process",
    part: 2,
    content: "Happiness lives in the pursuit, not arrival. Ask yourself: How can I have fun with this? Set a prize for achieving your goal. A prize you desire \u2014 trips, experiences, purchases \u2014 gets you out of bed.",
    fields: [
      { label: "Prize", key: "prize" },
      { label: "How can I have fun with this?", key: "fun" },
    ],
  },
  {
    title: "A Journey of a Thousand Miles",
    part: 2,
    content: "Thinking delays momentum and disguises fear as intelligence. Once the goal is set, action beats planning. Progress is a chain of actions. Ask yourself: What\u2019s the next concrete step? Assign the step and execute it.",
  },
  {
    title: "Habits: The Hidden Drivers",
    part: 2,
    content: "Habits aren\u2019t accidents \u2014 they define who you are. When someone is truly pursuing a goal, it\u2019s unmistakable. It shows in their words, actions, and habits. Everything aligns.",
  },
];

const TOTAL_STEPS = STEPS.length;

function VisualizationTimer({ prompt, seconds }: { prompt: string; seconds: number }) {
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    if (!running || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [running, timeLeft]);

  useEffect(() => {
    if (timeLeft <= 0 && running) setRunning(false);
  }, [timeLeft, running]);

  const reset = () => { setRunning(false); setTimeLeft(seconds); };

  return (
    <Card className="overflow-visible border-dashed">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          <Eye className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium mb-3">{prompt}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span className="text-lg font-mono tabular-nums">{timeLeft}s</span>
              </div>
              {!running && timeLeft === seconds && (
                <Button size="sm" variant="outline" onClick={() => setRunning(true)} data-testid="button-viz-start">
                  Start
                </Button>
              )}
              {running && (
                <Button size="sm" variant="outline" onClick={() => setRunning(false)} data-testid="button-viz-pause">
                  Pause
                </Button>
              )}
              {!running && timeLeft < seconds && timeLeft > 0 && (
                <Button size="sm" variant="outline" onClick={() => setRunning(true)} data-testid="button-viz-resume">
                  Resume
                </Button>
              )}
              {timeLeft <= 0 && (
                <Badge variant="secondary" className="no-default-active-elevate">Done</Badge>
              )}
              {timeLeft < seconds && (
                <Button size="sm" variant="ghost" onClick={reset} data-testid="button-viz-reset">
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GoalWizardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const monthKey = getCurrentMonthKey();

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

  const fieldState: Record<string, { value: string; setter: (v: string) => void }> = {
    value: { value, setter: setValue },
    strengths: { value: strengths, setter: setStrengths },
    advantage: { value: advantage, setter: setAdvantage },
    goalWhat: { value: goalWhat, setter: setGoalWhat },
    goalWhen: { value: goalWhen, setter: setGoalWhen },
    goalWhere: { value: goalWhere, setter: setGoalWhere },
    goalHow: { value: goalHow, setter: setGoalHow },
    blockingHabit: { value: blockingHabit, setter: setBlockingHabit },
    habitAddress: { value: habitAddress, setter: setHabitAddress },
    prize: { value: prize, setter: setPrize },
    fun: { value: fun, setter: setFun },
    deadline: { value: deadline, setter: setDeadline },
    successProof: { value: successProof, setter: setSuccessProof },
    proofMetric: { value: proofMetric, setter: setProofMetric },
    weeklyBehavior: { value: weeklyBehavior, setter: setWeeklyBehavior },
    bestResult: { value: bestResult, setter: setBestResult },
    innerObstacle: { value: innerObstacle, setter: setInnerObstacle },
    obstacleTrigger: { value: obstacleTrigger, setter: setObstacleTrigger },
    obstacleThought: { value: obstacleThought, setter: setObstacleThought },
    obstacleEmotion: { value: obstacleEmotion, setter: setObstacleEmotion },
    obstacleBehavior: { value: obstacleBehavior, setter: setObstacleBehavior },
    ifThenPlan1: { value: ifThenPlan1, setter: setIfThenPlan1 },
    ifThenPlan2: { value: ifThenPlan2, setter: setIfThenPlan2 },
  };

  const { data: goal } = useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal", monthKey],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-goal?month=${monthKey}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user,
  });

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
        blockingHabit: blockingHabit.trim(),
        habitAddress: habitAddress.trim(),
        prize: prize.trim(),
        fun: fun.trim(),
        deadline: deadline.trim(),
        goalStatement: goalWhat.trim(),
        successMarker: "",
        why: "",
        nextConcreteStep: "",
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
      toast({ title: "Goal saved", description: "Your goal has been saved successfully." });
      setLocation("/dashboard");
    },
    onError: () => {
      toast({ title: "Error", description: "Could not save. Please try again.", variant: "destructive" });
    },
  });

  const currentStep = STEPS[step];
  const isLastStep = step === TOTAL_STEPS - 1;
  const progressPercent = ((step + 1) / TOTAL_STEPS) * 100;

  const isNextDisabled = () => {
    if (!currentStep.fields) return false;
    return currentStep.fields.some((f) => !fieldState[f.key].value.trim());
  };

  const partLabel = currentStep.part === 1 ? "Part 1: Setting the Goal" : "Part 2: The Right Mindset";
  const PartIcon = currentStep.part === 1 ? Crosshair : Sparkles;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <Badge variant="secondary" className="no-default-active-elevate">
              <PartIcon className="h-3 w-3 mr-1" />
              {partLabel}
            </Badge>
            <span className="text-sm text-muted-foreground" data-testid="text-wizard-step">
              Step {step + 1} of {TOTAL_STEPS}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <h1 className="font-serif text-3xl font-bold mb-6" data-testid="text-wizard-title">
          {currentStep.title}
        </h1>

        <Card className="overflow-visible mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-base text-muted-foreground">Teaching</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{currentStep.content}</p>
          </CardContent>
        </Card>

        {currentStep.fields && (
          <div className="space-y-5 mb-6">
            {currentStep.fields.map((field) => {
              const fs = fieldState[field.key];
              return (
                <div key={field.key} className="space-y-2">
                  <Label className="text-sm font-medium">{field.label}</Label>
                  {field.type === "date" ? (
                    <Input
                      type="date"
                      value={fs.value}
                      onChange={(e) => fs.setter(e.target.value)}
                      data-testid={`input-wizard-${field.key}`}
                    />
                  ) : (
                    <VoiceTextarea
                      value={fs.value}
                      onChange={(val) => fs.setter(val)}
                      placeholder={field.placeholder || "Enter your answer..."}
                      className="min-h-[70px] text-base"
                      data-testid={`input-wizard-${field.key}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {currentStep.visualization && (
          <div className="mb-8">
            <VisualizationTimer
              prompt={currentStep.visualization.prompt}
              seconds={currentStep.visualization.seconds}
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          {step > 0 ? (
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              data-testid="button-wizard-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {isLastStep ? (
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              data-testid="button-wizard-complete"
            >
              <Check className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Complete"}
            </Button>
          ) : (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={isNextDisabled()}
              data-testid="button-wizard-next"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
