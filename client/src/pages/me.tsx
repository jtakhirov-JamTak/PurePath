import { useState, useEffect } from "react";
import { PATTERN_LABELS } from "@/lib/display-names";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Save, LogOut, Download } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { buildIdentityDocPayload } from "@/lib/identity-helpers";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";
import type { IdentityDocument, PatternProfile } from "@shared/schema";

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

// ─── Tab selector ──────────────────────────────────────
type MeTab = "core" | "patterns" | "settings";
const TABS: { key: MeTab; label: string }[] = [
  { key: "core", label: "Core" },
  { key: "patterns", label: "Patterns" },
  { key: "settings", label: "Settings" },
];

// ═══════════════════════════════════════════════════════
export default function MePage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { register, unregister } = useUnsavedGuard();

  const [activeTab, setActiveTab] = useState<MeTab>("core");

  // ─── Queries ─────────────────────────────────────────
  const { data: doc, isLoading: docLoading } = useQuery<IdentityDocument>({ queryKey: ["/api/identity-document"], enabled: !!user });
  const { data: profile, isLoading: profileLoading } = useQuery<PatternProfile>({ queryKey: ["/api/pattern-profile"], enabled: !!user });

  // ─── Identity state ──────────────────────────────────
  const [identity, setIdentity] = useState("");
  const [values, setValues] = useState<ValueEntry[]>([{ value: "", why: "" }, { value: "", why: "" }, { value: "", why: "" }]);
  const [initialValues, setInitialValues] = useState<ValueEntry[]>([{ value: "", why: "" }, { value: "", why: "" }, { value: "", why: "" }]);
  const [vision, setVision] = useState("");
  const [purpose, setPurpose] = useState("");
  const [acceptanceTruth, setAcceptanceTruth] = useState("");
  const [idInit, setIdInit] = useState(false);

  useEffect(() => {
    if (doc && !idInit) {
      const parsed = parseValues(doc.values || "");
      setIdentity(doc.identity || "");
      setValues(parsed);
      setInitialValues(parsed);
      setVision(doc.vision || "");
      setPurpose(doc.purpose || "");
      setAcceptanceTruth(doc.acceptanceTruth || "");
      setIdInit(true);
    }
  }, [doc, idInit]);

  const idDirty = idInit && (
    identity !== (doc?.identity || "") ||
    JSON.stringify(values) !== JSON.stringify(initialValues) ||
    vision !== (doc?.vision || "") ||
    purpose !== (doc?.purpose || "") ||
    acceptanceTruth !== (doc?.acceptanceTruth || "")
  );

  // Snapshot the trimmed values at mutate() call time so onSuccess uses the exact
  // data that was POSTed, not a latest-render closure (avoids "concurrent edits
  // marked clean" bug when user types during an in-flight save).
  const saveIdMutation = useToastMutation<{ trimmedValues: ValueEntry[] }>({
    mutationFn: async ({ trimmedValues }) => {
      await apiRequest("PUT", "/api/identity-document", buildIdentityDocPayload(doc, {
        identity: identity.trim(),
        values: JSON.stringify(trimmedValues),
        vision: vision.trim(),
        purpose: purpose.trim(),
        acceptanceTruth: acceptanceTruth.trim(),
      }));
    },
    invalidateKeys: ["/api/identity-document"],
    successToast: { title: "Identity saved" },
    errorToast: "Could not save",
    onSuccess: (_data, { trimmedValues }) => {
      setInitialValues(trimmedValues);
    },
  });

  const submitIdentity = () => {
    const trimmedValues = values.map(v => ({ value: v.value.trim(), why: v.why.trim() }));
    return saveIdMutation.mutateAsync({ trimmedValues });
  };

  // ─── Pattern state ───────────────────────────────────
  const [pForm, setPForm] = useState<PForm>(emptyPForm());
  const [pInit, setPInit] = useState(false);

  useEffect(() => {
    if (profile && !pInit) { setPForm(pFormFromProfile(profile)); setPInit(true); }
  }, [profile, pInit]);

  const pf = (key: PFieldKey) => pForm[key];
  const setPf = (key: PFieldKey, val: string) => setPForm(prev => ({ ...prev, [key]: val }));

  const pDirty = pInit && PATTERN_FIELDS.some(k => pForm[k] !== ((profile as any)?.[k] || ""));

  const savePMutation = useToastMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {};
      for (const k of PATTERN_FIELDS) body[k] = pForm[k].trim();
      await apiRequest("PUT", "/api/pattern-profile", body);
    },
    invalidateKeys: ["/api/pattern-profile"],
    successToast: { title: "Patterns saved" },
    errorToast: "Could not save",
  });

  // ─── Unsaved guard registration ──────────────────────
  useEffect(() => {
    register("me-identity", {
      isDirty: idDirty,
      message: "You have unsaved changes to your identity. What would you like to do?",
      onSave: async () => { await submitIdentity(); },
      onDiscard: () => {
        if (!doc) return;
        const parsed = parseValues(doc.values || "");
        setIdentity(doc.identity || "");
        setValues(parsed);
        setInitialValues(parsed);
        setVision(doc.vision || "");
        setPurpose(doc.purpose || "");
        setAcceptanceTruth(doc.acceptanceTruth || "");
      },
    });
    return () => unregister("me-identity");
  }, [idDirty, doc, saveIdMutation, register, unregister]);

  useEffect(() => {
    register("me-patterns", {
      isDirty: pDirty,
      message: "You have unsaved changes to your patterns. What would you like to do?",
      onSave: async () => { await savePMutation.mutateAsync(); },
      onDiscard: () => {
        setPForm(profile ? pFormFromProfile(profile) : emptyPForm());
      },
    });
    return () => unregister("me-patterns");
  }, [pDirty, profile, savePMutation, register, unregister]);

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

        {/* ─── Tab selector ───────────────────────────── */}
        <div className="flex border-b border-border mb-4" data-testid="me-tabs">
          {TABS.map(t => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 min-h-[44px] text-sm font-medium transition-colors border-b-2 -mb-px ${
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`me-tab-${t.key}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ═══ CORE TAB ═══ */}
        {activeTab === "core" && (
          <div>
            <MeSection title="Identity Statement" filled={!!identity.trim()} testId="me-identity">
              <Textarea value={identity} onChange={e => setIdentity(e.target.value)}
                placeholder="I am..." className="min-h-[60px] max-h-[100px] resize-none" />
              <SaveBtn dirty={idDirty} pending={saveIdMutation.isPending} onClick={submitIdentity} />
            </MeSection>

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
              <SaveBtn dirty={idDirty} pending={saveIdMutation.isPending} onClick={submitIdentity} />
            </MeSection>

            <MeSection title="Vision + Why" filled={!!vision.trim()} testId="me-vision">
              <Field label="5-year vision" value={vision} onChange={setVision} placeholder="My vision is..." multiline />
              <Field label="Why it matters" value={purpose} onChange={setPurpose} placeholder="This matters because..." multiline />
              <SaveBtn dirty={idDirty} pending={saveIdMutation.isPending} onClick={submitIdentity} />
            </MeSection>

            <MeSection title="Acceptance Truth" filled={!!acceptanceTruth.trim()} testId="me-acceptance">
              <Textarea value={acceptanceTruth} onChange={e => setAcceptanceTruth(e.target.value)}
                placeholder="The truth I accept..." className="min-h-[60px] max-h-[100px] resize-none" />
              <SaveBtn dirty={idDirty} pending={saveIdMutation.isPending} onClick={submitIdentity} />
            </MeSection>
          </div>
        )}

        {/* ═══ PATTERNS TAB ═══ */}
        {activeTab === "patterns" && (
          <div>
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

            <MeSection title={PATTERN_LABELS.triggerPattern} filled={!!pf("triggerPatternTrigger").trim()} testId="me-trigger">
              <Field label="When this happens" value={pf("triggerPatternTrigger")} onChange={v => setPf("triggerPatternTrigger", v)} placeholder="The trigger" />
              <Field label="I tell myself" value={pf("triggerPatternInterpretation")} onChange={v => setPf("triggerPatternInterpretation", v)} placeholder="The story" />
              <Field label="I feel" value={pf("triggerPatternEmotion")} onChange={v => setPf("triggerPatternEmotion", v)} placeholder="Emotion" />
              <Field label="I feel the urge to" value={pf("triggerPatternUrge")} onChange={v => setPf("triggerPatternUrge", v)} placeholder="Urge" />
              <Field label="I do" value={pf("triggerPatternBehavior")} onChange={v => setPf("triggerPatternBehavior", v)} placeholder="Behavior" />
              <Field label="The outcome is" value={pf("triggerPatternOutcome")} onChange={v => setPf("triggerPatternOutcome", v)} placeholder="Result" />
              <SaveBtn dirty={pDirty} pending={savePMutation.isPending} onClick={() => savePMutation.mutate()} />
            </MeSection>

            <MeSection title={PATTERN_LABELS.avoidanceLoop} filled={!!pf("repeatingLoopStory").trim()} testId="me-avoidance">
              <Field label="The story I keep telling myself" value={pf("repeatingLoopStory")} onChange={v => setPf("repeatingLoopStory", v)} placeholder="The story" multiline />
              <Field label="What this story helps me avoid" value={pf("repeatingLoopAvoidance")} onChange={v => setPf("repeatingLoopAvoidance", v)} placeholder="What I avoid" multiline />
              <Field label="The cost of keeping it" value={pf("repeatingLoopCost")} onChange={v => setPf("repeatingLoopCost", v)} placeholder="The cost" multiline />
              <SaveBtn dirty={pDirty} pending={savePMutation.isPending} onClick={() => savePMutation.mutate()} />
            </MeSection>

            <MeSection title="Blind Spots" filled={!!pf("blindSpot1Pattern").trim()} testId="me-blind-spots">
              {[1, 2, 3].map(n => (
                <div key={n} className="space-y-1">
                  <Field label={`Blind spot ${n}`} value={pf(`blindSpot${n}Pattern` as PFieldKey)} onChange={v => setPf(`blindSpot${n}Pattern` as PFieldKey, v)} placeholder="Pattern I don't see" />
                  <Field label="What it causes" value={pf(`blindSpot${n}Outcome` as PFieldKey)} onChange={v => setPf(`blindSpot${n}Outcome` as PFieldKey, v)} placeholder="Outcome" />
                </div>
              ))}
              <SaveBtn dirty={pDirty} pending={savePMutation.isPending} onClick={() => savePMutation.mutate()} />
            </MeSection>
          </div>
        )}

        {/* ═══ SETTINGS TAB ═══ */}
        {activeTab === "settings" && (
          <div>
            <MeSection title="Account" filled testId="me-account">
              <div className="space-y-3">
                {user?.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
                <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => logout()}>
                  <LogOut className="h-4 w-4 mr-1" /> Sign out
                </Button>
              </div>
            </MeSection>

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
        )}

      </div>
    </AppLayout>
  );
}
