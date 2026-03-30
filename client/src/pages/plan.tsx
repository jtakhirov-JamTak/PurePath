import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { buildProcessUrl } from "@/hooks/use-return-to";
import { apiRequest } from "@/lib/queryClient";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { format, startOfWeek, addDays, getDay } from "date-fns";
import type { EisenhowerEntry, Habit, MonthlyGoal, IdentityDocument, WeeklySummary } from "@shared/schema";
import { getDayOfYear } from "date-fns";
import { CATEGORY_COLORS } from "@/lib/constants";
import { getWeekFocusItems, groupByGroupId } from "@/lib/eisenhower-filters";

const MAX_Q1 = 5;
const MAX_Q2 = 2;

export default function PlanPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(addDays(weekStart, 6), "MMM d");
  const weekLabel = `${format(weekStart, "MMM d")} – ${weekEndStr}`;
  const currentMonthKey = format(today, "yyyy-MM");
  const monthLabel = format(today, "MMMM yyyy");
  const yearLabel = format(today, "yyyy");

  // After Friday (Sat=6, Sun=0), lock removals — protect completed work
  const dayOfWeek = getDay(today); // 0=Sun, 6=Sat
  const weekLocked = dayOfWeek === 0 || dayOfWeek === 6;

  const { data: eisenhowerEntries = [] } = useQuery<EisenhowerEntry[]>({ queryKey: ["/api/eisenhower"], enabled: !!user });
  const { data: weeklySummary } = useQuery<WeeklySummary | null>({
    queryKey: ["/api/eisenhower/weekly-summary", weekStartStr],
    enabled: !!user,
  });
  const { data: habits = [] } = useQuery<Habit[]>({ queryKey: ["/api/habits"], enabled: !!user });
  const { data: monthlyGoal } = useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal", currentMonthKey],
    queryFn: async () => { const res = await fetch(`/api/monthly-goal?month=${currentMonthKey}`, { credentials: "include" }); if (!res.ok) throw new Error("Failed to fetch"); return res.json(); },
    enabled: !!user,
  });
  const { data: identityDoc } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
    enabled: !!user,
  });

  const goalDisplay = monthlyGoal?.goalWhat?.trim() || monthlyGoal?.goalStatement?.trim() || "";
  const activeHabits = habits.filter(h => h.active !== false);
  const focusItems = getWeekFocusItems(eisenhowerEntries, weekStartStr);

  // Completion heuristics for document cards
  const discoveryFilled = !!(identityDoc?.strengths?.trim() || identityDoc?.helpingPatterns?.trim());
  const identityFilled = !!(identityDoc?.identity?.trim() || identityDoc?.vision?.trim());
  const scoreboardFilled = !!(identityDoc?.yearVision?.trim());

  // Daily Anchor — rotating excerpt from identity document
  const anchorExcerpt = (() => {
    if (!identityDoc) return null;
    const fields = [
      identityDoc.identity?.trim(),
      identityDoc.vision?.trim(),
      identityDoc.values?.trim(),
      identityDoc.purpose?.trim(),
    ];
    const dayIndex = getDayOfYear(today) % 4;
    // Try the day's field first, then cycle through others
    for (let i = 0; i < 4; i++) {
      const text = fields[(dayIndex + i) % 4];
      if (text) return text;
    }
    return null;
  })();

  // Group multi-day items by groupId so each shows once with day indicators
  const groupedFocus = groupByGroupId(focusItems);
  const q1Items = groupedFocus.filter(e => e.quadrant === "q1");
  const q2Items = groupedFocus.filter(e => e.quadrant === "q2");

  // Week card: add flow state
  const [addingItem, setAddingItem] = useState(false);
  const [addTask, setAddTask] = useState("");
  const [addType, setAddType] = useState<"q1" | "q2">("q1");
  const [replaceId, setReplaceId] = useState<number | null>(null);

  const resetAddForm = () => {
    setAddingItem(false);
    setAddTask("");
    setAddType("q1");
    setReplaceId(null);
  };

  // Delete an item from the week (single request via groupId, fallback to individual delete)
  const deleteMutation = useToastMutation<{ id: number; groupId?: string | null }>({
    mutationFn: async ({ id, groupId }) => {
      if (groupId) {
        const res = await apiRequest("DELETE", `/api/eisenhower/group/${groupId}`);
        if (!res.ok) throw new Error("Failed to remove item");
      } else {
        const res = await apiRequest("DELETE", `/api/eisenhower/${id}`);
        if (!res.ok) throw new Error("Failed to remove item");
      }
    },
    invalidateKeys: [["/api/eisenhower"]],
    errorToast: "Could not remove item",
  });

  // Add a new item (and optionally delete a replaced Q2 item)
  const addMutation = useToastMutation<{ task: string; quadrant: "q1" | "q2"; replaceId?: number }>({
    mutationFn: async ({ task, quadrant, replaceId: rid }) => {
      // If replacing a Q2 item, delete all rows for that grouped item to make room
      if (rid) {
        const groupedItem = q2Items.find(i => i.id === rid);
        if (groupedItem?.groupId) {
          const delRes = await apiRequest("DELETE", `/api/eisenhower/group/${groupedItem.groupId}`);
          if (!delRes.ok) throw new Error("Failed to remove replaced item");
        } else {
          const delRes = await apiRequest("DELETE", `/api/eisenhower/${rid}`);
          if (!delRes.ok) throw new Error("Failed to remove replaced item");
        }
      }
      const res = await apiRequest("POST", "/api/eisenhower", {
        task,
        weekStart: weekStartStr,
        quadrant,
        blocksGoal: quadrant === "q2",
        sortOrder: focusItems.length,
        isBinary: false,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to add item");
      }
    },
    invalidateKeys: [["/api/eisenhower"]],
    errorToast: "Could not add item",
    onSuccess: () => resetAddForm(),
  });

  const canSaveAdd = addTask.trim().length > 0 && (
    addType === "q1" ? q1Items.length < MAX_Q1 :
    q2Items.length < MAX_Q2 || replaceId !== null
  );
  const needsQ2Replace = addType === "q2" && q2Items.length >= MAX_Q2;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-sm font-medium" data-testid="text-plan-title">Plan</h1>
        </div>

        <div className="space-y-6">
          {/* Your Words — emotional anchor at top */}
          {anchorExcerpt && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-bark font-medium">Your Words</p>
              <div className="rounded-lg bg-bark/5 p-3" data-testid="daily-anchor">
                <p className="text-[13px] text-foreground italic line-clamp-3">{anchorExcerpt}</p>
                <button
                  className="text-[11px] text-primary hover:underline cursor-pointer mt-2"
                  onClick={() => setLocation(buildProcessUrl("/identity", "/plan"))}
                  data-testid="link-anchor-identity"
                >
                  View full document →
                </button>
              </div>
            </div>
          )}

          {/* YEAR */}
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-bark font-medium">Year · {yearLabel}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation(buildProcessUrl("/discovery-profile", "/plan"))} data-testid="card-nav-discovery">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 mt-0.5 ${discoveryFilled ? "bg-emerald-500" : "bg-rose-400"}`} />
                    <div>
                      <p className="text-xs font-medium">Discovery Profile</p>
                      <p className="text-[10px] text-muted-foreground">Values, strengths, patterns</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation(buildProcessUrl("/identity", "/plan"))} data-testid="card-nav-identity">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 mt-0.5 ${identityFilled ? "bg-emerald-500" : "bg-rose-400"}`} />
                    <div>
                      <p className="text-xs font-medium">Identity Document</p>
                      <p className="text-[10px] text-muted-foreground">Vision, identity, purpose</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation(buildProcessUrl("/scoreboard", "/plan"))} data-testid="card-nav-scoreboard">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 mt-0.5 ${scoreboardFilled ? "bg-emerald-500" : "bg-rose-400"}`} />
                    <div>
                      <p className="text-xs font-medium">1-Year Scoreboard</p>
                      <p className="text-[10px] text-muted-foreground">Outcome, obstacles, IF-THEN</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* MONTH */}
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-bark font-medium">Month · {monthLabel}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* Monthly Goal card */}
              <Card className="overflow-visible hover-elevate cursor-pointer" onClick={() => setLocation(buildProcessUrl("/monthly-goal", "/plan"))} data-testid="card-monthly-goal">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 mt-0.5 ${goalDisplay ? "bg-emerald-500" : "bg-rose-400"}`} />
                    <div>
                      <p className="text-xs font-medium">Monthly Goal</p>
                      {goalDisplay ? (
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{goalDisplay}</p>
                      ) : (
                        <p className="text-[10px] text-rose-500">Not set</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Habits card */}
              <Card className="overflow-visible hover-elevate cursor-pointer" onClick={() => setLocation(buildProcessUrl("/habits", "/plan"))} data-testid="card-habits">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 mt-0.5 ${activeHabits.length > 0 ? "bg-emerald-500" : "bg-rose-400"}`} />
                    <div>
                      <p className="text-xs font-medium">Habits</p>
                      {activeHabits.length > 0 ? (
                        <p className="text-[10px] text-muted-foreground">{activeHabits.length} active</p>
                      ) : (
                        <p className="text-[10px] text-rose-500">None set</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* WEEK */}
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-bark font-medium">Week · {weekLabel}</p>

            {/* This Week — committed items */}
            <Card className="overflow-visible" data-testid="card-this-week">
              <CardContent className="p-3">
                {focusItems.length > 0 ? (
                  <div className="space-y-2">
                    {q1Items.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Handle this week ({q1Items.length}/{MAX_Q1})</p>
                        {q1Items.map(item => (
                          <div key={item.groupId || item.id} className="flex items-center gap-2 py-0.5 group">
                            <span className="h-2 w-2 rounded-full shrink-0 bg-rose-400" />
                            <div className="flex-1 min-w-0">
                              <span className={`text-xs ${item.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{item.task}</span>
                              {item.scheduledDates.length > 0 && (
                                <span className="text-[9px] text-muted-foreground ml-1">
                                  {item.scheduledDates.map(d => {
                                    const date = new Date(d + "T12:00:00");
                                    return format(date, "EEE");
                                  }).join(", ")}
                                </span>
                              )}
                            </div>
                            {!(weekLocked && (item.status === "completed" || item.completionLevel)) && (
                              <button
                                className="h-4 w-4 shrink-0 text-muted-foreground/40 hover:text-rose-500 transition-colors cursor-pointer"
                                onClick={() => deleteMutation.mutate({ id: item.id, groupId: item.groupId })}
                                data-testid={`button-remove-${item.id}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {q2Items.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Protect this week ({q2Items.length}/{MAX_Q2})</p>
                        {q2Items.map(item => (
                          <div key={item.groupId || item.id} className="flex items-center gap-2 py-0.5 group">
                            <span className="h-2 w-2 rounded-full shrink-0 bg-amber-400" />
                            <div className="flex-1 min-w-0">
                              <span className={`text-xs ${item.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{item.task}</span>
                              {item.scheduledDates.length > 0 && (
                                <span className="text-[9px] text-muted-foreground ml-1">
                                  {item.scheduledDates.map(d => {
                                    const date = new Date(d + "T12:00:00");
                                    return format(date, "EEE");
                                  }).join(", ")}
                                </span>
                              )}
                            </div>
                            {!(weekLocked && (item.status === "completed" || item.completionLevel)) && (
                              <button
                                className="h-4 w-4 shrink-0 text-muted-foreground/40 hover:text-rose-500 transition-colors cursor-pointer"
                                onClick={() => deleteMutation.mutate({ id: item.id, groupId: item.groupId })}
                                data-testid={`button-remove-${item.id}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Lightweight add flow */}
                    {addingItem ? (
                      <div className="space-y-2 pt-2 border-t border-border">
                        <Input
                          placeholder="What needs to happen?"
                          value={addTask}
                          onChange={e => setAddTask(e.target.value)}
                          className="text-xs h-8"
                          autoFocus
                          data-testid="input-add-task"
                        />
                        <div className="flex gap-1.5">
                          <button
                            className={`text-[10px] px-2 py-1 rounded-md border cursor-pointer ${addType === "q1" ? "bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/30 dark:border-rose-500 dark:text-rose-400" : "border-border text-muted-foreground"}`}
                            onClick={() => { setAddType("q1"); setReplaceId(null); }}
                          >
                            Handle {q1Items.length >= MAX_Q1 && "(full)"}
                          </button>
                          <button
                            className={`text-[10px] px-2 py-1 rounded-md border cursor-pointer ${addType === "q2" ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/30 dark:border-amber-500 dark:text-amber-400" : "border-border text-muted-foreground"}`}
                            onClick={() => { setAddType("q2"); setReplaceId(null); }}
                          >
                            Protect {q2Items.length >= MAX_Q2 && "(replace)"}
                          </button>
                        </div>

                        {addType === "q1" && q1Items.length >= MAX_Q1 && (
                          <p className="text-[10px] text-rose-500">At {MAX_Q1} Handle items. Remove one first.</p>
                        )}

                        {needsQ2Replace && (
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground">Replace which Protect item?</p>
                            {q2Items.map(item => (
                              <button
                                key={item.id}
                                className={`flex items-center gap-2 py-1 px-2 w-full text-left rounded-md text-xs cursor-pointer ${replaceId === item.id ? "bg-amber-50 border border-amber-300 dark:bg-amber-950/30 dark:border-amber-500" : "hover:bg-muted"}`}
                                onClick={() => setReplaceId(item.id)}
                              >
                                <span className="h-2 w-2 rounded-full shrink-0 bg-amber-400" />
                                {item.task}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="text-xs h-7"
                            disabled={!canSaveAdd || addMutation.isPending}
                            onClick={() => addMutation.mutate({
                              task: addTask.trim(),
                              quadrant: addType,
                              replaceId: needsQ2Replace ? replaceId ?? undefined : undefined,
                            })}
                            data-testid="button-save-add"
                          >
                            {addMutation.isPending ? "Saving..." : "Save"}
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={resetAddForm}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer mt-1"
                        onClick={() => setAddingItem(true)}
                        data-testid="button-add-item"
                      >
                        <Plus className="h-3 w-3" />
                        Add item
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No commitments yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Two week tools */}
            <div className="grid grid-cols-2 gap-2">
              {/* Plan your week */}
              <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => {
                if (focusItems.length > 0 && !confirm("This will start a fresh planning ritual. Your current week will be replaced when you commit the new plan.")) return;
                setLocation(buildProcessUrl("/eisenhower", "/plan"));
              }} data-testid="card-plan-week">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 mt-0.5 ${focusItems.length > 0 ? "bg-emerald-500" : "bg-rose-400"}`} />
                    <div>
                      <p className="text-xs font-medium">{focusItems.length > 0 ? "Rebuild Week" : "Plan Your Week"}</p>
                      <p className="text-[10px] text-muted-foreground">Full guided ritual</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Face your fear */}
              <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation(buildProcessUrl("/eisenhower?startAt=fear", "/plan"))} data-testid="card-face-fear">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 mt-0.5 ${weeklySummary?.fearTarget ? "bg-emerald-500" : "bg-rose-400"}`} />
                    <div>
                      <p className="text-xs font-medium">Face Your Fear</p>
                      <p className="text-[10px] text-muted-foreground">
                        {weeklySummary?.fearTarget
                          ? <span className="line-clamp-1">{weeklySummary.fearTarget}</span>
                          : "Weekly fear reflection"
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
