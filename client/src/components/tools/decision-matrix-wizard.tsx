import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, X, Plus, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

const TOTAL_STEPS = 7;

const BLOCKER_CHIPS = [
  { value: "perfection_over_timeliness", label: "Perfection over timeliness" },
  { value: "permission_seeking", label: "Permission-seeking" },
  { value: "outsourcing_the_decision", label: "Outsourcing the decision" },
  { value: "shame_avoidance", label: "Shame avoidance" },
  { value: "fear", label: "Fear" },
];

interface DecisionMatrixWizardProps {
  weekStartStr: string;
  onClose: () => void;
  onSaved: () => void;
}

export function DecisionMatrixWizard({ weekStartStr, onClose, onSaved }: DecisionMatrixWizardProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  // Step 1
  const [fear, setFear] = useState("");
  // Step 2
  const [blocker, setBlocker] = useState<string | null>(null);
  // Step 3
  const [problemStatement, setProblemStatement] = useState("");
  const [constraints, setConstraints] = useState<string[]>([]);
  const [constraintInput, setConstraintInput] = useState("");
  const [successLooksLike, setSuccessLooksLike] = useState("");
  const [mustHaves, setMustHaves] = useState<string[]>([]);
  const [mustHaveInput, setMustHaveInput] = useState("");
  const [niceToHaves, setNiceToHaves] = useState<string[]>([]);
  const [niceInput, setNiceInput] = useState("");
  const [notAllowed, setNotAllowed] = useState<string[]>([]);
  const [notAllowedInput, setNotAllowedInput] = useState("");
  // Step 4
  const [solutions, setSolutions] = useState<string[]>([]);
  const [solutionInput, setSolutionInput] = useState("");
  // Step 5
  const [doorType, setDoorType] = useState<"reversible" | "irreversible" | null>(null);
  const [decisionStatement, setDecisionStatement] = useState("");
  // Step 6
  const [consultQuestion, setConsultQuestion] = useState("");
  // Step 7
  const [firstPhysicalStep, setFirstPhysicalStep] = useState("");

  const addToList = (list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void, max: number) => {
    const trimmed = input.trim();
    if (trimmed && list.length < max) {
      setList([...list, trimmed]);
      setInput("");
    }
  };

  const removeFromList = (list: string[], setList: (v: string[]) => void, idx: number) => {
    setList(list.filter((_, i) => i !== idx));
  };

  const canNext = (() => {
    switch (step) {
      case 0: return fear.trim().length > 0;
      case 1: return blocker !== null;
      case 2: return problemStatement.trim().length > 0;
      case 3: return solutions.length > 0;
      case 4: return doorType !== null && decisionStatement.trim().length > 0;
      case 5: return true; // optional
      case 6: return firstPhysicalStep.trim().length > 0;
      default: return false;
    }
  })();

  const [saveError, setSaveError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const res = await apiRequest("POST", "/api/decisions", {
        weekStart: weekStartStr,
        fear: fear.trim(),
        blocker,
        problemStatement: problemStatement.trim() || null,
        constraints: constraints.length > 0 ? JSON.stringify(constraints) : null,
        successLooksLike: successLooksLike.trim() || null,
        mustHaves: mustHaves.length > 0 ? JSON.stringify(mustHaves) : null,
        niceToHaves: niceToHaves.length > 0 ? JSON.stringify(niceToHaves) : null,
        notAllowed: notAllowed.length > 0 ? JSON.stringify(notAllowed) : null,
        noFearSolutions: solutions.length > 0 ? JSON.stringify(solutions) : null,
        doorType,
        decisionStatement: decisionStatement.trim() || null,
        consultQuestion: consultQuestion.trim() || null,
        firstPhysicalStep: firstPhysicalStep.trim(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/decisions"] });
      onSaved();
    } catch (e: any) {
      console.error("Failed to save decision:", e);
      setSaveError(e.message || "Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (step === TOTAL_STEPS - 1) {
      handleSave();
      return;
    }
    setStep(s => s + 1);
  };

  const goBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  return (
    <Card className="border-blue-200 dark:border-blue-900/40">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Decision Matrix</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-blue-500" : "bg-muted"}`} />
          ))}
        </div>

        {/* Step 1: Name the fear */}
        {step === 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Name the fear</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground shrink-0">I'm afraid of</span>
              <Input
                value={fear}
                onChange={e => setFear(e.target.value)}
                placeholder="making the wrong choice..."
                className="text-sm"
                autoFocus
                data-testid="input-decision-fear"
              />
            </div>
          </div>
        )}

        {/* Step 2: Find the block */}
        {step === 1 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">What is making this hard?</Label>
            <p className="text-xs text-muted-foreground">If any of these are "Yes" — that's the blocker, not the decision itself.</p>
            <div className="flex flex-wrap gap-2">
              {BLOCKER_CHIPS.map(chip => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setBlocker(blocker === chip.value ? null : chip.value)}
                  className={`rounded-full px-3 py-2 text-xs font-medium border transition-colors cursor-pointer min-h-[44px] ${
                    blocker === chip.value
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-border text-muted-foreground hover:border-blue-400"
                  }`}
                  data-testid={`chip-blocker-${chip.value}`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Focus on Solutions */}
        {step === 2 && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Focus on Solutions</Label>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Problem statement</label>
              <Textarea value={problemStatement} onChange={e => setProblemStatement(e.target.value)} placeholder="What exactly needs deciding?" rows={2} className="text-sm resize-none" data-testid="input-problem-statement" />
            </div>

            <ListInput label="Constraints" items={constraints} setItems={setConstraints} input={constraintInput} setInput={setConstraintInput} max={3} placeholder="e.g. Budget limit, timeline..." testId="constraints" />

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">What success looks like</label>
              <Input value={successLooksLike} onChange={e => setSuccessLooksLike(e.target.value)} placeholder="I'll know this worked if..." className="text-sm" data-testid="input-success" />
            </div>

            <ListInput label="Must-haves" items={mustHaves} setItems={setMustHaves} input={mustHaveInput} setInput={setMustHaveInput} max={3} placeholder="Non-negotiable..." testId="must-haves" />
            <ListInput label="Nice-to-haves" items={niceToHaves} setItems={setNiceToHaves} input={niceInput} setInput={setNiceInput} max={2} placeholder="Bonus..." testId="nice-to-haves" />
            <ListInput label="Not allowed" items={notAllowed} setItems={setNotAllowed} input={notAllowedInput} setInput={setNotAllowedInput} max={2} placeholder="Dealbreaker..." testId="not-allowed" />
          </div>
        )}

        {/* Step 4: What would I do if I wasn't scared? */}
        {step === 3 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">What would I do if I wasn't scared?</Label>
            <p className="text-xs text-muted-foreground">Based on what you defined, write up to 3 solutions.</p>
            {solutions.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">{i + 1}.</span>
                <span className="text-sm flex-1">{s}</span>
                <button onClick={() => removeFromList(solutions, setSolutions, i)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {solutions.length < 3 && (
              <div className="flex gap-2">
                <Input
                  value={solutionInput}
                  onChange={e => setSolutionInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addToList(solutions, setSolutions, solutionInput, setSolutionInput, 3)}
                  placeholder="A possible solution..."
                  className="text-sm"
                  data-testid="input-solution"
                />
                <Button size="icon" variant="outline" onClick={() => addToList(solutions, setSolutions, solutionInput, setSolutionInput, 3)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Decide */}
        {step === 4 && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">The two-way door rule</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDoorType("reversible")}
                className={`rounded-lg border p-3 text-left transition-colors ${doorType === "reversible" ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : "border-border"}`}
                data-testid="button-reversible"
              >
                <p className="text-xs font-medium">Reversible</p>
                <p className="text-[10px] text-muted-foreground">Decide now. "Good-enough, consistently." Aim 80-90%.</p>
              </button>
              <button
                onClick={() => setDoorType("irreversible")}
                className={`rounded-lg border p-3 text-left transition-colors ${doorType === "irreversible" ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : "border-border"}`}
                data-testid="button-irreversible"
              >
                <p className="text-xs font-medium">Irreversible</p>
                <p className="text-[10px] text-muted-foreground">Choose safety + clarity, but set a deadline to prevent rumination.</p>
              </button>
            </div>
            <p className="text-xs text-muted-foreground italic text-center">"Advice = input. Decision = mine."</p>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Write the decision as one sentence</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">I choose</span>
                <Input
                  value={decisionStatement}
                  onChange={e => setDecisionStatement(e.target.value)}
                  placeholder="to..."
                  className="text-sm"
                  data-testid="input-decision-statement"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Consult (optional) */}
        {step === 5 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Consult (optional)</Label>
            <p className="text-xs text-muted-foreground">You may ask one person (or ChatGPT) one focused question: "Any red flags I'm missing?" You are not asking them to choose.</p>
            <Textarea
              value={consultQuestion}
              onChange={e => setConsultQuestion(e.target.value)}
              placeholder="The specific question I'll ask..."
              rows={2}
              className="text-sm resize-none"
              data-testid="input-consult"
            />
            <p className="text-xs text-muted-foreground italic">This step is optional. Skip if you're ready to act.</p>
          </div>
        )}

        {/* Step 7: First physical step */}
        {step === 6 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Take the first physical step</Label>
            <p className="text-xs text-muted-foreground">You need "proof," not more thinking. This is the micro-move (&lt;2 min) — the antidote to rumination.</p>
            <Textarea
              value={firstPhysicalStep}
              onChange={e => setFirstPhysicalStep(e.target.value)}
              placeholder="Book / pay deposit / email / calendar hold / create the folder..."
              rows={2}
              className="text-sm resize-none"
              autoFocus
              data-testid="input-first-step"
            />
          </div>
        )}

        {saveError && (
          <p className="text-xs text-destructive text-center">{saveError}</p>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center pt-2 border-t">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="mr-1 h-3 w-3" /> Back
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          )}
          <Button size="sm" onClick={goNext} disabled={!canNext || saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? "Saving..." : step === TOTAL_STEPS - 1 ? (
              <><Check className="mr-1 h-3 w-3" /> Done</>
            ) : (
              <>Next <ArrowRight className="ml-1 h-3 w-3" /></>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper component for add/remove list fields
function ListInput({ label, items, setItems, input, setInput, max, placeholder, testId }: {
  label: string; items: string[]; setItems: (v: string[]) => void;
  input: string; setInput: (v: string) => void; max: number;
  placeholder: string; testId: string;
}) {
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && items.length < max) {
      setItems([...items, trimmed]);
      setInput("");
    }
  };
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">{label} ({items.length}/{max})</label>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="flex-1">{item}</span>
          <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {items.length < max && (
        <div className="flex gap-1.5">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            placeholder={placeholder}
            className="text-xs h-7"
            data-testid={`input-${testId}`}
          />
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={add}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
