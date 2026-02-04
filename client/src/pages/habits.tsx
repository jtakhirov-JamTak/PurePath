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
      return apiRequest("POST", "/api/tasks", task);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setTaskDialogOpen(false);
      setNewTask({ title: "", date: format(new Date(), "yyyy-MM-dd"), time: "09:00" });
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
            <p className="text-muted-foreground">Track your daily habits and tasks</p>
          </div>
        </div>

        <Tabs defaultValue="habits" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="habits">Weekly Habits</TabsTrigger>
            <TabsTrigger value="tasks">Daily Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="habits" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
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
                      />
                    </div>
                    <div>
                      <Label>Cadence</Label>
                      <Select value={newHabit.cadence} onValueChange={(v) => setNewHabit({ ...newHabit, cadence: v })}>
                        <SelectTrigger>
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
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={() => createHabitMutation.mutate(newHabit)} 
                      disabled={!newHabit.name || createHabitMutation.isPending}
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
                  <Card key={habit.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-cyan-500" />
                          </div>
                          <div>
                            <p className="font-medium">{habit.name}</p>
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
                    <DialogDescription>Add a task for a specific day (max 3 per day)</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Task</Label>
                      <Input 
                        placeholder="What needs to be done?"
                        value={newTask.title} 
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Date</Label>
                        <Input 
                          type="date"
                          value={newTask.date} 
                          onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Time</Label>
                        <Input 
                          type="time"
                          value={newTask.time} 
                          onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={() => createTaskMutation.mutate(newTask)} 
                      disabled={!newTask.title || createTaskMutation.isPending}
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
                  Tasks for {format(new Date(selectedDate), "MMM d, yyyy")}
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
                      >
                        <Checkbox 
                          checked={task.completed || false}
                          onCheckedChange={(checked) => toggleTaskMutation.mutate({ id: task.id, completed: !!checked })}
                        />
                        <div className="flex-1">
                          <p className={`${task.completed ? "line-through opacity-60" : ""}`}>{task.title}</p>
                          <span className="text-xs text-muted-foreground">{task.time}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteTaskMutation.mutate(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
