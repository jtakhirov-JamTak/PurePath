import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pencil, Save, Trash2, RotateCcw, Copy, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { buildProcessUrl } from "@/hooks/use-return-to";
import { format, startOfWeek } from "date-fns";
import type { EisenhowerEntry, Habit, MonthlyGoal, IdentityDocument, PlanVersion } from "@shared/schema";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_DOTS: Record<string, string> = {
  health: "bg-emerald-500",
  wealth: "bg-yellow-400",
  relationships: "bg-rose-500",
  "self-development": "bg-blue-500",
  happiness: "bg-slate-300 dark:bg-slate-400",
};

function PlanVersioningPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<number | null>(null);

  const { data: versions = [] } = useQuery<PlanVersion[]>({
    queryKey: ["/api/plan-versions"],
  });

  const saveMutation = useMutation({
    mutationFn: async (mode: string) => {
      const res = await apiRequest("POST", "/api/plan-versions/save", { mode, versionName: versionName || undefined });
      if (!res.ok) { const body = await res.json(); throw new Error(body.error || "Failed to save plan"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plan-versions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-goal"] });
      setVersionName("");
      toast({ title: "Plan saved successfully" });
    },
    onError: (error: Error) => { toast({ title: "Could not save plan", description: error.message, variant: "destructive" }); },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/plan-versions/clear", {});
      if (!res.ok) { const body = await res.json(); throw new Error(body.error || "Failed to clear plan"); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-goal"] });
      setConfirmClear(false);
      toast({ title: "Plan data cleared" });
    },
    onError: (error: Error) => { toast({ title: "Could not clear plan", description: error.message, variant: "destructive" }); },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/plan-versions/${id}/restore`, {});
      if (!res.ok) { const body = await res.json(); throw new Error(body.error || "Failed to restore plan"); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-goal"] });
      setConfirmRestore(null);
      toast({ title: "Plan restored from saved version" });
    },
    onError: (error: Error) => { toast({ title: "Could not restore plan", description: error.message, variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/plan-versions/${id}`, undefined);
      if (!res.ok) { const body = await res.json(); throw new Error(body.error || "Failed to delete version"); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plan-versions"] });
      toast({ title: "Version deleted" });
    },
    onError: (error: Error) => { toast({ title: "Could not delete version", description: error.message, variant: "destructive" }); },
  });

  return (
    <div data-testid="card-plan-versioning">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        Plan Versions
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Input value={versionName} onChange={(e) => setVersionName(e.target.value)} placeholder="Version name (optional)" className="flex-1 min-w-[150px] text-xs" data-testid="input-version-name" />
            <Button size="sm" className="text-xs" onClick={() => saveMutation.mutate("save")} disabled={saveMutation.isPending} data-testid="button-save-plan">
              <Save className="h-3 w-3 mr-1" />Save
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => saveMutation.mutate("save_and_copy")} disabled={saveMutation.isPending} data-testid="button-save-copy">
              <Copy className="h-3 w-3 mr-1" />Copy
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setConfirmClear(true)} data-testid="button-clear-plan">
              <Trash2 className="h-3 w-3 mr-1" />Clear
            </Button>
          </div>
          {versions.length > 0 && (
            <div>
              <Button variant="ghost" size="sm" onClick={() => setShowVersions(!showVersions)} className="w-full justify-between text-xs" data-testid="button-toggle-versions">
                <span>{versions.length} saved version{versions.length !== 1 ? "s" : ""}</span>
                {showVersions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
              {showVersions && (
                <div className="space-y-1.5 mt-2">
                  {versions.map(v => (
                    <div key={v.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs" data-testid={`version-row-${v.id}`}>
                      <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{v.versionName}</p>
                        <p className="text-[10px] text-muted-foreground">{format(new Date(v.createdAt), "MMM d, yyyy h:mm a")}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setConfirmRestore(v.id)} data-testid={`button-restore-${v.id}`}><RotateCcw className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteMutation.mutate(v.id)} data-testid={`button-delete-version-${v.id}`}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader><DialogTitle>Clear Plan Data?</DialogTitle><DialogDescription>This will clear your current vision board, monthly goal, and deactivate all habits.</DialogDescription></DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmClear(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => { saveMutation.mutate("save_and_clear"); setConfirmClear(false); }} disabled={saveMutation.isPending}>Save First, Then Clear</Button>
            <Button variant="destructive" onClick={() => clearMutation.mutate()} disabled={clearMutation.isPending} data-testid="button-confirm-clear">Clear Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmRestore !== null} onOpenChange={(o) => { if (!o) setConfirmRestore(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Restore This Version?</DialogTitle><DialogDescription>This will overwrite your current plan data with the saved version.</DialogDescription></DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmRestore(null)}>Cancel</Button>
            <Button onClick={() => confirmRestore !== null && restoreMutation.mutate(confirmRestore)} disabled={restoreMutation.isPending} data-testid="button-confirm-restore">Restore</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PlanPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const today = new Date();
  const weekStartStr = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const currentMonthKey = format(today, "yyyy-MM");

  const { data: eisenhowerEntries = [] } = useQuery<EisenhowerEntry[]>({ queryKey: ["/api/eisenhower"], enabled: !!user });
  const { data: habits = [] } = useQuery<Habit[]>({ queryKey: ["/api/habits"], enabled: !!user });
  const { data: monthlyGoal } = useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal", currentMonthKey],
    queryFn: async () => { const res = await fetch(`/api/monthly-goal?month=${currentMonthKey}`, { credentials: "include" }); if (!res.ok) throw new Error("Failed to fetch"); return res.json(); },
    enabled: !!user,
  });

  const goalDisplay = monthlyGoal?.goalWhat?.trim() || monthlyGoal?.goalStatement?.trim() || "";
  const activeHabits = habits.filter(h => h.active !== false);
  const focusItems = eisenhowerEntries.filter(e => e.weekStart === weekStartStr && (e.quadrant === "q1" || (e.quadrant === "q2" && e.blocksGoal)));

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-sm font-medium" data-testid="text-plan-title">Plan</h1>
          <p className="text-xs text-muted-foreground">Your documents, goal, habits, and weekly focus.</p>
        </div>

        <div className="space-y-6">
          {/* Documents */}
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-bark font-medium">Documents</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation(buildProcessUrl("/discovery-profile", "/plan"))} data-testid="card-nav-discovery">
                <CardContent className="p-3">
                  <p className="text-xs font-medium">Discovery Profile</p>
                  <p className="text-[10px] text-muted-foreground">Values, strengths, patterns</p>
                </CardContent>
              </Card>
              <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation(buildProcessUrl("/identity", "/plan"))} data-testid="card-nav-identity">
                <CardContent className="p-3">
                  <p className="text-xs font-medium">Identity Document</p>
                  <p className="text-[10px] text-muted-foreground">Vision, identity, purpose</p>
                </CardContent>
              </Card>
              <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation(buildProcessUrl("/scoreboard", "/plan"))} data-testid="card-nav-scoreboard">
                <CardContent className="p-3">
                  <p className="text-xs font-medium">1-Year Scoreboard</p>
                  <p className="text-[10px] text-muted-foreground">Outcome, obstacles, IF-THEN</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Monthly Goal */}
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-bark font-medium">Monthly Goal</p>
            {goalDisplay ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium" data-testid="text-plan-goal">{goalDisplay}</p>
                {monthlyGoal?.nextConcreteStep && (
                  <p className="text-[10px] text-muted-foreground">Next step: {monthlyGoal.nextConcreteStep}</p>
                )}
                {monthlyGoal?.deadline && (
                  <p className="text-[10px] text-muted-foreground">By: {format(new Date(monthlyGoal.deadline + "T00:00:00"), "MMM d, yyyy")}</p>
                )}
                {monthlyGoal?.fun && (
                  <p className="text-[10px] text-muted-foreground">Prize: {monthlyGoal.fun}</p>
                )}
                <Button variant="outline" size="sm" className="text-xs mt-1" onClick={() => setLocation(buildProcessUrl("/monthly-goal", "/plan"))} data-testid="button-plan-edit-goal">
                  <Pencil className="h-3 w-3 mr-1" />Edit
                </Button>
              </div>
            ) : (
              <button className="text-xs text-primary hover:underline cursor-pointer" onClick={() => setLocation(buildProcessUrl("/monthly-goal", "/plan"))} data-testid="button-plan-set-goal">
                Set your monthly goal →
              </button>
            )}
          </div>

          {/* Habits */}
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-bark font-medium">Habits</p>
            {activeHabits.length > 0 ? (
              <div className="space-y-1">
                {activeHabits.slice(0, 5).map(habit => (
                  <div key={habit.id} className="flex items-center gap-2 py-0.5" data-testid={`habit-plan-${habit.id}`}>
                    <div className={`h-2 w-2 rounded-full shrink-0 ${CATEGORY_DOTS[(habit.category as string) || "health"] || "bg-emerald-500"}`} />
                    <span className="text-xs flex-1">{habit.name}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">{habit.timing || "afternoon"}</span>
                  </div>
                ))}
                {activeHabits.length > 5 && <p className="text-[10px] text-muted-foreground">+{activeHabits.length - 5} more</p>}
                <button className="text-xs text-primary hover:underline cursor-pointer mt-1" onClick={() => setLocation(buildProcessUrl("/habits", "/plan"))} data-testid="button-open-habits">
                  Edit habits →
                </button>
              </div>
            ) : (
              <button className="text-xs text-primary hover:underline cursor-pointer" onClick={() => setLocation(buildProcessUrl("/habits", "/plan"))} data-testid="button-create-habits">
                Add your first habit →
              </button>
            )}
          </div>

          {/* This Week */}
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-bark font-medium">This Week</p>
            {focusItems.length > 0 ? (
              <div className="space-y-1">
                {focusItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 py-0.5" data-testid={`focus-plan-${item.id}`}>
                    <span className={`text-xs flex-1 ${item.status === "completed" ? "line-through text-muted-foreground" : item.status === "skipped" ? "text-muted-foreground italic" : ""}`}>{item.task}</span>
                    {item.status && <span className="text-[10px] text-muted-foreground">{item.status}</span>}
                  </div>
                ))}
                <button className="text-xs text-primary hover:underline cursor-pointer mt-1" onClick={() => setLocation(buildProcessUrl("/eisenhower", "/plan"))} data-testid="button-open-eisenhower">
                  Plan your week →
                </button>
              </div>
            ) : (
              <button className="text-xs text-primary hover:underline cursor-pointer" onClick={() => setLocation(buildProcessUrl("/eisenhower", "/plan"))} data-testid="button-plan-eisenhower">
                Figure out what matters →
              </button>
            )}
          </div>

          {/* Plan Versions */}
          <div className="pt-4 border-t">
            <PlanVersioningPanel />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
