import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Minus, Plus } from "lucide-react";
import type { Habit } from "@shared/schema";
import { CATEGORY_COLORS, TIMING_ORDER, TIMING_LABELS } from "@/lib/constants";
import { getHabitLabel, getCompletionBoxClass, getNextHabitLevel } from "@/lib/completion";

interface JournalHabitItem {
  id: number;
  name: string;
  isMorning: boolean;
  done: boolean;
  skipped: boolean;
}

interface DailyHabitsCardProps {
  todayStr: string;
  todaysHabits: Habit[];
  journalHabitItems: JournalHabitItem[];
  habitStatusMap: Map<number, string>;
  habitLevelMap: Map<number, number>;
  completedHabits: number;
  totalHabits: number;
  onHabitLevel: (habitId: number, level: number | null, options?: { isBinary?: boolean }) => void;
  onHabitSkip: (habitId: number) => void;
  onNavigate: (path: string) => void;
}

export function DailyHabitsCard({
  todayStr,
  todaysHabits,
  journalHabitItems,
  habitStatusMap,
  habitLevelMap,
  completedHabits,
  totalHabits,
  onHabitLevel,
  onHabitSkip,
  onNavigate,
}: DailyHabitsCardProps) {
  // Sort habits by time of day
  const sortedHabits = [...todaysHabits]
    .sort((a, b) => (TIMING_ORDER[a.timing || "afternoon"] ?? 1) - (TIMING_ORDER[b.timing || "afternoon"] ?? 1))
    .slice(0, 3);

  if (sortedHabits.length === 0 && journalHabitItems.length === 0) {
    return (
      <Card className="overflow-visible" data-testid="card-no-habits">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground" data-testid="text-no-habits">No habits due today.</p>
          <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => onNavigate("/habits")} data-testid="button-add-habits">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Set up habits
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-visible" data-testid="card-daily-habits">
      <CardHeader className="pb-1.5 px-3 pt-2.5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <span className="text-xs font-medium uppercase tracking-wide text-bark">Daily Habits</span>
          <span className="text-[11px] text-muted-foreground" data-testid="text-habits-progress">
            {completedHabits}/{totalHabits} done
          </span>
        </div>
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden mt-1.5">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 0}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="pb-3 px-3">
        <ul className="space-y-0.5">
          {journalHabitItems.map((jh) => (
            <li key={jh.id} className="flex items-center gap-2.5 py-1.5" data-testid={`journal-habit-${jh.isMorning ? "morning" : "evening"}`}>
              <div className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${
                jh.done ? "bg-primary border-primary" : jh.skipped ? "bg-yellow-300 border-yellow-400 dark:bg-yellow-400/30 dark:border-yellow-400/50" : "border-border"
              }`}>
                {jh.done && <Check className="h-3 w-3 text-primary-foreground" />}
                {jh.skipped && <Minus className="h-3 w-3 text-yellow-700 dark:text-yellow-300" />}
              </div>
              <span className="h-2 w-2 rounded-full shrink-0 bg-violet-400" />
              <button
                className={`text-xs flex-1 text-left hover:underline ${jh.done ? "line-through text-muted-foreground" : jh.skipped ? "text-muted-foreground italic" : ""}`}
                onClick={() => {
                  const session = jh.isMorning ? "morning" : "evening";
                  onNavigate(`/journal/${todayStr}/${session}`);
                }}
                data-testid={`button-journal-habit-${jh.isMorning ? "morning" : "evening"}`}
              >
                {jh.name}
              </button>
              {jh.done && <span className="text-[10px] text-muted-foreground">done</span>}
              {jh.skipped && <span className="text-[10px] text-muted-foreground">skipped</span>}
            </li>
          ))}
          {sortedHabits.map((habit) => {
            const level = habitLevelMap.get(habit.id) ?? null;
            const status = habitStatusMap.get(habit.id) || null;
            const timingLabel = TIMING_LABELS[habit.timing || "afternoon"] || "PM";

            const cycleHabit = () => {
              const nextLevel = getNextHabitLevel(level);
              if (nextLevel === 0) {
                onHabitSkip(habit.id);
              } else {
                onHabitLevel(habit.id, nextLevel, { isBinary: false });
              }
            };

            const boxLabel = getHabitLabel(level);
            const boxClass = getCompletionBoxClass(status);

            return (
              <li key={habit.id} className="flex items-center gap-2.5 py-1.5" data-testid={`habit-item-${habit.id}`}>
                <button
                  onClick={cycleHabit}
                  className={`h-5 w-12 text-[10px] rounded-md border-2 shrink-0 font-medium cursor-pointer ${boxClass}`}
                  data-testid={`habit-level-${habit.id}`}
                >
                  {boxLabel}
                </button>
                <span className={`h-2 w-2 rounded-full shrink-0 ${CATEGORY_COLORS[habit.category || "health"] || "bg-emerald-500"}`} />
                <span className="text-[10px] text-muted-foreground w-6 shrink-0">{timingLabel}</span>
                <span className={`text-xs flex-1 ${
                  status === "completed" ? "line-through text-muted-foreground" : status === "skipped" ? "text-muted-foreground italic" : ""
                }`}>
                  {habit.name}
                </span>
                {status === "skipped" && (
                  <span className="text-[10px] text-muted-foreground">skipped</span>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
