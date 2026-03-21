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

export default function IdentityDocPage() {
  const { user } = useAuth();

  const { data: doc, isLoading } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
    enabled: !!user,
  });

  const [vision, setVision] = useState("");
  const [identity, setIdentity] = useState("");
  const [othersWillSee, setOthersWillSee] = useState<string[]>(["", "", ""]);
  const [purpose, setPurpose] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (doc) {
      setVision(doc.vision || "");
      setIdentity(doc.identity || "");
      const parsed = doc.othersWillSee ? doc.othersWillSee.split("|||") : ["", "", ""];
      setOthersWillSee(parsed.length === 3 ? parsed : [parsed[0] || "", parsed[1] || "", parsed[2] || ""]);
      setPurpose(doc.purpose || "");
      setInitialized(true);
    }
  }, [doc]);

  const saveMutation = useToastMutation({
    mutationFn: async () => {
      if (!initialized) return;
      await apiRequest("PUT", "/api/identity-document", {
        vision: vision.trim(),
        identity: identity.trim(),
        othersWillSee: othersWillSee.map(s => s.trim()).join("|||"),
        purpose: purpose.trim(),
        values: doc?.values || "",
        yearVision: doc?.yearVision || "",
        yearVisualization: doc?.yearVisualization || "",
        todayValue: doc?.todayValue || "",
        todayIntention: doc?.todayIntention || "",
        todayReflection: doc?.todayReflection || "",
        visionBoardMain: doc?.visionBoardMain || "",
        visionBoardLeft: doc?.visionBoardLeft || "",
        visionBoardRight: doc?.visionBoardRight || "",
        beYourself: doc?.beYourself || "",
        strengths: doc?.strengths || "",
        helpingPatterns: doc?.helpingPatterns || "",
        hurtingPatterns: doc?.hurtingPatterns || "",
        stressResponses: doc?.stressResponses || "",
      });
    },
    invalidateKeys: ["/api/identity-document"],
    successToast: { title: "Saved", description: "Your Identity Document has been updated." },
    errorToast: "Could not save. Please try again.",
  });

  const hasChanges = initialized && (
    vision !== (doc?.vision || "") ||
    identity !== (doc?.identity || "") ||
    othersWillSee.map(s => s.trim()).join("|||") !== (doc?.othersWillSee || "||") ||
    purpose !== (doc?.purpose || "")
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

  return (
    <AppLayout>
      <FlowBar fallback="/dashboard" doneLabel="Done" />
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-10">
          <h1 className="text-base font-medium" data-testid="text-identity-title">Identity Document</h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-identity-subtitle">
            Who you're choosing to become — from Lesson 2: Decide
          </p>
        </div>

        <div className="space-y-6">
          <Card className="overflow-visible" data-testid="card-vision">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Eye className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">Vision</CardTitle>
                  <CardDescription>Your 10+ year vision. Where are you headed?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VoiceTextarea
                value={vision}
                onChange={setVision}
                placeholder="In 10 years I see myself living with purpose, running a meaningful business, deeply connected to the people I love..."
                className="min-h-[120px] resize-none"
                data-testid="input-vision"
              />
            </CardContent>
          </Card>

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
                placeholder="I am someone who shows up with courage every day. I am disciplined, present, and kind..."
                className="min-h-[120px] resize-none"
                data-testid="input-identity"
              />
            </CardContent>
          </Card>

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

          <Card className="overflow-visible" data-testid="card-purpose">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Heart className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">Purpose</CardTitle>
                  <CardDescription>Your deeper reason for doing this work.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VoiceTextarea
                value={purpose}
                onChange={setPurpose}
                placeholder="I exist to create, to lead with empathy, and to leave things better than I found them..."
                className="min-h-[120px] resize-none"
                data-testid="input-purpose"
              />
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
