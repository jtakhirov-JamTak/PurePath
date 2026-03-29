import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";
import { JOURNAL_STATE } from "@/lib/constants";

export function JournalQuickEntry({
  todayStr,
  hasMorning,
  hasEvening,
  setLocation,
  firstName,
}: {
  todayStr: string;
  hasMorning: boolean;
  hasEvening: boolean;
  setLocation: (path: string) => void;
  firstName: string;
}) {
  const bothDone = hasMorning && hasEvening;
  const displayName = firstName || "there";
  const hour = new Date().getHours();

  if (bothDone) {
    return (
      <Card className={`overflow-visible border-l-4 ${JOURNAL_STATE.done}`} data-testid="card-journal-quick">
        <CardContent className="py-2 px-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            <span data-testid="text-journals-complete">Journals complete for today</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasMorning) {
    return (
      <Card className={`overflow-visible border-l-4 ${hour < 12 ? JOURNAL_STATE.morningActive : JOURNAL_STATE.morningMissed}`} data-testid="card-journal-quick">
        <CardHeader className="py-2 px-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium" data-testid="text-journal-greeting">
                Good morning, {displayName}
              </p>
              <p className="text-xs text-muted-foreground">Start your day with intention</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-3 px-3">
          <Button
            size="sm"
            className="text-xs"
            onClick={() => {
              setLocation(`/journal/${todayStr}/morning`);
              window.scrollTo(0, 0);
            }}
            data-testid="button-start-morning-journal"
          >
            Start Morning Journal
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`overflow-visible border-l-4 ${hour >= 17 ? JOURNAL_STATE.eveningActive : JOURNAL_STATE.eveningDefault}`} data-testid="card-journal-quick">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-medium" data-testid="text-journal-greeting">
              How was your day?
            </p>
            <p className="text-xs text-muted-foreground">Take a moment to reflect</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3 px-3">
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => {
            setLocation(`/journal/${todayStr}/evening`);
            window.scrollTo(0, 0);
          }}
          data-testid="button-start-evening-journal"
        >
          Start Evening Journal
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
