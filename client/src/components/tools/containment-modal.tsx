import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ExerciseModal } from "@/components/exercise-modal";
import { useMoodTracking } from "@/hooks/use-mood-tracking";
import { useTimer, formatTime } from "@/hooks/use-timer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Heart, ArrowRight, Play, Pause, RotateCcw, Plus,
} from "lucide-react";
import { format } from "date-fns";

const CONTAINMENT_STEPS = [
  { label: "FEEL", instruction: "Close your eyes. Notice where the emotion lives in your body - throat, chest, stomach, jaw. Don't push it away, just observe.", duration: 15 },
  { label: "LABEL", instruction: "Name the emotion using this sentence:", duration: 0 },
  { label: "REGULATE", instruction: "Take slow breaths. In through your nose (4 counts), hold (4 counts), out through your mouth (6 counts).", duration: 20 },
  { label: "MOVE", instruction: "Choose one small action to shift your state: stand up, stretch, drink water, or write one sentence.", duration: 0 },
];

function TimerCircle({ timer, color, testId }: { timer: ReturnType<typeof useTimer>; color: string; testId: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-24 w-24">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6"
            className={`${color} transition-all duration-1000`}
            strokeDasharray={`${2 * Math.PI * 54}`}
            strokeDashoffset={`${2 * Math.PI * 54 * (1 - timer.progress / 100)}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-mono font-bold" data-testid={testId}>{formatTime(timer.seconds)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!timer.isRunning ? (
          <Button size="sm" onClick={timer.start} disabled={timer.seconds === 0} data-testid={`${testId}-start`}>
            <Play className="h-4 w-4 mr-1" />
            {timer.isComplete ? "Done" : "Start"}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={timer.pause} data-testid={`${testId}-pause`}>
            <Pause className="h-4 w-4 mr-1" />
            Pause
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={timer.reset} data-testid={`${testId}-reset`}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => timer.addTime(15)} data-testid={`${testId}-add15`}>
          <Plus className="h-3 w-3 mr-1" />
          15s
        </Button>
      </div>
    </div>
  );
}

export function ContainmentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const timer = useTimer(CONTAINMENT_STEPS[0].duration);
  const [emotionName, setEmotionName] = useState("");
  const [becauseText, setBecauseText] = useState("");
  const [validationChip, setValidationChip] = useState<string>("");
  const [moveAction, setMoveAction] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();
  const mood = useMoodTracking("Containment");

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const addTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest("POST", "/api/tasks", {
        title, date: todayStr, time: format(new Date(), "HH:mm"),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to add task");
      }
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/tasks"] }); },
    onError: (error: Error) => {
      toast({ title: "Could not add task", description: error.message, variant: "destructive" });
    },
  });

  const currentStep = CONTAINMENT_STEPS[step];
  const isLastStep = step === CONTAINMENT_STEPS.length - 1;

  const canAdvance = () => {
    if (currentStep.duration > 0 && !timer.isComplete && timer.seconds > 0) return false;
    if (step === 1 && !emotionName) return false;
    return true;
  };

  const goNext = () => {
    if (isLastStep) {
      if (moveAction.trim()) addTaskMutation.mutate(moveAction.trim());
      mood.finishExercise();
      return;
    }
    const nextStep = step + 1;
    setStep(nextStep);
    const nextDuration = CONTAINMENT_STEPS[nextStep].duration;
    if (nextDuration > 0) timer.setDuration(nextDuration);
  };

  const handleClose = () => {
    setStep(0); setEmotionName(""); setBecauseText(""); setValidationChip(""); setMoveAction("");
    timer.setDuration(CONTAINMENT_STEPS[0].duration);
    onClose();
  };

  return (
    <ExerciseModal
      open={open}
      onClose={handleClose}
      mood={mood}
      title="Emotional Containment"
      icon={<Heart className="h-5 w-5 text-rose-500" />}
      testId="modal-containment"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          {CONTAINMENT_STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <div className="text-center space-y-3">
          <Badge variant="secondary" className="text-sm">{currentStep.label}</Badge>
          <p className="text-sm text-muted-foreground">{currentStep.instruction}</p>

          {currentStep.duration > 0 && (
            <TimerCircle timer={timer} color="text-primary" testId="text-containment-timer" />
          )}

          {step === 1 && (
            <div className="space-y-3 text-left">
              <div className="space-y-2">
                <Input
                  value={emotionName}
                  onChange={(e) => setEmotionName(e.target.value)}
                  placeholder="Type your emotion..."
                  className="text-center text-sm"
                  data-testid="input-emotion-name"
                />
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {["Angry", "Sad", "Anxious", "Frustrated", "Hurt", "Scared"].map(e => (
                    <Badge
                      key={e}
                      variant={emotionName.toLowerCase() === e.toLowerCase() ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => setEmotionName(e)}
                      data-testid={`badge-emotion-${e.toLowerCase()}`}
                    >
                      {e}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">Tap a suggestion or type your own</p>
              </div>
              {emotionName && (
                <div className="space-y-2 text-center">
                  <p className="text-sm font-medium">
                    "I feel <span className="text-primary">{emotionName.toLowerCase()}</span> because..."
                  </p>
                  <Textarea
                    value={becauseText}
                    onChange={(e) => setBecauseText(e.target.value)}
                    placeholder="...describe briefly what triggered this"
                    rows={2}
                    className="text-sm resize-none"
                    data-testid="input-because-text"
                  />
                  <Badge
                    variant={validationChip === "it makes sense" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setValidationChip(validationChip === "it makes sense" ? "" : "it makes sense")}
                    data-testid="badge-validation-it-makes-sense"
                  >
                    ...and it makes sense to feel this way
                  </Badge>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2">
              <Textarea
                value={moveAction}
                onChange={(e) => setMoveAction(e.target.value)}
                placeholder="What small action will you take?"
                rows={2}
                className="text-sm resize-none"
                data-testid="input-move-action"
              />
              <p className="text-xs text-muted-foreground">This will be added to today's tasks</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleClose} data-testid="button-containment-close">
            Close
          </Button>
          <Button size="sm" onClick={goNext} disabled={!canAdvance()} data-testid="button-containment-next">
            {isLastStep ? (moveAction.trim() ? "Add to Tasks & Done" : "Done") : "Next"}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>
    </ExerciseModal>
  );
}
