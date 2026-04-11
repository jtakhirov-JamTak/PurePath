import { useState } from "react";
import { PATTERN_LABELS } from "@/lib/display-names";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sun, Moon, ArrowRight, ArrowLeft, Check } from "lucide-react";

export const SHADOW_EMOTIONS = [
  "anxiety", "shame", "frustration", "overwhelm",
  "apathy", "resentment", "fear", "numbness",
] as const;

export interface PrecisionResult {
  proofPatternWhen: string;
  proofPatternBehavior: string;
  proofPatternOutcome: string;
  proofPatternImpact: string;
  shadowEmotions: string;
  shadowEnvironment: string;
  shadowBehavior: string;
  shadowOutcome: string;
}

interface PrecisionWizardProps {
  mode: "full" | "success_only" | "shadow_only";
  onComplete: (data: PrecisionResult) => void;
  onCancel?: () => void;
  existingData?: Partial<PrecisionResult>;
  behaviorName?: string;
}

type Step = "success" | "shadow" | "done";

export function PrecisionWizard({ mode, onComplete, onCancel, existingData, behaviorName }: PrecisionWizardProps) {
  const [step, setStep] = useState<Step>(mode === "shadow_only" ? "shadow" : "success");

  // Success pattern fields
  const [when, setWhen] = useState(existingData?.proofPatternWhen ?? "");
  const [behavior, setBehavior] = useState(existingData?.proofPatternBehavior ?? "");
  const [outcome, setOutcome] = useState(existingData?.proofPatternOutcome ?? "");
  const [impact, setImpact] = useState(existingData?.proofPatternImpact ?? "");

  // Shadow pattern fields
  const [emotions, setEmotions] = useState<string[]>(() => {
    if (existingData?.shadowEmotions) return existingData.shadowEmotions.split(",").filter(Boolean);
    return [];
  });
  const [environment, setEnvironment] = useState(existingData?.shadowEnvironment ?? "");
  const [shadowBeh, setShadowBeh] = useState(existingData?.shadowBehavior ?? "");
  const [shadowOut, setShadowOut] = useState(existingData?.shadowOutcome ?? "");

  const toggleEmotion = (e: string) => {
    setEmotions(prev => {
      if (prev.includes(e)) return prev.filter(x => x !== e);
      if (prev.length >= 3) return prev;
      return [...prev, e];
    });
  };

  const successValid = when.trim() && behavior.trim() && outcome.trim();
  const shadowValid = emotions.length > 0 && environment.trim() && shadowBeh.trim() && shadowOut.trim();

  const handleNext = () => {
    if (step === "success" && mode === "success_only") {
      finish();
    } else if (step === "success") {
      setStep("shadow");
    } else if (step === "shadow") {
      finish();
    }
  };

  const handleBack = () => {
    if (step === "shadow" && mode === "full") {
      setStep("success");
    }
  };

  const finish = () => {
    setStep("done");
    onComplete({
      proofPatternWhen: when.trim(),
      proofPatternBehavior: behavior.trim(),
      proofPatternOutcome: outcome.trim(),
      proofPatternImpact: impact.trim(),
      shadowEmotions: emotions.join(","),
      shadowEnvironment: environment.trim(),
      shadowBehavior: shadowBeh.trim(),
      shadowOutcome: shadowOut.trim(),
    });
  };

  const canNext = step === "success" ? successValid : step === "shadow" ? shadowValid : false;

  const totalSteps = mode === "full" ? 2 : 1;
  const currentStep = step === "success" ? 1 : step === "shadow" ? (mode === "full" ? 2 : 1) : totalSteps;

  if (step === "done") {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Check className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-medium">Pattern mapped</p>
          {behaviorName && <p className="text-xs text-muted-foreground">{behaviorName}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
            {step === "success" ? <Sun className="h-4 w-4 text-primary" /> : <Moon className="h-4 w-4 text-primary" />}
          </div>
          <div className="flex-1">
            <CardTitle className="text-sm">
              {step === "success" ? PATTERN_LABELS.success : PATTERN_LABELS.shadow}
            </CardTitle>
            <CardDescription>
              {step === "success"
                ? "Map what happens when this behavior works"
                : "Map the pattern that derails this behavior"}
            </CardDescription>
          </div>
          {totalSteps > 1 && (
            <span className="text-xs text-muted-foreground shrink-0">{currentStep}/{totalSteps}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {behaviorName && (
          <p className="text-xs text-muted-foreground italic">Behavior: {behaviorName}</p>
        )}

        {step === "success" && (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-medium">When <span className="text-muted-foreground">(context/trigger)</span></Label>
              <Input
                value={when}
                onChange={e => setWhen(e.target.value)}
                placeholder="e.g. When I wake up before my alarm..."
                data-testid="precision-when"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">I do <span className="text-muted-foreground">(specific behavior)</span></Label>
              <Input
                value={behavior}
                onChange={e => setBehavior(e.target.value)}
                placeholder="e.g. I immediately put on my running shoes..."
                data-testid="precision-behavior"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Outcome <span className="text-muted-foreground">(positive result)</span></Label>
              <Input
                value={outcome}
                onChange={e => setOutcome(e.target.value)}
                placeholder="e.g. I feel energized and clear for the whole morning"
                data-testid="precision-outcome"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Impact on others <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input
                value={impact}
                onChange={e => setImpact(e.target.value)}
                placeholder="e.g. My family sees me calmer and more present"
                data-testid="precision-impact"
              />
            </div>
          </>
        )}

        {step === "shadow" && (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-medium">What do you feel at your worst? <span className="text-xs text-muted-foreground">(1-3)</span></Label>
              <div className="flex flex-wrap gap-2">
                {SHADOW_EMOTIONS.map(e => {
                  const selected = emotions.includes(e);
                  return (
                    <button
                      key={e}
                      type="button"
                      onClick={() => toggleEmotion(e)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[44px] ${
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      } ${!selected && emotions.length >= 3 ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                      disabled={!selected && emotions.length >= 3}
                      data-testid={`emotion-${e}`}
                    >
                      {e}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">What situation creates that state?</Label>
              <Textarea
                value={environment}
                onChange={e => setEnvironment(e.target.value)}
                placeholder="e.g. When I check my phone first thing and see work emails piling up..."
                className="min-h-[60px] max-h-[100px] resize-none"
                data-testid="precision-environment"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">What do you actually do?</Label>
              <Textarea
                value={shadowBeh}
                onChange={e => setShadowBeh(e.target.value)}
                placeholder="e.g. I scroll social media for 45 minutes instead of getting ready..."
                className="min-h-[60px] max-h-[100px] resize-none"
                data-testid="precision-shadow-behavior"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">What happens as a result?</Label>
              <Textarea
                value={shadowOut}
                onChange={e => setShadowOut(e.target.value)}
                placeholder="e.g. I'm late, rushed, and start the day behind..."
                className="min-h-[60px] max-h-[100px] resize-none"
                data-testid="precision-shadow-outcome"
              />
            </div>
          </>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {step === "shadow" && mode === "full" ? (
              <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            ) : onCancel ? (
              <Button variant="ghost" size="sm" className="min-h-[44px] text-muted-foreground" onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
          </div>
          <Button
            size="sm"
            className="min-h-[44px]"
            disabled={!canNext}
            onClick={handleNext}
          >
            {(step === "success" && mode === "success_only") || step === "shadow"
              ? "Complete"
              : <>Next <ArrowRight className="h-4 w-4 ml-1" /></>
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
