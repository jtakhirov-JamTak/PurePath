import { useReturnTo } from "@/hooks/use-return-to";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Check } from "lucide-react";

interface FlowBarProps {
  fallback?: string;
  doneLabel?: string;
  onDone?: () => void;
}

export function FlowBar({ fallback = "/week", doneLabel, onDone }: FlowBarProps) {
  const { returnTo, finish } = useReturnTo(fallback);

  const handleDone = () => {
    if (onDone) onDone();
    finish();
  };

  return (
    <div className="sticky top-[57px] z-40 bg-background/95 backdrop-blur-md border-b" data-testid="flow-bar">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => finish()}
          className="gap-1 text-muted-foreground hover:text-foreground -ml-2"
          data-testid="flow-bar-back"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        {doneLabel && (
          <Button
            size="sm"
            onClick={handleDone}
            className="gap-1"
            data-testid="flow-bar-done"
          >
            {doneLabel}
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
