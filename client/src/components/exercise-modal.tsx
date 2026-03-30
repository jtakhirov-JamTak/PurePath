import { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, ArrowRight, Frown, Meh, Smile, Laugh } from "lucide-react";
import type { MoodTrackingState } from "@/hooks/use-mood-tracking";

const MOOD_LEVELS = [
  { level: 1, icon: Frown, label: "Very Low", color: "text-red-500" },
  { level: 2, icon: Frown, label: "Low", color: "text-orange-500" },
  { level: 3, icon: Meh, label: "Neutral", color: "text-yellow-500" },
  { level: 4, icon: Smile, label: "Good", color: "text-lime-500" },
  { level: 5, icon: Laugh, label: "Great", color: "text-emerald-500" },
];

function MoodCheckIn({
  phase,
  mood,
  setMood,
  emotion,
  setEmotion,
  onContinue,
  saving = false,
}: {
  phase: "before" | "after";
  mood: number | null;
  setMood: (v: number) => void;
  emotion: string;
  setEmotion: (v: string) => void;
  onContinue: () => void;
  saving?: boolean;
}) {
  return (
    <div className="space-y-4" data-testid={`mood-checkin-${phase}`}>
      <p className="text-sm font-medium text-center">
        {phase === "before" ? "How are you feeling right now?" : "How do you feel after the exercise?"}
      </p>
      <div className="flex justify-center gap-3">
        {MOOD_LEVELS.map((m) => {
          const Icon = m.icon;
          const selected = mood === m.level;
          return (
            <button
              key={m.level}
              onClick={() => setMood(m.level)}
              className={`flex flex-col items-center gap-1 p-2 rounded-md transition-all ${
                selected ? "bg-primary/10 ring-2 ring-primary" : "hover-elevate"
              }`}
              data-testid={`mood-${phase}-${m.level}`}
            >
              <Icon className={`h-7 w-7 ${selected ? m.color : "text-muted-foreground"}`} />
              <span className={`text-[10px] ${selected ? "font-medium" : "text-muted-foreground"}`}>{m.label}</span>
            </button>
          );
        })}
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground text-center">Name one emotion you're feeling</p>
        <Input
          value={emotion}
          onChange={(e) => setEmotion(e.target.value)}
          placeholder="e.g. anxious, hopeful, drained..."
          className="text-center text-sm"
          data-testid={`input-emotion-${phase}`}
        />
        <div className="flex flex-wrap gap-1.5 justify-center">
          {(phase === "before"
            ? ["Anxious", "Sad", "Frustrated", "Overwhelmed", "Angry", "Numb"]
            : ["Calmer", "Lighter", "Hopeful", "Relieved", "Grounded", "Same"]
          ).map(e => (
            <Badge
              key={e}
              variant={emotion.toLowerCase() === e.toLowerCase() ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setEmotion(e)}
              data-testid={`badge-emotion-${phase}-${e.toLowerCase()}`}
            >
              {e}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={onContinue}
          disabled={!mood || !emotion.trim() || saving}
          data-testid={`button-mood-${phase}-continue`}
        >
          {saving ? "Saving..." : phase === "before" ? "Start Exercise" : "Done"}
          {!saving && <ArrowRight className="ml-1 h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
}

interface ExerciseModalProps {
  open: boolean;
  onClose: () => void;
  mood: MoodTrackingState;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  testId: string;
}

export function ExerciseModal({
  open,
  onClose,
  mood,
  title,
  icon,
  children,
  className = "sm:max-w-md",
  testId,
}: ExerciseModalProps) {
  const resetAndClose = () => {
    // Reset and close in the same batch — React 18 batches both state updates
    // so the dialog closes without flashing the "before" screen
    mood.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
      <DialogContent className={className} data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            {title}
          </DialogTitle>
        </DialogHeader>

        {mood.phase === "before" ? (
          <MoodCheckIn
            phase="before"
            mood={mood.moodBefore}
            setMood={mood.setMoodBefore}
            emotion={mood.emotionBefore}
            setEmotion={mood.setEmotionBefore}
            onContinue={mood.startExercise}
            saving={mood.saving}
          />
        ) : mood.phase === "done" ? (
          <div className="text-center space-y-3 py-4" data-testid="mood-done">
            <Check className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-medium">Exercise complete</p>
            <p className="text-xs text-muted-foreground">Your mood check-in has been saved.</p>
            <Button size="sm" onClick={resetAndClose} data-testid="button-mood-done-close">Close</Button>
          </div>
        ) : mood.phase === "after" ? (
          <MoodCheckIn
            phase="after"
            mood={mood.moodAfter}
            setMood={mood.setMoodAfter}
            emotion={mood.emotionAfter}
            setEmotion={mood.setEmotionAfter}
            onContinue={mood.completeTracking}
            saving={mood.saving}
          />
        ) : (
          children
        )}
      </DialogContent>
    </Dialog>
  );
}
