import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { FlowBar } from "@/components/flow-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VoiceTextarea } from "@/components/voice-input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Save } from "lucide-react";
import type { IdentityDocument } from "@shared/schema";

export default function DiscoveryProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: doc, isLoading } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
    enabled: !!user,
  });

  const [values, setValues] = useState("");
  const [strengths, setStrengths] = useState("");
  const [helpingPatterns, setHelpingPatterns] = useState("");
  const [hurtingPatterns, setHurtingPatterns] = useState("");
  const [stressResponses, setStressResponses] = useState("");

  useEffect(() => {
    if (doc) {
      setValues(doc.values || "");
      setStrengths(doc.strengths || "");
      setHelpingPatterns(doc.helpingPatterns || "");
      setHurtingPatterns(doc.hurtingPatterns || "");
      setStressResponses(doc.stressResponses || "");
    }
  }, [doc]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/identity-document", {
        identity: doc?.identity || "",
        vision: doc?.vision || "",
        purpose: doc?.purpose || "",
        yearVision: doc?.yearVision || "",
        yearVisualization: doc?.yearVisualization || "",
        todayValue: doc?.todayValue || "",
        todayIntention: doc?.todayIntention || "",
        todayReflection: doc?.todayReflection || "",
        visionBoardMain: doc?.visionBoardMain || "",
        visionBoardLeft: doc?.visionBoardLeft || "",
        visionBoardRight: doc?.visionBoardRight || "",
        othersWillSee: doc?.othersWillSee || "",
        beYourself: doc?.beYourself || "",
        values: values.trim(),
        strengths: strengths.trim(),
        helpingPatterns: helpingPatterns.trim(),
        hurtingPatterns: hurtingPatterns.trim(),
        stressResponses: stressResponses.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] });
      toast({ title: "Saved", description: "Your Discovery Profile has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not save. Please try again.", variant: "destructive" });
    },
  });

  const hasChanges =
    values !== (doc?.values || "") ||
    strengths !== (doc?.strengths || "") ||
    helpingPatterns !== (doc?.helpingPatterns || "") ||
    hurtingPatterns !== (doc?.hurtingPatterns || "") ||
    stressResponses !== (doc?.stressResponses || "");

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
      <FlowBar fallback="/plan" doneLabel="Done" />
      <div className="container mx-auto px-4 py-12 max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold" data-testid="text-page-title">Discovery Profile</h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-subtitle">
            A snapshot of your current self — from Lesson 1: Discover
          </p>
        </div>

        <Card className="overflow-visible" data-testid="card-values">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-serif">Values</CardTitle>
          </CardHeader>
          <CardContent>
            <VoiceTextarea
              value={values}
              onChange={setValues}
              placeholder="Your 2 core values and 1 aspirational value, with your reasons"
              rows={4}
              className="resize-none text-sm"
              data-testid="textarea-values"
            />
          </CardContent>
        </Card>

        <Card className="overflow-visible" data-testid="card-strengths">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-serif">Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <VoiceTextarea
              value={strengths}
              onChange={setStrengths}
              placeholder="What others consistently recognize in you"
              rows={4}
              className="resize-none text-sm"
              data-testid="textarea-strengths"
            />
          </CardContent>
        </Card>

        <Card className="overflow-visible" data-testid="card-behavioral-patterns">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-serif">Behavioral Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Helping Patterns</label>
                <VoiceTextarea
                  value={helpingPatterns}
                  onChange={setHelpingPatterns}
                  placeholder="Top 3 behaviors that serve you"
                  rows={4}
                  className="resize-none text-sm"
                  data-testid="textarea-helping-patterns"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Hurting Patterns</label>
                <VoiceTextarea
                  value={hurtingPatterns}
                  onChange={setHurtingPatterns}
                  placeholder="Top 3 behaviors to transform"
                  rows={4}
                  className="resize-none text-sm"
                  data-testid="textarea-hurting-patterns"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-visible" data-testid="card-stress-responses">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-serif">Stress Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <VoiceTextarea
              value={stressResponses}
              onChange={setStressResponses}
              placeholder="How you react under pressure"
              rows={4}
              className="resize-none text-sm"
              data-testid="textarea-stress-responses"
            />
          </CardContent>
        </Card>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !hasChanges}
          className="w-full"
          data-testid="button-save-profile"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Discovery Profile"}
        </Button>
      </div>
    </AppLayout>
  );
}
