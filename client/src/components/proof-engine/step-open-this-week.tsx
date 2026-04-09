import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { OpeningData } from "@/lib/proof-engine-logic";

interface Props {
  openingData: OpeningData;
  onOpeningChange: (field: keyof OpeningData, value: string) => void;
}

export function StepOpenThisWeek({ openingData, onOpeningChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Open this week</h2>
        <p className="text-sm text-muted-foreground">Set the tone before planning. Be honest.</p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">What story did I tell myself last week when I avoided what mattered?</Label>
        <Textarea
          value={openingData.openStory}
          onChange={(e) => onOpeningChange("openStory", e.target.value)}
          placeholder="The story I used to justify not doing the hard thing..."
          rows={3}
          className="resize-none text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">What hard truth is that story helping me avoid — and what is it costing me?</Label>
        <Textarea
          value={openingData.openHardTruth}
          onChange={(e) => onOpeningChange("openHardTruth", e.target.value)}
          placeholder="The uncomfortable reality I'm not facing, and the real cost..."
          rows={3}
          className="resize-none text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">What hard action will I take this week that proves I accepted that hard truth?</Label>
        <Textarea
          value={openingData.openHardAction}
          onChange={(e) => onOpeningChange("openHardAction", e.target.value)}
          placeholder="One specific, uncomfortable action I will do this week..."
          rows={3}
          className="resize-none text-sm"
        />
      </div>
    </div>
  );
}
