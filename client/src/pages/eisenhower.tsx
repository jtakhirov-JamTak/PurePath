import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Grid3X3, Plus, Download, ChevronLeft, ChevronRight, Trash2, Pencil, Check, Minus, Wand2, ArrowRight, GripVertical, Clock, Calendar, Sparkles, Loader2 } from "lucide-react";
import { format, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { EisenhowerEntry } from "@shared/schema";
import { HABIT_CATEGORIES, type HabitCategory } from "@shared/schema";

const CATEGORY_KEYS = Object.keys(HABIT_CATEGORIES) as HabitCategory[];

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  health: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-500" },
  wealth: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", border: "border-amber-500/30", dot: "bg-amber-500" },
  relationships: { bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-400", border: "border-rose-500/30", dot: "bg-rose-500" },
  career: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", border: "border-blue-500/30", dot: "bg-blue-500" },
  mindfulness: { bg: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-400", border: "border-violet-500/30", dot: "bg-violet-500" },
  learning: { bg: "bg-cyan-500/10", text: "text-cyan-700 dark:text-cyan-400", border: "border-cyan-500/30", dot: "bg-cyan-500" },
  leisure: { bg: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-400", border: "border-orange-500/30", dot: "bg-orange-500" },
};

function getCategoryStyle(category: string | null) {
  return CATEGORY_STYLES[category || "health"] || CATEGORY_STYLES.health;
}

const QUADRANTS = [
  { id: "q1", name: "Q1 - Urgent & Important", shortName: "Q1", description: "Do Now", color: "bg-red-500/20 text-red-700 dark:text-red-400", dropColor: "border-red-500/50" },
  { id: "q2", name: "Q2 - Important, Not Urgent", shortName: "Q2", description: "Schedule", color: "bg-green-500/20 text-green-700 dark:text-green-400", dropColor: "border-green-500/50" },
  { id: "q3", name: "Q3 - Urgent, Not Important", shortName: "Q3", description: "Delegate", color: "bg-amber-500/20 text-amber-700 dark:text-amber-400", dropColor: "border-amber-500/50" },
  { id: "q4", name: "Q4 - Not Urgent, Not Important", shortName: "Q4", description: "Avoid", color: "bg-gray-500/20 text-gray-700 dark:text-gray-400", dropColor: "border-gray-500/50" },
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

function parseScheduledTime(scheduledTime: string): { startTime: string; endTime: string } {
  const parts = scheduledTime.split(" - ");
  if (parts.length !== 2) return { startTime: "", endTime: "" };
  const parse12h = (t: string): string => {
    const match = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return "";
    let h = parseInt(match[1], 10);
    const m = match[2];
    const ampm = match[3].toUpperCase();
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${h.toString().padStart(2, "0")}:${m}`;
  };
  return { startTime: parse12h(parts[0]), endTime: parse12h(parts[1]) };
}

function formatTimeLabel(time: string) {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr} ${suffix}`;
}

function calcDuration(startTime: string, endTime: string): string {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return "";
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

function isSchedulableQuadrant(quadrant: string) {
  return quadrant === "q1" || quadrant === "q2";
}

interface WizardItem {
  task: string;
  quadrant: string;
  role: HabitCategory;
  deadline: string;
  startTime: string;
  endTime: string;
  goalAlignment: string;
  blocksGoal: boolean;
}

export default function EisenhowerPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    role: "health" as HabitCategory,
    task: "",
    quadrant: "q2",
    deadline: "",
    startTime: "",
    endTime: "",
    decision: "",
    goalAlignment: "",
    blocksGoal: false,
  });

  const [editEntry, setEditEntry] = useState<EisenhowerEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    role: "health" as HabitCategory,
    task: "",
    quadrant: "q2",
    deadline: "",
    startTime: "",
    endTime: "",
    goalAlignment: "",
    blocksGoal: false,
  });

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [brainDump, setBrainDump] = useState("");
  const [wizardItems, setWizardItems] = useState<WizardItem[]>([]);
  const [wizardSaving, setWizardSaving] = useState(false);
  const [dragItem, setDragItem] = useState<number | null>(null);
  const [dragOverQuadrant, setDragOverQuadrant] = useState<string | null>(null);
  const [aiParsing, setAiParsing] = useState(false);

  const wizardHasContent = brainDump.trim().length > 0 || wizardItems.length > 0;
  const [confirmClose, setConfirmClose] = useState(false);

  const handleWizardOpenChange = useCallback((open: boolean) => {
    if (!open && wizardHasContent) {
      setConfirmClose(true);
    } else {
      setWizardOpen(open);
    }
  }, [wizardHasContent]);

  const confirmDiscardWizard = useCallback(() => {
    setConfirmClose(false);
    setWizardOpen(false);
    setBrainDump("");
    setWizardItems([]);
    setWizardStep(0);
  }, []);

  const handleAiParse = useCallback(async () => {
    const lines = brainDump.split("\n").filter(l => l.trim());
    if (lines.length === 0) return;
    setAiParsing(true);
    try {
      const res = await apiRequest("POST", "/api/eisenhower/parse-tasks", {
        tasks: lines.map(l => l.trim()),
        weekStart: format(currentWeek, "yyyy-MM-dd"),
      });
      if (!res.ok) throw new Error("AI parsing failed");
      const data = await res.json();
      const items: WizardItem[] = (data.items || []).map((item: any, i: number) => {
        const validRoles = Object.keys(HABIT_CATEGORIES);
        const role = validRoles.includes(item.role) ? item.role as HabitCategory : "health" as HabitCategory;
        const validQuadrants = ["q1", "q2", "q3", "q4"];
        const quadrant = validQuadrants.includes(item.quadrant) ? item.quadrant : "unclassified";
        return {
          task: item.task || lines[i]?.trim() || "",
          quadrant,
          role,
          deadline: item.scheduledDate || "",
          startTime: item.startTime || "",
          endTime: item.endTime || "",
          goalAlignment: "",
          blocksGoal: false,
        };
      });
      setWizardItems(items);
      setWizardStep(1);
      toast({ title: "AI parsed your tasks", description: `${items.length} tasks categorized. Review and adjust as needed.` });
    } catch (error) {
      toast({ title: "AI parsing failed", description: "Falling back to manual mode.", variant: "destructive" });
    } finally {
      setAiParsing(false);
    }
  }, [brainDump, currentWeek, toast]);

  const weekStart = format(currentWeek, "yyyy-MM-dd");

  const { data: entries = [], isLoading } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower/week", weekStart],
  });

  const duration = newEntry.startTime && newEntry.endTime ? calcDuration(newEntry.startTime, newEntry.endTime) : "";
  const editDuration = editForm.startTime && editForm.endTime ? calcDuration(editForm.startTime, editForm.endTime) : "";

  const createMutation = useMutation({
    mutationFn: async (entry: typeof newEntry) => {
      const isSchedulable = isSchedulableQuadrant(entry.quadrant);
      const scheduledTime = isSchedulable && entry.startTime && entry.endTime
        ? `${formatTimeLabel(entry.startTime)} - ${formatTimeLabel(entry.endTime)}`
        : null;
      const timeEstimate = isSchedulable && entry.startTime && entry.endTime
        ? calcDuration(entry.startTime, entry.endTime)
        : null;
      const res = await apiRequest("POST", "/api/eisenhower", {
        role: entry.role,
        task: entry.task,
        quadrant: entry.quadrant,
        deadline: isSchedulable ? (entry.deadline || null) : null,
        decision: entry.decision || null,
        timeEstimate: timeEstimate || null,
        scheduledTime: scheduledTime || null,
        scheduledDate: isSchedulable ? (entry.deadline || null) : null,
        goalAlignment: entry.quadrant === "q2" ? (entry.goalAlignment || null) : null,
        blocksGoal: entry.blocksGoal || false,
        weekStart,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to create entry");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower/week", weekStart] });
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
      setDialogOpen(false);
      setNewEntry({ role: "health", task: "", quadrant: "q2", deadline: "", startTime: "", endTime: "", decision: "", goalAlignment: "", blocksGoal: false });
    },
    onError: (error: Error) => {
      toast({ title: "Could not create entry", description: error.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: { id: number; updates: typeof editForm }) => {
      const { startTime, endTime, quadrant } = data.updates;
      const isSchedulable = isSchedulableQuadrant(quadrant);
      const scheduledTime = isSchedulable && startTime && endTime
        ? `${formatTimeLabel(startTime)} - ${formatTimeLabel(endTime)}` : null;
      const timeEstimate = isSchedulable && startTime && endTime
        ? calcDuration(startTime, endTime) : null;
      const res = await apiRequest("PATCH", `/api/eisenhower/${data.id}`, {
        role: data.updates.role,
        task: data.updates.task,
        quadrant: data.updates.quadrant,
        deadline: isSchedulable ? (data.updates.deadline || null) : null,
        scheduledTime,
        timeEstimate,
        scheduledDate: isSchedulable ? (data.updates.deadline || null) : null,
        goalAlignment: data.updates.quadrant === "q2" ? (data.updates.goalAlignment || null) : null,
        blocksGoal: data.updates.blocksGoal || false,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update entry");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower/week", weekStart] });
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
      setEditDialogOpen(false);
      setEditEntry(null);
    },
    onError: (error: Error) => {
      toast({ title: "Could not update entry", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: number; currentStatus: string | null }) => {
      const nextStatus = currentStatus === null || currentStatus === undefined ? "completed" : currentStatus === "completed" ? "skipped" : null;
      const res = await apiRequest("PATCH", `/api/eisenhower/${id}`, { status: nextStatus });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update status");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower/week", weekStart] });
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not update status", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/eisenhower/${id}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to delete entry");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower/week", weekStart] });
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not delete entry", description: error.message, variant: "destructive" });
    },
  });

  const handleExport = () => {
    window.open("/api/eisenhower/export", "_blank");
  };

  const handleOpenEdit = (entry: EisenhowerEntry) => {
    const parsed = entry.scheduledTime ? parseScheduledTime(entry.scheduledTime) : { startTime: "", endTime: "" };
    setEditForm({
      role: (entry.role as HabitCategory) || "health",
      task: entry.task,
      quadrant: entry.quadrant,
      deadline: entry.deadline || entry.scheduledDate || "",
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      goalAlignment: entry.goalAlignment || "",
      blocksGoal: entry.blocksGoal || false,
    });
    setEditEntry(entry);
    setEditDialogOpen(true);
  };

  const getEntriesByQuadrant = (quadrant: string) => entries.filter(e => e.quadrant === quadrant);

  const canSubmitEntry = (formState: { task: string; quadrant: string; deadline: string; startTime: string; endTime: string }) => {
    if (!formState.task.trim()) return false;
    if (isSchedulableQuadrant(formState.quadrant)) {
      if (!formState.deadline || !formState.startTime || !formState.endTime) return false;
    }
    return true;
  };

  const renderFormFields = (
    formState: { role: HabitCategory; task: string; quadrant: string; deadline: string; startTime: string; endTime: string; goalAlignment: string; blocksGoal: boolean },
    setFormState: (val: any) => void,
    durationVal: string,
    prefix: string,
  ) => {
    const schedulable = isSchedulableQuadrant(formState.quadrant);
    return (
      <div className="space-y-4">
        <div>
          <Label>Category</Label>
          <Select value={formState.role} onValueChange={(v) => setFormState({ ...formState, role: v as HabitCategory })}>
            <SelectTrigger data-testid={`${prefix}select-category`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_KEYS.map(key => {
                const style = getCategoryStyle(key);
                return (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                      {HABIT_CATEGORIES[key].label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Task</Label>
          <Textarea 
            value={formState.task} 
            onChange={(e) => setFormState({ ...formState, task: e.target.value })}
            placeholder="What needs to be done?"
            data-testid={`${prefix}input-task`}
          />
        </div>
        <div>
          <Label>Quadrant</Label>
          <Select value={formState.quadrant} onValueChange={(v) => setFormState({ ...formState, quadrant: v })}>
            <SelectTrigger data-testid={`${prefix}select-quadrant`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUADRANTS.map(q => (
                <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {schedulable && (
          <>
            <div>
              <Label>
                Date <span className="text-destructive">*</span>
              </Label>
              <Input 
                type="date" 
                value={formState.deadline} 
                onChange={(e) => setFormState({ ...formState, deadline: e.target.value })}
                data-testid={`${prefix}input-deadline`}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  Start Time <span className="text-destructive">*</span>
                </Label>
                <Select value={formState.startTime} onValueChange={(v) => setFormState({ ...formState, startTime: v })}>
                  <SelectTrigger data-testid={`${prefix}select-start-time`}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {TIME_SLOTS.map(t => (
                      <SelectItem key={t} value={t}>{formatTimeLabel(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  End Time <span className="text-destructive">*</span>
                </Label>
                <Select value={formState.endTime} onValueChange={(v) => setFormState({ ...formState, endTime: v })}>
                  <SelectTrigger data-testid={`${prefix}select-end-time`}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {TIME_SLOTS.filter(t => !formState.startTime || t > formState.startTime).map(t => (
                      <SelectItem key={t} value={t}>{formatTimeLabel(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {durationVal && (
              <p className="text-sm text-muted-foreground" data-testid={`${prefix}text-duration`}>
                Duration: {durationVal}
              </p>
            )}
          </>
        )}
        {formState.quadrant === "q2" && (
          <div>
            <Label>Goal Alignment (optional)</Label>
            <Input
              value={formState.goalAlignment}
              onChange={(e) => setFormState({ ...formState, goalAlignment: e.target.value })}
              placeholder="How does this support your monthly goal?"
              data-testid={`${prefix}input-goal-alignment`}
            />
          </div>
        )}
        <div className="flex items-center gap-3">
          <Checkbox
            id={`${prefix}blocks-goal`}
            checked={formState.blocksGoal}
            onCheckedChange={(v) => setFormState({ ...formState, blocksGoal: !!v })}
            data-testid={`${prefix}checkbox-blocks-goal`}
          />
          <Label htmlFor={`${prefix}blocks-goal`} className="text-sm cursor-pointer">
            Success Catalyst
          </Label>
        </div>
      </div>
    );
  };

  const handleDragStart = (idx: number) => {
    setDragItem(idx);
  };

  const handleDragOver = (e: React.DragEvent, quadrantId: string) => {
    e.preventDefault();
    setDragOverQuadrant(quadrantId);
  };

  const handleDragLeave = () => {
    setDragOverQuadrant(null);
  };

  const handleDrop = (quadrantId: string) => {
    if (dragItem !== null) {
      const updated = [...wizardItems];
      updated[dragItem] = { ...updated[dragItem], quadrant: quadrantId };
      setWizardItems(updated);
    }
    setDragItem(null);
    setDragOverQuadrant(null);
  };

  const wizardQ12Items = wizardItems.filter(i => isSchedulableQuadrant(i.quadrant));
  const allQ12Complete = wizardQ12Items.every(i => i.deadline && i.startTime && i.endTime);

  const wizardStepLabels = ["Brain Dump", "Classify", "Details"];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        rightContent={
          <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        }
      />

      <main className="container mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl bg-primary/[0.08] flex items-center justify-center">
              <Grid3X3 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold">Eisenhower Matrix</h1>
              <p className="text-muted-foreground">Weekly priority planning</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} data-testid="button-prev-week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className="font-medium" data-testid="text-current-week">Week of {format(currentWeek, "MMM d, yyyy")}</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} data-testid="button-next-week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex justify-end gap-2 mb-4">
          <Button variant="outline" onClick={() => { setWizardOpen(true); setWizardStep(0); setBrainDump(""); setWizardItems([]); }} data-testid="button-plan-week">
            <Wand2 className="h-4 w-4 mr-2" />
            Plan Week
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-entry">
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Entry</DialogTitle>
                <DialogDescription>Add a task to your Eisenhower Matrix</DialogDescription>
              </DialogHeader>
              {renderFormFields(newEntry, (val: any) => setNewEntry(val), duration, "")}
              <DialogFooter>
                <Button 
                  onClick={() => createMutation.mutate(newEntry)} 
                  disabled={!canSubmitEntry(newEntry) || createMutation.isPending}
                  data-testid="button-submit-entry"
                >
                  Add Entry
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Entry</DialogTitle>
              <DialogDescription>Update your Eisenhower Matrix entry</DialogDescription>
            </DialogHeader>
            {renderFormFields(editForm, (val: any) => setEditForm(val), editDuration, "edit-")}
            <DialogFooter>
              <Button 
                onClick={() => editEntry && editMutation.mutate({ id: editEntry.id, updates: editForm })} 
                disabled={!canSubmitEntry(editForm) || editMutation.isPending}
                data-testid="edit-dialog-submit"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid md:grid-cols-2 gap-6">
          {QUADRANTS.map(quadrant => (
            <Card key={quadrant.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="font-serif text-lg">{quadrant.name}</CardTitle>
                  <Badge variant="outline">{quadrant.description}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 min-h-[100px]">
                  {getEntriesByQuadrant(quadrant.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No tasks in this quadrant</p>
                  ) : (
                    getEntriesByQuadrant(quadrant.id).map(entry => {
                      const isQ4Loss = entry.quadrant === "q4" && entry.status === "completed";
                      return (
                        <div 
                          key={entry.id} 
                          className={`p-3 rounded-lg ${quadrant.color} flex items-start gap-3`}
                        >
                          <button
                            role="checkbox"
                            aria-checked={entry.status === "completed" ? true : entry.status === "skipped" ? "mixed" : false}
                            aria-label={`${entry.task} - ${entry.status === "completed" ? "completed" : entry.status === "skipped" ? "skipped" : "not tracked"}. Click to cycle.`}
                            className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                              entry.status === "completed" ? "bg-primary border-primary" : entry.status === "skipped" ? "bg-yellow-300 border-yellow-400 dark:bg-yellow-400/30 dark:border-yellow-400/50" : "border-border"
                            }`}
                            onClick={() => toggleMutation.mutate({ id: entry.id, currentStatus: entry.status || null })}
                            data-testid={`eisenhower-cycle-${entry.id}`}
                          >
                            {entry.status === "completed" && <Check className="h-3 w-3 text-primary-foreground" />}
                            {entry.status === "skipped" && <Minus className="h-3 w-3 text-yellow-700 dark:text-yellow-300" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${isQ4Loss ? "text-red-500 dark:text-red-400" : entry.status === "completed" ? "line-through opacity-60" : entry.status === "skipped" ? "text-muted-foreground italic opacity-60" : ""}`}>
                              {entry.task}
                              {isQ4Loss && <span className="ml-1 font-medium">(loss)</span>}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className={`text-xs ${getCategoryStyle(entry.role).text} ${getCategoryStyle(entry.role).border}`}>
                                <span className={`h-2 w-2 rounded-full mr-1 ${getCategoryStyle(entry.role).dot}`} />
                                {HABIT_CATEGORIES[(entry.role as HabitCategory)]?.label || entry.role}
                              </Badge>
                              {entry.blocksGoal && (
                                <Badge variant="outline" className="text-xs text-primary border-primary/30" data-testid={`badge-blocks-goal-${entry.id}`}>
                                  Success Catalyst
                                </Badge>
                              )}
                              {isSchedulableQuadrant(entry.quadrant) && entry.deadline && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(entry.deadline + "T00:00:00"), "MMM d")}
                                </span>
                              )}
                              {entry.scheduledTime && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {entry.scheduledTime}
                                </span>
                              )}
                              {entry.timeEstimate && <span className="text-xs text-muted-foreground">({entry.timeEstimate})</span>}
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleOpenEdit(entry)}
                            data-testid={`button-edit-entry-${entry.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deleteMutation.mutate(entry.id)}
                            data-testid={`button-delete-entry-${entry.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="font-serif">Quick Reference</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong>Q1 (Urgent + Important):</strong> Crises, deadlines, pressing problems. Requires date & time.</p>
            <p><strong>Q2 (Important + Not Urgent):</strong> Prevention, planning, growth, relationships. Requires date & time.</p>
            <p><strong>Q3 (Urgent + Not Important):</strong> Interruptions, other people's urgency. Delegate or decline.</p>
            <p><strong>Q4 (Not Urgent + Not Important):</strong> Time-wasters, avoidance. Avoid entirely. If done, it's a loss.</p>
            <p className="pt-2 border-t font-medium text-foreground">Goal: Reduce Q1 by investing in Q2. Your life gets calmer, clearer, and more intentional.</p>
          </CardContent>
        </Card>

        {/* Plan Week Wizard */}
        <Dialog open={wizardOpen} onOpenChange={handleWizardOpenChange}>
          <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto" data-testid="modal-plan-wizard">
            <DialogHeader>
              <DialogTitle className="font-serif flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                Plan Your Week
              </DialogTitle>
              <DialogDescription>
                {wizardStep === 0 && "Write everything on your mind — one task per line. Don't filter, just dump."}
                {wizardStep === 1 && "Drag each task into the right quadrant. Use the reference below to guide you."}
                {wizardStep === 2 && "Set a date and time for your Q1 and Q2 items. Q3 and Q4 items are ready to go."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                {wizardStepLabels.map((label, i) => (
                  <div key={i} className="flex items-center gap-2 flex-1">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                      i < wizardStep ? "bg-primary text-primary-foreground" : i === wizardStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {i < wizardStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span className={`text-xs font-medium ${i <= wizardStep ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                    {i < wizardStepLabels.length - 1 && <div className={`h-0.5 flex-1 rounded-full ${i < wizardStep ? "bg-primary" : "bg-muted"}`} />}
                  </div>
                ))}
              </div>

              {/* Step 1: Brain Dump */}
              {wizardStep === 0 && (
                <div className="space-y-3">
                  <Label>Brain Dump — one task per line</Label>
                  <Textarea
                    value={brainDump}
                    onChange={(e) => setBrainDump(e.target.value)}
                    placeholder={"Finish PPT by Tuesday night for Work\nSchedule dentist Thursday morning\nReview investments\nCall mom\nClean garage Saturday afternoon"}
                    rows={10}
                    className="text-sm"
                    data-testid="textarea-brain-dump"
                    autoFocus
                    disabled={aiParsing}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {brainDump.split("\n").filter(l => l.trim()).length} tasks listed
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAiParse}
                      disabled={!brainDump.trim() || aiParsing}
                      className="gap-1.5"
                      data-testid="button-ai-parse"
                    >
                      {aiParsing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Parsing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          Auto-fill with AI
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Include dates, times, and categories for best AI results (e.g., "Finish PPT by Tuesday night for Work")
                  </p>
                </div>
              )}

              {/* Step 2: Drag & Drop Classification */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  {/* Unclassified items */}
                  {wizardItems.some(i => !i.quadrant || i.quadrant === "unclassified") && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Drag tasks to a quadrant below</Label>
                      <div className="space-y-1">
                        {wizardItems.map((item, idx) => (
                          (!item.quadrant || item.quadrant === "unclassified") && (
                            <div
                              key={idx}
                              draggable
                              onDragStart={() => handleDragStart(idx)}
                              className="flex items-center gap-2 p-2 border rounded-md bg-card cursor-grab active:cursor-grabbing"
                              data-testid={`wizard-drag-item-${idx}`}
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm">{item.task}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quadrant drop zones */}
                  <div className="grid grid-cols-2 gap-3">
                    {QUADRANTS.map(q => {
                      const itemsInQ = wizardItems.filter(i => i.quadrant === q.id);
                      const isDragOver = dragOverQuadrant === q.id;
                      return (
                        <div
                          key={q.id}
                          className={`p-3 rounded-lg border-2 border-dashed min-h-[100px] transition-colors ${
                            isDragOver ? `${q.dropColor} bg-muted/50` : "border-border"
                          }`}
                          onDragOver={(e) => handleDragOver(e, q.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={() => handleDrop(q.id)}
                          data-testid={`wizard-drop-${q.id}`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <p className="text-xs font-semibold">{q.shortName}</p>
                            <Badge variant="outline" className="text-[10px]">{q.description}</Badge>
                          </div>
                          <div className="space-y-1">
                            {itemsInQ.map((item) => {
                              const realIdx = wizardItems.indexOf(item);
                              return (
                                <div
                                  key={realIdx}
                                  draggable
                                  onDragStart={() => handleDragStart(realIdx)}
                                  className={`flex items-center gap-2 p-1.5 rounded-md text-xs cursor-grab active:cursor-grabbing ${q.color}`}
                                  data-testid={`wizard-classified-${realIdx}`}
                                >
                                  <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="truncate">{item.task}</span>
                                </div>
                              );
                            })}
                            {itemsInQ.length === 0 && !isDragOver && (
                              <p className="text-[10px] text-muted-foreground text-center py-2">Drop here</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick tap classification as fallback */}
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground mb-2">Or tap to classify:</p>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                      {wizardItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2" data-testid={`wizard-tap-item-${idx}`}>
                          <span className="text-xs flex-1 truncate">{item.task}</span>
                          <div className="flex gap-1 shrink-0">
                            {QUADRANTS.map(q => (
                              <Button
                                key={q.id}
                                variant={item.quadrant === q.id ? "default" : "outline"}
                                size="sm"
                                className="text-[10px] h-6 px-2"
                                onClick={() => {
                                  const updated = [...wizardItems];
                                  updated[idx] = { ...updated[idx], quadrant: q.id };
                                  setWizardItems(updated);
                                }}
                                data-testid={`wizard-classify-${idx}-${q.id}`}
                              >
                                {q.shortName}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Reference */}
                  <div className="border-t pt-3">
                    <p className="text-xs font-semibold mb-1">Quick Reference</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                      <p><strong>Q1:</strong> Urgent + Important = Do now</p>
                      <p><strong>Q2:</strong> Important, not urgent = Schedule</p>
                      <p><strong>Q3:</strong> Urgent, not important = Delegate</p>
                      <p><strong>Q4:</strong> Not urgent/important = Avoid</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Q1/Q2 Details */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  {wizardQ12Items.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground">No Q1 or Q2 items need date & time details.</p>
                      <p className="text-xs text-muted-foreground mt-1">You can save your tasks now.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                      {wizardItems.map((item, idx) => {
                        if (!isSchedulableQuadrant(item.quadrant)) return null;
                        const q = QUADRANTS.find(q => q.id === item.quadrant)!;
                        const dur = item.startTime && item.endTime ? calcDuration(item.startTime, item.endTime) : "";
                        const isMissing = !item.deadline || !item.startTime || !item.endTime;
                        return (
                          <div key={idx} className={`p-3 border rounded-md space-y-3 ${q.color}`} data-testid={`wizard-detail-${idx}`}>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">{item.task}</p>
                              <Badge variant="outline" className="text-xs shrink-0">{q.shortName}</Badge>
                            </div>
                            <div>
                              <Label className="text-xs">
                                Category
                              </Label>
                              <Select value={item.role} onValueChange={(v) => {
                                const updated = [...wizardItems];
                                updated[idx] = { ...updated[idx], role: v as HabitCategory };
                                setWizardItems(updated);
                              }}>
                                <SelectTrigger className="h-8 text-xs" data-testid={`wizard-detail-category-${idx}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CATEGORY_KEYS.map(key => (
                                    <SelectItem key={key} value={key}>
                                      <div className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${getCategoryStyle(key).dot}`} />
                                        {HABIT_CATEGORIES[key].label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">
                                Date <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                type="date"
                                value={item.deadline}
                                onChange={(e) => {
                                  const updated = [...wizardItems];
                                  updated[idx] = { ...updated[idx], deadline: e.target.value };
                                  setWizardItems(updated);
                                }}
                                className="h-8 text-xs"
                                data-testid={`wizard-detail-date-${idx}`}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">
                                  Start <span className="text-destructive">*</span>
                                </Label>
                                <Select value={item.startTime} onValueChange={(v) => {
                                  const updated = [...wizardItems];
                                  updated[idx] = { ...updated[idx], startTime: v };
                                  setWizardItems(updated);
                                }}>
                                  <SelectTrigger className="h-8 text-xs" data-testid={`wizard-detail-start-${idx}`}>
                                    <SelectValue placeholder="Start" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-60">
                                    {TIME_SLOTS.map(t => (
                                      <SelectItem key={t} value={t}>{formatTimeLabel(t)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">
                                  End <span className="text-destructive">*</span>
                                </Label>
                                <Select value={item.endTime} onValueChange={(v) => {
                                  const updated = [...wizardItems];
                                  updated[idx] = { ...updated[idx], endTime: v };
                                  setWizardItems(updated);
                                }}>
                                  <SelectTrigger className="h-8 text-xs" data-testid={`wizard-detail-end-${idx}`}>
                                    <SelectValue placeholder="End" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-60">
                                    {TIME_SLOTS.filter(t => !item.startTime || t > item.startTime).map(t => (
                                      <SelectItem key={t} value={t}>{formatTimeLabel(t)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            {dur && <p className="text-xs text-muted-foreground">Duration: {dur}</p>}
                            {item.quadrant === "q2" && (
                              <div>
                                <Label className="text-xs">Goal Alignment (optional)</Label>
                                <Input
                                  value={item.goalAlignment}
                                  onChange={(e) => {
                                    const updated = [...wizardItems];
                                    updated[idx] = { ...updated[idx], goalAlignment: e.target.value };
                                    setWizardItems(updated);
                                  }}
                                  placeholder="How does this support your monthly goal?"
                                  className="h-8 text-xs"
                                  data-testid={`wizard-detail-goal-${idx}`}
                                />
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`wizard-catalyst-${idx}`}
                                checked={item.blocksGoal}
                                onCheckedChange={(v) => {
                                  const updated = [...wizardItems];
                                  updated[idx] = { ...updated[idx], blocksGoal: !!v };
                                  setWizardItems(updated);
                                }}
                                data-testid={`wizard-detail-catalyst-${idx}`}
                              />
                              <Label htmlFor={`wizard-catalyst-${idx}`} className="text-xs cursor-pointer">Success Catalyst</Label>
                            </div>
                            {isMissing && (
                              <p className="text-xs text-destructive">Date and time are required for {q.shortName} items</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Show Q3/Q4 summary */}
                  {wizardItems.some(i => !isSchedulableQuadrant(i.quadrant)) && (
                    <div className="border-t pt-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Q3 & Q4 items (no additional details needed)</p>
                      <div className="space-y-1">
                        {wizardItems.filter(i => !isSchedulableQuadrant(i.quadrant)).map((item, i) => {
                          const q = QUADRANTS.find(q => q.id === item.quadrant)!;
                          return (
                            <div key={i} className={`flex items-center gap-2 p-1.5 rounded-md text-xs ${q.color}`}>
                              <Badge variant="outline" className="text-[10px] shrink-0">{q.shortName}</Badge>
                              <span>{item.task}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter className="flex-row justify-between gap-2">
              <div>
                {wizardStep > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setWizardStep(s => s - 1)} data-testid="button-wizard-back">
                    Back
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {wizardStep < 2 && (
                  <Button
                    size="sm"
                    onClick={() => {
                      if (wizardStep === 0) {
                        const lines = brainDump.split("\n").filter(l => l.trim());
                        setWizardItems(lines.map(task => ({
                          task: task.trim(),
                          quadrant: "unclassified",
                          role: "health" as HabitCategory,
                          deadline: "",
                          startTime: "",
                          endTime: "",
                          goalAlignment: "",
                          blocksGoal: false,
                        })));
                      }
                      setWizardStep(s => s + 1);
                    }}
                    disabled={wizardStep === 0 && !brainDump.trim()}
                    data-testid="button-wizard-next"
                  >
                    Next
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                )}
                {wizardStep === 2 && (
                  <Button
                    size="sm"
                    onClick={async () => {
                      setWizardSaving(true);
                      try {
                        for (const item of wizardItems) {
                          if (item.quadrant === "unclassified") continue;
                          const isSchedulable = isSchedulableQuadrant(item.quadrant);
                          const scheduledTime = isSchedulable && item.startTime && item.endTime
                            ? `${formatTimeLabel(item.startTime)} - ${formatTimeLabel(item.endTime)}` : null;
                          const timeEstimate = isSchedulable && item.startTime && item.endTime
                            ? calcDuration(item.startTime, item.endTime) : null;
                          await apiRequest("POST", "/api/eisenhower", {
                            role: item.role,
                            task: item.task,
                            quadrant: item.quadrant,
                            deadline: isSchedulable ? (item.deadline || null) : null,
                            scheduledTime,
                            timeEstimate,
                            scheduledDate: isSchedulable ? (item.deadline || null) : null,
                            goalAlignment: item.quadrant === "q2" ? (item.goalAlignment || null) : null,
                            blocksGoal: item.blocksGoal || false,
                            weekStart,
                          });
                        }
                        queryClient.invalidateQueries({ queryKey: ["/api/eisenhower/week", weekStart] });
                        queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
                        setWizardOpen(false);
                      } finally {
                        setWizardSaving(false);
                      }
                    }}
                    disabled={wizardItems.filter(i => i.quadrant !== "unclassified").length === 0 || wizardSaving || (wizardQ12Items.length > 0 && !allQ12Complete)}
                    data-testid="button-wizard-save"
                  >
                    {wizardSaving ? "Saving..." : `Add ${wizardItems.filter(i => i.quadrant !== "unclassified").length} Tasks`}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
          <DialogContent data-testid="modal-confirm-close-wizard">
            <DialogHeader>
              <DialogTitle>Discard planner items?</DialogTitle>
              <DialogDescription>
                You have unsaved items in the weekly planner. Closing will discard them.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setConfirmClose(false)} data-testid="button-confirm-close-cancel">
                Keep Planning
              </Button>
              <Button variant="destructive" onClick={confirmDiscardWizard} data-testid="button-confirm-close-discard">
                Discard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
