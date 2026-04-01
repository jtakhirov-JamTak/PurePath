import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import type { MonthlyGoal, IdentityDocument } from "@shared/schema";

const TOTAL_STEPS = 7;

interface AvoidingExerciseProps {
  onFinish: () => void; // called after saving, triggers mood.finishExercise()
}

export function AvoidingExercise({ onFinish }: AvoidingExerciseProps) {
  const [step, setStep] = useState(0);
  const [avoidingWhat, setAvoidingWhat] = useState("");
  const [selectedValue, setSelectedValue] = useState("");
  const [discomfort, setDiscomfort] = useState<number | null>(null);
  const [anticipatedOutcome, setAnticipatedOutcome] = useState("");
  const [smallestExposure, setSmallestExposure] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const currentMonthKey = format(new Date(), "yyyy-MM");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const { data: monthlyGoal } = useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal", currentMonthKey],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-goal?month=${currentMonthKey}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: identityDoc } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
  });

  const valueChips = (identityDoc?.values || "")
    .split(/[\n,]+/)
    .map(v => v.trim())
    .filter(Boolean);

  const canNext = (() => {
    switch (step) {
      case 0: return true; // context step, always can advance
      case 1: return avoidingWhat.trim().length > 0;
      case 2: return selectedValue.length > 0;
      case 3: return discomfort !== null;
      case 4: return anticipatedOutcome.trim().length > 0;
      case 5: return smallestExposure.trim().length > 0;
      case 6: return scheduledTime.length > 0;
      default: return false;
    }
  })();

  const [saveError, setSaveError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const res = await apiRequest("POST", "/api/avoidance-logs", {
        date: todayStr,
        avoidingWhat: avoidingWhat.trim(),
        discomfort,
        smallestExposure: smallestExposure.trim(),
        selectedValue,
        anticipatedOutcome: anticipatedOutcome.trim(),
        scheduledTime,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/avoidance-logs"] });
      onFinish();
    } catch (e: any) {
      console.error("Failed to save avoidance log:", e);
      setSaveError(e.message || "Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (step === TOTAL_STEPS - 1) {
      handleSave();
      return;
    }
    setStep(s => s + 1);
  };

  const goBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const goalDisplay = monthlyGoal?.goalWhat?.trim() || monthlyGoal?.goalStatement?.trim() || "";

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      {/* Step 1: Monthly goal context */}
      {step === 0 && (
        <div className="space-y-3 text-center">
          <p className="text-sm font-medium">Your current focus</p>
          {goalDisplay ? (
            <div className="rounded-lg border bg-muted/50 px-4 py-3">
              <p className="text-sm">{goalDisplay}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No monthly goal set yet.</p>
          )}
          <p className="text-xs text-muted-foreground">Keep this in mind as you explore what you're avoiding.</p>
        </div>
      )}

      {/* Step 2: What am I avoiding? */}
      {step === 1 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">What am I avoiding?</Label>
          <Textarea
            value={avoidingWhat}
            onChange={e => setAvoidingWhat(e.target.value)}
            placeholder="The thing I keep putting off..."
            rows={3}
            className="resize-none text-sm"
            autoFocus
            data-testid="input-avoiding-what"
          />
        </div>
      )}

      {/* Step 3: Which value does facing this serve? */}
      {step === 2 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Which value does facing this serve?</Label>
          {valueChips.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {valueChips.map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedValue(value)}
                  className={`rounded-full px-3 py-2 text-xs font-medium border transition-colors cursor-pointer min-h-[44px] ${
                    selectedValue === value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                  data-testid={`chip-value-${value}`}
                >
                  {value}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">No values found in your Identity Document. Type one:</p>
              <Input
                value={selectedValue}
                onChange={e => setSelectedValue(e.target.value)}
                placeholder="e.g. Courage, Integrity, Growth..."
                className="text-sm"
                data-testid="input-value-fallback"
              />
            </div>
          )}
        </div>
      )}

      {/* Step 4: Discomfort level */}
      {step === 3 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Discomfort level</Label>
          <p className="text-xs text-muted-foreground">How uncomfortable does facing this feel?</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(level => (
              <button
                key={level}
                type="button"
                onClick={() => setDiscomfort(level)}
                className={`h-12 w-12 rounded-full border-2 text-sm font-bold transition-colors ${
                  discomfort === level
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
                data-testid={`button-discomfort-${level}`}
              >
                {level}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground px-2">
            <span>Mild</span>
            <span>Intense</span>
          </div>
        </div>
      )}

      {/* Step 5: Anticipated outcome */}
      {step === 4 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">What do I think will happen if I do this?</Label>
          <p className="text-xs text-muted-foreground">My fear is that...</p>
          <Textarea
            value={anticipatedOutcome}
            onChange={e => setAnticipatedOutcome(e.target.value)}
            placeholder="If I actually do this, I'm afraid that..."
            rows={3}
            className="resize-none text-sm"
            autoFocus
            data-testid="input-anticipated-outcome"
          />
        </div>
      )}

      {/* Step 6: Smallest exposure rep */}
      {step === 5 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Smallest exposure rep</Label>
          <p className="text-xs text-muted-foreground">The tiniest step I could take toward this...</p>
          <Textarea
            value={smallestExposure}
            onChange={e => setSmallestExposure(e.target.value)}
            placeholder="I could spend 2 minutes on..."
            rows={3}
            className="resize-none text-sm"
            autoFocus
            data-testid="input-smallest-exposure"
          />
        </div>
      )}

      {/* Step 7: Time picker */}
      {step === 6 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">I'll do this at:</Label>
          <Input
            type="time"
            value={scheduledTime}
            onChange={e => setScheduledTime(e.target.value)}
            className="text-sm max-w-[200px] mx-auto"
            data-testid="input-scheduled-time"
          />
          <p className="text-xs text-muted-foreground text-center">Set a specific time to do your smallest exposure rep.</p>
        </div>
      )}

      {saveError && (
        <p className="text-xs text-destructive text-center">{saveError}</p>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-2">
        {step > 0 ? (
          <Button variant="ghost" size="sm" onClick={goBack} data-testid="button-avoiding-back">
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back
          </Button>
        ) : <div />}
        <Button size="sm" onClick={goNext} disabled={!canNext || saving} data-testid="button-avoiding-next">
          {saving ? "Saving..." : step === TOTAL_STEPS - 1 ? "Done" : "Next"}
          {!saving && <ArrowRight className="ml-1 h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
}
