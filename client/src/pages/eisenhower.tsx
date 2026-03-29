import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { FlowBar } from "@/components/flow-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { X, Plus, Check, Loader2 } from "lucide-react";
import { format, startOfWeek, addDays } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";
import { useLocation } from "wouter";
import type { EisenhowerEntry } from "@shared/schema";

const MAX_Q1 = 5;
const MAX_Q2 = 2;
const MAX_CANDIDATES = 7;
const MAX_RANKED = 5;
const MAX_BRAIN_DUMP = 30;
const TOTAL_STEPS = 8;

const TIME_SLOTS = Array.from({ length: 27 }, (_, i) => {
  const totalMinutes = 8 * 60 + i * 30; // 8:00am to 9:00pm
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const label = `${h12}:${String(m).padStart(2, "0")}${h >= 12 ? "p" : "a"}`;
  return { value: `${hh}:${mm}`, label };
});

const BLOCKER_CHIPS = [
  { value: "getting_it_wrong", label: "Getting it wrong" },
  { value: "being_judged", label: "Being judged" },
  { value: "disappointing_someone", label: "Disappointing someone" },
  { value: "uncertainty", label: "Uncertainty / no perfect choice" },
  { value: "waiting_for_permission", label: "Waiting for permission" },
  { value: "hoping_someone_else_decides", label: "Hoping someone else decides" },
  { value: "shame_discomfort", label: "Shame / discomfort" },
  { value: "succeeding_and_sustaining", label: "Succeeding and having to sustain it" },
] as const;

interface BrainDumpItem {
  id: number;              // stable unique ID for React keys
  text: string;
  selected: boolean;       // survived Cut to 7
  rank: number | null;     // 1-5 from gut-rank step
  ignoreConsequence: boolean | null;  // "Will something real happen soon if I ignore this?"
  futureGlad: boolean | null;         // "Will my future self be glad I did this?"
  scheduledDate: string;   // YYYY-MM-DD
  scheduledStartTime: string; // HH:MM
  scheduledEndTime: string;   // HH:MM
}

interface FearData {
  targetTask: string;
  fearIfFaced: string;
  fearIfAvoided: string;
  blockerChip: string;
  smallestProofMove: string;
  promoteToQ2: boolean;
}

function classifyItem(item: BrainDumpItem): "q1" | "q2" | "not_this_week" {
  const { ignoreConsequence, futureGlad } = item;
  if (ignoreConsequence === null || futureGlad === null) return "not_this_week";
  if (ignoreConsequence && futureGlad) return "q1";    // Handle this week
  if (!ignoreConsequence && futureGlad) return "q2";   // Protect this week
  return "not_this_week"; // Yes+No and No+No both discarded
}

