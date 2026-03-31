import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { VoiceTextarea } from "@/components/voice-input";
import { Moon, AlertTriangle, Power, MinusCircle, ChevronDown, Sparkles } from "lucide-react";
import {
  APPRAISALS, EMOTIONS, URGES, ACTIONS, BODY_STATES, RECOVERY_TIMES,
  Chip, IntensityDots,
} from "@/components/tools/trigger-chips";
import type { EveningContent } from "@/pages/journal-entry";

const SKIP_CHIPS = ["Forgot", "Planning error", "De-prioritized", "Didn't have the energy", "Avoided it"];
const POSITIVE_INPUTS = ["Sleep", "Exercise", "Progress", "People", "Environment", "Mindset", "Other"];
const POSITIVE_STATES = ["Calm", "Energy", "Focus", "Confidence", "Connection", "Joy", "Other"];
const POSITIVE_DOWNSTREAMS = ["Habits", "Work", "Hard conversation", "Rest", "Planning", "Other"];

interface EveningJournalProps {
  eveningData: EveningContent;
  updateEvening: (field: keyof EveningContent, value: string) => void;
  updateEveningField: <K extends keyof EveningContent>(field: K, value: EveningContent[K]) => void;
  toggleEveningChip: (field: "triggerAppraisal" | "triggerBodyState", val: string) => void;
  setEveningData: React.Dispatch<React.SetStateAction<EveningContent>>;
  journalMode: "quick" | "full";
  skippedItems: Array<{ id: string; name: string; type: "habit" | "eisenhower" }>;
  identityStatement: string;
}

function IdentityContext({ identityStatement }: { identityStatement: string }) {
  if (!identityStatement) return null;
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3" data-testid="identity-context">
      <p className="text-sm text-muted-foreground italic">{identityStatement}</p>
    </div>
  );
}

