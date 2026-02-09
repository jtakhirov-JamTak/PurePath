import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ListTodo, Plus, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@shared/schema";

const QUADRANT_OPTIONS = [
  { value: "q1", label: "Q1: Urgent & Important", color: "text-red-500", bg: "bg-red-500/10" },
  { value: "q2", label: "Q2: Not Urgent & Important", color: "text-amber-500", bg: "bg-amber-500/10" },
  { value: "q3", label: "Q3: Urgent & Not Important", color: "text-blue-500", bg: "bg-blue-500/10" },
  { value: "q4", label: "Q4: Not Urgent & Not Important", color: "text-muted-foreground", bg: "bg-muted" },
];

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [newTask, setNewTask] = useState({
    title: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "09:00",
    quadrant: "" as string,
    scheduledTime: "",
  });

  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const todaysTasks = allTasks.filter(t => t.date === selectedDate);

  const createTaskMutation = useMutation({
    mutationFn: async (task: typeof newTask) => {
      const payload: any = {
        title: task.title,
        date: task.date,
        time: task.time,
      };
      if (task.quadrant) payload.quadrant = task.quadrant;
      if (task.scheduledTime) payload.scheduledTime = task.scheduledTime;
      return apiRequest("POST", "/api/tasks", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setTaskDialogOpen(false);
      setNewTask({ title: "", date: format(new Date(), "yyyy-MM-dd"), time: "09:00", quadrant: "", scheduledTime: "" });
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      return apiRequest("PATCH", `/api/tasks/${id}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const canSubmitTask = () => {
    if (!newTask.title) return false;
    if (newTask.quadrant === "q2" && !newTask.scheduledTime) return false;
    return true;
  };

  const getQuadrantBadge = (quadrant: string | null) => {
    if (!quadrant) return null;
    const q = QUADRANT_OPTIONS.find(o => o.value === quadrant);
    if (!q) return null;
    return (
      <Badge variant="outline" className={`text-xs ${q.color}`}>
        {q.value.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center">
            <ListTodo className="h-7 w-7 text-blue-500" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold" data-testid="text-page-title">Daily Tasks</h1>
            <p className="text-muted-foreground">Track up to 3 tasks per day with Eisenhower quadrant labels</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Label>Date:</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
                data-testid="input-task-date-selector"
              />
            </div>
            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={todaysTasks.length >= 3} data-testid="button-add-task">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Daily Task</DialogTitle>
                  <DialogDescription>Add a task for a specific day (max 3 per day). Label with an Eisenhower quadrant.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Task</Label>
                    <Input
                      placeholder="What needs to be done?"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      data-testid="input-task-title"
                    />
                  </div>
                  <div>
                    <Label>Quadrant</Label>
                    <Select
                      value={newTask.quadrant || "none"}
                      onValueChange={(v) => setNewTask({ ...newTask, quadrant: v === "none" ? "" : v, scheduledTime: v !== "q2" ? "" : newTask.scheduledTime })}
                    >
                      <SelectTrigger data-testid="select-quadrant">
                        <SelectValue placeholder="Select quadrant" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No quadrant</SelectItem>
                        {QUADRANT_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {newTask.quadrant === "q2" && (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                      <p className="text-sm text-amber-600 dark:text-amber-400 mb-2 font-medium">
                        Q2 tasks must be scheduled
                      </p>
                      <Label>Scheduled Time</Label>
                      <Input
                        placeholder="e.g., Tuesday 2pm, Tomorrow morning"
                        value={newTask.scheduledTime}
                        onChange={(e) => setNewTask({ ...newTask, scheduledTime: e.target.value })}
                        data-testid="input-scheduled-time"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={newTask.date}
                        onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                        data-testid="input-task-date"
                      />
                    </div>
                    <div>
                      <Label>Time</Label>
                      <Input
                        type="time"
                        value={newTask.time}
                        onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                        data-testid="input-task-time"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => createTaskMutation.mutate(newTask)}
                    disabled={!canSubmitTask() || createTaskMutation.isPending}
                    data-testid="button-submit-task"
                  >
                    Add Task
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Tasks for {format(new Date(selectedDate + "T12:00:00"), "MMM d, yyyy")}
              </CardTitle>
              <CardDescription>{todaysTasks.length}/3 tasks</CardDescription>
            </CardHeader>
            <CardContent>
              {todaysTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No tasks for this day</p>
              ) : (
                <div className="space-y-2">
                  {todaysTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                      data-testid={`card-task-${task.id}`}
                    >
                      <Checkbox
                        checked={task.completed || false}
                        onCheckedChange={(checked) => toggleTaskMutation.mutate({ id: task.id, completed: !!checked })}
                        data-testid={`checkbox-task-${task.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`${task.completed ? "line-through opacity-60" : ""}`} data-testid={`text-task-title-${task.id}`}>{task.title}</p>
                          {getQuadrantBadge(task.quadrant)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{task.time}</span>
                          {task.scheduledTime && (
                            <span className="text-amber-500">Scheduled: {task.scheduledTime}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTaskMutation.mutate(task.id)}
                        data-testid={`button-delete-task-${task.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            {QUADRANT_OPTIONS.map(q => (
              <Card key={q.value} className={`${q.bg} border-0`}>
                <CardContent className="py-3 px-4">
                  <p className={`text-sm font-medium ${q.color}`}>{q.value.toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">{q.label.replace(`${q.value.toUpperCase()}: `, "")}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
