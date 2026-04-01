import { Card, CardContent } from "@/components/ui/card";
import { Zap } from "lucide-react";

const DOMAIN_COLORS: Record<string, string> = {
  health: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  wealth: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  relationships: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  growth: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  joy: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

interface VisionCardProps {
  domain: string;
  scene: string;
  proofPoint: string;
  metric: string;
  ifThenPlan: string;
}

export function VisionCard({ domain, scene, proofPoint, metric, ifThenPlan }: VisionCardProps) {
  const colorClass = DOMAIN_COLORS[domain.toLowerCase()] || "bg-muted text-muted-foreground";

  return (
    <Card className="overflow-hidden" data-testid="vision-card">
      <CardContent className="p-4 space-y-3">
        {domain && (
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${colorClass}`}>
            {domain.charAt(0).toUpperCase() + domain.slice(1)}
          </span>
        )}

        {scene && (
          <p className="text-sm leading-relaxed">{scene}</p>
        )}

        {(proofPoint || metric) && (
          <div className="flex items-start gap-3 text-xs text-muted-foreground">
            {proofPoint && <span className="flex-1"><span className="font-medium text-foreground/70">Proof:</span> {proofPoint}</span>}
            {metric && <span className="shrink-0 font-mono text-foreground/70">{metric}</span>}
          </div>
        )}

        {ifThenPlan && (
          <div className="rounded-md bg-muted/50 px-3 py-2 flex items-start gap-2">
            <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs italic text-foreground/80">{ifThenPlan}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
