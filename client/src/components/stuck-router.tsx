import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight } from "lucide-react";
import { ContainmentModal, TriggerExerciseModal, AvoidingExerciseModal } from "@/components/tools/containment-modal";
import { FaceTheFear } from "@/components/tools/face-the-fear";

type Screen = "choose" | "stalled" | "containment" | "fear" | "trigger" | "avoidance";

export function StuckRouter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [screen, setScreen] = useState<Screen>("choose");

  const reset = () => {
    setScreen("choose");
    onClose();
  };

  // Delegate to sub-modals
  if (screen === "containment") {
    return <ContainmentModal open={true} onClose={reset} />;
  }
  if (screen === "fear") {
    return <FaceTheFear open={true} onClose={reset} />;
  }
  if (screen === "trigger") {
    return <TriggerExerciseModal open={true} onClose={reset} />;
  }
  if (screen === "avoidance") {
    return <AvoidingExerciseModal open={true} onClose={reset} />;
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); }}>
      <DialogContent className="max-w-sm" data-testid="stuck-router">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" />
            {screen === "choose" ? "What's happening?" : "What fits best right now?"}
          </DialogTitle>
        </DialogHeader>

        {screen === "choose" && (
          <div className="space-y-3 pt-2">
            <Button
              variant="outline"
              className="w-full justify-between h-auto py-4 px-4"
              onClick={() => setScreen("containment")}
              data-testid="stuck-flooded"
            >
              <div className="text-left">
                <div className="font-medium text-sm">I'm flooded</div>
                <div className="text-xs text-muted-foreground mt-0.5">Overwhelmed, emotional, can't think straight</div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between h-auto py-4 px-4"
              onClick={() => setScreen("stalled")}
              data-testid="stuck-stalled"
            >
              <div className="text-left">
                <div className="font-medium text-sm">I'm stalled</div>
                <div className="text-xs text-muted-foreground mt-0.5">Know what to do but not doing it</div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>
          </div>
        )}

        {screen === "stalled" && (
          <div className="space-y-3 pt-2">
            <Button
              variant="outline"
              className="w-full justify-between h-auto py-4 px-4"
              onClick={() => setScreen("trigger")}
              data-testid="stuck-triggered"
            >
              <div className="text-left">
                <div className="font-medium text-sm">Something set me off</div>
                <div className="text-xs text-muted-foreground mt-0.5">A trigger happened and I'm reacting</div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between h-auto py-4 px-4"
              onClick={() => setScreen("fear")}
              data-testid="stuck-afraid"
            >
              <div className="text-left">
                <div className="font-medium text-sm">I know what to do but I'm afraid</div>
                <div className="text-xs text-muted-foreground mt-0.5">Fear or discomfort is blocking me</div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between h-auto py-4 px-4"
              onClick={() => setScreen("avoidance")}
              data-testid="stuck-avoiding"
            >
              <div className="text-left">
                <div className="font-medium text-sm">I keep putting it off</div>
                <div className="text-xs text-muted-foreground mt-0.5">Procrastinating on something important</div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
