import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VoiceTextarea } from "@/components/voice-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  wealth: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30", dot: "bg-amber-500" },
  relationships: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/30", dot: "bg-rose-500" },
  career: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30", dot: "bg-blue-500" },
  mindfulness: { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/30", dot: "bg-violet-500" },
  learning: { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/30", dot: "bg-cyan-500" },
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
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [habitDialogOpen, setHabitDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>(["mon", "wed", "fri"]);
  const [newHabit, setNewHabit] = useState({
    name: "",
    motivatingReason: "",
    category: "health" as string,
    habitType: "maintenance" as string,
    timing: "afternoon" as string,
    recurringType: "indefinite" as "indefinite" | "count",
    recurringCount: "4",
    duration: "15",
    startTime: "",
    endTime: "",
    startDate: formatDate(new Date()),
    hasEndDate: false as boolean,
    endDate: "",
    intervalWeeks: "1",
  });

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
  });

  const activeHabits = habits.filter(h => h.active);

  const urlParamsHandled = useRef(false);
  const returnTo = useRef<string | null>(null);

  useEffect(() => {
    if (urlParamsHandled.current) return;
    const params = new URLSearchParams(search);
    const action = params.get("action");
    if (!action) return;

    const rt = params.get("returnTo");
    if (rt) returnTo.current = rt;

    if (action === "add") {
      urlParamsHandled.current = true;
      const timing = params.get("timing") || "afternoon";
      resetForm();
      setNewHabit(prev => ({ ...prev, timing }));
      setHabitDialogOpen(true);
      window.history.replaceState({}, "", "/habits");
    } else if (action === "edit" && habits.length > 0) {
      urlParamsHandled.current = true;
      const id = parseInt(params.get("id") || "");
      const habit = habits.find(h => h.id === id);
      if (habit) {
        openEdit(habit);
      }
      window.history.replaceState({}, "", "/habits");
    }
  }, [habits, search]);

  const toggleDay = (code: string) => {
    setSelectedDays(prev =>
      prev.includes(code) ? prev.filter(d => d !== code) : [...prev, code]
    );
  };

  const resetForm = () => {
    setNewHabit({ name: "", motivatingReason: "", category: "health", habitType: "maintenance", timing: "afternoon", recurringType: "indefinite", recurringCount: "4", duration: "15", startTime: "", endTime: "", startDate: formatDate(new Date()), hasEndDate: false, endDate: "", intervalWeeks: "1" });
    setSelectedDays(["mon", "wed", "fri"]);
  };

  const navigateBack = () => {
    if (returnTo.current) {
      const rt = returnTo.current;
      returnTo.current = null;
      setLocation(rt);
    }
  };

  const createHabitMutation = useMutation({
    mutationFn: async (data: typeof newHabit) => {
      const cadence = selectedDays.sort((a, b) => {
        const order = DAYS.map(d => d.code);
        return order.indexOf(a) - order.indexOf(b);
      }).join(",");
      const recurring = data.recurringType === "indefinite" ? "indefinite" : data.recurringCount;
      const time = data.startTime || "09:00";
      const res = await apiRequest("POST", "/api/habits", {
        name: data.name,
        motivatingReason: data.motivatingReason || null,
        category: data.category,
        habitType: data.habitType,
        timing: data.timing,
        cadence,
        recurring,
        duration: parseInt(data.duration) || null,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        time,
        startDate: data.startDate || null,
        endDate: data.hasEndDate && data.endDate ? data.endDate : null,
        intervalWeeks: parseInt(data.intervalWeeks) || 1,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to create habit");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/habits"] });
      setHabitDialogOpen(false);
      resetForm();
      navigateBack();
    },
    onError: (error: Error) => {
      toast({ title: "Could not add habit", description: error.message, variant: "destructive" });
    },
  });

  const updateHabitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof newHabit }) => {
      const cadence = selectedDays.sort((a, b) => {
        const order = DAYS.map(d => d.code);
        return order.indexOf(a) - order.indexOf(b);
      }).join(",");
      const recurring = data.recurringType === "indefinite" ? "indefinite" : data.recurringCount;
      const time = data.startTime || "09:00";
      const res = await apiRequest("PATCH", `/api/habits/${id}`, {
        name: data.name,
        motivatingReason: data.motivatingReason || null,
        category: data.category,
        habitType: data.habitType,
        timing: data.timing,
        cadence,
        recurring,
        duration: parseInt(data.duration) || null,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        time,
        startDate: data.startDate || null,
        endDate: data.hasEndDate && data.endDate ? data.endDate : null,
        intervalWeeks: parseInt(data.intervalWeeks) || 1,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update habit");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/habits"] });
      setHabitDialogOpen(false);
      setEditingHabit(null);
      resetForm();
      navigateBack();
    },
    onError: (error: Error) => {
      toast({ title: "Could not update habit", description: error.message, variant: "destructive" });
    },
  });

  const openEdit = (habit: Habit) => {
    const isCount = habit.recurring && habit.recurring !== "indefinite";
    setNewHabit({
      name: habit.name,
      motivatingReason: habit.motivatingReason || "",
      category: habit.category || "health",
      habitType: habit.habitType || "maintenance",
      timing: habit.timing === "daily" ? "afternoon" : (habit.timing || "afternoon"),
      recurringType: isCount ? "count" : "indefinite",
      recurringCount: isCount ? habit.recurring! : "4",
      duration: habit.duration?.toString() || "15",
      startTime: habit.startTime || "",
      endTime: habit.endTime || "",
      startDate: habit.startDate || formatDate(new Date()),
      hasEndDate: !!habit.endDate,
      endDate: habit.endDate || "",
      intervalWeeks: (habit.intervalWeeks || 1).toString(),
    });
    setSelectedDays(habit.cadence.split(","));
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

  const canSubmit = newHabit.name.trim() !== "" && newHabit.motivatingReason.trim() !== "" && selectedDays.length > 0 && parseInt(newHabit.duration) > 0;

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
            <Dialog open={habitDialogOpen} onOpenChange={(open) => {
              setHabitDialogOpen(open);
              if (!open) {
                setEditingHabit(null);
                resetForm();
                navigateBack();
              }
            }}>
              <DialogTrigger asChild>
                <Button disabled={activeHabits.length >= 5} data-testid="button-add-habit">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Habit
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>{editingHabit ? "Edit Habit" : "Add Habit"}</DialogTitle>
                  <DialogDescription>
                    {editingHabit ? "Update your habit details." : "Create a recurring habit. We recommend starting with 3."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 overflow-y-auto flex-1 pr-1">
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
                    <Label>
                      Why does this matter to you? <span className="text-destructive">*</span>
                    </Label>
                    <VoiceTextarea
                      placeholder="Your personal reason — this keeps you going when motivation dips"
                      value={newHabit.motivatingReason}
                      onChange={(val) => setNewHabit({ ...newHabit, motivatingReason: val })}
                      className="resize-none text-sm"
                      rows={2}
                      data-testid="input-motivating-reason"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={newHabit.category}
                        onValueChange={(v) => setNewHabit({ ...newHabit, category: v })}
                      >
                        <SelectTrigger data-testid="select-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(HABIT_CATEGORIES).map(([key, cat]) => {
                            const style = getCategoryStyle(key);
                            return (
                              <SelectItem key={key} value={key}>
                                <span className="flex items-center gap-2">
                                  <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                                  {cat.label}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Purpose</Label>
                      <Select
                        value={newHabit.habitType}
                        onValueChange={(v) => setNewHabit({ ...newHabit, habitType: v })}
                      >
                        <SelectTrigger data-testid="select-habit-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="goal">Goal Habit</SelectItem>
                          <SelectItem value="learning">Learning Habit</SelectItem>
                          <SelectItem value="maintenance">Maintenance Habit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Timing</Label>
                      <Select
                        value={newHabit.timing}
                        onValueChange={(v) => setNewHabit({ ...newHabit, timing: v })}
                      >
                        <SelectTrigger data-testid="select-habit-timing">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">Morning (6am–12pm)</SelectItem>
                          <SelectItem value="afternoon">Afternoon (12–6pm)</SelectItem>
                          <SelectItem value="evening">Evening (6–9pm)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Duration (min)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="480"
                        value={newHabit.duration}
                        onChange={(e) => setNewHabit({ ...newHabit, duration: e.target.value })}
                        data-testid="input-duration"
                      />
                    </div>
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
                    <Label className="mb-1 block">Repeat Every</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        value={newHabit.intervalWeeks}
                        onChange={(e) => setNewHabit({ ...newHabit, intervalWeeks: e.target.value })}
                        className="w-20"
                        data-testid="input-interval-weeks"
                      />
                      <span className="text-sm text-muted-foreground">
                        {parseInt(newHabit.intervalWeeks) === 1 ? "week" : "weeks"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="mb-1 block">Start Date</Label>
                      <Input
                        type="date"
                        value={newHabit.startDate}
                        onChange={(e) => setNewHabit({ ...newHabit, startDate: e.target.value })}
                        data-testid="input-start-date"
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block">End Date</Label>
                      <Select
                        value={newHabit.hasEndDate ? "date" : "none"}
                        onValueChange={(v) => setNewHabit({ ...newHabit, hasEndDate: v === "date" })}
                      >
                        <SelectTrigger data-testid="select-end-date-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No End Date</SelectItem>
                          <SelectItem value="date">Set End Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {newHabit.hasEndDate && (
                    <Input
                      type="date"
                      value={newHabit.endDate}
                      min={newHabit.startDate}
                      onChange={(e) => setNewHabit({ ...newHabit, endDate: e.target.value })}
                      data-testid="input-end-date"
                    />
                  )}

                  <div>
                    <Label className="mb-1 block">
                      Time of day
                      <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
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
                <DialogFooter>
                  <Button
                    onClick={() => {
                      if (editingHabit) {
                        updateHabitMutation.mutate({ id: editingHabit.id, data: newHabit });
                      } else {
                        createHabitMutation.mutate(newHabit);
                      }
                    }}
                    disabled={!canSubmit || createHabitMutation.isPending || updateHabitMutation.isPending}
                    data-testid="button-submit-habit"
                  >
                    {editingHabit ? "Save Changes" : "Add Habit"}
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
