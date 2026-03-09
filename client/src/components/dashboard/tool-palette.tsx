import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Brain, Pause, AlertTriangle, Shield } from "lucide-react";

interface ToolPaletteProps {
  onToolOpen: (tool: string) => void;
  onNavigate: (path: string) => void;
  onStillnessOpen: () => void;
}

export function ToolPalette({ onToolOpen, onNavigate, onStillnessOpen }: ToolPaletteProps) {
  return (
    <Card className="overflow-visible" data-testid="card-tools">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-serif">Tools</CardTitle>
      </CardHeader>
      <CardContent className="pb-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={() => onToolOpen("containment")}
            data-testid="button-tool-containment"
          >
            <Heart className="h-6 w-6 text-rose-500" />
            <span className="text-xs font-medium">Containment</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={() => onNavigate("/meditation")}
            data-testid="button-tool-meditation"
          >
            <Brain className="h-6 w-6 text-purple-500" />
            <span className="text-xs font-medium">Meditation</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={onStillnessOpen}
            data-testid="button-tool-stillness"
          >
            <Pause className="h-6 w-6 text-slate-500" />
            <span className="text-xs font-medium">Stillness</span>
          </Button>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">Use As Needed</p>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="flex flex-col items-center gap-1.5 h-auto py-3 opacity-80"
              onClick={() => onNavigate("/empathy")}
              data-testid="button-tool-eq-module"
            >
              <Brain className="h-5 w-5 text-emerald-500" />
              <span className="text-xs">EQ Module</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-1.5 h-auto py-3 opacity-80"
              onClick={() => onToolOpen("trigger")}
              data-testid="button-tool-trigger"
            >
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span className="text-xs">Trigger Log</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-1.5 h-auto py-3 opacity-80"
              onClick={() => onToolOpen("avoidance")}
              data-testid="button-tool-avoidance"
            >
              <Shield className="h-5 w-5 text-blue-500" />
              <span className="text-xs">Avoidance</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
