import { useState, useMemo, useRef, useCallback } from "react";
import { HabitDialog } from "@/components/habit-dialog";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Sun, Moon, ArrowRight, Lock, BarChart3, Wrench,
  ChevronLeft, ChevronRight, Download, Check, Minus,
  GripVertical, Pencil, Trash2, Plus, X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, addWeeks, subWeeks, startOfWeek, addDays } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Purchase, Journal, Habit, HabitCompletion, EisenhowerEntry } from "@shared/schema";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const CATEGORY_DOTS: Record<string, string> = {
  health: "bg-emerald-500",
  wealth: "bg-yellow-400",
  relationships: "bg-rose-500",
  "self-development": "bg-blue-500",
  happiness: "bg-slate-300 dark:bg-slate-400",
  career: "bg-blue-500",
  mindfulness: "bg-blue-500",
  learning: "bg-blue-500",
  leisure: "bg-slate-300 dark:bg-slate-400",
};

const TIME_RANGES = ["morning", "afternoon", "evening"] as const;
type TimeRange = (typeof TIME_RANGES)[number];

export default function JournalHubPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [habitDialogOpen, setHabitDialogOpen] = useState(false);
  const [habitDialogTiming, setHabitDialogTiming] = useState("afternoon");
  const [habitDialogEditing, setHabitDialogEditing] = useState<Habit | null>(null);

  const weekEnd = addDays(weekStart, 6);
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  const days = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < 7; i++) result.push(addDays(weekStart, i));
    return result;
  }, [weekStart]);

  const { data: purchases = [] } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
    enabled: !!user,
  });

  const { data: journals = [], isLoading: journalsLoading } = useQuery<Journal[]>({
    queryKey: ["/api/journals"],
    enabled: !!user,
  });

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: !!user,
  });

  const { data: eisenhowerEntries = [] } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower"],
    enabled: !!user,
  });

  const { data: habitCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions/range", weekStartStr, weekEndStr],
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const hasAccess = purchases.some(p =>
    p.courseType === "phase12" || p.courseType === "allinone" ||
    p.courseType === "course1" || p.courseType === "course2" || p.courseType === "bundle"
  );

  const todayJournals = journals.filter(j => j.date === today);
  const hasMorning = todayJournals.some(j => j.session === "morning");
  const hasEvening = todayJournals.some(j => j.session === "evening");

  const journalsByDate = useMemo(() => {
    const map = new Map<string, { morning: boolean; evening: boolean }>();
    journals.forEach((j) => {
      if (!map.has(j.date)) map.set(j.date, { morning: false, evening: false });
      const d = map.get(j.date)!;
      if (j.session === "morning") d.morning = true;
      if (j.session === "evening") d.evening = true;
    });
    return map;
  }, [journals]);

  const completionsByDate = useMemo(() => {
    const map = new Map<string, Map<number, string>>();
    habitCompletions.forEach((hc) => {
      if (!map.has(hc.date)) map.set(hc.date, new Map());
      map.get(hc.date)!.set(hc.habitId, hc.status || "completed");
    });
    return map;
  }, [habitCompletions]);

  const cycleHabitMutation = useMutation({
    mutationFn: async ({ habitId, currentStatus, date }: { habitId: number; currentStatus: string | null; date: string }) => {
      let res;
      if (currentStatus === null) {
        res = await apiRequest("POST", "/api/habit-completions", { habitId, date, status: "completed" });
      } else if (currentStatus === "completed") {
        res = await apiRequest("PATCH", `/api/habit-completions/${habitId}/${date}`, { status: "skipped" });
      } else {
        res = await apiRequest("DELETE", `/api/habit-completions/${habitId}/${date}`);
      }
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update habit status");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habit-completions/range"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habit-completions"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not update habit", description: error.message, variant: "destructive" });
    },
  });

  const toggleEisenhowerMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: number; currentStatus: string | null }) => {
      const nextStatus = currentStatus === null || currentStatus === undefined ? "completed" : currentStatus === "completed" ? "skipped" : null;
      const res = await apiRequest("PATCH", `/api/eisenhower/${id}`, { status: nextStatus });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update status");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not update status", description: error.message, variant: "destructive" });
    },
  });

  const reorderHabitsMutation = useMutation({
    mutationFn: async (items: Array<{ id: number; sortOrder: number; timing?: string }>) => {
      const res = await apiRequest("POST", "/api/habits/reorder", { items });
      if (!res.ok) throw new Error("Failed to reorder");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not reorder habits", description: error.message, variant: "destructive" });
    },
  });

  const reorderEisenhowerMutation = useMutation({
    mutationFn: async (items: Array<{ id: number; sortOrder: number; timeRange?: string }>) => {
      const res = await apiRequest("POST", "/api/eisenhower/reorder", { items });
      if (!res.ok) throw new Error("Failed to reorder");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not reorder items", description: error.message, variant: "destructive" });
    },
  });

  const deleteHabitMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/habits/${id}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to delete habit");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      toast({ title: "Habit deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not delete habit", description: error.message, variant: "destructive" });
    },
  });

  const createEisenhowerMutation = useMutation({
    mutationFn: async (data: { task: string; scheduledDate: string }) => {
      const res = await apiRequest("POST", "/api/eisenhower", {
        task: data.task,
        weekStart: weekStartStr,
        role: "",
        quadrant: "q2",
        scheduledDate: data.scheduledDate,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to create item");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
      toast({ title: "Item created" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not create item", description: error.message, variant: "destructive" });
    },
  });

  const updateEisenhowerMutation = useMutation({
    mutationFn: async ({ id, task }: { id: number; task: string }) => {
      const res = await apiRequest("PATCH", `/api/eisenhower/${id}`, { task });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update item");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not update item", description: error.message, variant: "destructive" });
    },
  });

  const deleteEisenhowerMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/eisenhower/${id}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to delete item");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
      toast({ title: "Item deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not delete item", description: error.message, variant: "destructive" });
    },
  });

  const q2Items = useMemo(
    () => eisenhowerEntries.filter((e) => e.quadrant === "q2" && e.weekStart === weekStartStr),
    [eisenhowerEntries, weekStartStr]
  );
  const q1Items = useMemo(
    () => eisenhowerEntries.filter((e) => e.quadrant === "q1" && e.weekStart === weekStartStr),
    [eisenhowerEntries, weekStartStr]
  );

  const eisenhowerByDate = useMemo(() => {
    const map = new Map<string, EisenhowerEntry[]>();
    [...q2Items, ...q1Items].forEach((e) => {
      const d = e.scheduledDate || e.deadline || "";
      if (!d) return;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(e);
    });
    const parseTime = (t: string | null): number => {
      if (!t) return 9999;
      const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) return 9999;
      let h = parseInt(match[1]);
      const m = parseInt(match[2]);
      const ampm = match[3].toUpperCase();
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };
    map.forEach((arr) => {
      arr.sort((a: EisenhowerEntry, b: EisenhowerEntry) => parseTime(a.scheduledTime) - parseTime(b.scheduledTime));
    });
    return map;
  }, [q2Items, q1Items]);

  const [showExport, setShowExport] = useState(false);
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (exportStart) params.set("startDate", exportStart);
    if (exportEnd) params.set("endDate", exportEnd);
    const response = await fetch(`/api/journals/export?${params.toString()}`, { credentials: "include" });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journal-export${exportStart ? `-${exportStart}` : ""}${exportEnd ? `-to-${exportEnd}` : ""}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const activeHabits = useMemo(() => {
    return habits.filter(h => {
      if (h.active === false) return false;
      if (h.startDate && h.startDate > weekEndStr) return false;
      if (h.endDate && h.endDate < weekStartStr) return false;
      return true;
    });
  }, [habits, weekStartStr, weekEndStr]);

  const habitsByTiming = useMemo(() => {
    const map: Record<TimeRange, Habit[]> = { morning: [], afternoon: [], evening: [] };
    activeHabits.forEach(h => {
      const raw = h.timing || "afternoon";
      const bucket: TimeRange = (raw === "daily" || !map[raw as TimeRange]) ? "afternoon" : (raw as TimeRange);
      map[bucket].push(h);
    });
    for (const key of TIME_RANGES) {
      map[key].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
    return map;
  }, [activeHabits]);

  const [activeHabitDragId, setActiveHabitDragId] = useState<number | null>(null);
  const [overContainer, setOverContainer] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleHabitDragStart = useCallback((event: DragStartEvent) => {
    const id = Number(event.active.id);
    setActiveHabitDragId(id);
  }, []);

  const handleHabitDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      const overId = String(over.id);
      if (overId.startsWith("timing-")) {
        setOverContainer(overId.replace("timing-", ""));
      } else {
        const overHabit = activeHabits.find(h => h.id === Number(overId));
        if (overHabit) {
          const t = (overHabit.timing || "afternoon") as string;
          setOverContainer(t === "daily" ? "afternoon" : t);
        }
      }
    }
  }, [activeHabits]);

  const handleHabitDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveHabitDragId(null);
    setOverContainer(null);

    if (!over) return;

    const activeId = Number(active.id);
    const activeHabit = activeHabits.find(h => h.id === activeId);
    if (!activeHabit) return;

    const sourceTiming = ((activeHabit.timing || "afternoon") === "daily" ? "afternoon" : (activeHabit.timing || "afternoon")) as TimeRange;

    let targetTiming: TimeRange = sourceTiming;
    const overId = String(over.id);
    if (overId.startsWith("timing-")) {
      targetTiming = overId.replace("timing-", "") as TimeRange;
    } else {
      const overHabit = activeHabits.find(h => h.id === Number(overId));
      if (overHabit) {
        const t = (overHabit.timing || "afternoon") as string;
        targetTiming = (t === "daily" ? "afternoon" : t) as TimeRange;
      }
    }

    const sourceList = [...habitsByTiming[sourceTiming]];
    const targetList = sourceTiming === targetTiming ? sourceList : [...habitsByTiming[targetTiming]];

    if (sourceTiming === targetTiming) {
      const oldIndex = sourceList.findIndex(h => h.id === activeId);
      const overHabitId = Number(overId);
      let newIndex = sourceList.findIndex(h => h.id === overHabitId);
      if (newIndex === -1) newIndex = sourceList.length - 1;
      if (oldIndex === newIndex) return;

      const reordered = arrayMove(sourceList, oldIndex, newIndex);
      const items = reordered.map((h, i) => ({ id: h.id, sortOrder: i }));
      reorderHabitsMutation.mutate(items);
    } else {
      const oldIndex = sourceList.findIndex(h => h.id === activeId);
      if (oldIndex !== -1) sourceList.splice(oldIndex, 1);

      let insertIndex = targetList.length;
      const overHabitId = Number(overId);
      const overIdx = targetList.findIndex(h => h.id === overHabitId);
      if (overIdx !== -1) insertIndex = overIdx;

      targetList.splice(insertIndex, 0, activeHabit);

      const items = [
        ...sourceList.map((h, i) => ({ id: h.id, sortOrder: i })),
        ...targetList.map((h, i) => ({ id: h.id, sortOrder: i, timing: targetTiming })),
      ];
      reorderHabitsMutation.mutate(items);
    }
  }, [activeHabits, habitsByTiming, reorderHabitsMutation]);

  const draggedHabit = activeHabitDragId ? activeHabits.find(h => h.id === activeHabitDragId) : null;

  if (journalsLoading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </AppLayout>
    );
  }

  const gridCols = "grid-cols-[minmax(180px,auto)_repeat(7,1fr)]";
  const cellH = "min-h-[36px]";

  const timingSubheader = (timing: string, label: string) => (
    <>
      <div className="flex items-center px-3 py-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{label}</p>
      </div>
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        return <div key={dateStr} className={dateStr === today ? "bg-primary/5" : ""} />;
      })}
    </>
  );

  const journalRow = (session: "morning" | "evening") => {
    const icon = session === "morning"
      ? <Sun className="h-4 w-4 text-amber-500" />
      : <Moon className="h-4 w-4 text-indigo-500" />;
    const rowLabel = session === "morning" ? "Morning Journal" : "Evening Journal";
    return (
      <>
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-t">
          <div className="shrink-0">{icon}</div>
          <p className="text-xs font-semibold leading-snug">{rowLabel}</p>
        </div>
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const done = session === "morning"
            ? journalsByDate.get(dateStr)?.morning || false
            : journalsByDate.get(dateStr)?.evening || false;
          const isPast = dateStr < today;
          const skipped = !done && isPast;
          return (
            <DayCell key={dateStr} dateStr={dateStr} todayStr={today} cellH={cellH}>
              <div
                className="flex items-center justify-center h-full cursor-pointer hover-elevate rounded-md"
                onClick={() => setLocation(`/journal/${dateStr}/${session}`)}
                data-testid={`row-${session}-${dateStr}`}
              >
                {done
                  ? <div className="h-7 w-7 rounded-md bg-primary border-2 border-primary flex items-center justify-center"><Check className="h-4 w-4 text-primary-foreground" /></div>
                  : skipped
                    ? <div className="h-7 w-7 rounded-md bg-yellow-300 border-2 border-yellow-400 dark:bg-yellow-400/30 dark:border-yellow-400/50 flex items-center justify-center"><Minus className="h-4 w-4 text-yellow-700 dark:text-yellow-300" /></div>
                    : <div className="h-7 w-7 rounded-md border-2 border-muted-foreground/30 flex items-center justify-center"><Minus className="h-3 w-3 text-muted-foreground/30" /></div>}
              </div>
            </DayCell>
          );
        })}
      </>
    );
  };

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 flex flex-col">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="ghost" onClick={() => setWeekStart((w) => subWeeks(w, 1))} data-testid="button-prev-week">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-serif text-xl font-bold" data-testid="text-week-label">
              {format(weekStart, "MMM d")} — {format(weekEnd, "MMM d, yyyy")}
            </h1>
            <Button size="icon" variant="ghost" onClick={() => setWeekStart((w) => addWeeks(w, 1))} data-testid="button-next-week">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowExport(!showExport)} data-testid="button-toggle-export">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
        </div>

        {showExport && (
          <div className="flex items-end gap-3 mb-4 flex-wrap p-3 border rounded-md bg-muted/30" data-testid="export-panel">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">From</label>
              <input
                type="date"
                value={exportStart}
                onChange={(e) => setExportStart(e.target.value)}
                className="block border rounded-md px-2 py-1.5 text-sm bg-background"
                data-testid="input-export-start"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">To</label>
              <input
                type="date"
                value={exportEnd}
                onChange={(e) => setExportEnd(e.target.value)}
                className="block border rounded-md px-2 py-1.5 text-sm bg-background"
                data-testid="input-export-end"
              />
            </div>
            <Button size="sm" onClick={handleExport} data-testid="button-export-download">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download
            </Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <div className="min-w-[960px]">
            <div className={`grid ${gridCols} border rounded-md overflow-hidden`}>
              <div className="bg-muted/40 p-2" />
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const isToday = dateStr === today;
                return (
                  <div key={dateStr} className={`text-center py-2 border-l ${isToday ? "bg-primary/[0.06]" : "bg-muted/40"}`}>
                    <p className={`text-xs uppercase tracking-wide ${isToday ? "text-primary font-bold" : "text-muted-foreground font-medium"}`}>
                      {format(day, "EEE")}
                    </p>
                    <p className={`text-lg font-bold leading-tight ${isToday ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </p>
                  </div>
                );
              })}

              <SectionHeaderRow label="Scheduled Items" days={days} todayStr={today} />
              <ScheduledItemsSection
                days={days}
                todayStr={today}
                cellH={cellH}
                eisenhowerByDate={eisenhowerByDate}
                toggleEisenhowerMutation={toggleEisenhowerMutation}
                createEisenhowerMutation={createEisenhowerMutation}
                updateEisenhowerMutation={updateEisenhowerMutation}
                deleteEisenhowerMutation={deleteEisenhowerMutation}
              />

              <SectionHeaderRow label="Habits" days={days} todayStr={today} />

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleHabitDragStart}
                onDragOver={handleHabitDragOver}
                onDragEnd={handleHabitDragEnd}
              >
                {timingSubheader("morning", "Morning (6am\u201312pm)")}
                {journalRow("morning")}
                <HabitTimingSection
                  timing="morning"
                  habits={habitsByTiming.morning}
                  days={days}
                  todayStr={today}
                  cellH={cellH}
                  completionsByDate={completionsByDate}
                  onCycle={(habitId, status, date) => cycleHabitMutation.mutate({ habitId, currentStatus: status, date })}
                  onEditHabit={(id) => { const h = habits.find(hb => hb.id === id); if (h) { setHabitDialogEditing(h); setHabitDialogOpen(true); } }}
                  onDeleteHabit={(id) => deleteHabitMutation.mutate(id)}
                  onAddHabit={() => { setHabitDialogEditing(null); setHabitDialogTiming("morning"); setHabitDialogOpen(true); }}
                />

                {timingSubheader("afternoon", "Afternoon (12\u20136pm)")}
                <HabitTimingSection
                  timing="afternoon"
                  habits={habitsByTiming.afternoon}
                  days={days}
                  todayStr={today}
                  cellH={cellH}
                  completionsByDate={completionsByDate}
                  onCycle={(habitId, status, date) => cycleHabitMutation.mutate({ habitId, currentStatus: status, date })}
                  onEditHabit={(id) => { const h = habits.find(hb => hb.id === id); if (h) { setHabitDialogEditing(h); setHabitDialogOpen(true); } }}
                  onDeleteHabit={(id) => deleteHabitMutation.mutate(id)}
                  onAddHabit={() => { setHabitDialogEditing(null); setHabitDialogTiming("afternoon"); setHabitDialogOpen(true); }}
                />

                {timingSubheader("evening", "Evening (6\u20139pm)")}
                <HabitTimingSection
                  timing="evening"
                  habits={habitsByTiming.evening}
                  days={days}
                  todayStr={today}
                  cellH={cellH}
                  completionsByDate={completionsByDate}
                  onCycle={(habitId, status, date) => cycleHabitMutation.mutate({ habitId, currentStatus: status, date })}
                  onEditHabit={(id) => { const h = habits.find(hb => hb.id === id); if (h) { setHabitDialogEditing(h); setHabitDialogOpen(true); } }}
                  onDeleteHabit={(id) => deleteHabitMutation.mutate(id)}
                  onAddHabit={() => { setHabitDialogEditing(null); setHabitDialogTiming("evening"); setHabitDialogOpen(true); }}
                />
                {journalRow("evening")}

                <DragOverlay>
                  {draggedHabit ? (
                    <div className="bg-background border rounded-md px-3 py-2 shadow-md flex items-center gap-2 text-xs">
                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${CATEGORY_DOTS[draggedHabit.category || "health"] || "bg-muted"}`} />
                      {draggedHabit.name}
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto w-full mt-10 space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card
              className={`overflow-visible ${hasAccess ? "hover-elevate cursor-pointer" : "opacity-60"}`}
              onClick={() => hasAccess && setLocation(`/journal/${today}/morning`)}
              data-testid="card-morning-journal"
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Sun className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-base">Morning Check-in</CardTitle>
                    <CardDescription className="text-sm">Set your intention for today</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {hasMorning ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Completed today</Badge>
                ) : (
                  <Badge variant="outline">Not started</Badge>
                )}
              </CardContent>
            </Card>

            <Card
              className={`overflow-visible ${hasAccess ? "hover-elevate cursor-pointer" : "opacity-60"}`}
              onClick={() => hasAccess && setLocation(`/journal/${today}/evening`)}
              data-testid="card-evening-journal"
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-md bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <Moon className="h-5 w-5 text-indigo-500" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-base">Evening Review</CardTitle>
                    <CardDescription className="text-sm">Reflect on your day</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {hasEvening ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Completed today</Badge>
                ) : (
                  <Badge variant="outline">Not started</Badge>
                )}
              </CardContent>
            </Card>
          </div>

          {!hasAccess && (
            <div className="text-center py-4">
              <Button onClick={() => setLocation("/checkout/phase12")} data-testid="button-unlock-journal">
                <Lock className="h-4 w-4 mr-2" />
                Unlock Journaling — Phase 1 & 2
              </Button>
            </div>
          )}

          <div className="pt-6 border-t space-y-3">
            <Card
              className="overflow-visible hover-elevate cursor-pointer"
              onClick={() => setLocation("/progress")}
              data-testid="card-link-progress"
            >
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="font-serif text-base">Progress</CardTitle>
                  <CardDescription className="text-sm">Track your habits, goals, and overall growth</CardDescription>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardHeader>
            </Card>

            <Card
              className="overflow-visible hover-elevate cursor-pointer"
              onClick={() => setLocation("/tools")}
              data-testid="card-link-tools"
            >
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Wrench className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="font-serif text-base">Tools</CardTitle>
                  <CardDescription className="text-sm">Meditation, emotional processing, empathy, and regulation</CardDescription>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
      <HabitDialog
        open={habitDialogOpen}
        onOpenChange={(open) => {
          setHabitDialogOpen(open);
          if (!open) setHabitDialogEditing(null);
        }}
        editingHabit={habitDialogEditing}
        defaultTiming={habitDialogTiming}
      />
    </AppLayout>
  );
}

