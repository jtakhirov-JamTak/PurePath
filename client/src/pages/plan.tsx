import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useActiveSprint } from "@/hooks/use-active-sprint";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { buildProcessUrl } from "@/hooks/use-return-to";
import { apiRequest } from "@/lib/queryClient";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, getDay } from "date-fns";
import { getWeekBounds } from "@/lib/week-utils";
import type { EisenhowerEntry, Habit, MonthlyGoal, AnnualCommitment } from "@shared/schema";
import { CATEGORY_COLORS, TIMING_LABELS } from "@/lib/constants";
import { getWeekFocusItems, groupByGroupId } from "@/lib/eisenhower-filters";

import { MAX_Q1, MAX_Q2 } from "@/lib/proof-engine-logic";

// ─── Accordion section ──────────────────────────────────────────────
function Section({
  id, verb, timeLabel, accentClass, completionOk, summary, expanded, onToggle, celebrating, headerExtra, children,
}: {
  id: string; verb: string; timeLabel: string; accentClass: string;
  completionOk: boolean; summary: string; expanded: boolean;
  onToggle: () => void; celebrating: boolean; headerExtra?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className={`rounded-[10px] border border-border/40 overflow-hidden transition-colors duration-500 ${
      celebrating ? "bg-primary/5 dark:bg-primary/10" : completionOk && expanded ? "bg-primary/[0.03] dark:bg-primary/5" : "bg-card"
    }`}>
      <div className="flex items-center w-full p-3">
        <button
          onClick={onToggle}
          className="flex items-center flex-1 min-w-0 text-left cursor-pointer"
          data-testid={`section-${id}`}
        >
          <div className="flex-1 min-w-0">
            <span className={`text-base font-serif font-normal ${accentClass}`}>{verb}</span>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground ml-2">{timeLabel}</span>
            {!expanded && (
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{summary}</p>
            )}
          </div>
          <span className={`h-2 w-2 rounded-full shrink-0 mx-2 ${completionOk ? "bg-primary" : "bg-muted-foreground/30"}`} />
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </button>
        {headerExtra}
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sub-card (navigation) ──────────────────────────────────────────
function SubCard({ ok, title, subtitle, onClick, testId }: {
  ok: boolean; title: string; subtitle: string; onClick: () => void; testId?: string;
}) {
  return (
    <div
      className="rounded-lg border border-border/60 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={onClick}
      data-testid={testId}
    >
      <div className="flex items-start gap-2">
        <span className={`h-2 w-2 rounded-full shrink-0 mt-0.5 ${ok ? "bg-primary" : "bg-muted-foreground/30"}`} />
        <div>
          <p className="text-xs font-medium">{title}</p>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export default function PlanPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const { weekStart, weekStartStr } = getWeekBounds(today, weekOffset);
  const weekLabel = `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d")}`;
  const isCurrentWeek = weekOffset === 0;
  const dayOfWeek = getDay(today);
  const weekLocked = dayOfWeek === 0 || dayOfWeek === 6;
  const { toast } = useToast();

  // ─── Queries ─────────────────────────────────────────────────────
  const { data: eisenhowerEntries = [] } = useQuery<EisenhowerEntry[]>({ queryKey: ["/api/eisenhower"], enabled: !!user });
  const { data: habits = [] } = useQuery<Habit[]>({ queryKey: ["/api/habits"], enabled: !!user });
  const { data: annualCommitment } = useQuery<AnnualCommitment>({ queryKey: ["/api/annual-commitment"], enabled: !!user });
  const { data: activeSprint } = useActiveSprint(!!user);

  // ─── Computed ────────────────────────────────────────────────────
  const goalDisplay = activeSprint?.goalStatement?.trim() || "";
  const sprintLabel = activeSprint?.sprintName?.trim()
    || (activeSprint?.startDate && activeSprint?.endDate
      ? `${format(new Date(activeSprint.startDate + "T12:00:00"), "MMM d")} – ${format(new Date(activeSprint.endDate + "T12:00:00"), "MMM d")}`
      : "");
  const activeHabits = habits.filter(h => h.active !== false);
  const weeklyProofBehavior = annualCommitment?.weeklyProofBehaviorHabitId
    ? habits.find(h => h.id === annualCommitment.weeklyProofBehaviorHabitId) || null
    : null;
  const focusItems = getWeekFocusItems(eisenhowerEntries, weekStartStr);
  const groupedFocus = groupByGroupId(focusItems);
  // Read proofBucket with quadrant fallback for legacy data
  const getBucket = (e: typeof groupedFocus[0]) => e.proofBucket || (e.quadrant === "q1" ? "handle" : e.quadrant === "q2" ? "protect" : "not_this_week");
  const q1Items = groupedFocus.filter(e => getBucket(e) === "handle");
  const q2Items = groupedFocus.filter(e => getBucket(e) === "protect");


  // ─── Accordion state ─────────────────────────────────────────────
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (key: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });


  // ─── Add flow state ──────────────────────────────────────────────
  const [addingItem, setAddingItem] = useState(false);
  const [addTask, setAddTask] = useState("");
  const [addType, setAddType] = useState<"q1" | "q2">("q1");
  const [addDate, setAddDate] = useState("");
  const [addTime, setAddTime] = useState("");
  const [replaceId, setReplaceId] = useState<number | null>(null);

  const resetAddForm = () => { setAddingItem(false); setAddTask(""); setAddType("q1"); setAddDate(""); setAddTime(""); setReplaceId(null); };

  // ─── Mutations ───────────────────────────────────────────────────
  const deleteMutation = useToastMutation<{ id: number; groupId?: string | null }>({
    mutationFn: async ({ id, groupId }) => {
      const res = groupId
        ? await apiRequest("DELETE", `/api/eisenhower/group/${groupId}`)
        : await apiRequest("DELETE", `/api/eisenhower/${id}`);
      if (!res.ok) throw new Error("Failed to remove item");
    },
    invalidateKeys: [["/api/eisenhower"]],
    errorToast: "Could not remove item",
  });

  const addMutation = useToastMutation<{ task: string; quadrant: "q1" | "q2"; replaceId?: number }>({
    mutationFn: async ({ task, quadrant, replaceId: rid }) => {
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
        task, weekStart: weekStartStr, quadrant, blocksGoal: quadrant === "q2", sortOrder: focusItems.length, isBinary: false,
        scheduledDate: addDate || null, scheduledStartTime: addTime || null,
      });
      if (!res.ok) { const body = await res.json(); throw new Error(body.error || "Failed to add item"); }
    },
    invalidateKeys: [["/api/eisenhower"]],
    errorToast: "Could not add item",
    onSuccess: () => resetAddForm(),
  });

  const canSaveAdd = addTask.trim().length > 0 && (
    addType === "q1" ? q1Items.length < MAX_Q1 : q2Items.length < MAX_Q2 || replaceId !== null
  );
  const needsQ2Replace = addType === "q2" && q2Items.length >= MAX_Q2;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-4 max-w-2xl space-y-3">

        {/* Weekly Proof Behavior */}
        {weeklyProofBehavior && (
          <div className="rounded-lg border-l-4 border-l-primary/60 bg-primary/[0.04] px-4 py-3" data-testid="weekly-proof-behavior">
            <p className="text-xs font-medium text-muted-foreground">Weekly proof behavior</p>
            <p className="text-sm font-medium">{weeklyProofBehavior.name}</p>
          </div>
        )}

        {/* ─── 1. COMMIT — Sprint ────────────────────────────────── */}
        <Section
          id="commit" verb="Commit" timeLabel="Sprint" accentClass="text-[#B8706A]"
          completionOk={!!goalDisplay} summary={goalDisplay || "No sprint set"}
          expanded={expanded.has("commit")} onToggle={() => toggle("commit")} celebrating={false}
        >
          <div className="rounded-lg border border-border/60 p-3" data-testid="card-this-sprint">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium">This Sprint</p>
              {sprintLabel && <span className="text-[10px] text-muted-foreground">{sprintLabel}</span>}
            </div>
            <div
              className="flex items-start gap-2 cursor-pointer hover:bg-muted/30 rounded px-1 -mx-1 py-1"
              onClick={() => setLocation(buildProcessUrl("/sprint", "/week"))}
              data-testid="card-sprint-goal"
            >
              <span className={`h-2 w-2 rounded-full shrink-0 mt-0.5 ${goalDisplay ? "bg-primary" : "bg-muted-foreground/30"}`} />
              <div>
                <p className="text-xs font-medium">Sprint Goal</p>
                <p className="text-[10px] text-muted-foreground">{goalDisplay || "Not set"}</p>
              </div>
            </div>
          </div>

          {/* Flag for sprint review */}
          {goalDisplay && (
            <button
              className="text-[11px] text-muted-foreground hover:text-foreground hover:underline cursor-pointer mt-2 block"
              onClick={() => {
                const reason = prompt("Why does this need a sprint review?");
                if (reason?.trim()) {
                  apiRequest("PATCH", "/api/goal-sprint/flag-review", { reason: reason.trim() })
                    .then(() => toast({ title: "Flagged for sprint review" }))
                    .catch(() => toast({ title: "Could not flag for review", variant: "destructive" }));
                }
              }}
              data-testid="button-flag-review"
            >
              Flag for sprint review
            </button>
          )}
        </Section>

        {/* ─── 2. DECIDE — Weekly ────────────────────────────────── */}
        <Section
          id="decide" verb="Decide" timeLabel="Weekly" accentClass="text-[#B09340]"
          completionOk={focusItems.length > 0} summary={focusItems.length > 0 ? `${focusItems.length} items committed` : "Week not planned"}
          expanded={expanded.has("decide")} onToggle={() => toggle("decide")} celebrating={false}
        >

          {/* Sub-card A: This Week */}
          <div className="rounded-lg border border-border/60 p-3 mb-2" data-testid="card-this-week">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium">This Week</p>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{weekLabel}</span>
                <button onClick={() => setWeekOffset(o => Math.max(o - 1, -4))} className="p-0.5 text-muted-foreground hover:text-foreground cursor-pointer" data-testid="button-week-prev">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setWeekOffset(o => Math.min(o + 1, 1))} className="p-0.5 text-muted-foreground hover:text-foreground cursor-pointer" data-testid="button-week-next">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {focusItems.length > 0 ? (
              <div className="space-y-2">
                {q1Items.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Handle ({q1Items.length}/{MAX_Q1})</p>
                    {q1Items.map(item => (
                      <div key={item.groupId || item.id} className="flex items-center gap-2 py-0.5">
                        <span className="h-2 w-2 rounded-full shrink-0 bg-rose-400" />
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs ${item.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{item.task}</span>
                          {item.scheduledDates.length > 0 && (
                            <span className="text-[9px] text-muted-foreground ml-1">
                              {item.scheduledDates.map(d => format(new Date(d + "T12:00:00"), "EEE")).join(", ")}
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
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Protect ({q2Items.length}/{MAX_Q2})</p>
                    {q2Items.map(item => (
                      <div key={item.groupId || item.id} className="flex items-center gap-2 py-0.5">
                        <span className="h-2 w-2 rounded-full shrink-0 bg-amber-400" />
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs ${item.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{item.task}</span>
                          {item.scheduledDates.length > 0 && (
                            <span className="text-[9px] text-muted-foreground ml-1">
                              {item.scheduledDates.map(d => format(new Date(d + "T12:00:00"), "EEE")).join(", ")}
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

                {/* Add flow */}
                {addingItem ? (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <Input placeholder="What needs to happen?" value={addTask} onChange={e => setAddTask(e.target.value)} className="text-xs h-8" autoFocus data-testid="input-add-task" />
                    <div className="flex gap-1.5">
                      <button className={`text-[10px] px-2 py-1 rounded-md border cursor-pointer ${addType === "q1" ? "bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/30 dark:border-rose-500 dark:text-rose-400" : "border-border text-muted-foreground"}`} onClick={() => { setAddType("q1"); setReplaceId(null); }}>
                        Handle {q1Items.length >= MAX_Q1 && "(full)"}
                      </button>
                      <button className={`text-[10px] px-2 py-1 rounded-md border cursor-pointer ${addType === "q2" ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/30 dark:border-amber-500 dark:text-amber-400" : "border-border text-muted-foreground"}`} onClick={() => { setAddType("q2"); setReplaceId(null); }}>
                        Protect {q2Items.length >= MAX_Q2 && "(replace)"}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Input type="date" value={addDate} onChange={e => setAddDate(e.target.value)} className="text-xs h-8 w-36" data-testid="input-add-date" />
                      <Input type="time" value={addTime} onChange={e => setAddTime(e.target.value)} className="text-xs h-8 w-28" data-testid="input-add-time" />
                    </div>
                    {addType === "q1" && q1Items.length >= MAX_Q1 && (
                      <p className="text-[10px] text-rose-500">At {MAX_Q1} Handle items. Remove one first.</p>
                    )}
                    {needsQ2Replace && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground">Replace which Protect item?</p>
                        {q2Items.map(item => (
                          <button key={item.id} className={`flex items-center gap-2 py-1 px-2 w-full text-left rounded-md text-xs cursor-pointer ${replaceId === item.id ? "bg-amber-50 border border-amber-300 dark:bg-amber-950/30 dark:border-amber-500" : "hover:bg-muted"}`} onClick={() => setReplaceId(item.id)}>
                            <span className="h-2 w-2 rounded-full shrink-0 bg-amber-400" />
                            {item.task}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" className="text-xs h-7" disabled={!canSaveAdd || addMutation.isPending} onClick={() => addMutation.mutate({ task: addTask.trim(), quadrant: addType, replaceId: needsQ2Replace ? replaceId ?? undefined : undefined })} data-testid="button-save-add">
                        {addMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs h-7" onClick={resetAddForm}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <button className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer mt-1" onClick={() => setAddingItem(true)} data-testid="button-add-item">
                    <Plus className="h-3 w-3" /> Add item
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No commitments yet.</p>
            )}

            {/* Plan / Rebuild button */}
            <button
              className="text-[11px] text-primary hover:underline cursor-pointer mt-2 block"
              onClick={() => {
                if (focusItems.length > 0 && !confirm("This will start a fresh planning ritual. Your current week will be replaced when you commit the new plan.")) return;
                setLocation(buildProcessUrl(`/week/plan${!isCurrentWeek ? `?week=${weekStartStr}` : ""}`, "/week"));
              }}
              data-testid="card-plan-week"
            >
              {focusItems.length > 0 ? "Rebuild week →" : "Plan your week →"}
            </button>
          </div>

        </Section>

        {/* ─── 3. PROVE — Daily ──────────────────────────────────── */}
        <Section
          id="prove" verb="Prove" timeLabel="Daily" accentClass="text-primary"
          completionOk={activeHabits.length > 0} summary={activeHabits.length > 0 ? `${activeHabits.length} active habits` : "No habits set"}
          expanded={expanded.has("prove")} onToggle={() => toggle("prove")} celebrating={false}
        >
          {activeHabits.length > 0 ? (
            <div className="space-y-1">
              {activeHabits.map(h => (
                <div
                  key={h.id}
                  className="flex items-center gap-2 py-1 cursor-pointer hover:bg-muted/30 rounded px-1 -mx-1"
                  onClick={() => setLocation(buildProcessUrl("/week/habits", "/week"))}
                >
                  <span className={`h-2 w-2 rounded-full shrink-0 ${CATEGORY_COLORS[h.category || "health"] || "bg-primary"}`} />
                  <span className="text-xs flex-1">{h.name}</span>
                  <span className="text-[10px] text-muted-foreground">{TIMING_LABELS[h.timing || "afternoon"] || "PM"}</span>
                </div>
              ))}
              <button
                className="text-[11px] text-primary hover:underline cursor-pointer mt-1"
                onClick={() => setLocation(buildProcessUrl("/week/habits", "/week"))}
              >
                Manage habits →
              </button>
            </div>
          ) : (
            <button
              className="text-xs text-primary hover:underline cursor-pointer"
              onClick={() => setLocation(buildProcessUrl("/week/habits", "/week"))}
            >
              Set up habits →
            </button>
          )}
        </Section>
      </div>
    </AppLayout>
  );
}

