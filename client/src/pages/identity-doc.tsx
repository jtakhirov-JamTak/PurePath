import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VoiceTextarea } from "@/components/voice-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Save, User, Eye, Leaf, Users, Heart, X } from "lucide-react";
import type { IdentityDocument } from "@shared/schema";

export default function IdentityDocPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: doc, isLoading } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
    enabled: !!user,
  });

  const [identity, setIdentity] = useState("");
  const [vision, setVision] = useState("");
  const [values, setValues] = useState("");
  const [othersWillSee, setOthersWillSee] = useState<string[]>(["", "", ""]);
  const [beYourself, setBeYourself] = useState("");

  useEffect(() => {
    if (doc) {
      setIdentity(doc.identity || "");
      setVision(doc.vision || "");
      setValues(doc.values || "");
      const parsed = doc.othersWillSee ? doc.othersWillSee.split("|||") : ["", "", ""];
      setOthersWillSee(parsed.length === 3 ? parsed : [parsed[0] || "", parsed[1] || "", parsed[2] || ""]);
      setBeYourself(doc.beYourself || "");
    }
  }, [doc]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/identity-document", {
        identity: identity.trim(),
        vision: vision.trim(),
        values: values.trim(),
        othersWillSee: othersWillSee.map(s => s.trim()).join("|||"),
        beYourself: beYourself.trim(),
        todayValue: doc?.todayValue || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] });
      toast({ title: "Saved", description: "Your Identity Document has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not save. Please try again.", variant: "destructive" });
    },
  });

  const valuesArray = values.split(",").map(v => v.trim()).filter(Boolean);
  const beYourselfArray = beYourself.split(",").map(v => v.trim()).filter(Boolean);

  const hasChanges =
    identity !== (doc?.identity || "") ||
    vision !== (doc?.vision || "") ||
    values !== (doc?.values || "") ||
    othersWillSee.map(s => s.trim()).join("|||") !== (doc?.othersWillSee || "||") ||
    beYourself !== (doc?.beYourself || "");

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-12 max-w-2xl space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-10">
          <h1 className="font-serif text-3xl font-bold mb-3" data-testid="text-identity-title">Identity Document</h1>
          <p className="text-muted-foreground text-lg">
            Define who you are, where you're going, and what you stand for.
          </p>
        </div>

        <div className="space-y-6">
          <Card className="overflow-visible" data-testid="card-identity">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-serif text-lg">Identity</CardTitle>
                  <CardDescription>Who are you becoming? Write it as if it's already true.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VoiceTextarea
                value={identity}
                onChange={(val) => setIdentity(val)}
                placeholder="I am someone who shows up with courage every day. I am disciplined, present, and kind..."
                className="min-h-[120px] resize-none"
                data-testid="input-identity"
              />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-vision">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Eye className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-serif text-lg">Vision</CardTitle>
                  <CardDescription>Where are you headed? Describe the life you're building.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VoiceTextarea
                value={vision}
                onChange={(val) => setVision(val)}
                placeholder="In 3 years I see myself living with purpose, running a meaningful business, deeply connected to the people I love..."
                className="min-h-[120px] resize-none"
                data-testid="input-vision"
              />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-values">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Leaf className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-serif text-lg">Values</CardTitle>
                  <CardDescription>Your guiding principles, separated by commas. You'll choose one to practice each day.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <VoiceTextarea
                value={values}
                onChange={(val) => setValues(val)}
                placeholder="courage, patience, kindness, discipline, gratitude, honesty"
                className="min-h-[80px] resize-none"
                data-testid="input-values"
              />
              {valuesArray.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {valuesArray.map((v, i) => (
                    <Badge key={i} variant="secondary" data-testid={`badge-value-${i}`}>
                      {v}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-others-will-see">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-serif text-lg">How Others Will See Me</CardTitle>
                  <CardDescription>Three qualities you want others to notice about you.</CardDescription>
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

          <Card className="overflow-visible" data-testid="card-be-yourself">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Heart className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-serif text-lg">Be Yourself</CardTitle>
                  <CardDescription>What makes you uniquely you? Separated by commas — add as many as you like.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <VoiceTextarea
                value={beYourself}
                onChange={(val) => setBeYourself(val)}
                placeholder="authentic, curious, playful, resilient, creative, empathetic"
                className="min-h-[80px] resize-none"
                data-testid="input-be-yourself"
              />
              {beYourselfArray.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {beYourselfArray.map((v, i) => (
                    <Badge key={i} variant="secondary" data-testid={`badge-be-yourself-${i}`}>
                      {v}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !hasChanges}
              data-testid="button-save-identity"
            >
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? "Saving..." : "Save Identity Document"}
            </Button>
            {!hasChanges && doc?.identity && (
              <span className="text-sm text-muted-foreground">All changes saved</span>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
