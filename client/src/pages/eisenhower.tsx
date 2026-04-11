import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { FlowBar } from "@/components/flow-bar";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, getDay } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";
import { useLocation } from "wouter";
import type { EisenhowerEntry, IdentityDocument, MonthlyGoal, AnnualCommitment, PatternProfile } from "@shared/schema";
import {
  MAX_Q1, MAX_Q2, MAX_BRAIN_DUMP, MAX_DAYS_PER_ITEM, SOFT_CAP, TOTAL_STEPS, VISIBLE_SCREENS, stepToScreen, SCREEN_LABELS,
  classifyItem, computeSortPriority, generateGroupId, createEmptyItem, suggestSequence,
  type ProofItem, type OpeningData, type CloseWeekData,
  type SortResult, type SortImportance, type SortConsequence, type SortBlocker,
} from "@/lib/proof-engine-logic";

import { StepCloseLastWeek } from "@/components/proof-engine/step-close-last-week";
import { StepOpenThisWeek } from "@/components/proof-engine/step-open-this-week";
import { StepBrainDump } from "@/components/proof-engine/step-brain-dump";
import { StepConvertOutcomes } from "@/components/proof-engine/step-convert-outcomes";
import { StepClassify } from "@/components/proof-engine/step-classify";
import { StepBucketAndCap } from "@/components/proof-engine/step-bucket-and-cap";
import { StepSequenceHandle } from "@/components/proof-engine/step-sequence-handle";
import { StepAttachTriggers } from "@/components/proof-engine/step-attach-triggers";

