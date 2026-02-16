import { useState, useEffect, useCallback, useRef } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Wind, Activity, Play, Pause, RotateCcw, ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import type { LucideIcon } from "lucide-react";

interface TimerState {
  seconds: number;
  isRunning: boolean;
  totalSeconds: number;
}

function useTimer(defaultDuration: number) {
  const [state, setState] = useState<TimerState>({
    seconds: defaultDuration,
    isRunning: false,
    totalSeconds: defaultDuration,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state.isRunning && state.seconds > 0) {
      intervalRef.current = setInterval(() => {
        setState(prev => {
          if (prev.seconds <= 1) {
            return { ...prev, seconds: 0, isRunning: false };
          }
          return { ...prev, seconds: prev.seconds - 1 };
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isRunning, state.seconds]);

  const start = useCallback(() => setState(prev => ({ ...prev, isRunning: true })), []);
  const pause = useCallback(() => setState(prev => ({ ...prev, isRunning: false })), []);
  const reset = useCallback(() => setState(prev => ({ ...prev, seconds: prev.totalSeconds, isRunning: false })), []);
  const setDuration = useCallback((d: number) => setState({ seconds: d, isRunning: false, totalSeconds: d }), []);

  return { ...state, start, pause, reset, setDuration };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface RegulationCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  defaultDuration: number;
  durationOptions: number[];
  steps: string[];
  testIdPrefix: string;
}

function RegulationCard({ title, description, icon: Icon, iconColor, defaultDuration, durationOptions, steps, testIdPrefix }: RegulationCardProps) {
  const timer = useTimer(defaultDuration);
  const [expanded, setExpanded] = useState(false);
  const progress = timer.totalSeconds > 0 ? ((timer.totalSeconds - timer.seconds) / timer.totalSeconds) * 100 : 0;

  return (
    <Card className="overflow-visible" data-testid={`card-${testIdPrefix}`}>
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className={`h-12 w-12 rounded-lg ${iconColor} flex items-center justify-center shrink-0`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="font-serif text-lg">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Badge variant="outline" className="shrink-0">{formatTime(defaultDuration)}</Badge>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-5">
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-32 w-32">
              <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
                <circle
                  cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6"
                  className="text-primary transition-all duration-1000"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-mono font-bold" data-testid={`text-timer-${testIdPrefix}`}>
                  {formatTime(timer.seconds)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!timer.isRunning ? (
                <Button onClick={timer.start} disabled={timer.seconds === 0} data-testid={`button-start-${testIdPrefix}`}>
                  <Play className="h-4 w-4 mr-1" />
                  {timer.seconds === 0 ? "Done" : "Start"}
                </Button>
              ) : (
                <Button variant="outline" onClick={timer.pause} data-testid={`button-pause-${testIdPrefix}`}>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={timer.reset} data-testid={`button-reset-${testIdPrefix}`}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {durationOptions.map(d => (
                <Button
                  key={d}
                  variant={timer.totalSeconds === d ? "default" : "outline"}
                  size="sm"
                  onClick={() => timer.setDuration(d)}
                  data-testid={`button-duration-${testIdPrefix}-${d}`}
                >
                  {formatTime(d)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
                </div>
                <p className="text-sm text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function RegulationPage() {
  const [, setLocation] = useLocation();

  const tools: RegulationCardProps[] = [
    {
      title: "Emotional Containment",
      description: "Feel, name, regulate, move — process emotions in under 60 seconds",
      icon: Heart,
      iconColor: "bg-rose-500",
      defaultDuration: 60,
      durationOptions: [30, 60, 90],
      testIdPrefix: "emotional",
      steps: [
        "FEEL (10-20s) — Notice the emotion in your body. Throat, chest, jaw. Don't push it away.",
        "NAME (5s) — Label the emotion: angry, sad, anxious, frustrated, hurt.",
        "REGULATE (20-30s) — Take 3 slow breaths. In through your nose, out through your mouth.",
        "MOVE (10s) — Choose one small action: stand up, stretch, drink water, write one sentence.",
      ],
    },
    {
      title: "Breathwork",
      description: "Box breathing to calm your nervous system",
      icon: Wind,
      iconColor: "bg-sky-500",
      defaultDuration: 120,
      durationOptions: [60, 120, 300],
      testIdPrefix: "breathwork",
      steps: [
        "Breathe IN for 4 seconds — fill your lungs fully.",
        "HOLD for 4 seconds — stay still and present.",
        "Breathe OUT for 4 seconds — release slowly and completely.",
        "HOLD for 4 seconds — empty, quiet, reset.",
        "Repeat the cycle until the timer completes.",
      ],
    },
    {
      title: "Micro-Movement",
      description: "Quick physical reset to release tension and shift your state",
      icon: Activity,
      iconColor: "bg-emerald-500",
      defaultDuration: 90,
      durationOptions: [60, 90, 180],
      testIdPrefix: "movement",
      steps: [
        "Stand up and shake your hands loosely for 10 seconds.",
        "Roll your shoulders backward 5 times, then forward 5 times.",
        "Stretch your arms above your head and hold for 10 seconds.",
        "Do 5 slow neck rolls — left, then right.",
        "March in place for 20 seconds, lifting your knees high.",
        "Finish with 3 deep breaths, arms relaxed at your sides.",
      ],
    },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")} className="mb-4" data-testid="button-back-dashboard">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Today
          </Button>
          <h1 className="font-serif text-3xl font-bold mb-3" data-testid="text-regulation-title">Regulation Now</h1>
          <p className="text-muted-foreground text-lg">
            Quick tools to regulate your nervous system when you need it most.
          </p>
        </div>

        <div className="space-y-4">
          {tools.map(tool => (
            <RegulationCard key={tool.testIdPrefix} {...tool} />
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground italic mt-8">
          You can't think your way out of a feeling. Regulate first, then respond.
        </p>
      </div>
    </AppLayout>
  );
}
