import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { FlowBar } from "@/components/flow-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { format, startOfWeek } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { EisenhowerEntry, MonthlyGoal, IdentityDocument } from "@shared/schema";

const MAX_Q1 = 5;
const MAX_Q2 = 2;

type Alignment = "yes" | "somewhat" | "no" | "";
type Consequence = "real_soon" | "important_not_urgent" | "others_urgency" | "very_little" | "";

interface WizardItem {
  id?: number;
  task: string;
  quadrant: string;
  goalAlignment: Alignment;
  decision: Consequence;
  sortOrder: number;
  selected: boolean;
  blocksGoal: boolean;
}

function classifyQuadrant(alignment: Alignment, consequence: Consequence): string {
  if (alignment === "yes") {
    return consequence === "real_soon" ? "q1" : "q2";
  }
  if (alignment === "somewhat") {
    if (consequence === "real_soon") return "q1";
    if (consequence === "important_not_urgent") return "q2";
    if (consequence === "others_urgency") return "q3";
    return "q4";
  }
  // no
  if (consequence === "real_soon") return "q3";
  if (consequence === "very_little") return "q4";
  return "q3";
}

export default function EisenhowerPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [newItemText, setNewItemText] = useState("");
  const [items, setItems] = useState<WizardItem[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [commitSelected, setCommitSelected] = useState<Set<number>>(new Set());

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");

  const currentMonthKey = format(today, "yyyy-MM");
  const { data: monthlyGoal } = useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal", currentMonthKey],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-goal?month=${currentMonthKey}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
  const { data: identityDoc } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
  });
  const { data: existingEntries = [] } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower/week", weekStartStr],
  });

  // Pre-load existing items on step 1 if they exist for this week
  const initFromExisting = useCallback(() => {
    if (items.length === 0 && existingEntries.length > 0) {
      setItems(existingEntries.map((e, i) => ({
        id: e.id,
        task: e.task,
        quadrant: e.quadrant,
        goalAlignment: (e.goalAlignment as Alignment) || "",
        decision: (e.decision as Consequence) || "",
        sortOrder: e.sortOrder ?? i,
        selected: true,
        blocksGoal: e.blocksGoal || false,
      })));
    }
  }, [existingEntries, items.length]);

  const addItem = () => {
    const pieces = newItemText.split(",").map(s => s.trim()).filter(Boolean);
    if (pieces.length === 0) return;
    setItems(prev => [
      ...prev,
      ...pieces.map<WizardItem>((text, i) => ({
        task: text,
        quadrant: "unsorted",
        goalAlignment: "",
        decision: "",
        sortOrder: prev.length + i,
        selected: false,
        blocksGoal: false,
      })),
    ]);
    setNewItemText("");
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Step 2: select top 10
  const toggleSelect = (idx: number) => {
    setItems(prev => {
      const next = [...prev];
      const selectedCount = next.filter(i => i.selected).length;
      if (!next[idx].selected && selectedCount >= 10) return next;
      next[idx] = { ...next[idx], selected: !next[idx].selected };
      return next;
    });
  };

  // Step 3: drag reorder for gut rank
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next.map((item, i) => ({ ...item, sortOrder: i }));
    });
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  // Derived data
  const selectedItems = items.filter(i => i.selected);
  const unselectedItems = items.filter(i => !i.selected);
  const gutTop5 = selectedItems.slice(0, 5);

  // Step 6: classify all selected items, preserving original index
  const classifiedItems = selectedItems.map(item => {
    const originalIdx = items.indexOf(item);
    return {
      ...item,
      _originalIdx: originalIdx,
      quadrant: item.goalAlignment && item.decision
        ? classifyQuadrant(item.goalAlignment, item.decision)
        : "unsorted",
    };
  });

  const q1Items = classifiedItems.filter(i => i.quadrant === "q1");
  const q2Items = classifiedItems.filter(i => i.quadrant === "q2");
  const q3Items = classifiedItems.filter(i => i.quadrant === "q3");
  const q4Items = classifiedItems.filter(i => i.quadrant === "q4");
  const droppedItems = unselectedItems;

  // Check alignment between gut and values
  const valuesTopTasks = [...q1Items, ...q2Items].map(i => i.task);
  const gutTopTasks = gutTop5.map(i => i.task);
  const isAligned = gutTopTasks.length <= 5 &&
    gutTopTasks.filter(t => valuesTopTasks.includes(t)).length >= Math.min(3, gutTopTasks.length);

  // Step 7: commit Q2 items
  const commitQ2Items = q2Items;

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Enforce limits before saving
      if (q1Items.length > MAX_Q1) throw new Error(`Max ${MAX_Q1} urgent items per week. If everything is urgent, nothing is.`);
      if (q2Items.length > MAX_Q2) throw new Error(`Max ${MAX_Q2} important-but-not-urgent items per week. Focus on what matters most.`);

      // Mark dropped items as Q4
      const allItems = [
        ...classifiedItems,
        ...droppedItems.map(i => ({ ...i, quadrant: "q4" })),
      ];

      const quadrantToDecision: Record<string, string> = {
        q1: "do_today",
        q2: "schedule",
        q3: "delegate",
        q4: "delete",
      };

      for (const item of allItems) {
        const payload = {
          task: item.task,
          weekStart: weekStartStr,
          role: "",
          quadrant: item.quadrant,
          goalAlignment: item.goalAlignment || null,
          decision: quadrantToDecision[item.quadrant] || null,
          blocksGoal: item.blocksGoal,
          sortOrder: item.sortOrder,
          isBinary: false,
        };

        if (item.id) {
          const res = await apiRequest("PATCH", `/api/eisenhower/${item.id}`, payload);
          if (!res.ok) throw new Error("Failed to update entry");
        } else {
          const res = await apiRequest("POST", "/api/eisenhower", payload);
          if (!res.ok) throw new Error("Failed to create entry");
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower/week", weekStartStr] });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
    },
  });

  const q1OverLimit = q1Items.length > MAX_Q1;
  const q2OverLimit = q2Items.length > MAX_Q2;

  const canNext = () => {
    switch (step) {
      case 1: return items.length >= 3;
      case 2: return selectedItems.length >= 1 && selectedItems.length <= 10;
      case 3: return true;
      case 4: return selectedItems.every(i => i.goalAlignment !== "");
      case 5: return selectedItems.every(i => i.decision !== "");
      case 6: return !q1OverLimit && !q2OverLimit;
      case 7: return true;
      default: return false;
    }
  };

  // Auto-select all if ≤10 items on entering step 2
  const enterStep2 = () => {
    if (items.length <= 10) {
      setItems(prev => prev.map(i => ({ ...i, selected: true })));
    }
    setStep(2);
  };

  // On entering step 2, mark unselected as q4
  const enterStep3 = () => {
    setItems(prev => prev.map(i => i.selected ? i : { ...i, quadrant: "q4" }));
    setStep(3);
  };

  const goalDisplay = monthlyGoal?.goalWhat?.trim() || monthlyGoal?.goalStatement?.trim() || "";
  const identityStatement = identityDoc?.identity?.trim() || "";

  // Init from existing data when we first load
  if (step === 1 && items.length === 0 && existingEntries.length > 0) {
    initFromExisting();
  }

  return (
    <AppLayout>
      <FlowBar fallback="/plan" doneLabel="Done" />
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-sm font-medium mb-4" data-testid="text-this-week-title">This Week</h1>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-6" data-testid="step-indicator">
          {[1, 2, 3, 4, 5, 6, 7].map(s => (
            <div
              key={s}
              className={`h-2 w-2 rounded-full ${s === step ? "bg-primary" : s < step ? "bg-primary/50" : "bg-muted"}`}
            />
          ))}
        </div>

        {/* Step 1: Brain Dump */}
        {step === 1 && (
          <div className="space-y-4" data-testid="step-1">
            <div>
              <h2 className="text-sm font-medium">What's on your plate this week?</h2>
              <p className="text-xs text-muted-foreground">List everything — work, personal, obligations, things you've been putting off. Don't filter.</p>
            </div>
            <div className="flex gap-2">
              <Input
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
                placeholder="Add an item..."
                className="text-xs"
                data-testid="input-brain-dump"
                autoFocus
              />
              <Button size="sm" className="text-xs" onClick={addItem} data-testid="button-add-item">Add</Button>
            </div>
            <div className="space-y-1">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 py-1 px-2 rounded-md bg-muted/30" data-testid={`brain-dump-item-${idx}`}>
                  <span className="text-xs flex-1">{item.task}</span>
                  <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{items.length} items</p>
          </div>
        )}

        {/* Step 2: Pick Top 10 */}
        {step === 2 && (
          <div className="space-y-4" data-testid="step-2">
            <div>
              <h2 className="text-sm font-medium">Which of these actually matter this week?</h2>
              <p className="text-xs text-muted-foreground">Select the 10 that deserve your attention. Let the rest go.</p>
            </div>
            <div className="space-y-1">
              {items.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleSelect(idx)}
                  className={`w-full text-left flex items-center gap-2 py-1.5 px-2 rounded-md text-xs cursor-pointer ${
                    item.selected ? "bg-primary/10 border border-primary/30" : "bg-muted/30 border border-transparent"
                  }`}
                  data-testid={`select-item-${idx}`}
                >
                  <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
                    item.selected ? "bg-primary border-primary" : "border-border"
                  }`}>
                    {item.selected && <span className="text-primary-foreground text-[8px]">✓</span>}
                  </div>
                  {item.task}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">{selectedItems.length}/10 selected</p>
          </div>
        )}

        {/* Step 3: Gut Rank */}
        {step === 3 && (
          <div className="space-y-4" data-testid="step-3">
            <div>
              <h2 className="text-sm font-medium">If you could only do 5, which would they be?</h2>
              <p className="text-xs text-muted-foreground">Drag into your instinct order. Don't overthink it — go with your gut.</p>
            </div>
            <div className="space-y-1">
              {selectedItems.map((item, idx) => {
                const globalIdx = items.indexOf(item);
                const isTop5 = idx < 5;
                return (
                  <div
                    key={globalIdx}
                    draggable
                    onDragStart={() => handleDragStart(items.indexOf(item))}
                    onDragOver={(e) => handleDragOver(e, items.indexOf(item))}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 py-1.5 px-2 rounded-md text-xs cursor-grab active:cursor-grabbing ${
                      isTop5 ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-muted/30 opacity-60"
                    }`}
                    data-testid={`gut-rank-${idx}`}
                  >
                    <span className="text-muted-foreground w-4 text-center shrink-0">{idx + 1}</span>
                    <span className="flex-1">{item.task}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Alignment Check */}
        {step === 4 && (
          <div className="space-y-4" data-testid="step-4">
            <div>
              <h2 className="text-sm font-medium">Does this move you toward who you're becoming?</h2>
              <p className="text-xs text-muted-foreground">Check each item against your direction.</p>
            </div>

            {(identityStatement || goalDisplay) ? (
              <div className="border-l-[3px] border-l-[#6B4226] dark:border-l-[#A67B5B] bg-bark/5 rounded-r-md p-3 space-y-1">
                {identityStatement && <p className="text-xs italic">{identityStatement}</p>}
                {goalDisplay && <p className="text-xs text-muted-foreground">{goalDisplay}</p>}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Set these up in your Plan page first.</p>
            )}

            <div className="space-y-3">
              {selectedItems.map((item) => {
                const globalIdx = items.indexOf(item);
                return (
                  <div key={globalIdx} className="space-y-1" data-testid={`alignment-item-${globalIdx}`}>
                    <p className="text-xs font-medium">{item.task}</p>
                    <div className="flex gap-1.5">
                      {(["yes", "somewhat", "no"] as Alignment[]).map(val => (
                        <Button
                          key={val}
                          size="sm"
                          variant={item.goalAlignment === val ? "default" : "outline"}
                          className={`text-xs h-7 px-3 ${
                            item.goalAlignment === val
                              ? val === "yes" ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : val === "somewhat" ? "bg-amber-500 hover:bg-amber-600 text-white"
                              : "bg-gray-500 hover:bg-gray-600 text-white"
                              : ""
                          }`}
                          onClick={() => {
                            setItems(prev => {
                              const next = [...prev];
                              next[globalIdx] = { ...next[globalIdx], goalAlignment: val };
                              return next;
                            });
                          }}
                          data-testid={`alignment-${globalIdx}-${val}`}
                        >
                          {val === "yes" ? "Yes" : val === "somewhat" ? "Somewhat" : "No"}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 5: Urgency / Consequence Check */}
        {step === 5 && (
          <div className="space-y-4" data-testid="step-5">
            <div>
              <h2 className="text-sm font-medium">If this didn't get handled soon, what would happen?</h2>
            </div>

            <div className="space-y-4">
              {selectedItems.map((item) => {
                const globalIdx = items.indexOf(item);
                const options: { value: Consequence; label: string; sub: string }[] = [
                  { value: "real_soon", label: "Real consequence soon", sub: "Something breaks, someone's affected, I lose ground" },
                  { value: "important_not_urgent", label: "Important, no immediate consequence", sub: "Matters, but nothing urgent" },
                  { value: "others_urgency", label: "Mostly other people's urgency", sub: "Someone else cares more than I do" },
                  { value: "very_little", label: "Very little happens", sub: "Life goes on" },
                ];
                return (
                  <div key={globalIdx} className="space-y-1.5" data-testid={`consequence-item-${globalIdx}`}>
                    <p className="text-xs font-medium">{item.task}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {options.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setItems(prev => {
                              const next = [...prev];
                              next[globalIdx] = { ...next[globalIdx], decision: opt.value };
                              return next;
                            });
                          }}
                          className={`text-left p-2 rounded-md border text-xs cursor-pointer ${
                            item.decision === opt.value
                              ? "border-primary bg-primary/10 font-medium"
                              : "border-border hover:bg-muted"
                          }`}
                          data-testid={`consequence-${globalIdx}-${opt.value}`}
                        >
                          <p className="font-medium">{opt.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{opt.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 6: The Reveal */}
        {step === 6 && (
          <div className="space-y-4" data-testid="step-6">
            <div>
              <h2 className="text-sm font-medium">Here's what your week actually looks like.</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium mb-2">Your gut said</p>
                <ol className="space-y-1">
                  {gutTop5.map((item, idx) => (
                    <li key={idx} className="text-xs flex items-center gap-1.5" data-testid={`gut-reveal-${idx}`}>
                      <span className="text-muted-foreground w-4 text-center">{idx + 1}</span>
                      {item.task}
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="text-xs font-medium mb-2">Your values say</p>
                <div className="flex gap-3 mb-2">
                  <span className={`text-[10px] font-medium ${q1OverLimit ? "text-red-500" : "text-muted-foreground"}`} data-testid="q1-counter">
                    Q1: {q1Items.length}/{MAX_Q1}
                  </span>
                  <span className={`text-[10px] font-medium ${q2OverLimit ? "text-red-500" : "text-muted-foreground"}`} data-testid="q2-counter">
                    Q2: {q2Items.length}/{MAX_Q2}
                  </span>
                </div>
                <ul className="space-y-1">
                  {q1Items.map((item, idx) => (
                    <li key={`q1-${idx}`} className="text-xs flex items-center gap-1.5" data-testid={`values-q1-${idx}`}>
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      {item.task}
                    </li>
                  ))}
                  {q2Items.map((item, idx) => (
                    <li key={`q2-${idx}`} className="text-xs flex items-center gap-1.5" data-testid={`values-q2-${idx}`}>
                      <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      {item.task}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {(q1OverLimit || q2OverLimit) && (
              <div className="rounded-md bg-red-500/10 border border-red-500/30 p-3" data-testid="limit-warning">
                {q2OverLimit && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Max {MAX_Q2} important-but-not-urgent items per week. Focus on what matters most.
                  </p>
                )}
                {q1OverLimit && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Max {MAX_Q1} urgent items per week. If everything is urgent, nothing is.
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">Go back to change your answers, or remove items.</p>
              </div>
            )}

            <div className="border-l-[3px] border-l-[#6B4226] dark:border-l-[#A67B5B] bg-bark/5 rounded-r-md p-3">
              <p className="text-xs">
                {isAligned
                  ? "Your instincts are well-aligned this week."
                  : "Notice the gap. The things you'd do by instinct aren't always the things that move your life forward."}
              </p>
            </div>

            {q3Items.length > 0 && (
              <details className="text-xs">
                <summary className="text-muted-foreground cursor-pointer">Handle but minimize ({q3Items.length})</summary>
                <ul className="mt-1 space-y-0.5 pl-4">
                  {q3Items.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-1.5" data-testid={`q3-item-${idx}`}>
                      <span className="h-2 w-2 rounded-full bg-gray-400 shrink-0" />
                      {item.task}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {(q4Items.length > 0 || droppedItems.length > 0) && (
              <details className="text-xs">
                <summary className="text-muted-foreground cursor-pointer">Consider dropping ({q4Items.length + droppedItems.length})</summary>
                <ul className="mt-1 space-y-0.5 pl-4">
                  {[...q4Items, ...droppedItems].map((item, idx) => {
                    const globalIdx = '_originalIdx' in item ? (item as any)._originalIdx as number : items.indexOf(item);
                    return (
                      <li key={idx} className="flex items-center gap-1.5" data-testid={`q4-item-${idx}`}>
                        <span className="h-2 w-2 rounded-full bg-red-400/60 shrink-0" />
                        <span className="flex-1 text-muted-foreground">{item.task}</span>
                        <button
                          onClick={() => removeItem(globalIdx)}
                          className="text-red-400 hover:text-red-600 cursor-pointer"
                          data-testid={`remove-q4-${idx}`}
                        >
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </details>
            )}
          </div>
        )}

        {/* Step 7: Commit */}
        {step === 7 && (
          <div className="space-y-4" data-testid="step-7">
            <div>
              <h2 className="text-sm font-medium">Mark your focus blocks for this week.</h2>
              <p className="text-xs text-muted-foreground">Toggle which Q2 items you'll protect time for.</p>
            </div>

            {commitQ2Items.length > 0 ? (
              <div className="space-y-1.5">
                {commitQ2Items.map((item, idx) => {
                  const globalIdx = item._originalIdx;
                  const isSelected = commitSelected.has(globalIdx);
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCommitSelected(prev => {
                          const next = new Set(prev);
                          if (isSelected) next.delete(globalIdx);
                          else next.add(globalIdx);
                          return next;
                        });
                        setItems(prev => {
                          const next = [...prev];
                          next[globalIdx] = { ...next[globalIdx], blocksGoal: !isSelected };
                          return next;
                        });
                      }}
                      className={`w-full text-left p-3 rounded-md border-2 text-xs cursor-pointer ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-border hover:border-primary/40"
                      }`}
                      data-testid={`commit-q2-${idx}`}
                    >
                      <p className="font-medium">{item.task}</p>
                      {isSelected && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          This will show on your dashboard all week.
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No Q2 items to commit. Your week is focused on urgent tasks.</p>
            )}

            <p className="text-xs text-muted-foreground text-center">These will show on your dashboard all week.</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          {step > 1 ? (
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setStep(s => s - 1)} data-testid="button-back">
              Back
            </Button>
          ) : <div />}

          {step < 7 ? (
            <Button
              size="sm"
              className="text-xs"
              disabled={!canNext()}
              onClick={() => {
                if (step === 1) enterStep2();
                else if (step === 2) enterStep3();
                else setStep(s => s + 1);
              }}
              data-testid="button-next"
            >
              Next
            </Button>
          ) : (
            <Button
              size="sm"
              className="text-xs"
              onClick={() => {
                // Mark Q1 items as active + committed Q2 items
                setItems(prev => prev.map(item => {
                  const q = item.goalAlignment && item.decision
                    ? classifyQuadrant(item.goalAlignment, item.decision)
                    : item.quadrant;
                  return { ...item, quadrant: q };
                }));
                saveMutation.mutate();
              }}
              disabled={saveMutation.isPending}
              data-testid="button-done"
            >
              {saveMutation.isPending ? "Saving..." : "Done"}
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
