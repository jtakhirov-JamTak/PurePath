import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const EMOTIONS = [
  "Anxiety / Worry",
  "Fear",
  "Anger / Irritation",
  "Frustration",
  "Shame",
  "Guilt",
  "Sadness",
  "Hurt / Rejection",
  "Overwhelm",
  "Numb / Disconnected",
];

const URGES = [
  "Avoid / Withdraw",
  "Delay / Procrastinate",
  "Defend / Justify",
  "Attack / Confront",
  "Shut Down / Go Silent",
  "Seek Reassurance",
  "Control / Fix",
  "Appease / People-Please",
  "Ruminate / Overthink",
  "Escape / Numb (scroll, eat, use, distract)",
];

export function TriggerLogModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [timeOfDay, setTimeOfDay] = useState("");
  const [context, setContext] = useState("");
  const [triggerText, setTriggerText] = useState("");
  const [emotion, setEmotion] = useState("");
  const [emotionIntensity, setEmotionIntensity] = useState<number | null>(null);
  const [urge, setUrge] = useState("");
  const [urgeIntensity, setUrgeIntensity] = useState<number | null>(null);
  const [whatIDid, setWhatIDid] = useState("");
  const [outcome, setOutcome] = useState("");
  const [recoveryMinutes, setRecoveryMinutes] = useState<number | undefined>(undefined);

  const resetForm = () => {
    setTimeOfDay("");
    setContext("");
    setTriggerText("");
    setEmotion("");
    setEmotionIntensity(null);
    setUrge("");
    setUrgeIntensity(null);
    setWhatIDid("");
    setOutcome("");
    setRecoveryMinutes(undefined);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/trigger-logs", {
        date: format(new Date(), "yyyy-MM-dd"),
        timeOfDay,
        context,
        triggerText,
        emotion,
        emotionIntensity,
        urge,
        urgeIntensity,
        whatIDid: whatIDid || undefined,
        outcome: outcome || undefined,
        recoveryMinutes: recoveryMinutes || undefined,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to save trigger log");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trigger-logs"] });
      toast({ title: "Trigger logged" });
      handleClose();
    },
    onError: (error: Error) => {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
    },
  });

  const canSubmit = timeOfDay && context && triggerText.trim() && emotion && emotionIntensity && urge && urgeIntensity;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg" data-testid="modal-trigger-log">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Log a Trigger
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Time of Day</label>
            <Select value={timeOfDay} onValueChange={setTimeOfDay}>
              <SelectTrigger data-testid="select-trigger-time">
                <SelectValue placeholder="Select time of day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Context</label>
            <Select value={context} onValueChange={setContext}>
              <SelectTrigger data-testid="select-trigger-context">
                <SelectValue placeholder="Select context" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Work">Work</SelectItem>
                <SelectItem value="Partner">Partner</SelectItem>
                <SelectItem value="Family">Family</SelectItem>
                <SelectItem value="Friends">Friends</SelectItem>
                <SelectItem value="Self">Self</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">What triggered you? (observable)</label>
            <Textarea
              value={triggerText}
              onChange={(e) => setTriggerText(e.target.value)}
              placeholder="Describe the trigger..."
              rows={2}
              className="resize-none text-sm"
              data-testid="textarea-trigger-text"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Emotion</label>
            <Select value={emotion} onValueChange={setEmotion}>
              <SelectTrigger data-testid="select-trigger-emotion">
                <SelectValue placeholder="Select emotion" />
              </SelectTrigger>
              <SelectContent>
                {EMOTIONS.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Emotion Intensity</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <Button
                  key={n}
                  variant={emotionIntensity === n ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setEmotionIntensity(n)}
                  data-testid={`button-emotion-intensity-${n}`}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Urge</label>
            <Select value={urge} onValueChange={setUrge}>
              <SelectTrigger data-testid="select-trigger-urge">
                <SelectValue placeholder="Select urge" />
              </SelectTrigger>
              <SelectContent>
                {URGES.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Urge Intensity</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <Button
                  key={n}
                  variant={urgeIntensity === n ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setUrgeIntensity(n)}
                  data-testid={`button-urge-intensity-${n}`}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">What I did <span className="text-xs text-muted-foreground">(optional)</span></label>
            <Textarea
              value={whatIDid}
              onChange={(e) => setWhatIDid(e.target.value)}
              placeholder="What action did you take?"
              rows={2}
              className="resize-none text-sm"
              data-testid="textarea-trigger-what-i-did"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Outcome <span className="text-xs text-muted-foreground">(optional)</span></label>
            <Textarea
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="What happened as a result?"
              rows={2}
              className="resize-none text-sm"
              data-testid="textarea-trigger-outcome"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Recovery time (minutes) <span className="text-xs text-muted-foreground">(optional)</span></label>
            <Input
              type="number"
              min={0}
              value={recoveryMinutes ?? ""}
              onChange={(e) => setRecoveryMinutes(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Minutes until calm"
              className="text-sm"
              data-testid="input-trigger-recovery"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={handleClose} data-testid="button-trigger-cancel">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={!canSubmit || saveMutation.isPending}
              data-testid="button-trigger-save"
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
