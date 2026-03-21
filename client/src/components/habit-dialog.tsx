import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { HABIT_CATEGORIES, type HabitCategory } from "@shared/schema";
import type { Habit } from "@shared/schema";

const CATEGORY_KEYS = Object.keys(HABIT_CATEGORIES) as HabitCategory[];

const CATEGORY_DOTS: Record<string, string> = {
  health: "bg-emerald-500",
  wealth: "bg-yellow-400",
  relationships: "bg-rose-500",
  "self-development": "bg-blue-500",
  happiness: "bg-slate-400",
};

const TIMINGS = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
] as const;

const DURATIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "60 min" },
] as const;

const ALL_DAYS_CADENCE = "mon,tue,wed,thu,fri,sat,sun";
const ALL_DAYS_SET = new Set(ALL_DAYS_CADENCE.split(","));
const DAY_BUTTONS = [
  { code: "mon", label: "M" },
  { code: "tue", label: "T" },
  { code: "wed", label: "W" },
  { code: "thu", label: "T" },
  { code: "fri", label: "F" },
  { code: "sat", label: "S" },
  { code: "sun", label: "S" },
] as const;

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface HabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingHabit?: Habit | null;
  defaultTiming?: string;
  onSuccess?: () => void;
}

export function HabitDialog({ open, onOpenChange, editingHabit, defaultTiming, onSuccess }: HabitDialogProps) {

  const [name, setName] = useState("");
  const [category, setCategory] = useState<HabitCategory>("health");
  const [timing, setTiming] = useState("morning");
  const [hasTimeCommitment, setHasTimeCommitment] = useState(true);
  const [duration, setDuration] = useState(15);
  const [scheduleMode, setScheduleMode] = useState<"daily" | "custom">("daily");
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set(ALL_DAYS_SET));

  useEffect(() => {
    if (!open) return;
    if (editingHabit) {
      setName(editingHabit.name);
      setCategory((editingHabit.category as HabitCategory) || "health");
      setTiming(editingHabit.timing === "daily" ? "afternoon" : (editingHabit.timing || "afternoon"));
      const dur = editingHabit.duration;
      if (dur && dur > 0) {
        setHasTimeCommitment(true);
        setDuration(dur);
      } else {
        setHasTimeCommitment(false);
        setDuration(15);
      }
      const days = new Set(editingHabit.cadence ? editingHabit.cadence.split(",") : ALL_DAYS_SET);
      if (days.size === 7 && Array.from(ALL_DAYS_SET).every(d => days.has(d))) {
        setScheduleMode("daily");
      } else {
        setScheduleMode("custom");
      }
      setSelectedDays(days);
    } else {
      setName("");
      setCategory("health");
      setTiming(defaultTiming || "morning");
      setHasTimeCommitment(true);
      setDuration(15);
      setScheduleMode("daily");
      setSelectedDays(new Set(ALL_DAYS_SET));
    }
  }, [open, editingHabit, defaultTiming]);

  const createHabitMutation = useToastMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/habits", {
        name,
        category,
        timing,
        cadence,
        duration: hasTimeCommitment ? duration : null,
        startDate: formatDate(new Date()),
        isBinary: !hasTimeCommitment,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to create habit");
      }
      return res.json();
    },
    invalidateKeys: ["/api/habits"],
    errorToast: "Could not add habit",
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const updateHabitMutation = useToastMutation<number>({
    mutationFn: async (id) => {
      const res = await apiRequest("PATCH", `/api/habits/${id}`, {
        name,
        category,
        timing,
        cadence,
        duration: hasTimeCommitment ? duration : null,
        isBinary: !hasTimeCommitment,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update habit");
      }
    },
    invalidateKeys: ["/api/habits"],
    errorToast: "Could not update habit",
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const cadence = scheduleMode === "daily" ? ALL_DAYS_CADENCE : DAY_BUTTONS.map(d => d.code).filter(c => selectedDays.has(c)).join(",");
  const canSubmit = name.trim() !== "" && (scheduleMode === "daily" || selectedDays.size > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingHabit ? "Edit Habit" : "Add Habit"}</DialogTitle>
          <DialogDescription>
            {editingHabit ? "Update your habit." : "Keep it simple — just 3 daily habits."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <Label>Name</Label>
            <Input
              placeholder="e.g., Meditate, Exercise, Read"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-habit-name"
            />
          </div>

          <div>
            <p className="text-[10px] uppercase text-muted-foreground mb-1.5">Schedule</p>
            <div className="flex gap-1 mb-2">
              <button
                type="button"
                onClick={() => { setScheduleMode("daily"); setSelectedDays(new Set(ALL_DAYS_SET)); }}
                className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  scheduleMode === "daily" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                }`}
                data-testid="button-schedule-daily"
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode("custom")}
                className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  scheduleMode === "custom" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                }`}
                data-testid="button-schedule-custom"
              >
                Custom
              </button>
            </div>
            {scheduleMode === "custom" && (
              <div className="flex gap-1.5">
                {DAY_BUTTONS.map((d) => (
                  <button
                    key={d.code}
                    type="button"
                    onClick={() => {
                      setSelectedDays(prev => {
                        const next = new Set(prev);
                        if (next.has(d.code)) {
                          if (next.size > 1) next.delete(d.code);
                        } else {
                          next.add(d.code);
                        }
                        return next;
                      });
                    }}
                    className={`h-7 w-7 text-[11px] font-medium rounded-sm transition-colors ${
                      selectedDays.has(d.code)
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                    data-testid={`button-day-${d.code}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="mb-2 block">Category</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                    category === key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  }`}
                  data-testid={`chip-category-${key}`}
                >
                  <span className={`h-2 w-2 rounded-full ${CATEGORY_DOTS[key]}`} />
                  {HABIT_CATEGORIES[key].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Time of Day</Label>
            <div className="flex gap-2">
              {TIMINGS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTiming(t.value)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    timing === t.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  }`}
                  data-testid={`chip-timing-${t.value}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="time-commitment" className="text-sm cursor-pointer">This habit has a time commitment</Label>
              <p className="text-[11px] text-muted-foreground">Turn off for simple yes/no habits</p>
            </div>
            <Switch
              id="time-commitment"
              checked={hasTimeCommitment}
              onCheckedChange={setHasTimeCommitment}
              data-testid="switch-time-commitment"
            />
          </div>

          {hasTimeCommitment && (
            <div>
              <Label className="mb-2 block">Duration</Label>
              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDuration(d.value)}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      duration === d.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                    }`}
                    data-testid={`chip-duration-${d.value}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (editingHabit) {
                updateHabitMutation.mutate(editingHabit.id);
              } else {
                createHabitMutation.mutate();
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
