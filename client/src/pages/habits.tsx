import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HabitDialog } from "@/components/habit-dialog";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Repeat, Plus, Trash2, Timer, Pencil, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { FlowBar } from "@/components/flow-bar";
import { apiRequest } from "@/lib/queryClient";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { HABIT_CATEGORIES } from "@shared/schema";
import type { Habit } from "@shared/schema";

const CATEGORY_DOTS: Record<string, string> = {
  health: "bg-emerald-500",
  wealth: "bg-yellow-400",
  relationships: "bg-rose-500",
  "self-development": "bg-blue-500",
  happiness: "bg-slate-400",
};

const TIMING_ORDER: Record<string, number> = {
  morning: 0,
  afternoon: 1,
  evening: 2,
};

const TIMING_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

const MAX_HABITS = 3;

export default function HabitsPage() {
  const [habitDialogOpen, setHabitDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
  });

  const activeHabits = habits
    .filter(h => h.active)
    .sort((a, b) => (TIMING_ORDER[a.timing || "afternoon"] ?? 1) - (TIMING_ORDER[b.timing || "afternoon"] ?? 1));

  const pastHabits = habits
    .filter(h => !h.active)
    .sort((a, b) => new Date(b.endDate || b.createdAt).getTime() - new Date(a.endDate || a.createdAt).getTime());

  const atLimit = activeHabits.length >= MAX_HABITS;
  const [showPastHabits, setShowPastHabits] = useState(false);

  const openEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setHabitDialogOpen(true);
  };

  const deleteHabitMutation = useToastMutation<number>({
    mutationFn: async (id) => {
      const res = await apiRequest("DELETE", `/api/habits/${id}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to delete habit");
      }
    },
    invalidateKeys: ["/api/habits"],
    errorToast: "Could not delete habit",
  });

  const newVersionMutation = useToastMutation<number>({
    mutationFn: async (id) => {
      const res = await apiRequest("POST", `/api/habits/${id}/new-version`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to create new version");
      }
    },
    invalidateKeys: ["/api/habits"],
    successToast: { title: "New version created", description: "Previous completions are preserved." },
    errorToast: "Could not create new version",
  });

  return (
    <AppLayout>
      <FlowBar fallback="/plan" doneLabel="Done" />

      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="flex items-center gap-4 mb-10">
          <div className="h-8 w-8 rounded-xl bg-primary/[0.08] flex items-center justify-center">
            <Repeat className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-medium" data-testid="text-page-title">Habits</h1>
            <p className="text-muted-foreground">3 daily habits — keep it simple</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[11px] text-muted-foreground" data-testid="text-habit-count">
              {activeHabits.length}/{MAX_HABITS} habits
            </p>
            {atLimit ? (
              <p className="text-[11px] text-muted-foreground italic">
                3 habit maximum reached
              </p>
            ) : (
              <Button
                onClick={() => { setEditingHabit(null); setHabitDialogOpen(true); }}
                data-testid="button-add-habit"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Habit
              </Button>
            )}
            <HabitDialog
              open={habitDialogOpen}
              onOpenChange={(open) => {
                setHabitDialogOpen(open);
                if (!open) setEditingHabit(null);
              }}
              editingHabit={editingHabit}
            />
          </div>

          {activeHabits.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Repeat className="h-8 w-8 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No habits yet</p>
                <p className="text-sm text-muted-foreground mt-1">Add up to 3 daily habits to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeHabits.map(habit => (
                <Card key={habit.id} data-testid={`card-habit-${habit.id}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/[0.08] flex items-center justify-center">
                          <Repeat className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate" data-testid={`text-habit-name-${habit.id}`}>
                            {habit.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs" data-testid={`badge-category-${habit.id}`}>
                              <span className={`h-2 w-2 rounded-full mr-1 ${CATEGORY_DOTS[habit.category || "health"] || "bg-emerald-500"}`} />
                              {HABIT_CATEGORIES[(habit.category as keyof typeof HABIT_CATEGORIES) || "health"]?.label || "Health"}
                            </Badge>
                            <Badge variant="outline" className="text-xs" data-testid={`badge-timing-${habit.id}`}>
                              {TIMING_LABELS[habit.timing || "afternoon"] || "Afternoon"}
                            </Badge>
                            {habit.duration && habit.duration > 0 && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Timer className="h-3 w-3" />
                                {habit.duration} min
                              </span>
                            )}
                            {(!habit.duration || habit.duration === 0) && (
                              <span className="text-xs text-muted-foreground">Yes / No</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
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
                          onClick={() => newVersionMutation.mutate(habit.id)}
                          title="Start fresh version (preserves history)"
                          data-testid={`button-new-version-${habit.id}`}
                        >
                          <RefreshCw className="h-4 w-4" />
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
              ))}
            </div>
          )}

          {pastHabits.length > 0 && (
            <div className="pt-4 border-t" data-testid="section-past-habits">
              <button
                onClick={() => setShowPastHabits(!showPastHabits)}
                className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-bark font-medium cursor-pointer"
                data-testid="button-toggle-past-habits"
              >
                Past Habits ({pastHabits.length})
                {showPastHabits ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {showPastHabits && (
                <div className="mt-2 space-y-1">
                  {pastHabits.map(habit => (
                    <div key={habit.id} className="flex items-center gap-2 py-1" data-testid={`past-habit-${habit.id}`}>
                      <div className={`h-2 w-2 rounded-full shrink-0 ${CATEGORY_DOTS[habit.category || "health"] || "bg-emerald-500"}`} />
                      <span className="text-[13px] text-muted-foreground flex-1 truncate">{habit.name}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {habit.startDate || "—"} – {habit.endDate || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
