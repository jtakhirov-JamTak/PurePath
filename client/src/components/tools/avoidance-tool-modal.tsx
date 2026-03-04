import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield } from "lucide-react";
import { format } from "date-fns";

const DELAY_OPTIONS = [
  "< 1 hour",
  "1-3 hours",
  "Half day",
  "1 day",
  "2-3 days",
  "4-7 days",
  "1+ weeks",
];

export function AvoidanceToolModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [avoidingWhat, setAvoidingWhat] = useState("");
  const [avoidanceDelay, setAvoidanceDelay] = useState("");
  const [discomfort, setDiscomfort] = useState<number | null>(null);
  const [smallestExposure, setSmallestExposure] = useState("");
  const [startedNow, setStartedNow] = useState(false);

  const resetForm = () => {
    setAvoidingWhat("");
    setAvoidanceDelay("");
    setDiscomfort(null);
    setSmallestExposure("");
    setStartedNow(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/avoidance-logs", {
        date: format(new Date(), "yyyy-MM-dd"),
        avoidingWhat,
        avoidanceDelay,
        discomfort,
        smallestExposure: smallestExposure || undefined,
        startedNow,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to save avoidance log");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/avoidance-logs"] });
      toast({ title: "Avoidance logged" });
      handleClose();
    },
    onError: (error: Error) => {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
    },
  });

  const canSubmit = avoidingWhat.trim() && avoidanceDelay && discomfort;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg" data-testid="modal-avoidance">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Avoidance Tool
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">What is the one thing I'm avoiding?</label>
            <Textarea
              value={avoidingWhat}
              onChange={(e) => setAvoidingWhat(e.target.value)}
              placeholder="Describe what you're avoiding..."
              rows={2}
              className="resize-none text-sm"
              data-testid="textarea-avoidance-what"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">How long have you been avoiding it?</label>
            <Select value={avoidanceDelay} onValueChange={setAvoidanceDelay}>
              <SelectTrigger data-testid="select-avoidance-delay">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {DELAY_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Discomfort Level</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <Button
                  key={n}
                  variant={discomfort === n ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setDiscomfort(n)}
                  data-testid={`button-discomfort-${n}`}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Smallest exposure rep <span className="text-xs text-muted-foreground">(optional)</span></label>
            <Textarea
              value={smallestExposure}
              onChange={(e) => setSmallestExposure(e.target.value)}
              placeholder="What's the tiniest step you could take?"
              rows={2}
              className="resize-none text-sm"
              data-testid="textarea-avoidance-exposure"
            />
          </div>

          <div className="space-y-1.5">
            <Button
              variant={startedNow ? "default" : "outline"}
              className="w-full"
              onClick={() => setStartedNow(!startedNow)}
              data-testid="button-avoidance-start-now"
            >
              {startedNow ? "Started! (5 min commitment)" : "Start now for 5 minutes"}
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={handleClose} data-testid="button-avoidance-cancel">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={!canSubmit || saveMutation.isPending}
              data-testid="button-avoidance-save"
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