export default function EisenhowerPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { register, unregister } = useUnsavedGuard();
  const isFearOnly = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("startAt") === "fear";
  const [step, setStep] = useState(isFearOnly ? 6 : 1);
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

  // Step 6 — Fear
  const [fearTargetIdx, setFearTargetIdx] = useState<number | null>(null);
  const [fearData, setFearData] = useState<FearData>({
    targetTask: "",
    fearIfFaced: "",
    fearIfAvoided: "",
    blockerChip: "",
    smallestProofMove: "",
    promoteToQ2: false,
  });

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekLabel = `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d")}`;

  // Check if a plan already exists for this week
  const { data: existingEntries = [], isLoading: entriesLoading } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower/week", weekStartStr],
  });
  const hasExistingPlan = existingEntries.length > 0;

  // Fear-only mode: pre-load existing items so user can pick a fear target
  const fearOnlyLoaded = useRef(false);
  useEffect(() => {
    // Redirect to plan if no entries exist for fear-only mode
    if (fearOnlyMode && !entriesLoading && existingEntries.length === 0 && !fearOnlyLoaded.current) {
      toast({ title: "Plan your week first", description: "You need committed items before facing a fear.", variant: "destructive" });
      setLocation("/plan");
      return;
    }
    if (fearOnlyMode && existingEntries.length > 0 && !fearOnlyLoaded.current) {
      fearOnlyLoaded.current = true;
      setItems(existingEntries.map(e => ({
        id: nextId.current++,
        text: e.task,
        selected: true,
        rank: null,
        ignoreConsequence: e.quadrant === "q1" ? true : e.quadrant === "q2" ? false : null,
        futureGlad: (e.quadrant === "q1" || e.quadrant === "q2") ? true : false,
        scheduledDate: e.scheduledDate || "",
        scheduledStartTime: e.scheduledStartTime || "",
        scheduledEndTime: e.scheduledEndTime || "",
      })));
    }
  }, [fearOnlyMode, existingEntries]);

  // Derived lists
  const selectedItems = items.filter(i => i.selected);
  const rankedItems = selectedItems.filter(i => i.rank !== null).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  const classifiedItems = selectedItems.map(item => ({ ...item, classification: classifyItem(item) }));
  const q1Items = classifiedItems.filter(i => i.classification === "q1");
  const q2Items = classifiedItems.filter(i => i.classification === "q2");
  const handleItems = q1Items; // alias for user-facing label
  const protectItems = q2Items;
  const discardedItems = classifiedItems.filter(i => i.classification === "not_this_week");
  const schedulableItems = [...handleItems, ...protectItems]; // items that need scheduling
  const allScheduled = schedulableItems.length === 0 || schedulableItems.every(i => i.scheduledDate && i.scheduledStartTime && i.scheduledEndTime);

  // Week days for scheduling step
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { date: format(d, "yyyy-MM-dd"), label: format(d, "EEE") };
  });

  // Brain dump helpers
  const addItem = () => {
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    // Support comma-separated
    const parts = trimmed.split(",").map(s => s.trim()).filter(Boolean);
    const newItems = parts
      .filter(text => !items.some(i => i.text.toLowerCase() === text.toLowerCase()))
      .slice(0, MAX_BRAIN_DUMP - items.length) // enforce cap
      .map(text => ({ id: nextId.current++, text, selected: false, rank: null, ignoreConsequence: null, futureGlad: null, scheduledDate: "", scheduledStartTime: "", scheduledEndTime: "" }));
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
      if (item.selected) return { ...item, selected: false, rank: null };
      const currentSelected = prev.filter(it => it.selected).length;
      if (currentSelected >= MAX_CANDIDATES) return item;
      return { ...item, selected: true };
    }));
  };

  // Step 4 — Tap-to-rank
  const toggleRank = (idx: number) => {
    setItems(prev => {
      const item = prev[idx];
      if (item.rank !== null) {
        // Unrank: remove this rank and reflow
        const removedRank = item.rank;
        return prev.map((it, i) => {
          if (i === idx) return { ...it, rank: null };
          if (it.rank !== null && it.rank > removedRank) return { ...it, rank: it.rank - 1 };
          return it;
        });
      }
      // Assign next rank
      const currentRanked = prev.filter(it => it.rank !== null).length;
      if (currentRanked >= MAX_RANKED) return prev;
      return prev.map((it, i) => {
        if (i === idx) return { ...it, rank: currentRanked + 1 };
        return it;
      });
    });
  };

  // Step 5 — Sort questions
  const sortItemIdx = (() => {
    // Find the first selected item that hasn't been classified yet
    for (let i = 0; i < items.length; i++) {
      if (items[i].selected && (items[i].ignoreConsequence === null || items[i].futureGlad === null)) {
        return i;
      }
    }
    return null;
  })();
  const allSorted = selectedItems.length > 0 && selectedItems.every(i => i.ignoreConsequence !== null && i.futureGlad !== null);

  const answerSort = (idx: number, field: "ignoreConsequence" | "futureGlad", value: boolean) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const updateSchedule = (idx: number, field: "scheduledDate" | "scheduledStartTime" | "scheduledEndTime", value: string) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  // Commit mutation — full week or fear-only
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

      // Full ritual mode: commit entire week
      const commitItems = [...handleItems, ...protectItems].map((item, i) => ({
        task: item.text,
        quadrant: item.classification as "q1" | "q2",
        sortOrder: i,
        scheduledDate: item.scheduledDate || null,
        scheduledStartTime: item.scheduledStartTime || null,
        scheduledEndTime: item.scheduledEndTime || null,
      }));

      // If fear item is promoted to Q2 and not already in Q2, add it
      const fearItem = fearTargetIdx !== null ? items[fearTargetIdx] : null;
      const fearClassification = fearItem ? classifyItem(fearItem) : null;
      const fearAlreadyQ2 = fearClassification === "q2";
      const shouldPromote = fearData.promoteToQ2 && fearItem && !fearAlreadyQ2;

      if (shouldPromote && fearItem) {
        const currentQ2 = commitItems.filter(ci => ci.quadrant === "q2").length;
        const alreadyIncluded = commitItems.some(ci => ci.task === fearItem.text);
        if (!alreadyIncluded && currentQ2 < MAX_Q2) {
          commitItems.push({
            task: fearItem.text,
            quadrant: "q2",
            sortOrder: commitItems.length,
            scheduledDate: fearItem.scheduledDate || null,
            scheduledStartTime: fearItem.scheduledStartTime || null,
            scheduledEndTime: fearItem.scheduledEndTime || null,
          });
        } else if (alreadyIncluded) {
          const existing = commitItems.find(ci => ci.task === fearItem.text);
          if (existing && currentQ2 < MAX_Q2) existing.quadrant = "q2";
        }
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
      setLocation(fearOnlyMode ? "/plan" : "/dashboard");
    },
    onError: (error: Error) => {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
    },
  });

  // Step navigation (1=Arrive, 2=BrainDump, 3=Cut, 4=Rank, 5=Sort, 6=Schedule, 7=Fear, 8=Commit)
  const fearStep = fearOnlyMode ? 6 : 7; // fear-only skips to step 6 which maps to fear
  const commitStep = fearOnlyMode ? 7 : 8;

  const canNext = (() => {
    switch (step) {
      case 1: return true;
      case 2: return items.length >= 1;
      case 3: return selectedItems.length >= 1 && selectedItems.length <= MAX_CANDIDATES;
      case 4: return rankedItems.length >= 1;
      case 5: return allSorted && q1Items.length <= MAX_Q1 && q2Items.length <= MAX_Q2;
      case 6: return fearOnlyMode
        ? (fearTargetIdx !== null && fearData.fearIfFaced.trim() && fearData.fearIfAvoided.trim() && fearData.blockerChip && fearData.smallestProofMove.trim())
        : allScheduled;
      case 7: return fearOnlyMode
        ? !commitMutation.isPending
        : (fearTargetIdx !== null && fearData.fearIfFaced.trim() && fearData.fearIfAvoided.trim() && fearData.blockerChip && fearData.smallestProofMove.trim());
      case 8: return !commitMutation.isPending;
      default: return false;
    }
  })();

  const goNext = () => {
    if (step === commitStep) {
      commitMutation.mutate();
      return;
    }
    if (step === (fearOnlyMode ? 5 : 6)) {
      // Pre-fill fear target with first item if none selected (entering fear step)
      if (fearTargetIdx === null && selectedItems.length > 0) {
        const firstIdx = items.findIndex(i => i.selected);
        setFearTargetIdx(firstIdx);
        setFearData(prev => ({ ...prev, targetTask: items[firstIdx].text }));
      }
    }
    setStep(s => Math.min(s + 1, commitStep));
  };
  const goBack = () => {
    if (fearOnlyMode && step === 6) return;
    if (step === fearStep) {
      setFearTargetIdx(null);
      setFearData({ targetTask: "", fearIfFaced: "", fearIfAvoided: "", blockerChip: "", smallestProofMove: "", promoteToQ2: false });
    }
    setStep(s => Math.max(s - 1, 1));
  };

  const fearOnlySteps = 2;
  const progressPercent = fearOnlyMode
    ? Math.round(((step - 5) / fearOnlySteps) * 100)
    : Math.round((step / TOTAL_STEPS) * 100);
  const displayStep = fearOnlyMode ? step - 5 : step;
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
              <p className="text-muted-foreground text-sm max-w-sm">
                Take 3 slow breaths.<br />
                You are overloaded, not incapable.
              </p>
            </div>
            {hasExistingPlan && (
              <p className="text-xs text-amber-600 dark:text-amber-400 max-w-xs">
                You already have a plan this week. Completing this ritual will replace it.
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

        {/* ==================== STEP 4 — GUT RANK TOP 5 ==================== */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">If I followed instinct alone, what would I do first?</h2>
              <p className="text-sm text-muted-foreground">Tap items in rank order (1 = first). Tap again to remove rank.</p>
            </div>

            {/* Ranked items */}
            {rankedItems.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ranked</p>
                {rankedItems.map((item) => {
                  const originalIdx = items.findIndex(it => it.id === item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleRank(originalIdx)}
                      className="w-full text-left flex items-center gap-3 rounded-lg border border-primary bg-primary/[0.06] px-3 py-2.5"
                      data-testid={`rank-item-${originalIdx}`}
                    >
                      <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                        {item.rank}
                      </div>
                      <span className="text-sm">{item.text}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Unranked items */}
            {(() => {
              const unranked = selectedItems.filter(i => i.rank === null);
              if (unranked.length === 0) return null;
              return (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unranked</p>
                  {unranked.map((item) => {
                    const originalIdx = items.findIndex(it => it.id === item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleRank(originalIdx)}
                        className="w-full text-left flex items-center gap-3 rounded-lg border px-3 py-2.5 hover:border-muted-foreground/30"
                        data-testid={`rank-item-${originalIdx}`}
                      >
                        <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground shrink-0">
                          —
                        </div>
                        <span className="text-sm">{item.text}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            <p className="text-xs text-muted-foreground text-center">
              {rankedItems.length} / {MAX_RANKED} ranked
            </p>
          </div>
        )}

        {/* ==================== STEP 5 — QUIETLY SORT ==================== */}
        {step === 5 && (
          <div className="space-y-6">
            {!allSorted && sortItemIdx !== null ? (
              // Show questions for the current item
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Item {selectedItems.filter(i => i.ignoreConsequence !== null && i.futureGlad !== null).length + 1} of {selectedItems.length}
                  </p>
                  <h2 className="text-lg font-semibold">"{items[sortItemIdx].text}"</h2>
                </div>

                {/* Question 1 */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Will something real happen soon if I ignore this?</Label>
                  <div className="flex gap-3">
                    <Button
                      variant={items[sortItemIdx].ignoreConsequence === true ? "default" : "outline"}
                      size="sm"
                      onClick={() => answerSort(sortItemIdx, "ignoreConsequence", true)}
                      data-testid="button-ignore-yes"
                    >
                      Yes
                    </Button>
                    <Button
                      variant={items[sortItemIdx].ignoreConsequence === false ? "default" : "outline"}
                      size="sm"
                      onClick={() => answerSort(sortItemIdx, "ignoreConsequence", false)}
                      data-testid="button-ignore-no"
                    >
                      No
                    </Button>
                  </div>
                </div>

                {/* Question 2 */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Will my future self be glad I did this?</Label>
                  <div className="flex gap-3">
                    <Button
                      variant={items[sortItemIdx].futureGlad === true ? "default" : "outline"}
                      size="sm"
                      onClick={() => answerSort(sortItemIdx, "futureGlad", true)}
                      data-testid="button-glad-yes"
                    >
                      Yes
                    </Button>
                    <Button
                      variant={items[sortItemIdx].futureGlad === false ? "default" : "outline"}
                      size="sm"
                      onClick={() => answerSort(sortItemIdx, "futureGlad", false)}
                      data-testid="button-glad-no"
                    >
                      No
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              // All sorted — show results
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">Your week, sorted</h2>
                  <p className="text-sm text-muted-foreground">Here's how your items landed.</p>
                </div>

                {handleItems.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-rose-500 uppercase tracking-wider">Handle this week ({handleItems.length}/{MAX_Q1})</p>
                    {handleItems.map((item, i) => (
                      <div key={i} className="rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-2 text-sm">
                        {item.text}
                      </div>
                    ))}
                  </div>
                )}

                {protectItems.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-amber-500 uppercase tracking-wider">Protect this week ({protectItems.length}/{MAX_Q2})</p>
                    {protectItems.map((item, i) => (
                      <div key={i} className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2 text-sm">
                        {item.text}
                      </div>
                    ))}
                  </div>
                )}

                {discardedItems.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Not this week</p>
                    {discardedItems.map((item, i) => (
                      <div key={i} className="rounded-lg border px-3 py-2 text-sm text-muted-foreground line-through">
                        {item.text}
                      </div>
                    ))}
                  </div>
                )}

                {(q1Items.length > MAX_Q1 || q2Items.length > MAX_Q2) && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 space-y-2">
                    <p className="text-sm text-destructive">
                      {q1Items.length > MAX_Q1 && `Too many Handle items (${q1Items.length}/${MAX_Q1}). `}
                      {q2Items.length > MAX_Q2 && `Too many Protect items (${q2Items.length}/${MAX_Q2}). `}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setItems(prev => prev.map(it => it.selected ? { ...it, ignoreConsequence: null, futureGlad: null } : it));
                      }}
                      data-testid="button-reset-sort"
                    >
                      Re-sort items
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== STEP 6 — SCHEDULE ==================== */}
        {step === 6 && !fearOnlyMode && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">When will you do each one?</h2>
              <p className="text-sm text-muted-foreground">Assign a day and time to each item.</p>
            </div>

            <div className="space-y-4">
              {schedulableItems.map((item) => {
                const originalIdx = items.findIndex(it => it.id === item.id);
                const isQ1 = item.classification === "q1";
                return (
                  <Card key={item.id} className={isQ1 ? "border-rose-200 dark:border-rose-900/40" : "border-amber-200 dark:border-amber-900/40"}>
                    <CardContent className="p-3 space-y-2">
                      <p className="text-sm font-medium">{item.text}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {weekDays.map(day => (
                          <button
                            key={day.date}
                            type="button"
                            onClick={() => updateSchedule(originalIdx, "scheduledDate", day.date)}
                            className={`text-xs px-3 py-2 rounded-md border cursor-pointer min-h-[44px] ${
                              items[originalIdx]?.scheduledDate === day.date
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={items[originalIdx]?.scheduledStartTime || ""}
                          onChange={e => updateSchedule(originalIdx, "scheduledStartTime", e.target.value)}
                          className="text-xs h-8 rounded-md border border-border bg-background px-2 flex-1"
                        >
                          <option value="">Start</option>
                          {TIME_SLOTS.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        <select
                          value={items[originalIdx]?.scheduledEndTime || ""}
                          onChange={e => updateSchedule(originalIdx, "scheduledEndTime", e.target.value)}
                          className="text-xs h-8 rounded-md border border-border bg-background px-2 flex-1"
                        >
                          <option value="">End</option>
                          {TIME_SLOTS.filter(t => !items[originalIdx]?.scheduledStartTime || t.value > items[originalIdx].scheduledStartTime).map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== STEP 7 — FACE THE FEAR ==================== */}
        {step === fearStep && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">What important thing am I resisting?</h2>
              <p className="text-sm text-muted-foreground">Pick the one item you feel most resistance toward.</p>
            </div>

            {/* Item picker */}
            <div className="space-y-1.5">
              {selectedItems.map((item) => {
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
                  {/* What am I resisting? */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">What am I resisting?</Label>
                    <p className="text-sm font-medium px-3 py-2 rounded-md bg-muted" data-testid="input-fear-target">
                      {fearData.targetTask}
                    </p>
                  </div>

                  {/* Fear if faced */}
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

                  {/* Fear if avoided */}
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

                  {/* Blocker chips */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">What is most true underneath this right now?</Label>
                    <div className="flex flex-wrap gap-2">
                      {BLOCKER_CHIPS.map((chip) => {
                        const isSelected = fearData.blockerChip === chip.value;
                        return (
                          <button
                            key={chip.value}
                            type="button"
                            onClick={() => setFearData(prev => ({ ...prev, blockerChip: chip.value }))}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                              isSelected
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

                  {/* Smallest proof move */}
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

        {/* ==================== STEP 8 — COMMIT ==================== */}
        {step === commitStep && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Commit the week</h2>
              <p className="text-sm text-muted-foreground">Review your plan and commit.</p>
            </div>

            {handleItems.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-rose-500 uppercase tracking-wider">Handle this week</p>
                {handleItems.map((item, i) => (
                  <div key={i} className="rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-2 text-sm">
                    {item.text}
                  </div>
                ))}
              </div>
            )}

            {protectItems.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-amber-500 uppercase tracking-wider">Protect this week</p>
                {protectItems.map((item, i) => (
                  <div key={i} className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2 text-sm">
                    {item.text}
                  </div>
                ))}
              </div>
            )}

            {/* Fear summary */}
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
                    const fearClass = classifyItem(fearItem);
                    const isAlreadyQ2 = fearClass === "q2";
                    const currentQ2Count = q2Items.length;
                    const hasRoom = currentQ2Count < MAX_Q2 || isAlreadyQ2;

                    if (isAlreadyQ2) return null; // Already committed as Q2

                    return (
                      <div className="pt-2 border-t">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fearData.promoteToQ2}
                            onChange={(e) => setFearData(prev => ({ ...prev, promoteToQ2: e.target.checked }))}
                            disabled={!hasRoom && !fearData.promoteToQ2}
                            className="rounded"
                            data-testid="checkbox-promote-q2"
                          />
                          <span className="text-xs">
                            Commit as Protect item{!hasRoom ? " (Q2 full — remove one first)" : ""}
                          </span>
                        </label>
                      </div>
                    );
                  })()}
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

        {/* ==================== NAVIGATION ==================== */}
        {(step > 1 || fearOnlyMode) && (
          <div className="flex justify-between items-center mt-8 pt-4 border-t">
            {!(fearOnlyMode && step === 6) ? (
              <Button variant="ghost" onClick={goBack} data-testid="button-back">
                Back
              </Button>
            ) : <div />}
            <Button
              onClick={goNext}
              disabled={!canNext || (step === commitStep && commitMutation.isPending)}
              data-testid="button-next"
            >
              {step === commitStep ? (
                commitMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                ) : "Commit"
              ) : "Next"}
            </Button>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
