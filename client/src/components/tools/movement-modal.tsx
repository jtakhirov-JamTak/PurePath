import { useState } from "react";
import { ExerciseModal } from "@/components/exercise-modal";
import { useMoodTracking } from "@/hooks/use-mood-tracking";
import { useTimer, formatTime } from "@/hooks/use-timer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity, Footprints, Target, ArrowRight,
  Play, Pause, RotateCcw, Plus,
} from "lucide-react";

const MOVEMENT_OPTIONS = [
  { label: "5-minute walk", type: "timer" as const, duration: 300, icon: Footprints },
  { label: "20 air squats", type: "counter" as const, target: 20, icon: Activity },
  { label: "20 jumping jacks", type: "counter" as const, target: 20, icon: Activity },
  { label: "Make your bed", type: "timer" as const, duration: 120, icon: Target },
  { label: "5-minute errand", type: "timer" as const, duration: 300, icon: ArrowRight },
];

export function MovementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const timer = useTimer(300);
  const [selected, setSelected] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const mood = useMoodTracking("Micro Movement");

  const handleClose = () => {
    timer.setDuration(300);
    setSelected(null);
    setCount(0);
    onClose();
  };

  const selectOption = (idx: number) => {
    const opt = MOVEMENT_OPTIONS[idx];
    setSelected(idx);
    setCount(0);
    if (opt.type === "timer") {
      timer.setDuration(opt.duration);
      setTimeout(() => timer.start(), 50);
    }
  };

  const option = selected !== null ? MOVEMENT_OPTIONS[selected] : null;
  const counterDone = option?.type === "counter" && count >= (option.target || 0);

  return (
    <ExerciseModal
      open={open}
      onClose={handleClose}
      mood={mood}
      title="Micro Movement"
      icon={<Activity className="h-5 w-5 text-emerald-500" />}
      testId="modal-movement"
    >
      <div className="space-y-4">
        {selected === null ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center mb-3">Tap to start immediately</p>
            {MOVEMENT_OPTIONS.map((opt, idx) => {
              const Icon = opt.icon;
              return (
                <Button
                  key={idx}
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={() => selectOption(idx)}
                  data-testid={`button-movement-option-${idx}`}
                >
                  <Icon className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-sm">{opt.label}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {opt.type === "timer" ? formatTime(opt.duration) : `${opt.target} reps`}
                  </Badge>
                </Button>
              );
            })}
          </div>
        ) : option?.type === "timer" ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm font-medium">{option.label}</p>
            <div className="relative h-28 w-28">
              <svg className="h-28 w-28 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
                <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6"
                  className="text-emerald-500 transition-all duration-1000"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - timer.progress / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-mono font-bold" data-testid="text-movement-timer">{formatTime(timer.seconds)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!timer.isRunning ? (
                <Button onClick={timer.start} disabled={timer.seconds === 0} data-testid="button-movement-start">
                  <Play className="h-4 w-4 mr-1" />
                  {timer.isComplete ? "Done" : "Start"}
                </Button>
              ) : (
                <Button variant="outline" onClick={timer.pause} data-testid="button-movement-pause">
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={timer.reset} data-testid="button-movement-reset">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            {timer.isComplete && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Well done!</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm font-medium">{option?.label}</p>
            <div className="text-center">
              <span className="text-5xl font-mono font-bold" data-testid="text-movement-counter">{count}</span>
              <span className="text-lg text-muted-foreground">/{option?.target}</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="lg"
                onClick={() => setCount(c => Math.min(c + 1, option?.target || 20))}
                disabled={counterDone}
                data-testid="button-movement-increment"
              >
                <Plus className="h-5 w-5 mr-1" />
                Count
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setCount(0)} data-testid="button-movement-count-reset">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            {counterDone && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Well done!</p>
            )}
          </div>
        )}

        <div className="flex justify-between items-center gap-2">
          {selected !== null && (
            <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setCount(0); timer.reset(); }} data-testid="button-movement-back">
              Back
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (selected !== null && (timer.isComplete || counterDone)) {
                mood.finishExercise();
              } else {
                handleClose();
              }
            }}
            className="ml-auto"
            data-testid="button-movement-close"
          >
            {selected !== null && (timer.isComplete || counterDone) ? "Finish" : "Close"}
          </Button>
        </div>
      </div>
    </ExerciseModal>
  );
}
