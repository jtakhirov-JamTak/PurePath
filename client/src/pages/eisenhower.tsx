import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { FlowBar } from "@/components/flow-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { X, Plus, Check, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, getDay } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";
import { useLocation } from "wouter";
import type { EisenhowerEntry, IdentityDocument, MonthlyGoal } from "@shared/schema";
import {
  MAX_Q1, MAX_Q2, MAX_CANDIDATES, MAX_BRAIN_DUMP, MAX_DAYS_PER_ITEM, TOTAL_STEPS,
  TIME_SLOTS, BLOCKER_CHIPS,
  IMPORTANCE_CHIPS, CONSEQUENCE_CHIPS, RESISTANCE_CHIPS,
  RESULT_BADGE,
  classifyItem, computeSortPriority, generateGroupId,
  type BrainDumpItem, type FearData,
  type SortResult, type SortImportance, type SortConsequence, type SortResistance,
} from "@/lib/eisenhower-logic";

export default function EisenhowerPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { register, unregister } = useUnsavedGuard();
  const isFearOnly = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("startAt") === "fear";
  const [step, setStep] = useState(isFearOnly ? 5 : 1);
  const nextId = useRef(1);
  const [fearOnlyMode, setFearOnlyMode] = useState(isFearOnly);

  // Step 2 — Brain dump
  const [newItemText, setNewItemText] = useState("");
  const [items, setItems] = useState<BrainDumpItem[]>([]);

  // Unsaved guard: mark dirty once user starts entering data (past step 1)
  useEffect(() => {
    const isDirty = step > 1 && items.length > 0;
    register("eisenhower-wizard", { isDirty, message: "You have an in-progress weekly plan. Leaving will lose your progress." });
    return () => unregister("eisenhower-wizard");
  }, [step, items.length, register, unregister]);

  // Step 5 — Fear
  const [fearTargetIdx, setFearTargetIdx] = useState<number | null>(null);
  const [fearData, setFearData] = useState<FearData>({
    targetTask: "",
    fearIfFaced: "",
    fearIfAvoided: "",
    blockerChip: "",
    smallestProofMove: "",
    promoteToQ2: false,
  });

  // Step 4 — Badge display: hold on current item briefly after classification
  const [badgeItemId, setBadgeItemId] = useState<number | null>(null);

  // Step 7 — Schedule sub-step tracking
  const [scheduleIdx, setScheduleIdx] = useState(0);

  const today = new Date();
  const weekParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("week") : null;
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const [planNextWeek, setPlanNextWeek] = useState(() => {
    if (isFearOnly) return false; // fear-only always uses current week
    if (weekParam) return weekParam !== format(currentWeekStart, "yyyy-MM-dd");
    // Default to next week on Fri/Sat/Sun
    const dow = getDay(today);
    return dow === 0 || dow === 5 || dow === 6;
  });
  const weekStart = planNextWeek ? addWeeks(currentWeekStart, 1) : currentWeekStart;
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekLabel = `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d")}`;

  // Check if a plan already exists for this week
  const { data: existingEntries = [], isLoading: entriesLoading } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower/week", weekStartStr],
  });
  const hasExistingPlan = existingEntries.length > 0;

  // Vision + goal for Weekly Reset display
  const currentMonthKey = format(today, "yyyy-MM");
  const { data: identityDoc } = useQuery<IdentityDocument>({ queryKey: ["/api/identity-document"] });
  const { data: monthlyGoal } = useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal", currentMonthKey],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-goal?month=${currentMonthKey}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  // Fear-only mode: pre-load existing items so user can pick a fear target
  const fearOnlyLoaded = useRef(false);
  useEffect(() => {
    if (fearOnlyMode && !entriesLoading && existingEntries.length === 0 && !fearOnlyLoaded.current) {
      toast({ title: "Plan your week first", description: "You need committed items before facing a fear.", variant: "destructive" });
      setLocation("/plan");
      return;
    }
    if (fearOnlyMode && existingEntries.length > 0 && !fearOnlyLoaded.current) {
      fearOnlyLoaded.current = true;
      // Deduplicate multi-day items by groupId
      const seen = new Map<string, EisenhowerEntry & { allDates: string[] }>();
      for (const e of existingEntries) {
        const key = e.groupId || String(e.id);
        const existing = seen.get(key);
        if (existing) {
          if (e.scheduledDate && !existing.allDates.includes(e.scheduledDate)) {
            existing.allDates.push(e.scheduledDate);
          }
        } else {
          seen.set(key, { ...e, allDates: e.scheduledDate ? [e.scheduledDate] : [] });
        }
      }
      setItems(Array.from(seen.values()).map(e => ({
        id: nextId.current++,
        text: e.task,
        selected: true,
        sortImportance: (e.sortImportance as SortImportance) || null,
        sortConsequence: (e.sortConsequence as SortConsequence) || null,
        sortResistance: (e.sortResistance as SortResistance) || null,
        sortResult: (e.sortResult as SortResult) || (e.quadrant === "q1" ? "handle" : e.quadrant === "q2" ? "protect" : null),
        sortPriority: e.sortPriority ?? null,
        scheduledDates: e.allDates,
        scheduledStartTime: e.scheduledStartTime || "",
        scheduledEndTime: e.scheduledEndTime || "",
        firstMove: e.firstMove || "",
      })));
    }
  }, [fearOnlyMode, existingEntries]);

  // Derived lists
  const selectedItems = items.filter(i => i.selected);
  const allSorted = selectedItems.length > 0 && selectedItems.every(i =>
    i.sortImportance !== null && i.sortConsequence !== null && i.sortResistance !== null
  );

  // Classified items with results (recomputes when items change)
  // Respect manual overrides: if sortResult was set by moveItem(), keep it
  const classifiedItems = selectedItems.map(item => {
    const derived = classifyItem(item);
    const wasManuallyMoved = item.sortResult !== null && item.sortResult !== derived;
    const result = wasManuallyMoved ? item.sortResult! : derived;
    return {
      ...item,
      sortResult: result,
      sortPriority: wasManuallyMoved ? (item.sortPriority ?? 99) : computeSortPriority(item),
    };
  });

  const handleItems = classifiedItems.filter(i => i.sortResult === "handle").sort((a, b) => a.sortPriority - b.sortPriority);
  const protectItems = classifiedItems.filter(i => i.sortResult === "protect").sort((a, b) => a.sortPriority - b.sortPriority);
  const discardedItems = classifiedItems.filter(i => i.sortResult === "not_this_week");
  const committedItems = [...handleItems, ...protectItems];

  // Week days for scheduling step
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { date: format(d, "yyyy-MM-dd"), label: format(d, "EEE") };
  });

  // Brain dump helpers
  const addItem = () => {
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    const parts = trimmed.split(",").map(s => s.trim()).filter(Boolean);
    const newItems = parts
      .filter(text => !items.some(i => i.text.toLowerCase() === text.toLowerCase()))
      .slice(0, MAX_BRAIN_DUMP - items.length)
      .map(text => ({
        id: nextId.current++, text, selected: false,
        sortImportance: null as SortImportance | null,
        sortConsequence: null as SortConsequence | null,
        sortResistance: null as SortResistance | null,
        sortResult: null as SortResult | null,
        sortPriority: null as number | null,
        scheduledDates: [] as string[],
        scheduledStartTime: "", scheduledEndTime: "", firstMove: "",
      }));
    setItems(prev => [...prev, ...newItems]);
    setNewItemText("");
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Step 3 — Cut to 7
  const toggleSelected = (idx: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      if (item.selected) return { ...item, selected: false, sortImportance: null, sortConsequence: null, sortResistance: null, sortResult: null, sortPriority: null };
      const currentSelected = prev.filter(it => it.selected).length;
      if (currentSelected >= MAX_CANDIDATES) return item;
      return { ...item, selected: true };
    }));
  };

  // Step 4 — Better Sort: find next unsorted item (hold on current while badge showing)
  const sortItemIdx = (() => {
    // If badge is showing, stay on that item
    if (badgeItemId !== null) {
      const idx = items.findIndex(i => i.id === badgeItemId);
      if (idx >= 0) return idx;
    }
    for (let i = 0; i < items.length; i++) {
      if (items[i].selected && (items[i].sortImportance === null || items[i].sortConsequence === null || items[i].sortResistance === null)) {
        return i;
      }
    }
    return null;
  })();

  const answerSort = (idx: number, field: "sortImportance" | "sortConsequence" | "sortResistance", value: string) => {
    setItems(prev => {
      const next = prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        // Auto-classify when all 3 answered
        if (updated.sortImportance && updated.sortConsequence && updated.sortResistance) {
          updated.sortResult = classifyItem(updated);
          updated.sortPriority = computeSortPriority(updated);
        }
        return updated;
      });
      // Show badge briefly before auto-advancing
      const updatedItem = next[idx];
      if (updatedItem.sortImportance && updatedItem.sortConsequence && updatedItem.sortResistance) {
        setBadgeItemId(updatedItem.id);
        setTimeout(() => setBadgeItemId(null), 800);
      }
      return next;
    });
  };

  // Step 6 — Review: move items between buckets
  const moveItem = (itemId: number, newResult: SortResult) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, sortResult: newResult };
    }));
  };

  // Step 7 — Schedule helpers
  const toggleScheduledDay = (idx: number, date: string) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const dates = item.scheduledDates.includes(date)
        ? item.scheduledDates.filter(d => d !== date)
        : item.scheduledDates.length >= MAX_DAYS_PER_ITEM ? item.scheduledDates : [...item.scheduledDates, date];
      return { ...item, scheduledDates: dates };
    }));
  };

  const updateScheduleField = (idx: number, field: "scheduledStartTime" | "scheduledEndTime" | "firstMove", value: string) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  // Commit mutation
  const commitMutation = useMutation({
    mutationFn: async () => {
      // Fear-only mode: save fear reflection without touching weekly entries
      if (fearOnlyMode) {
        if (!fearData.targetTask || !fearData.blockerChip) throw new Error("Complete the fear reflection first");
        const res = await apiRequest("POST", "/api/eisenhower/weekly-summary", {
          weekStart: weekStartStr,
          fearTarget: fearData.targetTask,
          fearIfFaced: fearData.fearIfFaced,
          fearIfAvoided: fearData.fearIfAvoided,
          fearBlocker: fearData.blockerChip,
          fearFirstMove: fearData.smallestProofMove,
          fearPromotedToQ2: fearData.promoteToQ2,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to save fear reflection");
        }
        return res.json();
      }

      // Full ritual mode: commit entire week with groupId expansion
      const commitItems = committedItems.map((item, i) => {
        const originalItem = items.find(it => it.id === item.id)!;
        const groupId = generateGroupId();
        return {
          task: item.text,
          quadrant: (item.sortResult === "handle" ? "q1" : "q2") as "q1" | "q2",
          sortOrder: i,
          groupId,
          scheduledDates: originalItem.scheduledDates.length > 0 ? originalItem.scheduledDates : [weekDays[0].date],
          scheduledStartTime: originalItem.scheduledStartTime || null,
          scheduledEndTime: originalItem.scheduledEndTime || null,
          firstMove: originalItem.firstMove,
          sortImportance: originalItem.sortImportance,
          sortConsequence: originalItem.sortConsequence,
          sortResistance: originalItem.sortResistance,
          sortResult: item.sortResult as "handle" | "protect",
          sortPriority: item.sortPriority,
        };
      });

      // Fear item: if promoted to Q2, it's already in committedItems (sortResult set to "protect" by checkbox).
      // Ensure its quadrant is q2 in the commit payload.
      if (fearData.promoteToQ2 && fearTargetIdx !== null) {
        const fearTask = items[fearTargetIdx]?.text;
        const existing = commitItems.find(ci => ci.task === fearTask);
        if (existing) existing.quadrant = "q2";
      }

      const body: any = {
        weekStart: weekStartStr,
        items: commitItems,
      };

      if (fearTargetIdx !== null && fearData.targetTask) {
        body.fearData = {
          fearTarget: fearData.targetTask,
          fearIfFaced: fearData.fearIfFaced,
          fearIfAvoided: fearData.fearIfAvoided,
          fearBlocker: fearData.blockerChip,
          fearFirstMove: fearData.smallestProofMove,
          fearPromotedToQ2: fearData.promoteToQ2,
        };
      }

      const res = await apiRequest("POST", "/api/eisenhower/commit-week", body);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to commit week");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower/week", weekStartStr] });
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower/weekly-summary", weekStartStr] });
      setLocation(fearOnlyMode ? "/plan" : "/plan");
    },
    onError: (error: Error) => {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
    },
  });

  // Step navigation: 1=Arrive, 2=BrainDump, 3=Cut, 4=Sort, 5=Fear, 6=ReviewBuckets, 7=Schedule+Save
  const allItemsScheduled = scheduleIdx >= committedItems.length;

  const canNext = (() => {
    switch (step) {
      case 1: return true;
      case 2: return items.length >= 1;
      case 3: return selectedItems.length >= 1 && selectedItems.length <= MAX_CANDIDATES;
      case 4: return allSorted && handleItems.length <= MAX_Q1 && protectItems.length <= MAX_Q2;
      case 5: // Fear step
        return !!(fearTargetIdx !== null && fearData.fearIfFaced.trim() && fearData.fearIfAvoided.trim() && fearData.blockerChip && fearData.smallestProofMove.trim());
      case 6: // Review buckets + caps
        return handleItems.length <= MAX_Q1 && protectItems.length <= MAX_Q2 && committedItems.length > 0;
      case 7: // Schedule + save
        if (!allItemsScheduled) {
          // Current item must have at least 1 day and a first move
          const currentItem = committedItems[scheduleIdx];
          if (!currentItem) return false;
          const orig = items.find(it => it.id === currentItem.id);
          return orig ? orig.scheduledDates.length >= 1 && orig.firstMove.trim().length > 0 : false;
        }
        return !commitMutation.isPending; // Final review — can commit
      default: return false;
    }
  })();

  const goNext = () => {
    if (step === 7 && !allItemsScheduled) {
      // Advance to next item in scheduling
      setScheduleIdx(s => s + 1);
      return;
    }
    if (step === 7 && allItemsScheduled) {
      // Final commit
      commitMutation.mutate();
      return;
    }
    if (fearOnlyMode && step === 5) {
      // Fear-only: commit directly
      commitMutation.mutate();
      return;
    }
    if (step === 4) {
      // Entering fear step — pre-fill fear target
      if (fearTargetIdx === null && committedItems.length > 0) {
        const firstCommitted = committedItems[0];
        const firstIdx = items.findIndex(i => i.id === firstCommitted.id);
        setFearTargetIdx(firstIdx);
        setFearData(prev => ({ ...prev, targetTask: firstCommitted.text }));
      }
    }
    if (step === 6) {
      // Entering schedule step — reset schedule index and prefill fear item's firstMove
      setScheduleIdx(0);
      if (fearTargetIdx !== null && fearData.smallestProofMove) {
        setItems(prev => prev.map((item, i) =>
          i === fearTargetIdx && !item.firstMove ? { ...item, firstMove: fearData.smallestProofMove } : item
        ));
      }
    }
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  };

  const goBack = () => {
    if (fearOnlyMode && step === 5) return;
    if (step === 7 && scheduleIdx > 0) {
      // Go back to previous item in scheduling
      setScheduleIdx(s => s - 1);
      return;
    }
    if (step === 7 && allItemsScheduled) {
      // Go back from final review to last schedule item
      setScheduleIdx(committedItems.length - 1);
      return;
    }
    if (step === 5) {
      setFearTargetIdx(null);
      setFearData({ targetTask: "", fearIfFaced: "", fearIfAvoided: "", blockerChip: "", smallestProofMove: "", promoteToQ2: false });
    }
    setStep(s => Math.max(s - 1, 1));
  };

  const fearOnlySteps = 1;
  const progressPercent = fearOnlyMode
    ? Math.round(((step - 4) / fearOnlySteps) * 100)
    : Math.round((step / TOTAL_STEPS) * 100);
  const displayStep = fearOnlyMode ? step - 4 : step;
  const displayTotal = fearOnlyMode ? fearOnlySteps : TOTAL_STEPS;

  return (
    <AppLayout>
      <FlowBar fallback="/plan" />

      {/* Progress bar */}
      <div className="container mx-auto px-4 pt-4">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1 text-right">Step {displayStep} of {displayTotal}</p>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-lg">
        {/* ==================== STEP 1 — ARRIVE ==================== */}
        {step === 1 && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Weekly Reset</h2>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{weekLabel}</p>
              {(identityDoc?.yearVision || monthlyGoal?.goalWhat) ? (
                <div className="space-y-2 max-w-sm text-left">
                  {identityDoc?.yearVision && (
                    <div className="rounded-md bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-0.5">1-Year Vision</p>
                      <p className="text-sm text-foreground/80">{identityDoc.yearVision}</p>
                    </div>
                  )}
                  {monthlyGoal?.goalWhat && (
                    <div className="rounded-md bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-0.5">Monthly Goal</p>
                      <p className="text-sm text-foreground/80">{monthlyGoal.goalWhat}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm max-w-sm">
                  Set your vision and goal to see them here.
                </p>
              )}
            </div>
            {/* Week toggle */}
            {!fearOnlyMode && (
              <div className="flex gap-2">
                <button
                  onClick={() => setPlanNextWeek(false)}
                  className={`text-xs px-4 py-2 rounded-full border min-h-[44px] ${!planNextWeek ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
                  data-testid="button-this-week"
                >
                  This week
                </button>
                <button
                  onClick={() => setPlanNextWeek(true)}
                  className={`text-xs px-4 py-2 rounded-full border min-h-[44px] ${planNextWeek ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
                  data-testid="button-next-week"
                >
                  Next week
                </button>
              </div>
            )}
            {hasExistingPlan && (
              <p className="text-xs text-amber-600 dark:text-amber-400 max-w-xs">
                You already have a plan for this week. Completing this ritual will replace it.
              </p>
            )}
            <Button size="lg" onClick={goNext} data-testid="button-ready">
              I'm ready
            </Button>
          </div>
        )}

        {/* ==================== STEP 2 — BRAIN DUMP ==================== */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">What is on my mind this week?</h2>
              <p className="text-sm text-muted-foreground">Write down all tasks, concerns, and loose ends. Messy is fine.</p>
            </div>

            <div className="flex gap-2">
              <Input
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
                placeholder="Add a task (comma-separated OK)"
                data-testid="input-brain-dump"
              />
              <Button size="icon" onClick={addItem} data-testid="button-add-item">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg border px-3 py-2" data-testid={`brain-dump-item-${i}`}>
                  <span className="flex-1 text-sm">{item.text}</span>
                  <button type="button" onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {items.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No items yet. Start writing.</p>
            )}
            {items.length >= MAX_BRAIN_DUMP && (
              <p className="text-xs text-amber-600 text-center">Maximum {MAX_BRAIN_DUMP} items. Narrow down or remove some.</p>
            )}
          </div>
        )}

        {/* ==================== STEP 3 — CUT TO 7 ==================== */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">What actually deserves space this week?</h2>
              <p className="text-sm text-muted-foreground">Tap to keep up to {MAX_CANDIDATES}. Let the rest go.</p>
            </div>

            <div className="space-y-2">
              {items.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleSelected(i)}
                  className={`w-full text-left flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                    item.selected
                      ? "border-primary bg-primary/[0.06]"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                  data-testid={`cut-item-${i}`}
                >
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    item.selected ? "border-primary bg-primary" : "border-muted-foreground/30"
                  }`}>
                    {item.selected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <span className="text-sm">{item.text}</span>
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {selectedItems.length} / {MAX_CANDIDATES} selected
            </p>
          </div>
        )}

        {/* ==================== STEP 4 — BETTER SORT ==================== */}
        {step === 4 && (
          <div className="space-y-6">
            {!allSorted && sortItemIdx !== null ? (
              /* ---- Classification questions (one item at a time) ---- */
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Item {selectedItems.filter(i => i.sortImportance !== null && i.sortConsequence !== null && i.sortResistance !== null).length + 1} of {selectedItems.length}
                  </p>
                  <h2 className="text-lg font-semibold">"{items[sortItemIdx].text}"</h2>
                </div>

                {/* Q1 — Importance */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Does this materially move my goal, values, or a key responsibility this week?</Label>
                  <div className="flex flex-wrap gap-2">
                    {IMPORTANCE_CHIPS.map(chip => (
                      <button
                        key={chip.value}
                        type="button"
                        onClick={() => answerSort(sortItemIdx, "sortImportance", chip.value)}
                        className={`rounded-full px-3 py-2 text-xs font-medium border transition-colors cursor-pointer min-h-[44px] ${
                          items[sortItemIdx].sortImportance === chip.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                        data-testid={`chip-importance-${chip.value}`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q2 — Consequence */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">If I ignore this for 7 days, what happens?</Label>
                  <div className="flex flex-wrap gap-2">
                    {CONSEQUENCE_CHIPS.map(chip => (
                      <button
                        key={chip.value}
                        type="button"
                        onClick={() => answerSort(sortItemIdx, "sortConsequence", chip.value)}
                        className={`rounded-full px-3 py-2 text-xs font-medium border transition-colors cursor-pointer min-h-[44px] ${
                          items[sortItemIdx].sortConsequence === chip.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                        data-testid={`chip-consequence-${chip.value}`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q3 — Resistance */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Am I resisting this because it's low value, or because it matters and feels uncomfortable?</Label>
                  <div className="flex flex-wrap gap-2">
                    {RESISTANCE_CHIPS.map(chip => (
                      <button
                        key={chip.value}
                        type="button"
                        onClick={() => answerSort(sortItemIdx, "sortResistance", chip.value)}
                        className={`rounded-full px-3 py-2 text-xs font-medium border transition-colors cursor-pointer min-h-[44px] ${
                          items[sortItemIdx].sortResistance === chip.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                        data-testid={`chip-resistance-${chip.value}`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Result badge after all 3 answered */}
                {items[sortItemIdx].sortImportance && items[sortItemIdx].sortConsequence && items[sortItemIdx].sortResistance && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${RESULT_BADGE[classifyItem(items[sortItemIdx])].className}`}>
                      {RESULT_BADGE[classifyItem(items[sortItemIdx])].label}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* ---- Review screen (all items sorted) ---- */
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">Your week, sorted</h2>
                  <p className="text-sm text-muted-foreground">Here's how your items landed. Tap to move between buckets.</p>
                </div>

                {handleItems.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-rose-500 uppercase tracking-wider">Handle this week ({handleItems.length}/{MAX_Q1})</p>
                    {handleItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-2">
                        <span className="text-sm flex-1">{item.text}</span>
                        <button
                          type="button"
                          onClick={() => moveItem(item.id, "protect")}
                          className="text-xs text-amber-600 dark:text-amber-400 hover:underline ml-2 shrink-0 min-h-[44px] flex items-center"
                        >
                          Move to Protect
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {protectItems.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-amber-500 uppercase tracking-wider">Protect this week ({protectItems.length}/{MAX_Q2})</p>
                    {protectItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2">
                        <span className="text-sm flex-1">{item.text}</span>
                        <button
                          type="button"
                          onClick={() => moveItem(item.id, "handle")}
                          className="text-xs text-rose-600 dark:text-rose-400 hover:underline ml-2 shrink-0 min-h-[44px] flex items-center"
                        >
                          Move to Handle
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {discardedItems.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Not this week</p>
                    {discardedItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border px-3 py-2 opacity-60">
                        <span className="text-sm text-muted-foreground line-through flex-1">{item.text}</span>
                        <div className="flex gap-2 ml-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => moveItem(item.id, "handle")}
                            className="text-xs text-rose-600 dark:text-rose-400 hover:underline min-h-[44px] flex items-center"
                          >
                            Handle
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(item.id, "protect")}
                            className="text-xs text-amber-600 dark:text-amber-400 hover:underline min-h-[44px] flex items-center"
                          >
                            Protect
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(handleItems.length > MAX_Q1 || protectItems.length > MAX_Q2) && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 space-y-2">
                    <p className="text-sm text-destructive">
                      {handleItems.length > MAX_Q1 && `Too many Handle items (${handleItems.length}/${MAX_Q1}). Move some to Protect or Not this week. `}
                      {protectItems.length > MAX_Q2 && `Too many Protect items (${protectItems.length}/${MAX_Q2}). Choose your most important. `}
                    </p>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setItems(prev => prev.map(it => it.selected
                      ? { ...it, sortImportance: null, sortConsequence: null, sortResistance: null, sortResult: null, sortPriority: null }
                      : it
                    ));
                  }}
                  data-testid="button-reset-sort"
                >
                  Re-sort all items
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ==================== STEP 5 — FACE THE FEAR ==================== */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">What important thing am I resisting?</h2>
              <p className="text-sm text-muted-foreground">Pick the one item you feel most resistance toward.</p>
            </div>

            {/* Item picker — show committed items only */}
            <div className="space-y-1.5">
              {(fearOnlyMode ? selectedItems : committedItems).map((item) => {
                const originalIdx = items.findIndex(it => it.id === item.id);
                const isSelected = fearTargetIdx === originalIdx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setFearTargetIdx(originalIdx);
                      setFearData(prev => ({ ...prev, targetTask: item.text }));
                    }}
                    className={`w-full text-left flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                      isSelected ? "border-primary bg-primary/[0.06]" : "border-border hover:border-muted-foreground/30"
                    }`}
                    data-testid={`fear-target-${originalIdx}`}
                  >
                    <div className={`h-4 w-4 rounded-full border-2 shrink-0 ${
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                    }`} />
                    <span className="text-sm">{item.text}</span>
                  </button>
                );
              })}
            </div>

            {fearTargetIdx !== null && (
              <Card>
                <CardContent className="pt-6 space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">What am I resisting?</Label>
                    <p className="text-sm font-medium px-3 py-2 rounded-md bg-muted" data-testid="input-fear-target">
                      {fearData.targetTask}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">What am I afraid might happen if I face it?</Label>
                    <Textarea
                      value={fearData.fearIfFaced}
                      onChange={(e) => setFearData(prev => ({ ...prev, fearIfFaced: e.target.value }))}
                      placeholder="If I face this..."
                      rows={2}
                      className="resize-none text-sm"
                      data-testid="input-fear-if-faced"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">What am I afraid might happen if I keep avoiding it?</Label>
                    <Textarea
                      value={fearData.fearIfAvoided}
                      onChange={(e) => setFearData(prev => ({ ...prev, fearIfAvoided: e.target.value }))}
                      placeholder="If I keep avoiding this..."
                      rows={2}
                      className="resize-none text-sm"
                      data-testid="input-fear-if-avoided"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">What is most true underneath this right now?</Label>
                    <div className="flex flex-wrap gap-2">
                      {BLOCKER_CHIPS.map((chip) => {
                        const isChipSelected = fearData.blockerChip === chip.value;
                        return (
                          <button
                            key={chip.value}
                            type="button"
                            onClick={() => setFearData(prev => ({ ...prev, blockerChip: chip.value }))}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                              isChipSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                            }`}
                            data-testid={`chip-blocker-${chip.value}`}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">What is the smallest proof move?</Label>
                    <Textarea
                      value={fearData.smallestProofMove}
                      onChange={(e) => setFearData(prev => ({ ...prev, smallestProofMove: e.target.value }))}
                      placeholder="One small, concrete step I can do this week..."
                      rows={2}
                      className="resize-none text-sm"
                      data-testid="input-proof-move"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ==================== STEP 6 — REVIEW BUCKETS + FEAR + CAPS ==================== */}
        {step === 6 && !fearOnlyMode && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Commit your week</h2>
              <p className="text-sm text-muted-foreground">Review your items. Move between buckets if needed.</p>
            </div>

            {/* Handle bucket */}
            {handleItems.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-rose-500 uppercase tracking-wider">Handle this week ({handleItems.length}/{MAX_Q1})</p>
                {handleItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-2">
                    <span className="text-sm flex-1">{item.text}</span>
                    <button
                      type="button"
                      onClick={() => moveItem(item.id, "protect")}
                      className="text-xs text-amber-600 dark:text-amber-400 hover:underline ml-2 shrink-0 min-h-[44px] flex items-center"
                    >
                      Move to Protect
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Protect bucket */}
            {protectItems.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-amber-500 uppercase tracking-wider">Protect this week ({protectItems.length}/{MAX_Q2})</p>
                {protectItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2">
                    <span className="text-sm flex-1">{item.text}</span>
                    <button
                      type="button"
                      onClick={() => moveItem(item.id, "handle")}
                      className="text-xs text-rose-600 dark:text-rose-400 hover:underline ml-2 shrink-0 min-h-[44px] flex items-center"
                    >
                      Move to Handle
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Not this week */}
            {discardedItems.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Not this week</p>
                {discardedItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border px-3 py-2 opacity-60">
                    <span className="text-sm text-muted-foreground line-through flex-1">{item.text}</span>
                    <div className="flex gap-2 ml-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveItem(item.id, "handle")}
                        className="text-xs text-rose-600 dark:text-rose-400 hover:underline min-h-[44px] flex items-center"
                      >
                        Handle
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(item.id, "protect")}
                        className="text-xs text-amber-600 dark:text-amber-400 hover:underline min-h-[44px] flex items-center"
                      >
                        Protect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Fear item integration */}
            {fearTargetIdx !== null && fearData.targetTask && (
              <Card className="border-indigo-200 dark:border-indigo-900/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-indigo-600 dark:text-indigo-400">Facing this week</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm font-medium">{fearData.targetTask}</p>
                  <p className="text-xs text-muted-foreground">Proof move: {fearData.smallestProofMove}</p>
                  <p className="text-xs text-muted-foreground">Blocker: {BLOCKER_CHIPS.find(c => c.value === fearData.blockerChip)?.label}</p>

                  {/* Promote to Q2 toggle */}
                  {(() => {
                    const fearItem = items[fearTargetIdx];
                    const fearResult = fearItem?.sortResult;
                    const isAlreadyProtect = fearResult === "protect";
                    const currentProtectCount = protectItems.length;
                    const hasRoom = currentProtectCount < MAX_Q2 || isAlreadyProtect;

                    if (isAlreadyProtect) return null;

                    return (
                      <div className="pt-2 border-t">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fearData.promoteToQ2}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFearData(prev => ({ ...prev, promoteToQ2: checked }));
                              // Move fear item into/out of Protect so it appears in committedItems for scheduling
                              if (fearTargetIdx !== null) {
                                setItems(prev => prev.map((it, idx) => {
                                  if (idx !== fearTargetIdx) return it;
                                  return { ...it, sortResult: checked ? "protect" : classifyItem(it) };
                                }));
                              }
                            }}
                            disabled={!hasRoom && !fearData.promoteToQ2}
                            className="rounded"
                            data-testid="checkbox-promote-q2"
                          />
                          <span className="text-xs">
                            Commit as Protect item{!hasRoom ? " (Protect full — move one out first)" : ""}
                          </span>
                        </label>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Cap enforcement messages */}
            {(handleItems.length > MAX_Q1 || protectItems.length > MAX_Q2) && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
                <p className="text-sm text-destructive">
                  {handleItems.length > MAX_Q1 && "You can handle up to 5 items this week. Let go of the rest or move them to Protect. "}
                  {protectItems.length > MAX_Q2 && "You can protect up to 2 items this week. Choose your most important. "}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ==================== STEP 7 — SCHEDULE + FIRST MOVES + SAVE ==================== */}
        {step === 7 && !fearOnlyMode && (
          <div className="space-y-6">
            {!allItemsScheduled ? (
              /* ---- Scheduling one item at a time ---- */
              (() => {
                const currentCommitted = committedItems[scheduleIdx];
                if (!currentCommitted) return null;
                const originalIdx = items.findIndex(it => it.id === currentCommitted.id);
                const originalItem = items[originalIdx];
                if (!originalItem) return null;
                const isHandle = currentCommitted.sortResult === "handle";
                const isFearItem = fearTargetIdx === originalIdx;

                return (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Scheduling {scheduleIdx + 1} of {committedItems.length}
                      </p>
                      <h2 className="text-lg font-semibold">{currentCommitted.text}</h2>
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        isHandle ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                 : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}>
                        {isHandle ? "Handle" : "Protect"}
                      </span>
                    </div>

                    {/* Day chips */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Which days?</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {weekDays.map(day => {
                          const isSelectedDay = originalItem.scheduledDates.includes(day.date);
                          const atMax = originalItem.scheduledDates.length >= MAX_DAYS_PER_ITEM && !isSelectedDay;
                          return (
                            <button
                              key={day.date}
                              type="button"
                              onClick={() => !atMax && toggleScheduledDay(originalIdx, day.date)}
                              className={`text-xs px-3 py-2 rounded-md border cursor-pointer min-h-[44px] ${
                                isSelectedDay
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : atMax
                                    ? "border-border text-muted-foreground/40 cursor-not-allowed"
                                    : "border-border text-muted-foreground hover:border-primary/40"
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                      {originalItem.scheduledDates.length >= MAX_DAYS_PER_ITEM && (
                        <p className="text-xs text-amber-600">Max {MAX_DAYS_PER_ITEM} days. If something needs all 7 days, it should probably be a habit, not a weekly item.</p>
                      )}
                    </div>

                    {/* Time slots */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">What time?</Label>
                      <div className="flex gap-2">
                        <select
                          value={originalItem.scheduledStartTime || ""}
                          onChange={e => updateScheduleField(originalIdx, "scheduledStartTime", e.target.value)}
                          className="text-xs h-10 rounded-md border border-border bg-background px-2 flex-1"
                        >
                          <option value="">Start</option>
                          {TIME_SLOTS.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        <select
                          value={originalItem.scheduledEndTime || ""}
                          onChange={e => updateScheduleField(originalIdx, "scheduledEndTime", e.target.value)}
                          className="text-xs h-10 rounded-md border border-border bg-background px-2 flex-1"
                        >
                          <option value="">End</option>
                          {TIME_SLOTS.filter(t => !originalItem.scheduledStartTime || t.value > originalItem.scheduledStartTime).map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* First move */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">First physical step</Label>
                      <Input
                        value={originalItem.firstMove}
                        onChange={e => updateScheduleField(originalIdx, "firstMove", e.target.value)}
                        placeholder={isFearItem ? fearData.smallestProofMove || "One concrete first step..." : "One concrete first step..."}
                        data-testid="input-first-move"
                      />
                    </div>
                  </div>
                );
              })()
            ) : (
              /* ---- Final review + save (7c) ---- */
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">Your week</h2>
                  <p className="text-sm text-muted-foreground">Review and commit.</p>
                </div>

                {handleItems.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-rose-500 uppercase tracking-wider">Handle ({handleItems.length})</p>
                    {handleItems.map((item) => {
                      const orig = items.find(it => it.id === item.id);
                      return (
                        <div key={item.id} className="rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-2 space-y-1">
                          <p className="text-sm font-medium">{item.text}</p>
                          <p className="text-xs text-muted-foreground">
                            {orig?.scheduledDates.map(d => {
                              const day = weekDays.find(wd => wd.date === d);
                              return day?.label;
                            }).filter(Boolean).join(", ")}
                            {orig?.scheduledStartTime && ` at ${orig.scheduledStartTime}`}
                          </p>
                          {orig?.firstMove && <p className="text-xs text-muted-foreground italic">First: {orig.firstMove}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {protectItems.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-amber-500 uppercase tracking-wider">Protect ({protectItems.length})</p>
                    {protectItems.map((item) => {
                      const orig = items.find(it => it.id === item.id);
                      const isFearLinked = fearTargetIdx !== null && items[fearTargetIdx]?.id === item.id;
                      return (
                        <div key={item.id} className={`rounded-lg border ${isFearLinked ? "border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20" : "border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20"} px-3 py-2 space-y-1`}>
                          <p className="text-sm font-medium">{item.text}{isFearLinked && " (fear item)"}</p>
                          <p className="text-xs text-muted-foreground">
                            {orig?.scheduledDates.map(d => {
                              const day = weekDays.find(wd => wd.date === d);
                              return day?.label;
                            }).filter(Boolean).join(", ")}
                            {orig?.scheduledStartTime && ` at ${orig.scheduledStartTime}`}
                          </p>
                          {orig?.firstMove && <p className="text-xs text-muted-foreground italic">First: {orig.firstMove}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Fear summary if not promoted */}
                {fearTargetIdx !== null && fearData.targetTask && !fearData.promoteToQ2 && (
                  <Card className="border-indigo-200 dark:border-indigo-900/40">
                    <CardContent className="pt-4 space-y-1">
                      <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Weekly fear rep</p>
                      <p className="text-sm">{fearData.targetTask}</p>
                      <p className="text-xs text-muted-foreground italic">Proof move: {fearData.smallestProofMove}</p>
                    </CardContent>
                  </Card>
                )}

                {commitMutation.isError && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
                    <p className="text-sm text-destructive">{commitMutation.error.message}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== NAVIGATION ==================== */}
        {(step > 1 || fearOnlyMode) && (
          <div className="flex justify-between items-center mt-8 pt-4 border-t">
            {!(fearOnlyMode && step === 5) ? (
              <Button variant="ghost" onClick={goBack} data-testid="button-back">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            ) : <div />}
            <Button
              onClick={goNext}
              disabled={!canNext || ((step === 7 && allItemsScheduled || (fearOnlyMode && step === 5)) && commitMutation.isPending)}
              data-testid="button-next"
            >
              {(step === 7 && allItemsScheduled) || (fearOnlyMode && step === 5) ? (
                commitMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                ) : "Commit"
              ) : (
                <>Next<ArrowRight className="ml-1 h-4 w-4" /></>
              )}
            </Button>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
