import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Brain, Pause, AlertTriangle } from "lucide-react";

interface ToolPaletteProps {
  onToolOpen: (tool: string) => void;
  onNavigate: (path: string) => void;
  onStillnessOpen: () => void;
}

export function ToolPalette({ onToolOpen, onNavigate, onStillnessOpen }: ToolPaletteProps) {
  return (
    <Card className="overflow-visible" data-testid="card-tools">
      <CardHeader className="pb-1.5 px-3 pt-2.5">
        <span className="text-xs font-medium uppercase tracking-wide text-bark">Tools</span>
      </CardHeader>
      <CardContent className="pb-3 px-3 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            className="flex flex-col items-center gap-1.5 h-auto py-2"
            onClick={() => onToolOpen("containment")}
            data-testid="button-tool-containment"
          >
            <Heart className="h-4 w-4 text-rose-500" />
            <span className="text-[10px] font-medium">Containment</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col items-center gap-1.5 h-auto py-2"
            onClick={() => onNavigate("/meditation")}
            data-testid="button-tool-meditation"
          >
            <Brain className="h-4 w-4 text-purple-500" />
            <span className="text-[10px] font-medium">Meditation</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col items-center gap-1.5 h-auto py-2"
            onClick={onStillnessOpen}
            data-testid="button-tool-stillness"
          >
            <Pause className="h-4 w-4 text-slate-500" />
            <span className="text-[10px] font-medium">Stillness</span>
          </Button>
        </div>

        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5">Use As Needed</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="flex flex-col items-center gap-1 h-auto py-2 opacity-80"
              onClick={() => onNavigate("/empathy")}
              data-testid="button-tool-eq-module"
            >
              <Brain className="h-4 w-4 text-emerald-500" />
              <span className="text-[10px]">EQ Module</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-1 h-auto py-2 opacity-80"
              onClick={() => onToolOpen("trigger")}
              data-testid="button-tool-trigger"
            >
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-[10px]">Trigger Log</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