function SectionHeaderRow({ label, days, todayStr }: { label: string; days: Date[]; todayStr: string }) {
  return (
    <>
      <div className="flex items-center px-3 py-2 bg-muted/50 border-t-2 border-t-primary/20">
        <p className="text-xs font-bold uppercase tracking-wider text-foreground/70">{label}</p>
      </div>
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const isToday = dateStr === todayStr;
        return (
          <div key={dateStr} className={`border-l border-t ${isToday ? "bg-primary/[0.03]" : "bg-muted/50"}`} />
        );
      })}
    </>
  );
}

function DayCell({ dateStr, todayStr, cellH, children }: { dateStr: string; todayStr: string; cellH: string; children: React.ReactNode }) {
  const isToday = dateStr === todayStr;
  return (
    <div className={`border-l border-t px-1.5 flex items-center justify-center ${cellH} ${isToday ? "bg-primary/[0.03]" : ""}`}>
      {children}
    </div>
  );
}

function ScheduledItemsSection({
  days,
  todayStr,
  cellH,
  eisenhowerByDate,
  toggleEisenhowerMutation,
  createEisenhowerMutation,
  updateEisenhowerMutation,
  deleteEisenhowerMutation,
}: {
  days: Date[];
  todayStr: string;
  cellH: string;
  eisenhowerByDate: Map<string, EisenhowerEntry[]>;
  toggleEisenhowerMutation: any;
  createEisenhowerMutation: any;
  updateEisenhowerMutation: any;
  deleteEisenhowerMutation: any;
}) {
  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/50 border-t-2 border-t-primary/20">
        <div>
          <p className="text-sm font-bold leading-snug">Scheduled Items</p>
          <p className="text-[10px] text-muted-foreground leading-snug">Q1 & Q2</p>
        </div>
      </div>
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const items = eisenhowerByDate.get(dateStr) || [];
        return (
          <ScheduledDayCell
            key={dateStr}
            dateStr={dateStr}
            todayStr={todayStr}
            cellH={items.length > 0 ? "" : cellH}
            items={items}
            toggleEisenhowerMutation={toggleEisenhowerMutation}
            createEisenhowerMutation={createEisenhowerMutation}
            updateEisenhowerMutation={updateEisenhowerMutation}
            deleteEisenhowerMutation={deleteEisenhowerMutation}
          />
        );
      })}
    </>
  );
}

