import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

/** Fear blocker chips — matches fearBlockerEnum in server/validation.ts */
const FEAR_BLOCKER_CHIPS = [
  { value: "getting_it_wrong", label: "Getting it wrong" },
  { value: "being_judged", label: "Being judged" },
  { value: "disappointing_someone", label: "Disappointing someone" },
  { value: "uncertainty", label: "Uncertainty / no perfect choice" },
  { value: "waiting_for_permission", label: "Waiting for permission" },
  { value: "hoping_someone_else_decides", label: "Hoping someone else decides" },
  { value: "shame_discomfort", label: "Shame / discomfort" },
  { value: "succeeding_and_sustaining", label: "Succeeding and having to sustain it" },
] as const;

interface FaceTheFearProps {
  open: boolean;
  onClose: () => void;
}

export function FaceTheFear({ open, onClose }: FaceTheFearProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState<"input" | "done">("input");

  const [fearTarget, setFearTarget] = useState("");
  const [fearIfFaced, setFearIfFaced] = useState("");
  const [fearIfAvoided, setFearIfAvoided] = useState("");
  const [fearBlocker, setFearBlocker] = useState("");
  const [fearFirstMove, setFearFirstMove] = useState("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/fear-logs", {
        date: format(new Date(), "yyyy-MM-dd"),
        fearTarget,
        fearIfFaced: fearIfFaced || null,
        fearIfAvoided: fearIfAvoided || null,
        fearBlocker: fearBlocker || null,
        fearFirstMove: fearFirstMove || null,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fear-logs"] });
      setStep("done");
    },
    onError: (error: Error) => {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
    },
  });

  const handleClose = () => {
    setStep("input");
    setFearTarget("");
    setFearIfFaced("");
    setFearIfAvoided("");
    setFearBlocker("");
    setFearFirstMove("");
    onClose();
  };

  const canSave = fearTarget.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Face the Fear</DialogTitle>
        </DialogHeader>

        {step === "done" ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Logged. The smallest proof move is worth more than the biggest plan.
            </p>
            <Button onClick={handleClose}>Done</Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">What important thing am I resisting?</Label>
              <Input
                value={fearTarget}
                onChange={(e) => setFearTarget(e.target.value)}
                placeholder="The thing I keep putting off..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">What am I afraid might happen if I face it?</Label>
              <Textarea
                value={fearIfFaced}
                onChange={(e) => setFearIfFaced(e.target.value)}
                placeholder="If I face this..."
                rows={2}
                className="resize-none text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">What am I afraid might happen if I keep avoiding it?</Label>
              <Textarea
                value={fearIfAvoided}
                onChange={(e) => setFearIfAvoided(e.target.value)}
                placeholder="If I keep avoiding this..."
                rows={2}
                className="resize-none text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">What is most true underneath this right now?</Label>
              <div className="flex flex-wrap gap-2">
                {FEAR_BLOCKER_CHIPS.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => setFearBlocker(chip.value)}
                    className={`rounded-full px-3 py-2.5 text-xs font-medium border transition-colors cursor-pointer min-h-[44px] ${
                      fearBlocker === chip.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">What is the smallest proof move?</Label>
              <Textarea
                value={fearFirstMove}
                onChange={(e) => setFearFirstMove(e.target.value)}
                placeholder="One small, concrete step I can do today..."
                rows={2}
                className="resize-none text-sm"
              />
            </div>

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!canSave || saveMutation.isPending}
              className="w-full"
            >
              {saveMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                <>Log it<ArrowRight className="ml-1 h-4 w-4" /></>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
