import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Shield } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import type { IdentityDocument } from "@shared/schema";

export function AvoidanceToolModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [avoidingWhat, setAvoidingWhat] = useState("");
  const [avoidanceValue, setAvoidanceValue] = useState("");
  const [discomfort, setDiscomfort] = useState<number | null>(null);
  const [fearedOutcome, setFearedOutcome] = useState("");
  const [smallestExposure, setSmallestExposure] = useState("");
  const [exposureTime, setExposureTime] = useState("");

  const { data: identityDoc } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
    enabled: open,
  });
  const valuesItems = identityDoc?.values?.split(",").map(s => s.trim()).filter(Boolean) || [];

  const resetForm = () => {
    setAvoidingWhat("");
    setAvoidanceValue("");
    setDiscomfort(null);
    setFearedOutcome("");
    setSmallestExposure("");
    setExposureTime("");
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
        discomfort,
        smallestExposure: smallestExposure || undefined,
        // TODO: add avoidanceValue, fearedOutcome, exposureTime to avoidance_logs schema
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

  const canSubmit = avoidingWhat.trim() && discomfort;

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
            <label className="text-sm font-medium">What am I avoiding?</label>
            <Textarea
              value={avoidingWhat}
              onChange={(e) => setAvoidingWhat(e.target.value)}
              placeholder="Describe what you're avoiding..."
              rows={2}
              className="resize-none text-sm"
              data-testid="textarea-avoidance-what"
            />
          </div>

          {avoidingWhat.trim() ? (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Which value does facing this serve?</label>
                {valuesItems.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {valuesItems.map((value, i) => {
                      const selected = avoidanceValue === value;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setAvoidanceValue(selected ? "" : value)}
                          className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors cursor-pointer ${
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-primary/40 text-primary hover:bg-primary/[0.08]"
                          }`}
                          data-testid={`chip-modal-avoidance-value-${i}`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Set up your values in your <button type="button" onClick={() => setLocation("/identity")} className="underline hover:text-foreground transition-colors">Identity Document</button> first.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Discomfort level</label>
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
                <label className="text-sm font-medium">What do I think will happen if I do this?</label>
                <Input
                  value={fearedOutcome}
                  onChange={(e) => setFearedOutcome(e.target.value)}
                  placeholder="My fear is that..."
                  data-testid="input-feared-outcome"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Smallest exposure rep</label>
                <Textarea
                  value={smallestExposure}
                  onChange={(e) => setSmallestExposure(e.target.value)}
                  placeholder="The tiniest step I could take..."
                  rows={2}
                  className="resize-none text-sm"
                  data-testid="textarea-avoidance-exposure"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">I'll do this at:</label>
                <Input
                  type="time"
                  value={exposureTime}
                  onChange={(e) => setExposureTime(e.target.value)}
                  className="w-32"
                  data-testid="input-exposure-time"
                />
              </div>
            </>
          ) : null}

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
