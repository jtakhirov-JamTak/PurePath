import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ArrowLeft, Zap } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { FreeTextOrChips } from "@/components/free-text-or-chips";
import { EMOTIONS_V2, URGES_V2 } from "./trigger-chips";
import type { PatternProfile } from "@shared/schema";

const TOTAL_STEPS = 5;

interface TriggerExerciseProps {
  onFinish: () => void;
}

export function TriggerExercise({ onFinish }: TriggerExerciseProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [whatHappened, setWhatHappened] = useState("");
  const [storyTold, setStoryTold] = useState("");
  const [emotion, setEmotion] = useState("");
  const [wantedToDo, setWantedToDo] = useState("");
  const [whatIDid, setWhatIDid] = useState("");
  const [fromTemplate, setFromTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const queryClient = useQueryClient();

  const { data: patternProfile } = useQuery<PatternProfile>({
    queryKey: ["/api/pattern-profile"],
    enabled: !!user,
  });

  const hasSavedTrigger = !!(patternProfile?.triggerPatternTrigger?.trim());

  const canNext = (() => {
    switch (step) {
      case 0: return whatHappened.trim().length > 0;
      case 1: return true;
      case 2: return emotion.length > 0;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  })();

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const res = await apiRequest("POST", "/api/trigger-logs", {
        date: format(new Date(), "yyyy-MM-dd"),
        triggerText: whatHappened.trim(),
        appraisal: storyTold.trim() || null,
        emotion: emotion || null,
        urge: wantedToDo || null,
        whatIDid: whatIDid.trim() || null,
        fromTemplate,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/trigger-logs"] });
      onFinish();
    } catch (e: any) {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">What happened?</p>
          {hasSavedTrigger && !fromTemplate && (
            <button
              type="button"
              onClick={() => {
                setWhatHappened(patternProfile!.triggerPatternTrigger!);
                setFromTemplate(true);
              }}
              className="flex items-center gap-1.5 text-xs text-primary hover:bg-primary/5 rounded-md px-3 py-2 border border-primary/20 transition-colors min-h-[44px]"
            >
              <Zap className="h-3.5 w-3.5" />
              Use saved trigger from Pattern Profile
            </button>
          )}
          <Textarea
            value={whatHappened}
            onChange={e => setWhatHappened(e.target.value)}
            placeholder="Brief description of the situation..."
            rows={3}
            className="resize-none text-sm"
            autoFocus
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">What story did I tell myself?</p>
          <p className="text-xs text-muted-foreground">The interpretation, not the facts.</p>
          <Textarea
            value={storyTold}
            onChange={e => setStoryTold(e.target.value)}
            placeholder="I told myself that..."
            rows={3}
            className="resize-none text-sm"
            autoFocus
          />
        </div>
      )}

      {step === 2 && (
        <FreeTextOrChips
          label="What did I feel?"
          value={emotion}
          onChange={setEmotion}
          presets={EMOTIONS_V2}
          placeholder="Type or choose below..."
        />
      )}

      {step === 3 && (
        <FreeTextOrChips
          label="What did I want to do?"
          value={wantedToDo}
          onChange={setWantedToDo}
          presets={URGES_V2}
          placeholder="Type or choose below..."
        />
      )}

      {step === 4 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">What did I do?</p>
          <Textarea
            value={whatIDid}
            onChange={e => setWhatIDid(e.target.value)}
            placeholder="What actually happened next..."
            rows={3}
            className="resize-none text-sm"
            autoFocus
          />
        </div>
      )}

      {saveError && (
        <p className="text-xs text-destructive text-center">{saveError}</p>
      )}

      <div className="flex justify-between items-center pt-2">
        {step > 0 ? (
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back
          </Button>
        ) : <div />}
        <Button size="sm" onClick={goNext} disabled={!canNext || saving}>
          {saving ? "Saving..." : step === TOTAL_STEPS - 1 ? "Done" : "Next"}
          {!saving && <ArrowRight className="ml-1 h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
}
