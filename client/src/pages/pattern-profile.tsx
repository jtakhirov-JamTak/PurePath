import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { FlowBar } from "@/components/flow-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { VoiceTextarea } from "@/components/voice-input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Save, AlertTriangle, ChevronDown } from "lucide-react";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";
import type { PatternProfile } from "@shared/schema";

function CollapsibleSection({ title, filled, children, defaultOpen = false, testId }: {
  title: string; filled: boolean; children: React.ReactNode; defaultOpen?: boolean; testId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="space-y-4" data-testid={testId}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-1 group"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          {filled && <span className="h-2 w-2 rounded-full bg-primary" />}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && children}
    </section>
  );
}

// All text fields on patternProfiles
const TEXT_FIELDS = [
  "helpingPattern1Condition", "helpingPattern1Behavior", "helpingPattern1Impact", "helpingPattern1Outcome",
  "helpingPattern2Condition", "helpingPattern2Behavior", "helpingPattern2Impact", "helpingPattern2Outcome",
  "helpingPattern3Condition", "helpingPattern3Behavior", "helpingPattern3Impact", "helpingPattern3Outcome",
  "hurtingPattern1Condition", "hurtingPattern1Behavior", "hurtingPattern1Impact", "hurtingPattern1Outcome",
  "hurtingPattern2Condition", "hurtingPattern2Behavior", "hurtingPattern2Impact", "hurtingPattern2Outcome",
  "hurtingPattern3Condition", "hurtingPattern3Behavior", "hurtingPattern3Impact", "hurtingPattern3Outcome",
  "repeatingLoopStory", "repeatingLoopAvoidance", "repeatingLoopCost",
  "triggerPatternTrigger", "triggerPatternInterpretation", "triggerPatternEmotion",
  "triggerPatternUrge", "triggerPatternBehavior", "triggerPatternOutcome",
  "blindSpot1Pattern", "blindSpot1Outcome",
  "blindSpot2Pattern", "blindSpot2Outcome",
  "blindSpot3Pattern", "blindSpot3Outcome",
] as const;

type FieldKey = typeof TEXT_FIELDS[number];
type FormState = Record<FieldKey, string>;

function emptyForm(): FormState {
  const obj = {} as FormState;
  for (const key of TEXT_FIELDS) obj[key] = "";
  return obj;
}

function formFromProfile(p: PatternProfile): FormState {
  const obj = {} as FormState;
  for (const key of TEXT_FIELDS) obj[key] = (p as any)[key] || "";
  return obj;
}

