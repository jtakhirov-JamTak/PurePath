import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Sun, Moon } from "lucide-react";
import type { Habit, HabitCompletion } from "@shared/schema";
import { CATEGORY_COLORS, TIMING_ORDER, TIMING_LABELS, HABIT_UNDONE_BG } from "@/lib/constants";
import { getHabitLabel, getCompletionBoxClass, getNextHabitLevel } from "@/lib/completion";
import { format, addDays } from "date-fns";

interface JournalHabitItem {
  id: number;
  name: string;
  session: "morning" | "evening";
  done: boolean;
}

interface DailyHabitsCardProps {
  todayStr: string;
  selectedDate: string;
  readOnly?: boolean;
  selectedHabits: Habit[];
  journalHabitItems: JournalHabitItem[];
  habitStatusMap: Map<number, string>;
  habitLevelMap: Map<number, number>;
  completedHabits: number;
  totalHabits: number;
  weekStreakCompletions: HabitCompletion[];
  journalDayMap: { morning: Set<string>; evening: Set<string> };
  onHabitLevel: (habitId: number, level: number | null, options?: { isBinary?: boolean }) => void;
  onHabitSkip: (habitId: number) => void;
  onNavigate: (path: string) => void;
}

export function DailyHabitsCard({
  todayStr,
  selectedDate,
  readOnly,
  selectedHabits,
  journalHabitItems,
  habitStatusMap,
  habitLevelMap,
  completedHabits,
  totalHabits,
  weekStreakCompletions,
  journalDayMap,
  onHabitLevel,
  onHabitSkip,
  onNavigate,
}: DailyHabitsCardProps) {
  const [popKeys, setPopKeys] = useState<Record<number, number>>({});

  // Streak dots: last 7 days + per-habit completion map
  const last7Days = useMemo(() => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      days.push(format(addDays(new Date(todayStr + "T12:00:00"), -i), "yyyy-MM-dd"));
    }
    return days;
  }, [todayStr]);

  const streakMap = useMemo(() => {
    const map = new Map<number, Map<string, number | null>>();
    weekStreakCompletions.forEach(hc => {
      if (!map.has(hc.habitId)) map.set(hc.habitId, new Map());
      map.get(hc.habitId)!.set(hc.date, hc.completionLevel);
    });
    return map;
  }, [weekStreakCompletions]);

  // Sort habits by time of day (capping already handled by parent)
  const sortedHabits = [...selectedHabits]
    .sort((a, b) => (TIMING_ORDER[a.timing || "afternoon"] ?? 1) - (TIMING_ORDER[b.timing || "afternoon"] ?? 1));

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
          {journalHabitItems.map((jh) => {
            const Icon = jh.session === "morning" ? Sun : Moon;
            const sessionDays = journalDayMap[jh.session];
            return (
              <li key={jh.id} className="py-1.5" data-testid={`journal-row-${jh.session}`}>
                <button
                  className="flex items-center gap-2.5 w-full text-left cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => onNavigate(`/journal/${selectedDate}/${jh.session}`)}
                  data-testid={`button-journal-${jh.session}`}
                >
                  <div className={`h-5 w-12 rounded-md border-2 shrink-0 flex items-center justify-center ${
                    jh.done ? "bg-emerald-500 border-emerald-600" : "border-border"
                  }`}>
                    <Icon className={`h-3 w-3 ${jh.done ? "text-white" : "text-muted-foreground"}`} />
                  </div>
                  <span className="h-2 w-2 rounded-full shrink-0 bg-violet-400" />
                  <span className={`text-xs flex-1 ${jh.done ? "line-through text-muted-foreground" : ""}`}>
                    {jh.name}
                  </span>
                  {jh.done && <span className="text-[10px] text-muted-foreground">done</span>}
                </button>
                {/* 7-dot journal streak */}
                <div className="flex gap-0.5 ml-[4.75rem] mt-0.5">
                  {last7Days.map(dayStr => {
                    const done = sessionDays.has(dayStr);
                    const isToday = dayStr === todayStr;
                    return (
                      <span
                        key={dayStr}
                        className={`h-1.5 w-1.5 rounded-full ${
                          done ? "bg-emerald-500"
                          : isToday ? "ring-1 ring-border bg-transparent"
                          : "bg-muted"
                        }`}
                      />
                    );
                  })}
                </div>
              </li>
            );
          })}
          {sortedHabits.map((habit) => {
            const level = habitLevelMap.get(habit.id) ?? null;
            const status = habitStatusMap.get(habit.id) || null;
            const timingLabel = TIMING_LABELS[habit.timing || "afternoon"] || "PM";

            const cycleHabit = () => {
              if (readOnly) return;
              setPopKeys(prev => ({ ...prev, [habit.id]: (prev[habit.id] || 0) + 1 }));
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
              <li key={habit.id} className={`py-1.5 transition-opacity duration-200 ${status === "skipped" ? "opacity-60" : ""}`} data-testid={`habit-item-${habit.id}`}>
                <div className="flex items-center gap-2.5">
                  <button
                    key={popKeys[habit.id] || 0}
                    onClick={cycleHabit}
                    className={`h-5 w-12 text-[10px] rounded-md border-2 shrink-0 font-medium ${readOnly ? "cursor-default opacity-50" : "cursor-pointer"} ${(popKeys[habit.id] || 0) > 0 ? "animate-tap-pop" : ""} ${boxClass} ${!status ? HABIT_UNDONE_BG : ""}`}
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
                </div>
                {/* 7-dot streak row */}
                <div className="flex gap-0.5 ml-[4.75rem] mt-0.5">
                  {last7Days.map(dayStr => {
                    const lvl = streakMap.get(habit.id)?.get(dayStr) ?? null;
                    const isToday = dayStr === todayStr;
                    return (
                      <span
                        key={dayStr}
                        className={`h-1.5 w-1.5 rounded-full ${
                          lvl === 2 ? "bg-emerald-500"
                          : lvl === 1 ? "bg-yellow-400"
                          : lvl === 0 ? "bg-rose-400"
                          : isToday ? "ring-1 ring-border bg-transparent"
                          : "bg-muted"
                        } ${isToday && lvl !== null && lvl > 0 ? "animate-dot-spring" : ""}`}
                      />
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
