import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Save } from "lucide-react";
import type { IdentityDocument } from "@shared/schema";

interface YearVisualization {
  place: string;
  people: string;
  dailyLife: string;
  feelings: string;
  calendarEvidence: string;
}

const emptyVisualization: YearVisualization = {
  place: "",
  people: "",
  dailyLife: "",
  feelings: "",
  calendarEvidence: "",
};

function parseVisualization(raw: string | null | undefined): YearVisualization {
  if (!raw) return { ...emptyVisualization };
  try {
    const parsed = JSON.parse(raw);
    return {
      place: parsed.place || "",
      people: parsed.people || "",
      dailyLife: parsed.dailyLife || "",
      feelings: parsed.feelings || "",
      calendarEvidence: parsed.calendarEvidence || "",
    };
  } catch {
    return { ...emptyVisualization };
  }
}

export default function Lesson2WorksheetPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: doc, isLoading } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
    enabled: !!user,
  });

  const [vision, setVision] = useState("");
  const [yearVision, setYearVision] = useState("");
  const [visualization, setVisualization] = useState<YearVisualization>({ ...emptyVisualization });
  const [identity, setIdentity] = useState("");
  const [purpose, setPurpose] = useState("");
  const [values, setValues] = useState("");

  useEffect(() => {
    if (doc) {
      setVision(doc.vision || "");
      setYearVision(doc.yearVision || "");
      setVisualization(parseVisualization(doc.yearVisualization));
      setIdentity(doc.identity || "");
      setPurpose(doc.purpose || "");
      setValues(doc.values || "");
    }
  }, [doc]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/identity-document", {
        vision: vision.trim(),
        yearVision: yearVision.trim(),
        yearVisualization: JSON.stringify(visualization),
        identity: identity.trim(),
        purpose: purpose.trim(),
        values: values.trim(),
        todayValue: doc?.todayValue || "",
        todayIntention: doc?.todayIntention || "",
        todayReflection: doc?.todayReflection || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] });
      toast({ title: "Saved", description: "Your Lesson 2 worksheet has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not save. Please try again.", variant: "destructive" });
    },
  });

  const hasChanges =
    vision !== (doc?.vision || "") ||
    yearVision !== (doc?.yearVision || "") ||
    identity !== (doc?.identity || "") ||
    purpose !== (doc?.purpose || "") ||
    values !== (doc?.values || "") ||
    JSON.stringify(visualization) !== JSON.stringify(parseVisualization(doc?.yearVisualization));

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
          <h1 className="font-serif text-3xl font-bold mb-3" data-testid="text-lesson2-title">
            Lesson 2: Who Do I Want To Be?
          </h1>
          <p className="text-muted-foreground text-lg">
            Build your vision, define your identity, and clarify your purpose.
          </p>
        </div>

        <div className="space-y-6">
          <Card className="overflow-visible" data-testid="card-vision">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">1</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">10-Year Vision</CardTitle>
                  <CardDescription>If everything went right, what does your life look like in 10 years?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={vision}
                onChange={(e) => setVision(e.target.value)}
                placeholder="Describe the life you're building toward..."
                className="min-h-[70px] text-base"
                data-testid="input-vision"
              />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-yearVision">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">2</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">1-Year Vision</CardTitle>
                  <CardDescription>What does the next year look like if you stay on track?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={yearVision}
                onChange={(e) => setYearVision(e.target.value)}
                placeholder="Where will you be one year from today?"
                className="min-h-[70px] text-base"
                data-testid="input-yearVision"
              />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-yearVisualization">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">3</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">1-Year Visualization</CardTitle>
                  <CardDescription>Make it real. Fill in the details of your life one year from now.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Where are you?</Label>
                <Textarea
                  value={visualization.place}
                  onChange={(e) => setVisualization(v => ({ ...v, place: e.target.value }))}
                  placeholder="City, home, workspace..."
                  className="min-h-[70px] text-base"
                  data-testid="input-place"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Who is with you?</Label>
                <Textarea
                  value={visualization.people}
                  onChange={(e) => setVisualization(v => ({ ...v, people: e.target.value }))}
                  placeholder="Family, friends, mentors, colleagues..."
                  className="min-h-[70px] text-base"
                  data-testid="input-people"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">What does a typical day look like?</Label>
                <Textarea
                  value={visualization.dailyLife}
                  onChange={(e) => setVisualization(v => ({ ...v, dailyLife: e.target.value }))}
                  placeholder="Morning routine, work, evening..."
                  className="min-h-[70px] text-base"
                  data-testid="input-dailyLife"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">How do you feel?</Label>
                <Textarea
                  value={visualization.feelings}
                  onChange={(e) => setVisualization(v => ({ ...v, feelings: e.target.value }))}
                  placeholder="Confident, peaceful, energized..."
                  className="min-h-[70px] text-base"
                  data-testid="input-feelings"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">What's the evidence on your calendar?</Label>
                <Textarea
                  value={visualization.calendarEvidence}
                  onChange={(e) => setVisualization(v => ({ ...v, calendarEvidence: e.target.value }))}
                  placeholder="Meetings, habits, events that prove this life is real..."
                  className="min-h-[70px] text-base"
                  data-testid="input-calendarEvidence"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-identity">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">4</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">Who Am I Becoming?</CardTitle>
                  <CardDescription>Write a statement about the person you are choosing to be.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                placeholder="I am someone who..."
                className="min-h-[70px] text-base"
                data-testid="input-identity"
              />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-purpose">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">5</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">Purpose</CardTitle>
                  <CardDescription>Why does this matter? What drives you forward?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="I do this because..."
                className="min-h-[70px] text-base"
                data-testid="input-purpose"
              />
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-values">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0 no-default-active-elevate">6</Badge>
                <div>
                  <CardTitle className="font-serif text-lg">Core Values</CardTitle>
                  <CardDescription>List the values that guide your decisions (comma-separated).</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={values}
                onChange={(e) => setValues(e.target.value)}
                placeholder="e.g. Honesty, growth, courage, family..."
                className="min-h-[70px] text-base"
                data-testid="input-values"
              />
            </CardContent>
          </Card>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!hasChanges || saveMutation.isPending}
              data-testid="button-save-lesson2"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save Worksheet"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