export default function PatternProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, unregister } = useUnsavedGuard();

  const { data: profile, isLoading } = useQuery<PatternProfile>({
    queryKey: ["/api/pattern-profile"],
    enabled: !!user,
  });

  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (profile) setForm(formFromProfile(profile));
  }, [profile]);

  const update = (key: FieldKey, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {};
      for (const key of TEXT_FIELDS) payload[key] = form[key].trim();
      await apiRequest("PUT", "/api/pattern-profile", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pattern-profile"] });
      toast({ title: "Saved", description: "Your Pattern Profile has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not save. Please try again.", variant: "destructive" });
    },
  });

  const hasChanges = profile
    ? TEXT_FIELDS.some(k => form[k] !== ((profile as any)[k] || ""))
    : TEXT_FIELDS.some(k => form[k] !== "");

  useEffect(() => {
    register("pattern-profile", { isDirty: hasChanges, message: "You have unsaved changes to your Pattern Profile." });
    return () => unregister("pattern-profile");
  }, [hasChanges, register, unregister]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-12 max-w-2xl space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <FlowBar fallback="/me" doneLabel="Done" />
      <div className="container mx-auto px-4 py-12 max-w-2xl space-y-8">
        <div>
          <h1 className="text-base font-medium" data-testid="text-page-title">Pattern Profile</h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-subtitle">
            Patterns, triggers, blind spots
          </p>
        </div>

        {/* Helping Patterns */}
        <CollapsibleSection title="Helping Patterns" filled={!!form.helpingPattern1Condition.trim()} defaultOpen={!profile} testId="section-helping">
          {([1, 2, 3] as const).map(n => (
            <Card key={`helping-${n}`} className="overflow-visible" data-testid={`card-helping-pattern-${n}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-[13px]">Pattern {n}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Under what condition...</label>
                  <Input value={form[`helpingPattern${n}Condition` as FieldKey]} onChange={e => update(`helpingPattern${n}Condition` as FieldKey, e.target.value)} placeholder="When I..." data-testid={`input-helping-${n}-condition`} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">I do...</label>
                  <Input value={form[`helpingPattern${n}Behavior` as FieldKey]} onChange={e => update(`helpingPattern${n}Behavior` as FieldKey, e.target.value)} placeholder="I tend to..." data-testid={`input-helping-${n}-behavior`} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">People feel...</label>
                  <Input value={form[`helpingPattern${n}Impact` as FieldKey]} onChange={e => update(`helpingPattern${n}Impact` as FieldKey, e.target.value)} placeholder="Others experience..." data-testid={`input-helping-${n}-impact`} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">It leads to...</label>
                  <Input value={form[`helpingPattern${n}Outcome` as FieldKey]} onChange={e => update(`helpingPattern${n}Outcome` as FieldKey, e.target.value)} placeholder="The result is..." data-testid={`input-helping-${n}-outcome`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </CollapsibleSection>

        {/* Hurting Patterns */}
        <CollapsibleSection title="Hurting Patterns" filled={!!form.hurtingPattern1Condition.trim()} testId="section-hurting">
          {([1, 2, 3] as const).map(n => (
            <Card key={`hurting-${n}`} className="overflow-visible" data-testid={`card-hurting-pattern-${n}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-[13px]">Pattern {n}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Under what condition...</label>
                  <Input value={form[`hurtingPattern${n}Condition` as FieldKey]} onChange={e => update(`hurtingPattern${n}Condition` as FieldKey, e.target.value)} placeholder="When I..." data-testid={`input-hurting-${n}-condition`} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">I do...</label>
                  <Input value={form[`hurtingPattern${n}Behavior` as FieldKey]} onChange={e => update(`hurtingPattern${n}Behavior` as FieldKey, e.target.value)} placeholder="I tend to..." data-testid={`input-hurting-${n}-behavior`} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">People feel...</label>
                  <Input value={form[`hurtingPattern${n}Impact` as FieldKey]} onChange={e => update(`hurtingPattern${n}Impact` as FieldKey, e.target.value)} placeholder="Others experience..." data-testid={`input-hurting-${n}-impact`} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">It leads to...</label>
                  <Input value={form[`hurtingPattern${n}Outcome` as FieldKey]} onChange={e => update(`hurtingPattern${n}Outcome` as FieldKey, e.target.value)} placeholder="The result is..." data-testid={`input-hurting-${n}-outcome`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </CollapsibleSection>

        {/* Primary Repeating Loop */}
        <CollapsibleSection title="Primary Repeating Loop" filled={!!form.repeatingLoopStory.trim()} testId="section-loop">
          <Card className="overflow-visible" data-testid="card-repeating-loop">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">The story I keep repeating</label>
                <VoiceTextarea value={form.repeatingLoopStory} onChange={v => update("repeatingLoopStory", v)} placeholder="The narrative I fall back into..." rows={3} className="resize-none text-sm" data-testid="textarea-loop-story" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">What it helps me avoid</label>
                <VoiceTextarea value={form.repeatingLoopAvoidance} onChange={v => update("repeatingLoopAvoidance", v)} placeholder="By repeating this, I avoid..." rows={3} className="resize-none text-sm" data-testid="textarea-loop-avoidance" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">The cost of keeping it</label>
                <VoiceTextarea value={form.repeatingLoopCost} onChange={v => update("repeatingLoopCost", v)} placeholder="What it costs me..." rows={3} className="resize-none text-sm" data-testid="textarea-loop-cost" />
              </div>
            </CardContent>
          </Card>
        </CollapsibleSection>

        {/* Repeating Trigger Pattern */}
        <CollapsibleSection title="Repeating Trigger Pattern" filled={!!form.triggerPatternTrigger.trim()} testId="section-trigger">
          <Card className="overflow-visible" data-testid="card-trigger-pattern">
            <CardContent className="pt-6 space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Trigger</label>
                <Input value={form.triggerPatternTrigger} onChange={e => update("triggerPatternTrigger", e.target.value)} placeholder="What sets it off..." data-testid="input-trigger-pattern-trigger" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Interpretation</label>
                <Input value={form.triggerPatternInterpretation} onChange={e => update("triggerPatternInterpretation", e.target.value)} placeholder="The story I tell myself..." data-testid="input-trigger-pattern-interpretation" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Emotion</label>
                <Input value={form.triggerPatternEmotion} onChange={e => update("triggerPatternEmotion", e.target.value)} placeholder="What I feel..." data-testid="input-trigger-pattern-emotion" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Urge</label>
                <Input value={form.triggerPatternUrge} onChange={e => update("triggerPatternUrge", e.target.value)} placeholder="What I want to do..." data-testid="input-trigger-pattern-urge" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Behavior</label>
                <Input value={form.triggerPatternBehavior} onChange={e => update("triggerPatternBehavior", e.target.value)} placeholder="What I actually do..." data-testid="input-trigger-pattern-behavior" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Outcome</label>
                <Input value={form.triggerPatternOutcome} onChange={e => update("triggerPatternOutcome", e.target.value)} placeholder="What happens as a result..." data-testid="input-trigger-pattern-outcome" />
              </div>
            </CardContent>
          </Card>
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Use Emotional Containment when this pattern surfaces.
            </p>
          </div>
        </CollapsibleSection>

        {/* 3 Blind Spots */}
        <CollapsibleSection title="3 Blind Spots" filled={!!form.blindSpot1Pattern.trim()} testId="section-blindspots">
          {([1, 2, 3] as const).map(n => (
            <Card key={`blind-${n}`} className="overflow-visible" data-testid={`card-blind-spot-${n}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-[13px]">Blind Spot {n}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Pattern</label>
                  <Input value={form[`blindSpot${n}Pattern` as FieldKey]} onChange={e => update(`blindSpot${n}Pattern` as FieldKey, e.target.value)} placeholder="What I don't see..." data-testid={`input-blind-spot-${n}-pattern`} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Outcome</label>
                  <Input value={form[`blindSpot${n}Outcome` as FieldKey]} onChange={e => update(`blindSpot${n}Outcome` as FieldKey, e.target.value)} placeholder="What it costs me..." data-testid={`input-blind-spot-${n}-outcome`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </CollapsibleSection>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !hasChanges}
          className="w-full"
          data-testid="button-save-profile"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Pattern Profile"}
        </Button>
      </div>
    </AppLayout>
  );
}
