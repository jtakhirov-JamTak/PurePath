import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import {
  APPRAISALS, EMOTIONS, URGES, ACTIONS, BODY_STATES, RECOVERY_TIMES,
  Chip, IntensityDots, useMultiChips,
} from "./trigger-chips";

export function TriggerLogModal({ open, onClose }: { open: boolean; onClose: () => void }) {

  // Tier 1
  const [triggerText, setTriggerText] = useState("");
  const appraisal = useMultiChips();
  const [appraisalOther, setAppraisalOther] = useState("");
  const [emotion, setEmotion] = useState("");
  const [emotionIntensity, setEmotionIntensity] = useState<number | null>(null);
  const [urge, setUrge] = useState("");
  const [urgeIntensity, setUrgeIntensity] = useState<number | null>(null);
  const [urgeOther, setUrgeOther] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [actionOther, setActionOther] = useState("");

  // Tier 2
  const [showTier2, setShowTier2] = useState(false);
  const bodyState = useMultiChips();
  const [outcome, setOutcome] = useState("");
  const [recoveryTime, setRecoveryTime] = useState("");
  const [reflection, setReflection] = useState("");

  const resetForm = () => {
    setTriggerText("");
    appraisal.setSelected([]);
    setAppraisalOther("");
    setEmotion("");
    setEmotionIntensity(null);
    setUrge("");
    setUrgeIntensity(null);
    setUrgeOther("");
    setActionTaken("");
    setActionOther("");
    setShowTier2(false);
    bodyState.setSelected([]);
    setOutcome("");
    setRecoveryTime("");
    setReflection("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const saveMutation = useToastMutation({
    mutationFn: async () => {
      // Build appraisal string from chips + other
      const appraisalParts = [...appraisal.selected.filter((a) => a !== "Other")];
      if (appraisal.selected.includes("Other") && appraisalOther.trim()) {
        appraisalParts.push(appraisalOther.trim());
      }

      const actionValue = actionTaken === "Other" && actionOther.trim()
        ? actionOther.trim()
        : actionTaken || undefined;

      const res = await apiRequest("POST", "/api/trigger-logs", {
        date: format(new Date(), "yyyy-MM-dd"),
        triggerText,
        appraisal: appraisalParts.length > 0 ? appraisalParts.join(", ") : undefined,
        emotion,
        emotionIntensity,
        urge: urge === "Other" && urgeOther.trim() ? urgeOther.trim() : urge,
        urgeIntensity,
        whatIDid: actionValue,
        actionTaken: actionValue,
        // Tier 2
        bodyState: bodyState.selected.length > 0 ? bodyState.selected.join(", ") : undefined,
        outcome: outcome.trim() || undefined,
        recoveryTime: recoveryTime || undefined,
        reflection: reflection.trim() || undefined,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to save trigger log");
      }
    },
    invalidateKeys: ["/api/trigger-logs"],
    successToast: { title: "Trigger logged" },
    errorToast: "Could not save",
    onSuccess: () => {
      handleClose();
    },
  });

  const canSubmit =
    triggerText.trim() &&
    appraisal.selected.length > 0 &&
    emotion &&
    emotionIntensity &&
    urge &&
    urgeIntensity &&
    actionTaken;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-4" data-testid="modal-trigger-log">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Log a Trigger
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 1. What happened */}
          <div className="space-y-1">
            <label className="text-sm font-medium">What happened?</label>
            <Input
              value={triggerText}
              onChange={(e) => setTriggerText(e.target.value)}
              placeholder="Brief description of the situation"
              className="text-sm"
              data-testid="input-trigger-text"
            />
          </div>

          {/* 2. This felt like... (multi-select) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">This felt like...</label>
            <div className="flex flex-wrap gap-1.5">
              {APPRAISALS.map((a) => (
                <Chip
                  key={a}
                  label={a}
                  selected={appraisal.selected.includes(a)}
                  onClick={() => appraisal.toggle(a)}
                />
              ))}
            </div>
            {appraisal.selected.includes("Other") && (
              <Input
                value={appraisalOther}
                onChange={(e) => setAppraisalOther(e.target.value)}
                placeholder="Describe..."
                className="text-sm mt-1.5"
              />
            )}
          </div>

          {/* 3. Emotion (single select + intensity) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Emotion</label>
            <div className="flex flex-wrap gap-1.5">
              {EMOTIONS.map((e) => (
                <Chip
                  key={e}
                  label={e}
                  selected={emotion === e}
                  onClick={() => setEmotion(emotion === e ? "" : e)}
                />
              ))}
            </div>
            {emotion && (
              <IntensityDots
                value={emotionIntensity}
                onChange={setEmotionIntensity}
                testIdPrefix="emotion-intensity"
              />
            )}
          </div>

          {/* 4. Urge (single select + intensity) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Urge</label>
            <div className="flex flex-wrap gap-1.5">
              {URGES.map((u) => (
                <Chip
                  key={u}
                  label={u}
                  selected={urge === u}
                  onClick={() => setUrge(urge === u ? "" : u)}
                />
              ))}
            </div>
            {urge && (
              <IntensityDots
                value={urgeIntensity}
                onChange={setUrgeIntensity}
                testIdPrefix="urge-intensity"
              />
            )}
            {urge === "Other" && (
              <Input
                value={urgeOther}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrgeOther(e.target.value)}
                placeholder="Describe..."
                className="text-sm mt-1.5"
              />
            )}
          </div>

          {/* 5. What did you do? (single select) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">What did you do?</label>
            <div className="flex flex-wrap gap-1.5">
              {ACTIONS.map((a) => (
                <Chip
                  key={a}
                  label={a}
                  selected={actionTaken === a}
                  onClick={() => setActionTaken(actionTaken === a ? "" : a)}
                />
              ))}
            </div>
            {actionTaken === "Other" && (
              <Input
                value={actionOther}
                onChange={(e) => setActionOther(e.target.value)}
                placeholder="Describe..."
                className="text-sm mt-1.5"
              />
            )}
          </div>

          {/* Save button */}
          <Button
            className="w-full"
            onClick={() => saveMutation.mutate()}
            disabled={!canSubmit || saveMutation.isPending}
            data-testid="button-trigger-save"
          >
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>

          {/* Tier 2 expand link */}
          {!showTier2 && (
            <button
              type="button"
              onClick={() => setShowTier2(true)}
              className="flex items-center justify-center gap-1 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Add more detail
              <ChevronDown className="h-3 w-3" />
            </button>
          )}

          {/* Tier 2 — Enrichment */}
          {showTier2 && (
            <div className="space-y-4 pt-2 border-t border-border animate-in slide-in-from-top-2 duration-300">
              {/* 6. Body state (multi-select) */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">What did you feel in your body?</label>
                <div className="flex flex-wrap gap-1.5">
                  {BODY_STATES.map((b) => (
                    <Chip
                      key={b}
                      label={b}
                      selected={bodyState.selected.includes(b)}
                      onClick={() => bodyState.toggle(b)}
                    />
                  ))}
                </div>
              </div>

              {/* 7. What happened right after */}
              <div className="space-y-1">
                <label className="text-sm font-medium">What happened right after?</label>
                <Input
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="Brief description..."
                  className="text-sm"
                />
              </div>

              {/* 8. Recovery time */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">How long until you felt calm?</label>
                <div className="flex flex-wrap gap-1.5">
                  {RECOVERY_TIMES.map((r) => (
                    <Chip
                      key={r}
                      label={r}
                      selected={recoveryTime === r}
                      onClick={() => setRecoveryTime(recoveryTime === r ? "" : r)}
                    />
                  ))}
                </div>
              </div>

              {/* 9. Reflection */}
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Reflection <span className="text-xs text-muted-foreground">(optional)</span>
                </label>
                <Textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="Any insight about this pattern?"
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>

              {/* Second save button after Tier 2 */}
              <Button
                className="w-full"
                onClick={() => saveMutation.mutate()}
                disabled={!canSubmit || saveMutation.isPending}
              >
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
