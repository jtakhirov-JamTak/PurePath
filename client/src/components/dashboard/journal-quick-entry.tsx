import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sun, Moon, Check, ArrowRight } from "lucide-react";

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

  if (bothDone) {
    return (
      <Card className="overflow-visible" data-testid="card-journal-quick">
        <CardContent className="py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-emerald-500" />
            <span data-testid="text-journals-complete">Journals complete for today</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasMorning) {
    return (
      <Card className="overflow-visible border-l-4 border-l-primary" data-testid="card-journal-quick">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-lg font-serif" data-testid="text-journal-greeting">
                <Sun className="h-5 w-5 inline mr-1.5 text-amber-500" />
                Good morning, {displayName}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Start your day with intention</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">What are you grateful for?</label>
              <Input
                placeholder="Today I'm grateful for..."
                className="text-sm"
                readOnly
                onFocus={() => {
                  setLocation(`/journal/${todayStr}/morning`);
                  window.scrollTo(0, 0);
                }}
                data-testid="input-gratitude-preview"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">What's your intention?</label>
              <Input
                placeholder="Today I intend to..."
                className="text-sm"
                readOnly
                onFocus={() => {
                  setLocation(`/journal/${todayStr}/morning`);
                  window.scrollTo(0, 0);
                }}
                data-testid="input-intention-preview"
              />
            </div>
          </div>
          <Button
            onClick={() => {
              setLocation(`/journal/${todayStr}/morning`);
              window.scrollTo(0, 0);
            }}
            className="w-full"
            data-testid="button-start-morning-journal"
          >
            <Sun className="h-4 w-4 mr-2" />
            Start Morning Journal
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-visible border-l-4 border-l-primary/50" data-testid="card-journal-quick">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-base font-serif" data-testid="text-journal-greeting">
              <Moon className="h-4 w-4 inline mr-1.5 text-indigo-400" />
              How was your day?
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Take a moment to reflect</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <Button
          variant="outline"
          onClick={() => {
            setLocation(`/journal/${todayStr}/evening`);
            window.scrollTo(0, 0);
          }}
          className="w-full"
          data-testid="button-start-evening-journal"
        >
          <Moon className="h-4 w-4 mr-2" />
          Start Evening Journal
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
