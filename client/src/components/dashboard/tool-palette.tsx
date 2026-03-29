import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
        <div className="space-y-1.5">
          <button
            className="flex items-center gap-3 w-full rounded-lg border border-border/60 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none"
            onClick={() => onToolOpen("containment")}
            data-testid="button-tool-containment"
          >
            <Heart className="h-4 w-4 text-rose-500 shrink-0" />
            <div>
              <p className="text-xs font-medium">Containment</p>
              <p className="text-[10px] text-muted-foreground">Slow down before reacting</p>
            </div>
          </button>
          <button
            className="flex items-center gap-3 w-full rounded-lg border border-border/60 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none"
            onClick={() => onToolOpen("trigger")}
            data-testid="button-tool-trigger"
          >
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs font-medium">Trigger Log</p>
              <p className="text-[10px] text-muted-foreground">Track what set you off</p>
            </div>
          </button>
          <button
            className="flex items-center gap-3 w-full rounded-lg border border-border/60 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none"
            onClick={() => onNavigate("/empathy")}
            data-testid="button-tool-eq-module"
          >
            <Brain className="h-4 w-4 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs font-medium">EQ Module</p>
              <p className="text-[10px] text-muted-foreground">Build emotional awareness</p>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
