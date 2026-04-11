import { useState, useEffect, useMemo } from "react";
import { PATTERN_LABELS } from "@/lib/display-names";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Save, LogOut, Download, Pin, PinOff, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { buildIdentityDocPayload } from "@/lib/identity-helpers";
import { HabitDialog } from "@/components/habit-dialog";
import type { IdentityDocument, PatternProfile, AnnualCommitment, Habit } from "@shared/schema";

// ─── Collapsible Section ───────────────────────────────
function MeSection({ title, filled, children, defaultOpen = false, testId }: {
  title: string; filled: boolean; children: React.ReactNode; defaultOpen?: boolean; testId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-border last:border-b-0" data-testid={testId}>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 px-1 min-h-[44px]">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full shrink-0 ${filled ? "bg-primary" : "border-2 border-muted-foreground/30"}`} />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pb-5 px-1 space-y-3">{children}</div>}
    </section>
  );
}

// ─── Value entry helpers ───────────────────────────────
interface ValueEntry { value: string; why: string }
function parseValues(raw: string): ValueEntry[] {
  try { const p = JSON.parse(raw); if (Array.isArray(p) && p.length === 3) return p; } catch {}
  return [{ value: raw || "", why: "" }, { value: "", why: "" }, { value: "", why: "" }];
}

// ─── Pattern text fields ──────────────────────────────
const PATTERN_FIELDS = [
  "helpingPattern1Condition", "helpingPattern1Behavior", "helpingPattern1Impact", "helpingPattern1Outcome",
  "helpingPattern2Condition", "helpingPattern2Behavior", "helpingPattern2Impact", "helpingPattern2Outcome",
  "helpingPattern3Condition", "helpingPattern3Behavior", "helpingPattern3Impact", "helpingPattern3Outcome",
  "hurtingPattern1Condition", "hurtingPattern1Behavior", "hurtingPattern1Impact", "hurtingPattern1Outcome",
  "hurtingPattern2Condition", "hurtingPattern2Behavior", "hurtingPattern2Impact", "hurtingPattern2Outcome",
  "hurtingPattern3Condition", "hurtingPattern3Behavior", "hurtingPattern3Impact", "hurtingPattern3Outcome",
  "hurtingPattern1Emotions", "hurtingPattern1Environment",
  "hurtingPattern2Emotions", "hurtingPattern2Environment",
  "hurtingPattern3Emotions", "hurtingPattern3Environment",
  "repeatingLoopStory", "repeatingLoopAvoidance", "repeatingLoopCost",
  "repeatingLoopCommitment", "repeatingLoopBehavior",
  "triggerPatternTrigger", "triggerPatternInterpretation", "triggerPatternEmotion",
  "triggerPatternUrge", "triggerPatternBehavior", "triggerPatternOutcome",
  "blindSpot1Pattern", "blindSpot1Outcome",
  "blindSpot2Pattern", "blindSpot2Outcome",
  "blindSpot3Pattern", "blindSpot3Outcome",
] as const;
type PFieldKey = typeof PATTERN_FIELDS[number];
type PForm = Record<PFieldKey, string>;
function emptyPForm(): PForm { const o = {} as PForm; for (const k of PATTERN_FIELDS) o[k] = ""; return o; }
function pFormFromProfile(p: PatternProfile): PForm { const o = {} as PForm; for (const k of PATTERN_FIELDS) o[k] = (p as any)[k] || ""; return o; }

// ─── Inline field helper ──────────────────────────────
function Field({ label, value, onChange, placeholder, multiline }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {multiline ? (
        <Textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="min-h-[60px] max-h-[100px] resize-none" />
      ) : (
        <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

function SaveBtn({ dirty, pending, onClick }: { dirty: boolean; pending: boolean; onClick: () => void }) {
  if (!dirty) return null;
  return (
    <Button size="sm" className="min-h-[44px] mt-2" disabled={pending} onClick={onClick}>
      <Save className="h-4 w-4 mr-1" /> {pending ? "Saving..." : "Save"}
    </Button>
  );
}

// ═══════════════════════════════════════════════════════
export default function MePage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ─── Queries ─────────────────────────────────────────
  const { data: doc, isLoading: docLoading } = useQuery<IdentityDocument>({ queryKey: ["/api/identity-document"], enabled: !!user });
  const { data: profile, isLoading: profileLoading } = useQuery<PatternProfile>({ queryKey: ["/api/pattern-profile"], enabled: !!user });
  const { data: annual } = useQuery<AnnualCommitment | null>({ queryKey: ["/api/annual-commitment"], enabled: !!user });
  const { data: habits = [] } = useQuery<Habit[]>({ queryKey: ["/api/habits"], enabled: !!user });

  // ─── Identity state ──────────────────────────────────
  const [identity, setIdentity] = useState("");
  const [values, setValues] = useState<ValueEntry[]>([{ value: "", why: "" }, { value: "", why: "" }, { value: "", why: "" }]);
  const [vision, setVision] = useState("");
  const [purpose, setPurpose] = useState("");
  const [acceptanceTruth, setAcceptanceTruth] = useState("");
  const [idInit, setIdInit] = useState(false);

  useEffect(() => {
    if (doc && !idInit) {
      setIdentity(doc.identity || "");
      setValues(parseValues(doc.values || ""));
      setVision(doc.vision || "");
      setPurpose(doc.purpose || "");
      setAcceptanceTruth(doc.acceptanceTruth || "");
      setIdInit(true);
    }
  }, [doc, idInit]);

  const idDirty = idInit && (
    identity !== (doc?.identity || "") ||
    JSON.stringify(values) !== (doc?.values || "") ||
    vision !== (doc?.vision || "") ||
    purpose !== (doc?.purpose || "") ||
    acceptanceTruth !== (doc?.acceptanceTruth || "")
  );

  const saveIdMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/identity-document", buildIdentityDocPayload(doc, {
        identity: identity.trim(),
        values: JSON.stringify(values.map(v => ({ value: v.value.trim(), why: v.why.trim() }))),
        vision: vision.trim(),
        purpose: purpose.trim(),
        acceptanceTruth: acceptanceTruth.trim(),
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] });
      toast({ title: "Identity saved" });
    },
    onError: () => toast({ title: "Could not save", variant: "destructive" }),
  });

  // ─── Pattern state ───────────────────────────────────
  const [pForm, setPForm] = useState<PForm>(emptyPForm());
  const [pInit, setPInit] = useState(false);

  useEffect(() => {
    if (profile && !pInit) { setPForm(pFormFromProfile(profile)); setPInit(true); }
  }, [profile, pInit]);

  const pf = (key: PFieldKey) => pForm[key];
  const setPf = (key: PFieldKey, val: string) => setPForm(prev => ({ ...prev, [key]: val }));

  const pDirty = pInit && PATTERN_FIELDS.some(k => pForm[k] !== ((profile as any)?.[k] || ""));

  const savePMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {};
      for (const k of PATTERN_FIELDS) body[k] = pForm[k].trim();
      await apiRequest("PUT", "/api/pattern-profile", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pattern-profile"] });
      toast({ title: "Patterns saved" });
    },
    onError: () => toast({ title: "Could not save", variant: "destructive" }),
  });

  // ─── Habits state ────────────────────────────────────
  const [habitDialogOpen, setHabitDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const activeHabits = useMemo(() => habits.filter(h => h.active), [habits]);

  const pinMutation = useMutation({
    mutationFn: async ({ id, pinned }: { id: number; pinned: boolean }) => {
      await apiRequest("PUT", `/api/habits/${id}`, { isPinned: pinned });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/habits"] }),
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/habits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      toast({ title: "Habit archived" });
    },
  });

  // ─── Derived ─────────────────────────────────────────
  const weeklyBehavior = annual?.weeklyProofBehaviorHabitId
    ? habits.find(h => h.id === annual.weeklyProofBehaviorHabitId)?.name ?? null
    : null;

  // ─── Loading ─────────────────────────────────────────
  if (docLoading || profileLoading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* ═══ 1. Identity Statement ═══ */}
        <MeSection title="Identity Statement" filled={!!identity.trim()} testId="me-identity">
          <Textarea value={identity} onChange={e => setIdentity(e.target.value)}
            placeholder="I am..." className="min-h-[60px] max-h-[100px] resize-none" />
          <SaveBtn dirty={idDirty} pending={saveIdMutation.isPending} onClick={() => saveIdMutation.mutate()} />
        </MeSection>

        {/* ═══ 2. Values + Why ═══ */}
        <MeSection title="Values + Why" filled={values.some(v => v.value.trim())} testId="me-values">
          {values.map((v, i) => (
            <div key={i} className="space-y-1 rounded-lg bg-muted/20 p-3">
              <Label className="text-xs text-muted-foreground">{i < 2 ? `Core value ${i + 1}` : "Aspirational value"}</Label>
              <Input value={v.value} onChange={e => { const n = [...values]; n[i] = { ...n[i], value: e.target.value }; setValues(n); }}
                placeholder="I value..." />
              <Input value={v.why} onChange={e => { const n = [...values]; n[i] = { ...n[i], why: e.target.value }; setValues(n); }}
                placeholder="Because..." />
            </div>
          ))}
          <SaveBtn dirty={idDirty} pending={saveIdMutation.isPending} onClick={() => saveIdMutation.mutate()} />
        </MeSection>

        {/* ═══ 3. Vision + Why ═══ */}
        <MeSection title="Vision + Why" filled={!!vision.trim()} testId="me-vision">
          <Field label="5-year vision" value={vision} onChange={setVision} placeholder="My vision is..." multiline />
          <Field label="Why it matters" value={purpose} onChange={setPurpose} placeholder="This matters because..." multiline />
          <SaveBtn dirty={idDirty} pending={saveIdMutation.isPending} onClick={() => saveIdMutation.mutate()} />
        </MeSection>

        {/* ═══ 4. Success Patterns ═══ */}
        <MeSection title={PATTERN_LABELS.successPlural} filled={!!pf("helpingPattern1Condition").trim()} testId="me-success-patterns">
          {[1, 2, 3].map(n => {
            const c = `helpingPattern${n}Condition` as PFieldKey;
            if (n > 1 && !pf(c).trim() && !pf(`helpingPattern${n}Behavior` as PFieldKey).trim()) return null;
            return (
              <div key={n} className="space-y-1 rounded-lg bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground">Success Pattern {n}</p>
                <Field label="When" value={pf(`helpingPattern${n}Condition` as PFieldKey)} onChange={v => setPf(`helpingPattern${n}Condition` as PFieldKey, v)} placeholder="Context/trigger" />
                <Field label="I do" value={pf(`helpingPattern${n}Behavior` as PFieldKey)} onChange={v => setPf(`helpingPattern${n}Behavior` as PFieldKey, v)} placeholder="Specific behavior" />
                <Field label="Outcome" value={pf(`helpingPattern${n}Outcome` as PFieldKey)} onChange={v => setPf(`helpingPattern${n}Outcome` as PFieldKey, v)} placeholder="Positive result" />
                <Field label="Impact" value={pf(`helpingPattern${n}Impact` as PFieldKey)} onChange={v => setPf(`helpingPattern${n}Impact` as PFieldKey, v)} placeholder="Others experience..." />
              </div>
            );
          })}
          <SaveBtn dirty={pDirty} pending={savePMutation.isPending} onClick={() => savePMutation.mutate()} />
        </MeSection>

        {/* ═══ 5. Shadow Patterns ═══ */}
        <MeSection title={PATTERN_LABELS.shadowPlural} filled={!!pf("hurtingPattern1Condition").trim()} testId="me-shadow-patterns">
          {[1, 2, 3].map(n => {
            const c = `hurtingPattern${n}Condition` as PFieldKey;
            if (n > 1 && !pf(c).trim() && !pf(`hurtingPattern${n}Behavior` as PFieldKey).trim()) return null;
            return (
              <div key={n} className="space-y-1 rounded-lg bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground">Shadow Pattern {n}</p>
                <Field label="When" value={pf(`hurtingPattern${n}Condition` as PFieldKey)} onChange={v => setPf(`hurtingPattern${n}Condition` as PFieldKey, v)} placeholder="Situation/environment" />
                <Field label="I do" value={pf(`hurtingPattern${n}Behavior` as PFieldKey)} onChange={v => setPf(`hurtingPattern${n}Behavior` as PFieldKey, v)} placeholder="What you actually do" />
                <Field label="Outcome" value={pf(`hurtingPattern${n}Outcome` as PFieldKey)} onChange={v => setPf(`hurtingPattern${n}Outcome` as PFieldKey, v)} placeholder="What happens" />
                <Field label="Impact" value={pf(`hurtingPattern${n}Impact` as PFieldKey)} onChange={v => setPf(`hurtingPattern${n}Impact` as PFieldKey, v)} placeholder="Cost to self/others" />
              </div>
            );
          })}
          <SaveBtn dirty={pDirty} pending={savePMutation.isPending} onClick={() => savePMutation.mutate()} />
        </MeSection>

        {/* ═══ 6. Repeating Trigger Pattern ═══ */}
        <MeSection title={PATTERN_LABELS.triggerPattern} filled={!!pf("triggerPatternTrigger").trim()} testId="me-trigger">
          <Field label="When this happens" value={pf("triggerPatternTrigger")} onChange={v => setPf("triggerPatternTrigger", v)} placeholder="The trigger" />
          <Field label="I tell myself" value={pf("triggerPatternInterpretation")} onChange={v => setPf("triggerPatternInterpretation", v)} placeholder="The story" />
          <Field label="I feel" value={pf("triggerPatternEmotion")} onChange={v => setPf("triggerPatternEmotion", v)} placeholder="Emotion" />
          <Field label="I feel the urge to" value={pf("triggerPatternUrge")} onChange={v => setPf("triggerPatternUrge", v)} placeholder="Urge" />
          <Field label="I do" value={pf("triggerPatternBehavior")} onChange={v => setPf("triggerPatternBehavior", v)} placeholder="Behavior" />
          <Field label="The outcome is" value={pf("triggerPatternOutcome")} onChange={v => setPf("triggerPatternOutcome", v)} placeholder="Result" />
          <SaveBtn dirty={pDirty} pending={savePMutation.isPending} onClick={() => savePMutation.mutate()} />
        </MeSection>

        {/* ═══ 7. Avoidance Loop ═══ */}
        <MeSection title={PATTERN_LABELS.avoidanceLoop} filled={!!pf("repeatingLoopStory").trim()} testId="me-avoidance">
          <Field label="The story I keep telling myself" value={pf("repeatingLoopStory")} onChange={v => setPf("repeatingLoopStory", v)} placeholder="The story" multiline />
          <Field label="What this story helps me avoid" value={pf("repeatingLoopAvoidance")} onChange={v => setPf("repeatingLoopAvoidance", v)} placeholder="What I avoid" multiline />
          <Field label="The cost of keeping it" value={pf("repeatingLoopCost")} onChange={v => setPf("repeatingLoopCost", v)} placeholder="The cost" multiline />
          <SaveBtn dirty={pDirty} pending={savePMutation.isPending} onClick={() => savePMutation.mutate()} />
        </MeSection>

        {/* ═══ 8. Blind Spots ═══ */}
        <MeSection title="Blind Spots" filled={!!pf("blindSpot1Pattern").trim()} testId="me-blind-spots">
          {[1, 2, 3].map(n => (
            <div key={n} className="space-y-1">
              <Field label={`Blind spot ${n}`} value={pf(`blindSpot${n}Pattern` as PFieldKey)} onChange={v => setPf(`blindSpot${n}Pattern` as PFieldKey, v)} placeholder="Pattern I don't see" />
              <Field label="What it causes" value={pf(`blindSpot${n}Outcome` as PFieldKey)} onChange={v => setPf(`blindSpot${n}Outcome` as PFieldKey, v)} placeholder="Outcome" />
            </div>
          ))}
          <SaveBtn dirty={pDirty} pending={savePMutation.isPending} onClick={() => savePMutation.mutate()} />
        </MeSection>

        {/* ═══ 9. Acceptance Truth ═══ */}
        <MeSection title="Acceptance Truth" filled={!!acceptanceTruth.trim()} testId="me-acceptance">
          <Textarea value={acceptanceTruth} onChange={e => setAcceptanceTruth(e.target.value)}
            placeholder="The truth I accept..." className="min-h-[60px] max-h-[100px] resize-none" />
          <SaveBtn dirty={idDirty} pending={saveIdMutation.isPending} onClick={() => saveIdMutation.mutate()} />
        </MeSection>

        {/* ═══ 10. Annual Commitment ═══ */}
        <MeSection title="Annual Commitment" filled={!!annual?.domain} testId="me-annual">
          {annual ? (
            <div className="space-y-2 text-sm">
              {annual.domain && <p><span className="text-xs text-muted-foreground">Domain:</span> {annual.domain}</p>}
              {annual.personStatement && <p><span className="text-xs text-muted-foreground">I am:</span> {annual.personStatement}</p>}
              {annual.proofMetric && <p><span className="text-xs text-muted-foreground">Metric:</span> {annual.proofMetric}</p>}
              {weeklyBehavior && <p><span className="text-xs text-muted-foreground">Weekly Proof Behavior:</span> {weeklyBehavior}</p>}
              {annual.confidenceCheck != null && <p><span className="text-xs text-muted-foreground">Confidence:</span> {annual.confidenceCheck}/10</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No annual commitment set. Complete onboarding to set one.</p>
          )}
        </MeSection>

        {/* ═══ 11. Habits ═══ */}
        <MeSection title="Habits" filled={activeHabits.length > 0} testId="me-habits">
          <div className="space-y-2">
            {activeHabits.map(h => (
              <div key={h.id} className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{h.name}</p>
                  <p className="text-xs text-muted-foreground">{h.source === "annual" ? "Annual" : h.source === "sprint" ? "Sprint" : "Support"}{h.isPinned ? " · Pinned" : ""}</p>
                </div>
                {h.source === "support" && (
                  <button type="button" onClick={() => pinMutation.mutate({ id: h.id, pinned: !h.isPinned })}
                    className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground">
                    {h.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  </button>
                )}
                <button type="button" onClick={() => { setEditingHabit(h); setHabitDialogOpen(true); }}
                  className="text-xs text-primary hover:underline min-h-[44px] flex items-center px-2">
                  Edit
                </button>
                {h.source === "support" && (
                  <button type="button" onClick={() => archiveMutation.mutate(h.id)}
                    className="text-xs text-muted-foreground hover:underline min-h-[44px] flex items-center px-2">
                    Archive
                  </button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" className="min-h-[44px]"
              onClick={() => { setEditingHabit(null); setHabitDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Habit
            </Button>
          </div>
          <HabitDialog
            open={habitDialogOpen}
            onOpenChange={(open) => { setHabitDialogOpen(open); if (!open) setEditingHabit(null); }}
            editingHabit={editingHabit}
          />
        </MeSection>

        {/* ═══ 12. Account Settings ═══ */}
        <MeSection title="Account" filled testId="me-account">
          <div className="space-y-3">
            {user?.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
            <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => logout()}>
              <LogOut className="h-4 w-4 mr-1" /> Sign out
            </Button>
          </div>
        </MeSection>

        {/* ═══ 13. Data Export ═══ */}
        <MeSection title="Data Export" filled testId="me-export">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Download all your data as a CSV file.</p>
            <Button variant="outline" size="sm" className="min-h-[44px]" onClick={async () => {
              try {
                const res = await fetch("/api/export-all", { credentials: "include" });
                if (!res.ok) throw new Error("Export failed");
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `the-leaf-export-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast({ title: "Export downloaded" });
              } catch {
                toast({ title: "Export failed", variant: "destructive" });
              }
            }}>
              <Download className="h-4 w-4 mr-1" /> Export All Data
            </Button>
          </div>
        </MeSection>

      </div>
    </AppLayout>
  );
}