export function EveningJournal({
  eveningData,
  updateEvening,
  updateEveningField,
  toggleEveningChip,
  setEveningData,
  journalMode,
  skippedItems,
  identityStatement,
}: EveningJournalProps) {
  return (
    <div className="space-y-6">
      {journalMode === "quick" ? (
        /* Evening Quick Mode */
        <>
          <Card data-testid="card-quick-evening">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Moon className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <CardTitle className="text-sm">Quick Close</CardTitle>
                  <CardDescription>15-second evening check-in</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">How was today overall?</Label>
                <div className="flex items-center justify-center gap-3" data-testid="quick-rating">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const selected = eveningData.quickRating === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => updateEveningField("quickRating", selected ? null : n)}
                        className={`h-10 w-10 rounded-full border-2 text-sm font-bold transition-all cursor-pointer ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground scale-110"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                        data-testid={`button-quick-rating-${n}`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground px-1">
                  <span>Rough</span>
                  <span>Great</span>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">One thing to remember</Label>
                <Input
                  value={eveningData.quickRemember}
                  onChange={(e) => updateEvening("quickRemember", e.target.value)}
                  placeholder="Today I learned..."
                  data-testid="input-quick-remember"
                />
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        /* Evening Full Mode */
        <>
          {/* Section 0 — Skipped Today (conditional) */}
          {skippedItems.length > 0 && (
            <Card data-testid="card-skipped-today">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                    <MinusCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Skipped today</CardTitle>
                    <CardDescription>Quick check — what got in the way? <Badge variant="outline" className="ml-2 text-xs">Optional</Badge></CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {skippedItems.map((item) => (
                  <div key={item.id} className="space-y-1.5" data-testid={`skipped-item-${item.id}`}>
                    <p className="text-xs font-medium">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">What most got in the way?</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SKIP_CHIPS.map((chip) => {
                        const selected = eveningData.skipReasons[item.id] === chip;
                        return (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => {
                              setEveningData(prev => ({
                                ...prev,
                                skipReasons: {
                                  ...prev.skipReasons,
                                  [item.id]: selected ? "" : chip,
                                },
                              }));
                            }}
                            className={`rounded-full px-3 py-1 text-xs border transition-colors cursor-pointer ${
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground hover:border-primary/40"
                            }`}
                            data-testid={`skip-chip-${item.id}-${chip.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            {chip}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Section 1 — What got in the way? */}
          <Card data-testid="card-trigger-check">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-md bg-amber-500/[0.08] flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-sm">What got in the way?</CardTitle>
                  <CardDescription>Optional — log triggers from today</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 1. What happened */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">What happened?</Label>
                <Input
                  value={eveningData.triggerText}
                  onChange={(e) => updateEvening("triggerText", e.target.value)}
                  placeholder="Brief description of the situation"
                  className="text-sm"
                  data-testid="input-journal-trigger-text"
                />
              </div>

              {eveningData.triggerText.trim() && (
                <>
                  {/* 2. This felt like... */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">This felt like...</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {APPRAISALS.map((a) => (
                        <Chip
                          key={a}
                          label={a}
                          selected={eveningData.triggerAppraisal.includes(a)}
                          onClick={() => toggleEveningChip("triggerAppraisal", a)}
                        />
                      ))}
                    </div>
                    {eveningData.triggerAppraisal.includes("Other") && (
                      <Input
                        value={eveningData.triggerAppraisalOther}
                        onChange={(e) => updateEvening("triggerAppraisalOther", e.target.value)}
                        placeholder="Describe..."
                        className="text-sm mt-1.5"
                      />
                    )}
                  </div>

                  {/* 3. Emotion + intensity */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Emotion</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {EMOTIONS.map((e) => (
                        <Chip
                          key={e}
                          label={e}
                          selected={eveningData.triggerEmotion === e}
                          onClick={() => updateEvening("triggerEmotion", eveningData.triggerEmotion === e ? "" : e)}
                        />
                      ))}
                    </div>
                    {eveningData.triggerEmotion && (
                      <IntensityDots
                        value={eveningData.triggerEmotionIntensity}
                        onChange={(n) => updateEveningField("triggerEmotionIntensity", n)}
                        testIdPrefix="journal-emotion-intensity"
                      />
                    )}
                    {eveningData.triggerEmotion === "Other" && (
                      <Input
                        value={eveningData.triggerEmotionOther}
                        onChange={(e) => updateEvening("triggerEmotionOther", e.target.value)}
                        placeholder="Describe..."
                        className="text-sm mt-1.5"
                      />
                    )}
                  </div>

                  {/* 4. Urge + intensity */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Urge</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {URGES.map((u) => (
                        <Chip
                          key={u}
                          label={u}
                          selected={eveningData.triggerUrge === u}
                          onClick={() => updateEvening("triggerUrge", eveningData.triggerUrge === u ? "" : u)}
                        />
                      ))}
                    </div>
                    {eveningData.triggerUrge && (
                      <IntensityDots
                        value={eveningData.triggerUrgeIntensity}
                        onChange={(n) => updateEveningField("triggerUrgeIntensity", n)}
                        testIdPrefix="journal-urge-intensity"
                      />
                    )}
                    {eveningData.triggerUrge === "Other" && (
                      <Input
                        value={eveningData.triggerUrgeOther}
                        onChange={(e) => updateEvening("triggerUrgeOther", e.target.value)}
                        placeholder="Describe..."
                        className="text-sm mt-1.5"
                      />
                    )}
                  </div>

                  {/* 5. What did you do? */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">What did you do?</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {ACTIONS.map((a) => (
                        <Chip
                          key={a}
                          label={a}
                          selected={eveningData.triggerAction === a}
                          onClick={() => updateEvening("triggerAction", eveningData.triggerAction === a ? "" : a)}
                        />
                      ))}
                    </div>
                    {eveningData.triggerAction === "Other" && (
                      <Input
                        value={eveningData.triggerActionOther}
                        onChange={(e) => updateEvening("triggerActionOther", e.target.value)}
                        placeholder="Describe..."
                        className="text-sm mt-1.5"
                      />
                    )}
                  </div>

                  {/* Tier 2 expand */}
                  {!eveningData.triggerShowTier2 && (
                    <button
                      type="button"
                      onClick={() => updateEveningField("triggerShowTier2", true)}
                      className="flex items-center justify-center gap-1 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                    >
                      Add more detail
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  )}

                  {/* Tier 2 — Enrichment */}
                  {eveningData.triggerShowTier2 && (
                    <div className="space-y-4 pt-2 border-t border-border">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">What did you feel in your body?</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {BODY_STATES.map((b) => (
                            <Chip
                              key={b}
                              label={b}
                              selected={eveningData.triggerBodyState.includes(b)}
                              onClick={() => toggleEveningChip("triggerBodyState", b)}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-sm font-medium">What happened right after?</Label>
                        <Input
                          value={eveningData.triggerOutcome}
                          onChange={(e) => updateEvening("triggerOutcome", e.target.value)}
                          placeholder="Brief description..."
                          className="text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">How long until you felt calm?</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {RECOVERY_TIMES.map((r) => (
                            <Chip
                              key={r}
                              label={r}
                              selected={eveningData.triggerRecoveryTime === r}
                              onClick={() => updateEvening("triggerRecoveryTime", eveningData.triggerRecoveryTime === r ? "" : r)}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-sm font-medium">
                          Reflection <span className="text-xs text-muted-foreground">(optional)</span>
                        </Label>
                        <VoiceTextarea
                          value={eveningData.triggerReflection}
                          onChange={(val) => updateEvening("triggerReflection", val)}
                          placeholder="Any insight about this pattern?"
                          className="min-h-[60px] resize-none"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {!eveningData.triggerText.trim() && (
                <p className="text-xs text-muted-foreground">No trigger? That's a win — skip this section.</p>
              )}
            </CardContent>
          </Card>

          {/* Section 2 — What went well today? */}
          <Card data-testid="card-positive-pattern">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-md bg-emerald-500/[0.08] flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-sm">What went well today?</CardTitle>
                  <CardDescription>Capture what worked and why</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <IdentityContext identityStatement={identityStatement} />

              <div className="space-y-2">
                <Label className="text-sm font-medium">What went well today?</Label>
                <VoiceTextarea
                  value={eveningData.positiveEvent}
                  onChange={(val) => updateEvening("positiveEvent", val)}
                  placeholder="Something that worked, felt good, or moved things forward..."
                  className="min-h-[80px] max-h-[120px] resize-none"
                  data-testid="input-positive-event"
                />
              </div>

              {/* Mechanistic chain — behind "Add more detail" */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">What helped most?</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {POSITIVE_INPUTS.map((opt) => (
                      <Chip
                        key={opt}
                        label={opt}
                        selected={eveningData.positiveInput === opt}
                        onClick={() => updateEvening("positiveInput", eveningData.positiveInput === opt ? "" : opt)}
                      />
                    ))}
                  </div>
                  {eveningData.positiveInput === "Other" && (
                    <Input
                      value={eveningData.positiveInputOther}
                      onChange={(e) => updateEvening("positiveInputOther", e.target.value)}
                      placeholder="Describe..."
                      className="text-sm mt-1.5"
                    />
                  )}
                </div>

                {!eveningData.positiveShowDetail && (
                  <button
                    type="button"
                    onClick={() => updateEveningField("positiveShowDetail", true)}
                    className="flex items-center justify-center gap-1 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    Add more detail
                    <ChevronDown className="h-3 w-3" />
                  </button>
                )}

                {eveningData.positiveShowDetail && (
                  <div className="space-y-4 pt-2 border-t border-border">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">What state did it create?</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {POSITIVE_STATES.map((opt) => (
                          <Chip
                            key={opt}
                            label={opt}
                            selected={eveningData.positiveState === opt}
                            onClick={() => updateEvening("positiveState", eveningData.positiveState === opt ? "" : opt)}
                          />
                        ))}
                      </div>
                      {eveningData.positiveState === "Other" && (
                        <Input
                          value={eveningData.positiveStateOther}
                          onChange={(e) => updateEvening("positiveStateOther", e.target.value)}
                          placeholder="Describe..."
                          className="text-sm mt-1.5"
                        />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">What did it make easier next?</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {POSITIVE_DOWNSTREAMS.map((opt) => (
                          <Chip
                            key={opt}
                            label={opt}
                            selected={eveningData.positiveDownstream === opt}
                            onClick={() => updateEvening("positiveDownstream", eveningData.positiveDownstream === opt ? "" : opt)}
                          />
                        ))}
                      </div>
                      {eveningData.positiveDownstream === "Other" && (
                        <Input
                          value={eveningData.positiveDownstreamOther}
                          onChange={(e) => updateEvening("positiveDownstreamOther", e.target.value)}
                          placeholder="Describe..."
                          className="text-sm mt-1.5"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 5 — Shutdown */}
          <Card data-testid="card-shutdown">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Power className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">Shutdown</CardTitle>
                  <CardDescription>Close out your day</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Today was enough because:</Label>
                <VoiceTextarea
                  value={eveningData.shutdownEnough}
                  onChange={(val) => updateEvening("shutdownEnough", val)}
                  placeholder="Today was enough because..."
                  className="min-h-[60px] resize-none"
                  data-testid="input-shutdown-enough"
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