function ScheduledDayCell({
  dateStr,
  todayStr,
  cellH,
  items,
  toggleEisenhowerMutation,
  createEisenhowerMutation,
  updateEisenhowerMutation,
  deleteEisenhowerMutation,
}: {
  dateStr: string;
  todayStr: string;
  cellH: string;
  items: EisenhowerEntry[];
  toggleEisenhowerMutation: any;
  createEisenhowerMutation: any;
  updateEisenhowerMutation: any;
  deleteEisenhowerMutation: any;
}) {
  const isToday = dateStr === todayStr;
  const [showAdd, setShowAdd] = useState(false);
  const [addValue, setAddValue] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  const handleAddSubmit = () => {
    const val = addValue.trim();
    if (!val) return;
    createEisenhowerMutation.mutate({ task: val, scheduledDate: dateStr });
    setAddValue("");
    setShowAdd(false);
  };

  return (
    <div className={`border-l border-t px-1.5 flex flex-col ${cellH} ${isToday ? "bg-primary/[0.05]" : "bg-muted/20"} group/daycell relative`}>
      {items.length > 0 && (
        <div className="space-y-1.5 py-2 w-full">
          {items.map((entry) => (
            <EisenhowerItemRow
              key={entry.id}
              entry={entry}
              toggleEisenhowerMutation={toggleEisenhowerMutation}
              updateEisenhowerMutation={updateEisenhowerMutation}
              deleteEisenhowerMutation={deleteEisenhowerMutation}
            />
          ))}
        </div>
      )}
      {showAdd ? (
        <div className="flex items-center gap-1 py-1 w-full">
          <Input
            ref={addInputRef}
            value={addValue}
            onChange={(e) => setAddValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSubmit();
              if (e.key === "Escape") { setShowAdd(false); setAddValue(""); }
            }}
            placeholder="New item..."
            className="h-6 text-[11px] px-1.5 flex-1"
            autoFocus
            data-testid={`input-add-eisenhower-${dateStr}`}
          />
          <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={handleAddSubmit} data-testid={`button-submit-eisenhower-${dateStr}`}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={() => { setShowAdd(false); setAddValue(""); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <button
          className="invisible group-hover/daycell:visible flex items-center justify-center w-full py-0.5 text-muted-foreground/50 cursor-pointer"
          onClick={() => setShowAdd(true)}
          data-testid={`button-add-eisenhower-${dateStr}`}
        >
          <Plus className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function EisenhowerItemRow({
  entry,
  toggleEisenhowerMutation,
  updateEisenhowerMutation,
  deleteEisenhowerMutation,
}: {
  entry: EisenhowerEntry;
  toggleEisenhowerMutation: any;
  updateEisenhowerMutation: any;
  deleteEisenhowerMutation: any;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(entry.task);

  const handleEditSubmit = () => {
    const val = editValue.trim();
    if (!val || val === entry.task) { setEditing(false); return; }
    updateEisenhowerMutation.mutate({ id: entry.id, task: val });
    setEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${entry.task}"?`)) {
      deleteEisenhowerMutation.mutate(entry.id);
    }
  };

  return (
    <div className="flex items-start gap-1.5 px-1 group/eitem" data-testid={`eisenhower-${entry.id}`}>
      <button
        role="checkbox"
        aria-checked={entry.status === "completed" ? true : entry.status === "skipped" ? "mixed" : false}
        aria-label={`${entry.task} - ${entry.status === "completed" ? "completed" : entry.status === "skipped" ? "skipped" : "not tracked"}. Click to cycle.`}
        className={`mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
          entry.status === "completed" ? "bg-primary border-primary" : entry.status === "skipped" ? "bg-yellow-300 border-yellow-400 dark:bg-yellow-400/30 dark:border-yellow-400/50" : "border-muted-foreground/30"
        }`}
        onClick={() => toggleEisenhowerMutation.mutate({ id: entry.id, currentStatus: entry.status || null })}
        data-testid={`eisenhower-cycle-${entry.id}`}
      >
        {entry.status === "completed" && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
        {entry.status === "skipped" && <Minus className="h-2.5 w-2.5 text-yellow-700 dark:text-yellow-300" />}
      </button>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-1">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEditSubmit();
                if (e.key === "Escape") setEditing(false);
              }}
              className="h-5 text-[11px] px-1 flex-1"
              autoFocus
              data-testid={`input-edit-eisenhower-${entry.id}`}
            />
            <Button size="icon" variant="ghost" className="h-4 w-4 shrink-0" onClick={handleEditSubmit}>
              <Check className="h-2.5 w-2.5" />
            </Button>
          </div>
        ) : (
          <>
            <p className={`text-[11px] leading-tight ${entry.status === "completed" ? "line-through text-muted-foreground" : entry.status === "skipped" ? "text-muted-foreground italic" : ""}`}>
              {entry.task}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className={`text-[10px] font-bold uppercase ${entry.quadrant === "q1" ? "text-orange-500" : "text-blue-500"}`}>
                {entry.quadrant}
              </span>
              {entry.scheduledTime && (
                <span className="text-[10px] text-muted-foreground font-medium">{entry.scheduledTime}</span>
              )}
              {entry.blocksGoal && (
                <span className="text-[10px] text-primary font-bold">Success Catalyst</span>
              )}
            </div>
          </>
        )}
      </div>
      {!editing && (
        <div className="invisible group-hover/eitem:visible flex items-center gap-0.5 shrink-0 mt-0.5">
          <button className="cursor-pointer" onClick={() => { setEditValue(entry.task); setEditing(true); }} data-testid={`button-edit-eisenhower-${entry.id}`}>
            <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
          </button>
          <button className="cursor-pointer" onClick={handleDelete} data-testid={`button-delete-eisenhower-${entry.id}`}>
            <Trash2 className="h-2.5 w-2.5 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}

function HabitTimingSection({
  timing,
  habits,
  days,
  todayStr,
  cellH,
  completionsByDate,
  onCycle,
  onEditHabit,
  onDeleteHabit,
  onAddHabit,
}: {
  timing: TimeRange;
  habits: Habit[];
  days: Date[];
  todayStr: string;
  cellH: string;
  completionsByDate: Map<string, Map<number, string>>;
  onCycle: (habitId: number, currentStatus: string | null, date: string) => void;
  onEditHabit: (id: number) => void;
  onDeleteHabit: (id: number) => void;
  onAddHabit: () => void;
}) {
  const { setNodeRef } = useDroppable({ id: `timing-${timing}` });

  const habitIds = useMemo(() => habits.map(h => h.id), [habits]);

  return (
    <SortableContext items={habitIds} strategy={verticalListSortingStrategy}>
      <div ref={setNodeRef} style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "subgrid" }}>
        {habits.map((habit) => (
          <SortableHabitRow
            key={habit.id}
            habit={habit}
            days={days}
            todayStr={todayStr}
            cellH={cellH}
            completionsByDate={completionsByDate}
            onCycle={onCycle}
            onEditHabit={onEditHabit}
            onDeleteHabit={onDeleteHabit}
          />
        ))}

        <div className="flex items-center gap-2 px-3 py-1 bg-muted/30 border-t">
          <button
            className="flex items-center gap-1.5 text-muted-foreground/60 text-xs cursor-pointer"
            onClick={onAddHabit}
            data-testid={`button-add-habit-${timing}`}
          >
            <Plus className="h-3 w-3" />
            <span>Add habit</span>
          </button>
        </div>
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          return <div key={`add-${dateStr}`} className={`border-l border-t ${dateStr === todayStr ? "bg-primary/[0.03]" : ""}`} />;
        })}
      </div>
    </SortableContext>
  );
}

function SortableHabitRow({
  habit,
  days,
  todayStr,
  cellH,
  completionsByDate,
  onCycle,
  onEditHabit,
  onDeleteHabit,
}: {
  habit: Habit;
  days: Date[];
  todayStr: string;
  cellH: string;
  completionsByDate: Map<string, Map<number, string>>;
  onCycle: (habitId: number, currentStatus: string | null, date: string) => void;
  onEditHabit: (id: number) => void;
  onDeleteHabit: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id });

  const handleDelete = () => {
    if (window.confirm(`Delete "${habit.name}"?`)) {
      onDeleteHabit(habit.id);
    }
  };

  const scheduledDays = useMemo(() => new Set(habit.cadence.split(",")), [habit.cadence]);
  const catDot = CATEGORY_DOTS[habit.category || "health"] || "bg-muted";

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    gridColumn: "1 / -1",
    display: "grid",
    gridTemplateColumns: "subgrid",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-1 px-1 py-2 bg-muted/30 border-t group/hrow">
        <button
          className="cursor-grab active:cursor-grabbing shrink-0 touch-none"
          {...attributes}
          {...listeners}
          data-testid={`drag-handle-habit-${habit.id}`}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground/50" />
        </button>
        <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${catDot}`} />
        <p className="text-xs leading-snug flex-1 min-w-0 truncate">{habit.name}</p>
        <div className="invisible group-hover/hrow:visible flex items-center gap-0.5 shrink-0">
          <button className="cursor-pointer" onClick={() => onEditHabit(habit.id)} data-testid={`button-edit-habit-${habit.id}`}>
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
          <button className="cursor-pointer" onClick={handleDelete} data-testid={`button-delete-habit-${habit.id}`}>
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayCode = DAY_CODES[day.getDay()];
        const inRange = (!habit.startDate || dateStr >= habit.startDate) && (!habit.endDate || dateStr <= habit.endDate);
        const isScheduled = scheduledDays.has(dayCode) && inRange;
        const dateMap = completionsByDate.get(dateStr);
        const status = dateMap?.get(habit.id) || null;

        return (
          <DayCell key={dateStr} dateStr={dateStr} todayStr={todayStr} cellH={cellH}>
            {isScheduled ? (
              <button
                role="checkbox"
                aria-checked={status === "completed" ? true : status === "skipped" ? "mixed" : false}
                aria-label={`${habit.name} - ${status || "not tracked"}`}
                className={`h-7 w-7 rounded-md border-2 flex items-center justify-center transition-colors cursor-pointer ${
                  status === "completed" ? "bg-primary border-primary" : status === "skipped" ? "bg-yellow-300 border-yellow-400 dark:bg-yellow-400/30 dark:border-yellow-400/50" : "border-muted-foreground/30"
                }`}
                onClick={() => onCycle(habit.id, status, dateStr)}
                data-testid={`habit-status-${habit.id}-${dateStr}`}
              >
                {status === "completed" && <Check className="h-4 w-4 text-primary-foreground" />}
                {status === "skipped" && <Minus className="h-4 w-4 text-yellow-700 dark:text-yellow-300" />}
              </button>
            ) : null}
          </DayCell>
        );
      })}
    </div>
  );
}
