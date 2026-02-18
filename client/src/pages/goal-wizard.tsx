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
import { ArrowRight, ArrowLeft, Check, Sparkles, Crosshair } from "lucide-react";
import type { MonthlyGoal } from "@shared/schema";

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

interface WizardStep {
  title: string;
  part: 1 | 2;
  content: string;
  fields?: { label: string; key: string; type?: string }[];
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
    title: "Goals Eliminate Problems",
    part: 1,
    content: "Pursuing what you want often removes what you don\u2019t. Goals dissolve irrelevant problems. Not every problem deserves attention. Ask one question: Does this block my goal? If not, ignore it and move forward.",
    fields: [
      { label: "What habit is blocking my goal?", key: "blockingHabit" },
      { label: "How can I address it?", key: "habitAddress" },
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
          <div className="space-y-5 mb-8">
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
                      placeholder={`Enter your answer...`}
                      className="min-h-[70px] text-base"
                      data-testid={`input-wizard-${field.key}`}
                    />
                  )}
                </div>
              );
            })}
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
