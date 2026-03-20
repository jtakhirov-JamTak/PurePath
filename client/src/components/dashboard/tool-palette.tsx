import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Brain, AlertTriangle } from "lucide-react";

interface ToolPaletteProps {
  onToolOpen: (tool: string) => void;
  onNavigate: (path: string) => void;
}

export function ToolPalette({ onToolOpen, onNavigate }: ToolPaletteProps) {
  return (
    <Card className="overflow-visible" data-testid="card-tools">
      <CardHeader className="pb-1.5 px-3 pt-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-bark">Tools</span>
      </CardHeader>
      <CardContent className="pb-3 px-3">
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
            onClick={() => onToolOpen("trigger")}
            data-testid="button-tool-trigger"
          >
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-[10px] font-medium">Trigger Log</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col items-center gap-1.5 h-auto py-2 opacity-80"
            onClick={() => onNavigate("/empathy")}
            data-testid="button-tool-eq-module"
          >
            <Brain className="h-4 w-4 text-emerald-500" />
            <span className="text-[10px] font-medium">EQ Module</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
