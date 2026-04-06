import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { FlowBar } from "@/components/flow-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VoiceTextarea } from "@/components/voice-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Save, Eye, User, Users, Heart } from "lucide-react";
import type { IdentityDocument } from "@shared/schema";
import { buildIdentityDocPayload } from "@/lib/identity-helpers";

interface ValueEntry { value: string; why: string }

function parseValues(raw: string): ValueEntry[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 3) return parsed;
  } catch { /* fall through */ }
  // Legacy: plain text — put it in first value
  return [
    { value: raw || "", why: "" },
    { value: "", why: "" },
    { value: "", why: "" },
  ];
}

function serializeValues(entries: ValueEntry[]): string {
  return JSON.stringify(entries);
}

export default function IdentityDocPage() {
  const { user } = useAuth();

  const { data: doc, isLoading } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
    enabled: !!user,
  });

  const [vision, setVision] = useState("");
  const [visionWhy, setVisionWhy] = useState("");
  const [identity, setIdentity] = useState("");
  const [valuesEntries, setValuesEntries] = useState<ValueEntry[]>([
    { value: "", why: "" }, { value: "", why: "" }, { value: "", why: "" },
  ]);
  const [othersWillSee, setOthersWillSee] = useState<string[]>(["", "", ""]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (doc) {
      setVision(doc.vision || "");
      setVisionWhy(doc.purpose || ""); // repurpose `purpose` field for vision why
      setIdentity(doc.identity || "");
      setValuesEntries(parseValues(doc.values || ""));
      const parsed = doc.othersWillSee ? doc.othersWillSee.split("|||") : ["", "", ""];
      setOthersWillSee(parsed.length === 3 ? parsed : [parsed[0] || "", parsed[1] || "", parsed[2] || ""]);
      setInitialized(true);
    }
  }, [doc]);

  const updateValue = (idx: number, field: keyof ValueEntry, val: string) => {
    setValuesEntries(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  const saveMutation = useToastMutation({
    mutationFn: async () => {
      if (!initialized) return;
      await apiRequest("PUT", "/api/identity-document", buildIdentityDocPayload(doc, {
        vision: vision.trim(),
        purpose: visionWhy.trim(), // store vision-why in purpose field
        identity: identity.trim(),
        values: serializeValues(valuesEntries.map(e => ({ value: e.value.trim(), why: e.why.trim() }))),
        othersWillSee: othersWillSee.map(s => s.trim()).join("|||"),
      }));
    },
    invalidateKeys: ["/api/identity-document"],
    successToast: { title: "Saved", description: "Your Identity Document has been updated." },
    errorToast: "Could not save. Please try again.",
  });

  const currentValuesJson = serializeValues(valuesEntries.map(e => ({ value: e.value.trim(), why: e.why.trim() })));
  const hasChanges = initialized && (
    vision !== (doc?.vision || "") ||
    visionWhy !== (doc?.purpose || "") ||
    identity !== (doc?.identity || "") ||
    currentValuesJson !== (doc?.values || "") ||
    othersWillSee.map(s => s.trim()).join("|||") !== (doc?.othersWillSee || "||")
  );

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-12 max-w-2xl space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </AppLayout>
    );
  }

  const VALUE_LABELS = ["Core Value 1", "Core Value 2", "Aspirational Value"];

  return (
    <AppLayout>
      <FlowBar fallback="/profile" doneLabel="Done" />
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-10">
          <h1 className="text-base font-medium" data-testid="text-identity-title">Identity Document</h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-identity-subtitle">
            Who you're choosing to become — from the workshop
          </p>
        </div>

        <div className="space-y-6">
          {/* Values — 3 structured entries */}
          <Card className="overflow-visible" data-testid="card-values">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Heart className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">Values</CardTitle>
                  <CardDescription>2 core values + 1 aspirational value</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {valuesEntries.map((entry, i) => (
                <div key={i} className="space-y-2 border-b last:border-0 pb-3 last:pb-0">
                  <label className="text-xs font-medium text-muted-foreground">{VALUE_LABELS[i]}</label>
                  <Input
                    value={entry.value}
                    onChange={e => updateValue(i, "value", e.target.value)}
                    placeholder={i < 2 ? "A core value I live by..." : "A value I'm growing into..."}
                    data-testid={`input-value-${i}`}
                  />
                  <Input
                    value={entry.why}
                    onChange={e => updateValue(i, "why", e.target.value)}
                    placeholder="Why this matters to me..."
                    className="text-sm"
                    data-testid={`input-value-why-${i}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Vision + Why */}
          <Card className="overflow-visible" data-testid="card-vision">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Eye className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">Vision</CardTitle>
                  <CardDescription>Your 5-year vision. Where are you headed?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <VoiceTextarea
                value={vision}
                onChange={setVision}
                placeholder="5 years from now, on an ordinary day..."
                className="min-h-[120px] resize-none"
                data-testid="input-vision"
              />
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Why it matters</label>
                <VoiceTextarea
                  value={visionWhy}
                  onChange={setVisionWhy}
                  placeholder="This matters because..."
                  className="min-h-[80px] resize-none"
                  data-testid="input-vision-why"
                />
              </div>
            </CardContent>
          </Card>

          {/* Identity Statement */}
          <Card className="overflow-visible" data-testid="card-identity">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">Identity Statement</CardTitle>
                  <CardDescription>Who are you becoming? Write it as if it's already true.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VoiceTextarea
                value={identity}
                onChange={setIdentity}
                placeholder="I am committed to becoming someone who..."
                className="min-h-[120px] resize-none"
                data-testid="input-identity"
              />
            </CardContent>
          </Card>

          {/* Relational Intention — 3 boxes */}
          <Card className="overflow-visible" data-testid="card-others-will-see">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">Relational Intention</CardTitle>
                  <CardDescription>How I want others to experience me.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {othersWillSee.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                  <Input
                    value={item}
                    onChange={(e) => {
                      const updated = [...othersWillSee];
                      updated[i] = e.target.value;
                      setOthersWillSee(updated);
                    }}
                    placeholder={
                      i === 0 ? "e.g. Confident and grounded" :
                      i === 1 ? "e.g. Warm and approachable" :
                      "e.g. Someone who follows through"
                    }
                    data-testid={`input-others-will-see-${i}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!initialized || isLoading || saveMutation.isPending || !hasChanges}
            className="w-full"
            data-testid="button-save-identity"
          >
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save Identity Document"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