export default function EisenhowerPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { register, unregister } = useUnsavedGuard();
  const [step, setStep] = useState(1);
  const nextId = useRef(1);

  // Items state
  const [newItemText, setNewItemText] = useState("");
  const [items, setItems] = useState<ProofItem[]>([]);

  // Opening data (Steps 1-2)
  const [openingData, setOpeningData] = useState<OpeningData>({
    patternPullBack: "", openStory: "", openHardTruth: "", openHardAction: "",
  });

  // Classification UI state
  const [badgeItemId, setBadgeItemId] = useState<number | null>(null);

  // Step 8 — Schedule sub-step tracking
  const [scheduleIdx, setScheduleIdx] = useState(0);

  // Pattern nudge state
  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null);
  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [nudgeChecked, setNudgeChecked] = useState(false);

  // Milestone suggestion state
  const [dismissedMilestones, setDismissedMilestones] = useState<Set<string>>(new Set());

  // Week calculation
  const today = new Date();
  const weekParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("week") : null;
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const [planNextWeek, setPlanNextWeek] = useState(() => {
    if (weekParam) return weekParam !== format(currentWeekStart, "yyyy-MM-dd");
    const dow = getDay(today);
    return dow === 0 || dow === 5 || dow === 6;
  });
  const weekStart = planNextWeek ? addWeeks(currentWeekStart, 1) : currentWeekStart;
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekLabel = `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d")}`;

  // Existing plan check
  const { data: existingEntries = [] } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower/week", weekStartStr],
  });
  const hasExistingPlan = existingEntries.length > 0;

  // Close last week data — always shows the last fully completed week
  // (the week before the current calendar week, regardless of which week we're planning)
  const lastCompletedWeekStart = format(addDays(currentWeekStart, -7), "yyyy-MM-dd");
  const { data: closeWeekData, isLoading: closeWeekLoading } = useQuery<CloseWeekData>({
    queryKey: ["/api/eisenhower/close-week", lastCompletedWeekStart],
    queryFn: async () => {
      // Pass the completed week directly — server will use it as-is
      const res = await fetch(`/api/eisenhower/close-week/${lastCompletedWeekStart}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  // Context data
  const currentMonthKey = format(today, "yyyy-MM");
  const { data: identityDoc } = useQuery<IdentityDocument>({ queryKey: ["/api/identity-document"] });
  const { data: annualCommitment } = useQuery<AnnualCommitment>({ queryKey: ["/api/annual-commitment"] });
  const { data: patternProfile } = useQuery<PatternProfile>({ queryKey: ["/api/pattern-profile"] });
  const { data: habits = [] } = useQuery<{ id: number; name: string; source?: string | null }[]>({ queryKey: ["/api/habits"] });
  const weeklyProofBehaviorName = annualCommitment?.weeklyProofBehaviorHabitId
    ? habits.find(h => h.id === annualCommitment.weeklyProofBehaviorHabitId)?.name || null
    : null;
  const avoidanceLoopStory = patternProfile?.repeatingLoopStory?.trim() || null;
  const { data: monthlyGoal } = useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal", currentMonthKey],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-goal?month=${currentMonthKey}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  // Pre-fill IF-THEN on protect items from annual commitment (only empty fields, tracked via item marker)
  useEffect(() => {
    if (step === 8 && annualCommitment) {
      const plans = [annualCommitment.ifThenPlan1, annualCommitment.ifThenPlan2].filter(Boolean);
      if (plans.length > 0) {
        setItems(prev => {
          const needsPrefill = prev.some(item =>
            item.sortResult === "protect" && !item.ifThenStatement && !(item as any)._ifThenPrefilled
          );
          if (!needsPrefill) return prev;
          return prev.map(item => {
            if (item.sortResult !== "protect" || item.ifThenStatement || (item as any)._ifThenPrefilled) return item;
            const planIdx = prev.filter(i => i.sortResult === "protect" && i.id < item.id).length;
            if (planIdx >= plans.length) return { ...item, _ifThenPrefilled: true } as any;
            return { ...item, ifThenStatement: plans[planIdx]!, _ifThenPrefilled: true } as any;
          });
        });
      }
    }
  }, [step, annualCommitment]);

  // Unsaved guard
  useEffect(() => {
    const isDirty = step > 1 && items.length > 0;
    register("proof-engine", { isDirty, message: "You have an in-progress weekly plan. Leaving will lose your progress." });
    return () => unregister("proof-engine");
  }, [step, items.length, register, unregister]);

  // Derived lists
  const classifiedItems = items.map(item => {
    const derived = classifyItem(item);
    const wasManuallyMoved = item.sortResult !== null && item.sortResult !== derived &&
      item.classifyGoalMove !== null && item.classifyIgnore7Days !== null && item.classifyBlocker !== null;
    const result = wasManuallyMoved ? item.sortResult! : derived;
    return {
      ...item,
      sortResult: result,
      sortPriority: wasManuallyMoved ? (item.sortPriority ?? 99) : computeSortPriority(item),
    };
  });

  const handleItems = classifiedItems.filter(i => i.sortResult === "handle").sort((a, b) => (a.sortPriority ?? 99) - (b.sortPriority ?? 99));
  const protectItems = classifiedItems.filter(i => i.sortResult === "protect").sort((a, b) => (a.sortPriority ?? 99) - (b.sortPriority ?? 99));
  const discardedItems = classifiedItems.filter(i => i.sortResult === "not_this_week");
  const allClassified = items.length > 0 && items.every(i =>
    i.classifyGoalMove !== null && i.classifyIgnore7Days !== null && i.classifyBlocker !== null
  );

  // Sprint milestone suggestions for BucketAndCap (Screen 3)
  const weekEndStr = format(addDays(weekStart, 6), "yyyy-MM-dd");
  const milestoneSuggestions = (() => {
    if (!monthlyGoal) return [];
    const suggestions: Array<{ key: string; text: string; note: string | null }> = [];
    if (monthlyGoal.milestone1Text && monthlyGoal.milestone1TargetWeek) {
      if (monthlyGoal.milestone1TargetWeek >= weekStartStr && monthlyGoal.milestone1TargetWeek <= weekEndStr) {
        suggestions.push({ key: "m1", text: monthlyGoal.milestone1Text, note: monthlyGoal.milestone1Note ?? null });
      }
    }
    if (monthlyGoal.milestone2Text && monthlyGoal.milestone2TargetWeek) {
      if (monthlyGoal.milestone2TargetWeek >= weekStartStr && monthlyGoal.milestone2TargetWeek <= weekEndStr) {
        suggestions.push({ key: "m2", text: monthlyGoal.milestone2Text, note: monthlyGoal.milestone2Note ?? null });
      }
    }
    // Filter out already-added items (case-insensitive) and dismissed suggestions
    return suggestions.filter(s => {
      const lower = s.text.toLowerCase().trim();
      return !dismissedMilestones.has(s.key) &&
        !items.some(i => i.text.toLowerCase().trim() === lower || i.outcome.toLowerCase().trim() === lower);
    });
  })();

  const acceptMilestone = (suggestion: { key: string; text: string }) => {
    // Classification fields must evaluate to "protect" via classifyItem():
    // goal="clearly" + ignore="important_nothing_breaks" + blocker!="nothing" → Protect
    const newItem: ProofItem = {
      ...createEmptyItem(nextId.current++, suggestion.text),
      sortResult: "protect",
      sortPriority: 1,
      classifyGoalMove: "clearly",
      classifyIgnore7Days: "important_nothing_breaks",
      classifyBlocker: "unclear_next_step",
      sprintMilestone: true,
    };
    setItems(prev => [...prev, newItem]);
    // Array.from needed: TS target doesn't support Set spread without --downlevelIteration
    setDismissedMilestones(prev => { const next = new Set(Array.from(prev)); next.add(suggestion.key); return next; });
  };

  const dismissMilestone = (key: string) => {
    setDismissedMilestones(prev => { const next = new Set(Array.from(prev)); next.add(key); return next; });
  };

  // Step 5 — find next unclassified item
  const sortItemIdx = (() => {
    if (badgeItemId !== null) {
      const idx = items.findIndex(i => i.id === badgeItemId);
      if (idx >= 0) return idx;
    }
    for (let i = 0; i < items.length; i++) {
      if (items[i].classifyGoalMove === null || items[i].classifyIgnore7Days === null || items[i].classifyBlocker === null) {
        return i;
      }
    }
    return null;
  })();

  // Week days for scheduling
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { date: format(d, "yyyy-MM-dd"), label: format(d, "EEE") };
  });

  // Handle + Protect scheduled one-by-one; Not This Week batched on final screen
  const committedItems = [...handleItems, ...protectItems];
  const allItemsScheduled = scheduleIdx >= committedItems.length;

  // --- Handlers ---

  const addItem = () => {
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    const parts = trimmed.split(",").map(s => s.trim()).filter(Boolean);
    const newItems = parts
      .filter(text => !items.some(i => i.text.toLowerCase() === text.toLowerCase()))
      .slice(0, MAX_BRAIN_DUMP - items.length)
      .map(text => createEmptyItem(nextId.current++, text));
    setItems(prev => [...prev, ...newItems]);
    setNewItemText("");
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateOutcome = (idx: number, outcome: string) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, outcome } : item));
  };

  const toggleHardTruth = (idx: number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, hardTruthRelated: !item.hardTruthRelated } : item));
  };

  const answerClassify = (idx: number, field: "classifyGoalMove" | "classifyIgnore7Days" | "classifyBlocker", value: string) => {
    setItems(prev => {
      const next = prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        if (updated.classifyGoalMove && updated.classifyIgnore7Days && updated.classifyBlocker) {
          updated.sortResult = classifyItem(updated);
          updated.sortPriority = computeSortPriority(updated);
        }
        return updated;
      });
      const updatedItem = next[idx];
      if (updatedItem.classifyGoalMove && updatedItem.classifyIgnore7Days && updatedItem.classifyBlocker) {
        setBadgeItemId(updatedItem.id);
        setTimeout(() => setBadgeItemId(null), 800);
      }
      return next;
    });
  };

  const moveItem = (itemId: number, newResult: SortResult) => {
    setItems(prev => prev.map(item => item.id !== itemId ? item : { ...item, sortResult: newResult }));
  };

  const resetClassification = () => {
    setItems(prev => prev.map(it => ({
      ...it,
      classifyGoalMove: null, classifyIgnore7Days: null, classifyBlocker: null,
      sortResult: null, sortPriority: null,
    })));
    setNudgeChecked(false);
    setNudgeMessage(null);
  };

  const swapHandleItem = (itemId: number, direction: "up" | "down") => {
    // Build current display order: user-set sequenceOrder, or suggested order
    const hasUserOrder = handleItems.some(i => i.sequenceOrder !== null);
    const ordered = hasUserOrder
      ? [...handleItems].sort((a, b) => (a.sequenceOrder ?? 99) - (b.sequenceOrder ?? 99))
      : suggestSequence(handleItems).map(s => s.item);

    const currentIdx = ordered.findIndex(i => i.id === itemId);
    if (currentIdx < 0) return;
    const targetIdx = direction === "up" ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= ordered.length) return;

    // Swap positions
    const swapped = [...ordered];
    [swapped[currentIdx], swapped[targetIdx]] = [swapped[targetIdx], swapped[currentIdx]];

    // Write sequenceOrder to all handle items
    setItems(prev => {
      const next = [...prev];
      swapped.forEach((item, i) => {
        const idx = next.findIndex(it => it.id === item.id);
        if (idx >= 0) next[idx] = { ...next[idx], sequenceOrder: i };
      });
      return next;
    });
  };

  const toggleScheduledDay = (idx: number, date: string) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const dates = item.scheduledDates.includes(date)
        ? item.scheduledDates.filter(d => d !== date)
        : item.scheduledDates.length >= MAX_DAYS_PER_ITEM ? item.scheduledDates : [...item.scheduledDates, date];
      return { ...item, scheduledDates: dates };
    }));
  };

  const updateScheduleField = (idx: number, field: string, value: string) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const onOpeningChange = (field: keyof OpeningData, value: string) => {
    setOpeningData(prev => ({ ...prev, [field]: value }));
  };

  // Pattern nudge check (AI-powered)
  const checkPatternNudge = async () => {
    if (nudgeChecked) return;
    setNudgeLoading(true);
    try {
      const chosenItems = [...handleItems, ...protectItems].map(i => i.outcome || i.text);
      const res = await apiRequest("POST", "/api/eisenhower/pattern-check", {
        items: chosenItems,
        hardAction: openingData.openHardAction,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.nudgeNeeded) {
          setNudgeMessage(data.nudgeMessage);
        }
      }
    } catch {
      // Silently fail — nudge is non-critical
    } finally {
      setNudgeLoading(false);
      setNudgeChecked(true);
    }
  };

  // Commit mutation
  const commitMutation = useMutation({
    mutationFn: async () => {
      const allOrderedForCommit = [...handleItems, ...protectItems, ...discardedItems];
      const commitItems = allOrderedForCommit.map((item, i) => {
        const originalItem = items.find(it => it.id === item.id)!;
        const groupId = generateGroupId();
        const quadrant = item.sortResult === "handle" ? "q1" : item.sortResult === "protect" ? "q2" : "q4";

        return {
          task: originalItem.outcome || originalItem.text,
          quadrant: quadrant as "q1" | "q2" | "q4",
          sortOrder: i,
          groupId,
          scheduledDates: originalItem.scheduledDates.length > 0 ? originalItem.scheduledDates
            : quadrant === "q4" ? [weekDays[0].date] // Not-this-week items get a placeholder date
            : [weekDays[0].date],
          scheduledStartTime: originalItem.scheduledStartTime || null,
          scheduledEndTime: originalItem.scheduledEndTime || null,
          firstMove: originalItem.firstMove || null,
          sortImportance: originalItem.classifyGoalMove === "no" ? "not_really" : originalItem.classifyGoalMove,
          sortConsequence: originalItem.classifyIgnore7Days,
          sortBlocker: originalItem.classifyBlocker,
          sortResult: item.sortResult as "handle" | "protect" | "not_this_week",
          sortPriority: item.sortPriority ?? 99,
          outcome: originalItem.outcome || null,
          hardTruthRelated: originalItem.hardTruthRelated || false,
          sequenceOrder: originalItem.sequenceOrder ?? null,
          sequenceReason: null,
          ifThenStatement: originalItem.ifThenStatement || null,
          revisitDate: originalItem.revisitDate || null,
          proofBucket: item.sortResult || null,
        };
      });

      const body = {
        weekStart: weekStartStr,
        items: commitItems,
        openingData: {
          patternPullBack: openingData.patternPullBack || null,
          openStory: openingData.openStory || null,
          openHardTruth: openingData.openHardTruth || null,
          openHardAction: openingData.openHardAction || null,
        },
      };

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
      setLocation("/week");
    },
    onError: (error: Error) => {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
    },
  });

  // Navigation
  const canNext = (() => {
    switch (step) {
      case 1: return true; // Close last week — always can proceed
      case 2: return true; // Opening questions — optional
      case 3: return items.length >= 1;
      case 4: return items.length >= 1; // At least 1 outcome
      case 5: return allClassified;
      case 6: return handleItems.length <= MAX_Q1 && protectItems.length <= MAX_Q2 && (handleItems.length + protectItems.length) > 0;
      case 7: return handleItems.length > 0; // Sequence step
      case 8: {
        if (!allItemsScheduled) {
          const currentItem = committedItems[scheduleIdx];
          if (!currentItem) return false;
          const orig = items.find(it => it.id === currentItem.id);
          if (!orig) return false;
          return orig.firstMove.trim().length > 0 && orig.scheduledDates.length >= 1;
        }
        return !commitMutation.isPending;
      }
      default: return false;
    }
  })();

  const goNext = () => {
    if (step === 8 && !allItemsScheduled) {
      setScheduleIdx(s => s + 1);
      return;
    }
    if (step === 8 && allItemsScheduled) {
      commitMutation.mutate();
      return;
    }
    if (step === 6 && !nudgeChecked) {
      checkPatternNudge();
    }
    if (step === 7) {
      setScheduleIdx(0);
    }
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  };

  const goBack = () => {
    if (step === 8 && scheduleIdx > 0) {
      setScheduleIdx(s => s - 1);
      return;
    }
    if (step === 8 && allItemsScheduled) {
      setScheduleIdx(committedItems.length - 1);
      return;
    }
    setStep(s => Math.max(s - 1, 1));
  };

  const currentScreen = stepToScreen(step);
  const progressPercent = Math.round((currentScreen / VISIBLE_SCREENS) * 100);

  return (
    <AppLayout>
      <FlowBar fallback="/week" />

      {/* Progress bar — shows 4 visible screens */}
      <div className="container mx-auto px-4 pt-4">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-1 text-right">
          {SCREEN_LABELS[currentScreen - 1]} &middot; Step {currentScreen} of {VISIBLE_SCREENS}
        </p>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-lg">
        {/* Screen 1 — Review */}
        {step === 1 && (
          <div className="space-y-6">
            {weeklyProofBehaviorName && (
              <div className="rounded-lg border-l-4 border-l-primary/60 bg-primary/[0.04] px-4 py-3" data-testid="weekly-proof-behavior-review">
                <p className="text-xs font-medium text-muted-foreground">Weekly proof behavior</p>
                <p className="text-sm font-medium">{weeklyProofBehaviorName}</p>
              </div>
            )}
            <StepCloseLastWeek
              closeWeekData={closeWeekData ?? null}
              isLoading={closeWeekLoading}
              openingData={openingData}
              onOpeningChange={onOpeningChange}
              weekLabel={weekLabel}
              planNextWeek={planNextWeek}
              onToggleWeek={setPlanNextWeek}
              hasExistingPlan={hasExistingPlan}
            />
            {avoidanceLoopStory && (
              <div className="rounded-lg bg-muted/30 px-4 py-3 opacity-60" data-testid="avoidance-loop-reference">
                <p className="text-xs font-medium text-muted-foreground mb-1">Your avoidance loop</p>
                <p className="text-xs italic text-muted-foreground">{avoidanceLoopStory}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Open This Week */}
        {step === 2 && (
          <StepOpenThisWeek openingData={openingData} onOpeningChange={onOpeningChange} />
        )}

        {/* Step 3 — Brain Dump */}
        {step === 3 && (
          <StepBrainDump
            items={items}
            newItemText={newItemText}
            onNewItemTextChange={setNewItemText}
            onAddItem={addItem}
            onRemoveItem={removeItem}
          />
        )}

        {/* Step 4 — Convert to Outcomes */}
        {step === 4 && (
          <StepConvertOutcomes
            items={items}
            openingData={openingData}
            onUpdateOutcome={updateOutcome}
            onRemoveItem={removeItem}
            onToggleHardTruth={toggleHardTruth}
            showSoftCapWarning={items.length > SOFT_CAP}
          />
        )}

        {/* Step 5 — Classify */}
        {step === 5 && (
          <StepClassify
            items={items}
            sortItemIdx={sortItemIdx}
            badgeItemId={badgeItemId}
            allClassified={allClassified}
            onAnswer={answerClassify}
          />
        )}

        {/* Step 6 — Bucket and Cap */}
        {step === 6 && (
          <StepBucketAndCap
            handleItems={handleItems}
            protectItems={protectItems}
            discardedItems={discardedItems}
            onMoveItem={moveItem}
            onResetClassification={resetClassification}
            nudgeMessage={nudgeMessage}
            nudgeLoading={nudgeLoading}
            onNudgeDismiss={() => setNudgeMessage(null)}
            milestoneSuggestions={milestoneSuggestions}
            onAcceptMilestone={acceptMilestone}
            onDismissMilestone={dismissMilestone}
          />
        )}

        {/* Step 7 — Sequence Handle */}
        {step === 7 && (
          <StepSequenceHandle
            handleItems={handleItems}
            onSwap={swapHandleItem}
          />
        )}

        {/* Step 8 — Attach Triggers */}
        {step === 8 && (
          <StepAttachTriggers
            allItems={items}
            handleItems={handleItems}
            protectItems={protectItems}
            discardedItems={discardedItems}
            weekDays={weekDays}
            scheduleIdx={scheduleIdx}
            allItemsScheduled={allItemsScheduled}
            onToggleDay={toggleScheduledDay}
            onUpdateField={updateScheduleField}
            commitPending={commitMutation.isPending}
            commitError={commitMutation.isError ? commitMutation.error.message : null}
          />
        )}

        {/* Navigation */}
        {step >= 1 && (
          <div className="flex justify-between items-center mt-8 pt-4 border-t">
            {step > 1 ? (
              <Button variant="ghost" className="min-h-[44px]" onClick={goBack} data-testid="button-back">
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
            ) : <div />}
            <Button
              className="min-h-[44px]"
              onClick={goNext}
              disabled={!canNext || (step === 8 && allItemsScheduled && commitMutation.isPending)}
              data-testid="button-next"
            >
              {step === 8 && allItemsScheduled ? (
                commitMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Commit"
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
