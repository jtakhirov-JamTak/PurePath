import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HabitDialog } from "@/components/habit-dialog";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Repeat, Plus, Trash2, Clock, Timer, Calendar, Pencil, Copy } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Habit } from "@shared/schema";
import { HABIT_CATEGORIES, type HabitCategory } from "@shared/schema";

const DAYS = [
  { code: "mon", label: "Mon" },
  { code: "tue", label: "Tue" },
  { code: "wed", label: "Wed" },
  { code: "thu", label: "Thu" },
  { code: "fri", label: "Fri" },
  { code: "sat", label: "Sat" },
  { code: "sun", label: "Sun" },
];

const DAY_CODE_MAP: Record<number, string> = {
  0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
};

function generateTimeSlots() {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = h.toString().padStart(2, "0");
      const mm = m.toString().padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function formatTimeLabel(time: string) {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr} ${suffix}`;
}

function formatCadence(cadence: string): string {
  const codes = cadence.split(",");
  if (codes.length === 7) return "Every day";
  if (codes.length === 5 && !codes.includes("sat") && !codes.includes("sun")) return "Weekdays";
  if (codes.length === 2 && codes.includes("sat") && codes.includes("sun")) return "Weekends";
  return codes.map(c => DAYS.find(d => d.code === c)?.label || c).join(", ");
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}


const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  health: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-500" },
  wealth: { bg: "bg-yellow-400/10", text: "text-yellow-600 dark:text-yellow-400", border: "border-yellow-400/30", dot: "bg-yellow-400" },
  relationships: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/30", dot: "bg-rose-500" },
  "self-development": { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30", dot: "bg-blue-500" },
  happiness: { bg: "bg-slate-300/10", text: "text-slate-600 dark:text-slate-300", border: "border-slate-300/30", dot: "bg-slate-300 dark:bg-slate-400" },
  career: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30", dot: "bg-blue-500" },
  mindfulness: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30", dot: "bg-blue-500" },
  learning: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30", dot: "bg-blue-500" },
  leisure: { bg: "bg-slate-300/10", text: "text-slate-600 dark:text-slate-300", border: "border-slate-300/30", dot: "bg-slate-300 dark:bg-slate-400" },
};

function getCategoryStyle(category: string | null) {
  return CATEGORY_STYLES[category || "health"] || CATEGORY_STYLES.health;
}

function getNextOccurrences(habit: Habit, count: number = 3): string[] {
  const codes = habit.cadence.split(",");
  const interval = habit.intervalWeeks || 1;
  const results: string[] = [];
  const start = new Date();
  start.setDate(start.getDate() + 1);

  const startDateObj = habit.startDate ? new Date(habit.startDate + "T00:00:00") : null;

  for (let i = 0; i < 90 && results.length < count; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dayCode = DAY_CODE_MAP[d.getDay()];
    if (!codes.includes(dayCode)) continue;

    if (habit.endDate && formatDate(d) > habit.endDate) break;
    if (habit.startDate && formatDate(d) < habit.startDate) continue;

    if (interval > 1 && startDateObj) {
      const daysDiff = Math.floor((d.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
      const weeksDiff = Math.floor(daysDiff / 7);
      if (weeksDiff % interval !== 0) continue;
    }

    results.push(d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }));
  }
  return results;
}

export default function HabitsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [habitDialogOpen, setHabitDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [defaultTiming, setDefaultTiming] = useState("afternoon");

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
  });

  const activeHabits = habits.filter(h => h.active);

  const openEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setHabitDialogOpen(true);
  };

  const deleteHabitMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/habits/${id}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to delete habit");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/habits"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not delete habit", description: error.message, variant: "destructive" });
    },
  });

  const duplicateHabitMutation = useMutation({
    mutationFn: async (habit: Habit) => {
      const res = await apiRequest("POST", "/api/habits", {
        name: `${habit.name} (copy)`,
        motivatingReason: habit.motivatingReason || null,
        category: habit.category,
        habitType: habit.habitType,
        timing: habit.timing,
        cadence: habit.cadence,
        recurring: habit.recurring,
        duration: habit.duration,
        startTime: habit.startTime || null,
        endTime: habit.endTime || null,
        time: habit.time || "09:00",
        startDate: formatDate(new Date()),
        endDate: null,
        intervalWeeks: habit.intervalWeeks || 1,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to duplicate habit");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/habits"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not duplicate habit", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex items-center gap-4 mb-10">
          <div className="h-14 w-14 rounded-xl bg-primary/[0.08] flex items-center justify-center">
            <Repeat className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold" data-testid="text-page-title">Habits</h1>
            <p className="text-muted-foreground">Build up to 5 recurring habits — we recommend starting with 3</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground" data-testid="text-habit-count">
              {activeHabits.length}/5 habits
            </p>
            <Button
              disabled={activeHabits.length >= 5}
              onClick={() => { setEditingHabit(null); setHabitDialogOpen(true); }}
              data-testid="button-add-habit"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Habit
            </Button>
            <HabitDialog
              open={habitDialogOpen}
              onOpenChange={(open) => {
                setHabitDialogOpen(open);
                if (!open) setEditingHabit(null);
              }}
              editingHabit={editingHabit}
              defaultTiming={defaultTiming}
            />
          </div>

          {activeHabits.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Repeat className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No habits yet</p>
                <p className="text-sm text-muted-foreground mt-1">Start with 3 habits and build from there</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeHabits.map(habit => {
                const style = getCategoryStyle(habit.category);
                return (
                  <Card key={habit.id} data-testid={`card-habit-${habit.id}`}>
                    <CardContent className="py-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/[0.08] flex items-center justify-center">
                            <div className={`h-3 w-3 rounded-full ${style.dot}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium truncate" data-testid={`text-habit-name-${habit.id}`}>{habit.name}</p>
                              <Badge variant="outline" className={`text-xs ${style.text} ${style.border}`} data-testid={`badge-category-${habit.id}`}>
                                {HABIT_CATEGORIES[(habit.category as HabitCategory) || "health"]?.label || "Health"}
                              </Badge>
                              {habit.habitType && habit.habitType !== "maintenance" && (
                                <Badge variant="secondary" className="text-xs" data-testid={`badge-habit-type-${habit.id}`}>
                                  {habit.habitType === "goal" ? "Goal" : "Learning"}
                                </Badge>
                              )}
                              {habit.timing && (
                                <Badge variant="outline" className="text-xs" data-testid={`badge-timing-${habit.id}`}>
                                  {habit.timing === "morning" ? "Morning" : habit.timing === "afternoon" ? "Afternoon" : "Evening"}
                                </Badge>
                              )}
                            </div>
                            {habit.motivatingReason && (
                              <p className="text-xs text-muted-foreground italic mt-0.5" data-testid={`text-reason-${habit.id}`}>
                                {habit.motivatingReason}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {formatCadence(habit.cadence)}
                                {(habit.intervalWeeks || 1) > 1 ? ` (every ${habit.intervalWeeks}w)` : ""}
                              </Badge>
                              {habit.duration && (
                                <span className="flex items-center gap-1 text-xs">
                                  <Timer className="h-3 w-3" />
                                  {habit.duration}m
                                </span>
                              )}
                              {habit.startDate && (
                                <span className="flex items-center gap-1 text-xs" data-testid={`text-start-date-${habit.id}`}>
                                  From {habit.startDate}
                                </span>
                              )}
                              {habit.endDate ? (
                                <span className="text-xs" data-testid={`text-end-date-${habit.id}`}>to {habit.endDate}</span>
                              ) : (
                                <span className="text-xs">No End Date</span>
                              )}
                              {habit.startTime && habit.endTime && (
                                <span className="flex items-center gap-1 text-xs">
                                  <Calendar className="h-3 w-3" />
                                  {formatTimeLabel(habit.startTime)} - {formatTimeLabel(habit.endTime)}
                                </span>
                              )}
                              {habit.startTime && !habit.endTime && (
                                <span className="flex items-center gap-1 text-xs">
                                  <Clock className="h-3 w-3" />
                                  {formatTimeLabel(habit.startTime)}
                                </span>
                              )}
                            </div>
                            {(() => {
                              const nextDates = getNextOccurrences(habit, 3);
                              if (nextDates.length === 0) return null;
                              return (
                                <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-next-dates-${habit.id}`}>
                                  Next: {nextDates.join(" · ")}
                                </p>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => duplicateHabitMutation.mutate(habit)}
                            disabled={activeHabits.length >= 5}
                            data-testid={`button-duplicate-habit-${habit.id}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(habit)}
                            data-testid={`button-edit-habit-${habit.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteHabitMutation.mutate(habit.id)}
                            data-testid={`button-delete-habit-${habit.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
