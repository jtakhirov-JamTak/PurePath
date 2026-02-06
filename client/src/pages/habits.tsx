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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckSquare, Plus, Trash2, Clock, Calendar, AlertCircle } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Habit, Task } from "@shared/schema";

const CADENCE_OPTIONS = [
  { value: "daily", label: "Every Day" },
  { value: "weekdays", label: "Weekdays Only" },
  { value: "weekends", label: "Weekends Only" },
  { value: "mon,wed,fri", label: "Mon, Wed, Fri" },
  { value: "tue,thu", label: "Tue, Thu" },
];

const QUADRANT_OPTIONS = [
  { value: "q1", label: "Q1: Urgent & Important", color: "text-red-500", bg: "bg-red-500/10" },
  { value: "q2", label: "Q2: Not Urgent & Important", color: "text-amber-500", bg: "bg-amber-500/10" },
  { value: "q3", label: "Q3: Urgent & Not Important", color: "text-blue-500", bg: "bg-blue-500/10" },
  { value: "q4", label: "Q4: Not Urgent & Not Important", color: "text-muted-foreground", bg: "bg-muted" },
];

export default function HabitsPage() {
  const queryClient = useQueryClient();
  const [habitDialogOpen, setHabitDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  const [newHabit, setNewHabit] = useState({
    name: "",
    cadence: "daily",
    time: "09:00",
  });

  const [newTask, setNewTask] = useState({
    title: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "09:00",
    quadrant: "" as string,
    scheduledTime: "",
  });

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
  });

  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const todaysTasks = allTasks.filter(t => t.date === selectedDate);
  const activeHabits = habits.filter(h => h.active);

  const createHabitMutation = useMutation({
    mutationFn: async (habit: typeof newHabit) => {
      return apiRequest("POST", "/api/habits", habit);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      setHabitDialogOpen(false);
      setNewHabit({ name: "", cadence: "daily", time: "09:00" });
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

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

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
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center">
            <CheckSquare className="h-7 w-7 text-cyan-500" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold">Habits & Tasks</h1>
            <p className="text-muted-foreground">Track your weekly habits and daily tasks</p>
          </div>
        </div>

        <Tabs defaultValue="habits" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="habits" data-testid="tab-habits">Weekly Habits</TabsTrigger>
            <TabsTrigger value="tasks" data-testid="tab-tasks">Daily Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="habits" className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground" data-testid="text-habit-count">
                  {activeHabits.length}/6 habits set
                </p>
              </div>
              <Dialog open={habitDialogOpen} onOpenChange={setHabitDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={activeHabits.length >= 6} data-testid="button-add-habit">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Habit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Weekly Habit</DialogTitle>
                    <DialogDescription>Create a recurring habit for your week</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Habit Name</Label>
                      <Input 
                        placeholder="e.g., Morning meditation"
                        value={newHabit.name} 
                        onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                        data-testid="input-habit-name"
                      />
                    </div>
                    <div>
                      <Label>Cadence</Label>
                      <Select value={newHabit.cadence} onValueChange={(v) => setNewHabit({ ...newHabit, cadence: v })}>
                        <SelectTrigger data-testid="select-cadence">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CADENCE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Time</Label>
                      <Input 
                        type="time"
                        value={newHabit.time} 
                        onChange={(e) => setNewHabit({ ...newHabit, time: e.target.value })}
                        data-testid="input-habit-time"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={() => createHabitMutation.mutate(newHabit)} 
                      disabled={!newHabit.name || createHabitMutation.isPending}
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
                  <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No habits set yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Add up to 6 weekly habits to track</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {activeHabits.map(habit => (
                  <Card key={habit.id} data-testid={`card-habit-${habit.id}`}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-cyan-500" />
                          </div>
                          <div>
                            <p className="font-medium" data-testid={`text-habit-name-${habit.id}`}>{habit.name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {CADENCE_OPTIONS.find(o => o.value === habit.cadence)?.label || habit.cadence}
                              </Badge>
                              <span>{habit.time}</span>
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

            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-sm font-medium">Google Calendar Sync</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Google Calendar integration coming soon. Your habits will automatically sync with your calendar.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
