import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VoiceTextarea } from "@/components/voice-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Habit } from "@shared/schema";
import { HABIT_CATEGORIES } from "@shared/schema";

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

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const CATEGORY_STYLES: Record<string, { dot: string }> = {
  health: { dot: "bg-emerald-500" },
  wealth: { dot: "bg-yellow-400" },
  relationships: { dot: "bg-rose-500" },
  "self-development": { dot: "bg-blue-500" },
  happiness: { dot: "bg-slate-300 dark:bg-slate-400" },
};

function getCategoryDot(category: string | null) {
  return (CATEGORY_STYLES[category || "health"] || CATEGORY_STYLES.health).dot;
}

type HabitFormData = {
  name: string;
  motivatingReason: string;
  category: string;
  habitType: string;
  timing: string;
  recurringType: "indefinite" | "count";
  recurringCount: string;
  duration: string;
  startTime: string;
  endTime: string;
  startDate: string;
  hasEndDate: boolean;
  endDate: string;
  intervalWeeks: string;
};

const DEFAULT_FORM: HabitFormData = {
  name: "",
  motivatingReason: "",
  category: "health",
  habitType: "maintenance",
  timing: "afternoon",
  recurringType: "indefinite",
  recurringCount: "4",
  duration: "15",
  startTime: "",
  endTime: "",
  startDate: formatDate(new Date()),
  hasEndDate: false,
  endDate: "",
  intervalWeeks: "1",
};

interface HabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingHabit?: Habit | null;
  defaultTiming?: string;
  onSuccess?: () => void;
}

export function HabitDialog({ open, onOpenChange, editingHabit, defaultTiming, onSuccess }: HabitDialogProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedDays, setSelectedDays] = useState<string[]>(["mon", "wed", "fri"]);
  const [formData, setFormData] = useState<HabitFormData>({ ...DEFAULT_FORM });

  useEffect(() => {
    if (!open) return;
    if (editingHabit) {
      const isCount = editingHabit.recurring && editingHabit.recurring !== "indefinite";
      setFormData({
        name: editingHabit.name,
        motivatingReason: editingHabit.motivatingReason || "",
        category: editingHabit.category || "health",
        habitType: editingHabit.habitType || "maintenance",
        timing: editingHabit.timing === "daily" ? "afternoon" : (editingHabit.timing || "afternoon"),
        recurringType: isCount ? "count" : "indefinite",
        recurringCount: isCount ? editingHabit.recurring! : "4",
        duration: editingHabit.duration?.toString() || "15",
        startTime: editingHabit.startTime || "",
        endTime: editingHabit.endTime || "",
        startDate: editingHabit.startDate || formatDate(new Date()),
        hasEndDate: !!editingHabit.endDate,
        endDate: editingHabit.endDate || "",
        intervalWeeks: (editingHabit.intervalWeeks || 1).toString(),
      });
      setSelectedDays(editingHabit.cadence.split(","));
    } else {
      setFormData({ ...DEFAULT_FORM, timing: defaultTiming || "afternoon" });
      setSelectedDays(["mon", "wed", "fri"]);
    }
  }, [open, editingHabit, defaultTiming]);

  const toggleDay = (code: string) => {
    setSelectedDays(prev =>
      prev.includes(code) ? prev.filter(d => d !== code) : [...prev, code]
    );
  };

  const createHabitMutation = useMutation({
    mutationFn: async (data: HabitFormData) => {
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
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ title: "Could not add habit", description: error.message, variant: "destructive" });
    },
  });

  const updateHabitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: HabitFormData }) => {
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
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ title: "Could not update habit", description: error.message, variant: "destructive" });
    },
  });

  const canSubmit = formData.name.trim() !== "" && formData.motivatingReason.trim() !== "" && selectedDays.length > 0 && parseInt(formData.duration) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              data-testid="input-habit-name"
            />
          </div>

          <div>
            <Label>
              Why does this matter to you? <span className="text-destructive">*</span>
            </Label>
            <VoiceTextarea
              placeholder="Your personal reason — this keeps you going when motivation dips"
              value={formData.motivatingReason}
              onChange={(val) => setFormData({ ...formData, motivatingReason: val })}
              className="resize-none text-sm"
              rows={2}
              data-testid="input-motivating-reason"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger data-testid="select-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(HABIT_CATEGORIES).map(([key, cat]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${getCategoryDot(key)}`} />
                        {cat.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Purpose</Label>
              <Select
                value={formData.habitType}
                onValueChange={(v) => setFormData({ ...formData, habitType: v })}
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
                value={formData.timing}
                onValueChange={(v) => setFormData({ ...formData, timing: v })}
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
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
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
                value={formData.intervalWeeks}
                onChange={(e) => setFormData({ ...formData, intervalWeeks: e.target.value })}
                className="w-20"
                data-testid="input-interval-weeks"
              />
              <span className="text-sm text-muted-foreground">
                {parseInt(formData.intervalWeeks) === 1 ? "week" : "weeks"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">Start Date</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                data-testid="input-start-date"
              />
            </div>
            <div>
              <Label className="mb-1 block">End Date</Label>
              <Select
                value={formData.hasEndDate ? "date" : "none"}
                onValueChange={(v) => setFormData({ ...formData, hasEndDate: v === "date" })}
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
          {formData.hasEndDate && (
            <Input
              type="date"
              value={formData.endDate}
              min={formData.startDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              data-testid="input-end-date"
            />
          )}

          <div>
            <Label className="mb-1 block">
              Time of day
              <span className="text-muted-foreground font-normal ml-1">(optional)</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Select value={formData.startTime || "none"} onValueChange={(v) => setFormData({ ...formData, startTime: v === "none" ? "" : v })}>
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
              <Select value={formData.endTime || "none"} onValueChange={(v) => setFormData({ ...formData, endTime: v === "none" ? "" : v })}>
                <SelectTrigger data-testid="select-end-time">
                  <SelectValue placeholder="End" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none">No end time</SelectItem>
                  {TIME_SLOTS.filter(t => !formData.startTime || t > formData.startTime).map(t => (
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
                updateHabitMutation.mutate({ id: editingHabit.id, data: formData });
              } else {
                createHabitMutation.mutate(formData);
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
  );
}
