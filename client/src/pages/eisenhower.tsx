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
import { Grid3X3, Plus, Download, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
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
  { id: "q4", name: "Q4 - Not Urgent, Not Important", description: "Eliminate", color: "bg-gray-500/20 text-gray-700 dark:text-gray-400" },
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
  });

  const weekStart = format(currentWeek, "yyyy-MM-dd");

  const { data: entries = [], isLoading } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower/week", weekStart],
  });

  const duration = newEntry.startTime && newEntry.endTime ? calcDuration(newEntry.startTime, newEntry.endTime) : "";

  const createMutation = useMutation({
    mutationFn: async (entry: typeof newEntry) => {
      const scheduledTime = entry.startTime && entry.endTime
        ? `${formatTimeLabel(entry.startTime)} - ${formatTimeLabel(entry.endTime)}`
        : "";
      const timeEstimate = entry.startTime && entry.endTime
        ? calcDuration(entry.startTime, entry.endTime)
        : "";
      return apiRequest("POST", "/api/eisenhower", {
        role: entry.role,
        task: entry.task,
        quadrant: entry.quadrant,
        deadline: entry.deadline || null,
        decision: entry.decision || null,
        timeEstimate: timeEstimate || null,
        scheduledTime: scheduledTime || null,
        weekStart,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower/week", weekStart] });
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
      setDialogOpen(false);
      setNewEntry({ role: "health", task: "", quadrant: "q2", deadline: "", startTime: "", endTime: "", decision: "" });
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

  const getEntriesByQuadrant = (quadrant: string) => entries.filter(e => e.quadrant === quadrant);

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
              <div className="space-y-4">
                <div>
                  <Label>Category</Label>
                  <Select value={newEntry.role} onValueChange={(v) => setNewEntry({ ...newEntry, role: v as HabitCategory })}>
                    <SelectTrigger data-testid="select-category">
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
                    value={newEntry.task} 
                    onChange={(e) => setNewEntry({ ...newEntry, task: e.target.value })}
                    placeholder="What needs to be done?"
                    data-testid="input-task"
                  />
                </div>
                <div>
                  <Label>Quadrant</Label>
                  <Select value={newEntry.quadrant} onValueChange={(v) => setNewEntry({ ...newEntry, quadrant: v })}>
                    <SelectTrigger data-testid="select-quadrant">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUADRANTS.map(q => (
                        <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input 
                    type="date" 
                    value={newEntry.deadline} 
                    onChange={(e) => setNewEntry({ ...newEntry, deadline: e.target.value })}
                    data-testid="input-deadline"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Time</Label>
                    <Select value={newEntry.startTime} onValueChange={(v) => setNewEntry({ ...newEntry, startTime: v })}>
                      <SelectTrigger data-testid="select-start-time">
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
                    <Select value={newEntry.endTime} onValueChange={(v) => setNewEntry({ ...newEntry, endTime: v })}>
                      <SelectTrigger data-testid="select-end-time">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {TIME_SLOTS.filter(t => !newEntry.startTime || t > newEntry.startTime).map(t => (
                          <SelectItem key={t} value={t}>{formatTimeLabel(t)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {duration && (
                  <p className="text-sm text-muted-foreground" data-testid="text-duration">
                    Duration: {duration}
                  </p>
                )}
              </div>
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
                    getEntriesByQuadrant(quadrant.id).map(entry => (
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
                          <p className={`text-sm ${entry.completed ? "line-through opacity-60" : ""}`}>{entry.task}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className={`text-xs ${getCategoryStyle(entry.role).text} ${getCategoryStyle(entry.role).border}`}>
                              <span className={`h-2 w-2 rounded-full mr-1 ${getCategoryStyle(entry.role).dot}`} />
                              {HABIT_CATEGORIES[(entry.role as HabitCategory)] ?.label || entry.role}
                            </Badge>
                            {entry.timeEstimate && <span className="text-xs text-muted-foreground">{entry.timeEstimate}</span>}
                            {entry.scheduledTime && <span className="text-xs text-muted-foreground">{entry.scheduledTime}</span>}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 shrink-0"
                          onClick={() => deleteMutation.mutate(entry.id)}
                          data-testid={`button-delete-entry-${entry.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
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
            <p><strong>Q4 (Not Urgent + Not Important):</strong> Time-wasters, avoidance → Eliminate</p>
            <p className="pt-2 border-t font-medium text-foreground">Goal: Reduce Q1 by investing in Q2. Your life gets calmer, clearer, and more intentional.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
