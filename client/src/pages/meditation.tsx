import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Brain, Clock, Headphones, Sofa, Trash2, Plus, Calendar } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { MeditationInsight } from "@shared/schema";

export default function MeditationPage() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [insightDate, setInsightDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [insightText, setInsightText] = useState("");

  const { data: insights, isLoading: insightsLoading } = useQuery<MeditationInsight[]>({
    queryKey: ["/api/meditation-insights"],
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { date: string; insight: string }) => {
      const res = await apiRequest("POST", "/api/meditation-insights", data);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to save insight");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meditation-insights"] });
      setInsightText("");
    },
    onError: (error: Error) => {
      toast({ title: "Could not save insight", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/meditation-insights/${id}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to delete insight");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meditation-insights"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not delete insight", description: error.message, variant: "destructive" });
    },
  });

  const handleSaveInsight = () => {
    if (!insightText.trim()) return;
    createMutation.mutate({ date: insightDate, insight: insightText.trim() });
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-14 w-14 rounded-xl bg-primary/[0.08] flex items-center justify-center">
              <Brain className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold">Integrative Meditation</h1>
              <p className="text-muted-foreground">Let your subconscious integrate thoughts freely</p>
            </div>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <Sofa className="h-5 w-5" />
              Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="outline">1</Badge>
              <span>Find a comfortable couch or chair in a dim or dark room</span>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline">2</Badge>
              <div className="flex items-center gap-2 flex-wrap">
                <Headphones className="h-4 w-4" />
                <span>Put on headphones with black noise at low volume</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-serif">Black Noise Audio</CardTitle>
            <CardDescription>Use this 12-hour black noise track during meditation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video w-full rounded-lg overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/zXntqw_LFu0"
                title="Black Noise for Meditation"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-lg"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Meditation Process (20-30 minutes)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-semibold text-lg mb-2">1. Downshift: Calm the Body (5 minutes)</h3>
              <p className="text-muted-foreground mb-2">Box breathing (4-4-4-4 pattern) for approximately 5 minutes.</p>
              <p className="text-sm text-muted-foreground italic">Move on when: body feels slower/heavier, jaw and shoulders soften.</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-semibold text-lg mb-2">2. Let Your Subconscious Thoughts Flow (20 minutes)</h3>
              <p className="text-muted-foreground mb-3">Let your thoughts, memories, and images arise freely. Let them come and go.</p>
              <p className="text-sm font-medium mb-2">You might experience:</p>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                <li>Multiple memories appear, seemingly unrelated, until you realize they share a pattern</li>
                <li>One strong emotion dominates, letting you face what you've been avoiding</li>
                <li>Imagination of how your actions may have impacted someone from their point of view (empathy insight)</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-semibold text-lg mb-2">3. Seal It (1-2 minutes)</h3>
              <p className="text-muted-foreground">Sit with the new state (clarity, insight, or empathy) without explaining it.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-serif">Post-Meditation Integration (2 minutes)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
              <p className="text-lg text-center font-medium">
                Write one sentence only:
              </p>
              <p className="text-xl text-center text-primary mt-2 font-serif">
                "The insight I gained was ______."
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/[0.08] flex items-center justify-center">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              Your Meditation Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isAuthenticated ? (
              <p className="text-muted-foreground text-center py-6" data-testid="text-login-prompt">
                Log in to track your meditation insights.
              </p>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="insight-date">Date</Label>
                    <Input
                      id="insight-date"
                      type="date"
                      value={insightDate}
                      onChange={(e) => setInsightDate(e.target.value)}
                      data-testid="input-insight-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insight-text">Insight</Label>
                    <Textarea
                      id="insight-text"
                      placeholder="The insight I gained was..."
                      value={insightText}
                      onChange={(e) => setInsightText(e.target.value)}
                      data-testid="input-insight-text"
                    />
                  </div>
                  <Button
                    onClick={handleSaveInsight}
                    disabled={!insightText.trim() || createMutation.isPending}
                    data-testid="button-save-insight"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {createMutation.isPending ? "Saving..." : "Save Insight"}
                  </Button>
                </div>

                <div className="space-y-3">
                  {insightsLoading ? (
                    <p className="text-muted-foreground text-center py-4" data-testid="text-loading-insights">
                      Loading insights...
                    </p>
                  ) : insights && insights.length > 0 ? (
                    insights.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/50"
                        data-testid={`card-insight-${item.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-muted-foreground mb-1" data-testid={`text-insight-date-${item.id}`}>
                            {format(new Date(item.date + "T00:00:00"), "MMMM d, yyyy")}
                          </p>
                          <p data-testid={`text-insight-content-${item.id}`}>{item.insight}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(item.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-insight-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4" data-testid="text-no-insights">
                      No insights recorded yet. Start meditating and capture your first insight.
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
