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

const ROLES = ["health", "wealth", "relationships"] as const;
const QUADRANTS = [
  { id: "q1", name: "Q1 - Urgent & Important", description: "Do Now", color: "bg-red-500/20 text-red-700 dark:text-red-400" },
  { id: "q2", name: "Q2 - Important, Not Urgent", description: "Schedule", color: "bg-green-500/20 text-green-700 dark:text-green-400" },
  { id: "q3", name: "Q3 - Urgent, Not Important", description: "Delegate", color: "bg-amber-500/20 text-amber-700 dark:text-amber-400" },
  { id: "q4", name: "Q4 - Not Urgent, Not Important", description: "Eliminate", color: "bg-gray-500/20 text-gray-700 dark:text-gray-400" },
];

export default function EisenhowerPage() {
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    role: "health" as typeof ROLES[number],
    task: "",
    quadrant: "q2",
    deadline: "",
    timeEstimate: "",
    decision: "",
    scheduledTime: "",
  });

  const weekStart = format(currentWeek, "yyyy-MM-dd");

  const { data: entries = [], isLoading } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower/week", weekStart],
  });

  const createMutation = useMutation({
    mutationFn: async (entry: typeof newEntry) => {
      return apiRequest("POST", "/api/eisenhower", { ...entry, weekStart });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower/week", weekStart] });
      setDialogOpen(false);
      setNewEntry({ role: "health", task: "", quadrant: "q2", deadline: "", timeEstimate: "", decision: "", scheduledTime: "" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      return apiRequest("PATCH", `/api/eisenhower/${id}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower/week", weekStart] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/eisenhower/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower/week", weekStart] });
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

      <main className="container mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center">
              <Grid3X3 className="h-7 w-7 text-amber-500" />
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
                  <Label>Role</Label>
                  <Select value={newEntry.role} onValueChange={(v) => setNewEntry({ ...newEntry, role: v as typeof ROLES[number] })}>
                    <SelectTrigger data-testid="select-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map(role => (
                        <SelectItem key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</SelectItem>
                      ))}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Deadline</Label>
                    <Input 
                      type="date" 
                      value={newEntry.deadline} 
                      onChange={(e) => setNewEntry({ ...newEntry, deadline: e.target.value })}
                      data-testid="input-deadline"
                    />
                  </div>
                  <div>
                    <Label>Time Estimate</Label>
                    <Input 
                      placeholder="e.g., 60m, 2h"
                      value={newEntry.timeEstimate} 
                      onChange={(e) => setNewEntry({ ...newEntry, timeEstimate: e.target.value })}
                      data-testid="input-time-estimate"
                    />
                  </div>
                </div>
                <div>
                  <Label>Scheduled Time</Label>
                  <Input 
                    placeholder="e.g., Tue 9:00-10:30"
                    value={newEntry.scheduledTime} 
                    onChange={(e) => setNewEntry({ ...newEntry, scheduledTime: e.target.value })}
                    data-testid="input-scheduled-time"
                  />
                </div>
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
                            <Badge variant="outline" className="text-xs capitalize">{entry.role}</Badge>
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
