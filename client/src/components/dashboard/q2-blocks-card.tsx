import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Q2TimeTracker, formatTime24to12 } from "./q2-time-tracker";
import type { EisenhowerEntry } from "@shared/schema";

const CATEGORY_STYLES: Record<string, string> = {
  health: "bg-emerald-500",
  wealth: "bg-yellow-400",
  relationships: "bg-rose-500",
  "self-development": "bg-blue-500",
  happiness: "bg-slate-300 dark:bg-slate-400",
  career: "bg-blue-500",
  mindfulness: "bg-blue-500",
  learning: "bg-blue-500",
  leisure: "bg-slate-300 dark:bg-slate-400",
};

interface Q2BlocksCardProps {
  todayQ2Items: EisenhowerEntry[];
  onUpdateLevel: (id: number, level: number | null, options?: { isBinary?: boolean }) => void;
  onSkipDialog: (item: { id: number; durationMinutes?: number | null; timeEstimate?: string | null }) => void;
  onSaveTimeTracker: (id: number, level: number, fields: Record<string, unknown>) => void;
}

export function Q2BlocksCard({ todayQ2Items, onUpdateLevel, onSkipDialog, onSaveTimeTracker }: Q2BlocksCardProps) {
  if (todayQ2Items.length === 0) return null;

  return (
    <Card className="overflow-visible" data-testid="card-q2-blocks">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-serif">Scheduled Q2 Blocks</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <ul className="space-y-2">
          {todayQ2Items.map((item) => {
            const status = item.status || null;
            const roleDot = CATEGORY_STYLES[(item.role as string) || "health"] || CATEGORY_STYLES.health;
            const isBin = item.isBinary || false;
            const lvl = item.completionLevel ?? null;
            const cycleQ2 = () => {
              if (isBin) {
                if (lvl === null) onUpdateLevel(item.id, 1, { isBinary: true });
                else if (lvl === 1) onSkipDialog({ id: item.id, durationMinutes: item.durationMinutes, timeEstimate: item.timeEstimate });
                else onUpdateLevel(item.id, null);
              } else {
                if (lvl === null) onUpdateLevel(item.id, 2);
                else if (lvl === 2) onUpdateLevel(item.id, 1);
                else if (lvl === 1) onSkipDialog({ id: item.id, durationMinutes: item.durationMinutes, timeEstimate: item.timeEstimate });
                else onUpdateLevel(item.id, null);
              }
            };
            const boxLabel = isBin
              ? (lvl === 1 ? "Done" : lvl === 0 ? "Skip" : "—")
              : (lvl === 2 ? "Full" : lvl === 1 ? "Min" : lvl === 0 ? "Skip" : "—");
            const boxClass =
              (lvl === 2 || (isBin && lvl === 1)) ? "bg-emerald-500 border-emerald-600 text-white"
              : lvl === 1 ? "bg-yellow-300 border-yellow-400 text-yellow-800 dark:bg-yellow-400/40 dark:border-yellow-400/60 dark:text-yellow-200"
              : lvl === 0 ? "bg-red-400 border-red-500 text-white dark:bg-red-500/40 dark:border-red-500/60"
              : "border-border text-muted-foreground";
            return (
              <li key={item.id} className="flex flex-col gap-1" data-testid={`q2-block-${item.id}`}>
                <div className="flex items-center gap-3">
                <button
                  onClick={cycleQ2}
                  className={`h-5 w-12 text-[10px] rounded-md border-2 shrink-0 font-medium cursor-pointer ${boxClass}`}
                  data-testid={`q2-level-${item.id}`}
                >
                  {boxLabel}
                </button>
                <span className={`h-2 w-2 rounded-full shrink-0 ${roleDot}`} />
                <span className={`text-sm flex-1 ${
                  status === "completed" ? "line-through text-muted-foreground"
                  : status === "skipped" ? "text-muted-foreground italic"
                  : ""
                }`}>{item.task}</span>
                {(item.scheduledTime || item.scheduledStartTime) && (
                  <span className="text-xs text-muted-foreground">{item.scheduledTime || formatTime24to12(item.scheduledStartTime!)}</span>
                )}
                {item.durationMinutes && (
                  <Badge variant="outline" className="text-[10px]">{item.durationMinutes}m</Badge>
                )}
                {status && (
                  <span className="text-xs text-muted-foreground">{status}</span>
                )}
                </div>
                {(item.completionLevel === 1 || item.completionLevel === 2) && (
                  <Q2TimeTracker item={item} onSave={(fields) => {
                    onSaveTimeTracker(item.id, item.completionLevel!, fields);
                  }} />
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
