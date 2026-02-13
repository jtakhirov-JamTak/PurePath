import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Grid3X3, Plus, Download, ChevronLeft, ChevronRight, Trash2, Pencil } from "lucide-react";
import { format, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { EisenhowerEntry } from "@shared/schema";
import { HABIT_CATEGORIES, type HabitCategory } from "@shared/schema";

const CATEGORY_KEYS = Object.keys(HABIT_CATEGORIES) as HabitCategory[];

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  health: { bg: "bg-primary/[0.08]", text: "text-primary", border: "border-primary/30", dot: "bg-primary" },
  wealth: { bg: "bg-primary/[0.08]", text: "text-primary", border: "border-primary/30", dot: "bg-primary" },
  relationships: { bg: "bg-primary/[0.08]", text: "text-primary", border: "border-primary/30", dot: "bg-primary" },
  career: { bg: "bg-primary/[0.08]", text: "text-primary", border: "border-primary/30", dot: "bg-primary" },
  mindfulness: { bg: "bg-primary/[0.08]", text: "text-primary", border: "border-primary/30", dot: "bg-primary" },
  learning: { bg: "bg-primary/[0.08]", text: "text-primary", border: "border-primary/30", dot: "bg-primary" },
};

function getCategoryStyle(category: string | null) {
  return CATEGORY_STYLES[category || "health"] || CATEGORY_STYLES.health;
}
const QUADRANTS = [
  { id: "q1", name: "Q1 - Urgent & Important", description: "Do Now", color: "bg-red-500/20 text-red-700 dark:text-red-400" },
  { id: "q2", name: "Q2 - Important, Not Urgent", description: "Schedule", color: "bg-green-500/20 text-green-700 dark:text-green-400" },
  { id: "q3", name: "Q3 - Urgent, Not Important", description: "Delegate", color: "bg-amber-500/20 text-amber-700 dark:text-amber-400" },
  { id: "q4", name: "Q4 - Not Urgent, Not Important", description: "Avoid", color: "bg-gray-500/20 text-gray-700 dark:text-gray-400" },
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

export default function EisenhowerPage() {
  const queryClient = useQueryClient();
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
      return apiRequest("POST", "/api/eisenhower", {
        role: entry.role,
        task: entry.task,
        quadrant: entry.quadrant,
        deadline: isSchedulable ? (entry.deadline || null) : null,
        decision: entry.decision || null,
        timeEstimate: timeEstimate || null,
        scheduledTime: scheduledTime || null,
        goalAlignment: entry.quadrant === "q2" ? (entry.goalAlignment || null) : null,
        blocksGoal: entry.blocksGoal || false,
        weekStart,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower/week", weekStart] });
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
      setDialogOpen(false);
      setNewEntry({ role: "health", task: "", quadrant: "q2", deadline: "", startTime: "", endTime: "", decision: "", goalAlignment: "", blocksGoal: false });
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
      return apiRequest("PATCH", `/api/eisenhower/${data.id}`, {
        role: data.updates.role,
        task: data.updates.task,
        quadrant: data.updates.quadrant,
        deadline: isSchedulable ? (data.updates.deadline || null) : null,
        scheduledTime,
        timeEstimate,
        goalAlignment: data.updates.quadrant === "q2" ? (data.updates.goalAlignment || null) : null,
        blocksGoal: data.updates.blocksGoal || false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower/week", weekStart] });
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
      setEditDialogOpen(false);
      setEditEntry(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      return apiRequest("PATCH", `/api/eisenhower/${id}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower/week", weekStart] });
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/eisenhower/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower/week", weekStart] });
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
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
      deadline: entry.deadline || "",
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      goalAlignment: entry.goalAlignment || "",
      blocksGoal: entry.blocksGoal || false,
    });
    setEditEntry(entry);
    setEditDialogOpen(true);
  };

  const getEntriesByQuadrant = (quadrant: string) => entries.filter(e => e.quadrant === quadrant);

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
              <Label>Date</Label>
              <Input 
                type="date" 
                value={formState.deadline} 
                onChange={(e) => setFormState({ ...formState, deadline: e.target.value })}
                data-testid={`${prefix}input-deadline`}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
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
                <Label>End Time</Label>
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

        <div className="flex justify-end mb-4">
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
                  disabled={!newEntry.task || createMutation.isPending}
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
            {editEntry && editEntry.scheduledTime && (
              <p className="text-sm text-muted-foreground">
                Current schedule: {editEntry.scheduledTime}
                {editEntry.timeEstimate ? ` (${editEntry.timeEstimate})` : ""}
              </p>
            )}
            {renderFormFields(editForm, (val: any) => setEditForm(val), editDuration, "edit-")}
            <DialogFooter>
              <Button 
                onClick={() => editEntry && editMutation.mutate({ id: editEntry.id, updates: editForm })} 
                disabled={!editForm.task || editMutation.isPending}
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
                <div className="flex items-center justify-between">
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
                      const isQ4Loss = entry.quadrant === "q4" && entry.completed;
                      return (
                        <div 
                          key={entry.id} 
                          className={`p-3 rounded-lg ${quadrant.color} flex items-start gap-3`}
                        >
                          <Checkbox 
                            checked={entry.completed || false}
                            onCheckedChange={(checked) => toggleMutation.mutate({ id: entry.id, completed: !!checked })}
                            data-testid={`checkbox-entry-${entry.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${isQ4Loss ? "text-red-500 dark:text-red-400" : entry.completed ? "line-through opacity-60" : ""}`}>
                              {entry.task}
                              {isQ4Loss && <span className="ml-1 font-medium">(loss)</span>}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className={`text-xs ${getCategoryStyle(entry.role).text} ${getCategoryStyle(entry.role).border}`}>
                                <span className={`h-2 w-2 rounded-full mr-1 ${getCategoryStyle(entry.role).dot}`} />
                                {HABIT_CATEGORIES[(entry.role as HabitCategory)] ?.label || entry.role}
                              </Badge>
                              {entry.blocksGoal && (
                                <Badge variant="outline" className="text-xs text-primary border-primary/30" data-testid={`badge-blocks-goal-${entry.id}`}>
                                  Success Catalyst
                                </Badge>
                              )}
                              {entry.timeEstimate && <span className="text-xs text-muted-foreground">{entry.timeEstimate}</span>}
                              {entry.scheduledTime && <span className="text-xs text-muted-foreground">{entry.scheduledTime}</span>}
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
            <p><strong>Q1 (Urgent + Important):</strong> Crises, deadlines, pressing problems → Do now</p>
            <p><strong>Q2 (Important + Not Urgent):</strong> Prevention, planning, growth, relationships → Schedule</p>
            <p><strong>Q3 (Urgent + Not Important):</strong> Interruptions, other people's urgency → Delegate or decline</p>
            <p><strong>Q4 (Not Urgent + Not Important):</strong> Time-wasters, avoidance — Avoid entirely. If done, it's a loss.</p>
            <p className="pt-2 border-t font-medium text-foreground">Goal: Reduce Q1 by investing in Q2. Your life gets calmer, clearer, and more intentional.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
