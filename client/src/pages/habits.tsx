import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Repeat, Plus, Trash2, Clock, Timer, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Habit } from "@shared/schema";

const DAYS = [
  { code: "mon", label: "Mon" },
  { code: "tue", label: "Tue" },
  { code: "wed", label: "Wed" },
  { code: "thu", label: "Thu" },
  { code: "fri", label: "Fri" },
  { code: "sat", label: "Sat" },
  { code: "sun", label: "Sun" },
];

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

export default function HabitsPage() {
  const queryClient = useQueryClient();
  const [habitDialogOpen, setHabitDialogOpen] = useState(false);

  const [selectedDays, setSelectedDays] = useState<string[]>(["mon", "wed", "fri"]);
  const [newHabit, setNewHabit] = useState({
    name: "",
    recurringType: "indefinite" as "indefinite" | "count",
    recurringCount: "30",
    duration: "15",
    startTime: "",
    endTime: "",
  });

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
  });

  const activeHabits = habits.filter(h => h.active);

  const toggleDay = (code: string) => {
    setSelectedDays(prev =>
      prev.includes(code) ? prev.filter(d => d !== code) : [...prev, code]
    );
  };

  const resetForm = () => {
    setNewHabit({ name: "", recurringType: "indefinite", recurringCount: "30", duration: "15", startTime: "", endTime: "" });
    setSelectedDays(["mon", "wed", "fri"]);
  };

  const createHabitMutation = useMutation({
    mutationFn: async (data: typeof newHabit) => {
      const cadence = selectedDays.sort((a, b) => {
        const order = DAYS.map(d => d.code);
        return order.indexOf(a) - order.indexOf(b);
      }).join(",");
      const recurring = data.recurringType === "indefinite" ? "indefinite" : data.recurringCount;
      const time = data.startTime || "09:00";
      return apiRequest("POST", "/api/habits", {
        name: data.name,
        cadence,
        recurring,
        duration: parseInt(data.duration) || null,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        time,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      setHabitDialogOpen(false);
      resetForm();
    },
  });

  const deleteHabitMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/habits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
    },
  });

  const canSubmit = newHabit.name.trim() !== "" && selectedDays.length > 0 && parseInt(newHabit.duration) > 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center">
            <Repeat className="h-7 w-7 text-cyan-500" />
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
            <Dialog open={habitDialogOpen} onOpenChange={setHabitDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={activeHabits.length >= 5} data-testid="button-add-habit">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Habit
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Habit</DialogTitle>
                  <DialogDescription>Create a recurring habit. We recommend starting with 3.</DialogDescription>
                </DialogHeader>
                <div className="space-y-5">
                  <div>
                    <Label>Habit</Label>
                    <Input
                      placeholder="e.g., Morning meditation, Exercise, Read"
                      value={newHabit.name}
                      onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                      data-testid="input-habit-name"
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block">Cadence (select days)</Label>
                    <div className="flex gap-1.5">
                      {DAYS.map(day => (
                        <button
                          key={day.code}
                          type="button"
                          onClick={() => toggleDay(day.code)}
                          className={`flex-1 py-2 text-xs font-medium rounded-md border transition-colors ${
                            selectedDays.includes(day.code)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover-elevate"
                          }`}
                          data-testid={`toggle-day-${day.code}`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Recurring</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <Select
                        value={newHabit.recurringType}
                        onValueChange={(v) => setNewHabit({ ...newHabit, recurringType: v as "indefinite" | "count" })}
                      >
                        <SelectTrigger className="w-[140px]" data-testid="select-recurring-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="indefinite">No End Date</SelectItem>
                          <SelectItem value="count">Weeks</SelectItem>
                        </SelectContent>
                      </Select>
                      {newHabit.recurringType === "count" && (
                        <Input
                          type="number"
                          min="1"
                          max="52"
                          value={newHabit.recurringCount}
                          onChange={(e) => setNewHabit({ ...newHabit, recurringCount: e.target.value })}
                          className="w-20"
                          data-testid="input-recurring-count"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="480"
                      value={newHabit.duration}
                      onChange={(e) => setNewHabit({ ...newHabit, duration: e.target.value })}
                      data-testid="input-duration"
                    />
                  </div>

                  <div>
                    <Label className="mb-1 block">
                      Start / End Time
                      <span className="text-muted-foreground font-normal ml-1">(optional, for calendar)</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Select value={newHabit.startTime || "none"} onValueChange={(v) => setNewHabit({ ...newHabit, startTime: v === "none" ? "" : v })}>
                          <SelectTrigger data-testid="select-start-time">
                            <SelectValue placeholder="Start" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            <SelectItem value="none">No start time</SelectItem>
                            {TIME_SLOTS.map(t => (
                              <SelectItem key={t} value={t}>{formatTimeLabel(t)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Select value={newHabit.endTime || "none"} onValueChange={(v) => setNewHabit({ ...newHabit, endTime: v === "none" ? "" : v })}>
                          <SelectTrigger data-testid="select-end-time">
                            <SelectValue placeholder="End" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            <SelectItem value="none">No end time</SelectItem>
                            {TIME_SLOTS.filter(t => !newHabit.startTime || t > newHabit.startTime).map(t => (
                              <SelectItem key={t} value={t}>{formatTimeLabel(t)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => createHabitMutation.mutate(newHabit)}
                    disabled={!canSubmit || createHabitMutation.isPending}
                    data-testid="button-submit-habit"
                  >
                    Add Habit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
            <div className="space-y-3">
              {activeHabits.map(habit => (
                <Card key={habit.id} data-testid={`card-habit-${habit.id}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                          <Repeat className="h-5 w-5 text-cyan-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate" data-testid={`text-habit-name-${habit.id}`}>{habit.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {formatCadence(habit.cadence)}
                            </Badge>
                            {habit.duration && (
                              <span className="flex items-center gap-1 text-xs">
                                <Timer className="h-3 w-3" />
                                {habit.duration}m
                              </span>
                            )}
                            {habit.recurring && habit.recurring !== "indefinite" ? (
                              <span className="text-xs">{habit.recurring} weeks</span>
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
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteHabitMutation.mutate(habit.id)}
                        data-testid={`button-delete-habit-${habit.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
