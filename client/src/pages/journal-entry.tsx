import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, ArrowLeft, Sun, Moon, Save, Loader2, Lock } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { format, parseISO } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Journal, Purchase } from "@shared/schema";

const morningPrompts = {
  gratitude: "What are three things you're grateful for today?",
  intentions: "What are your top intentions for today? What do you want to accomplish or feel?",
  affirmation: "Write a positive affirmation for yourself today.",
};

const eveningPrompts = {
  highlights: "What were the highlights of your day?",
  reflections: "What did you learn about yourself today?",
  challenges: "What challenges did you face and how did you handle them?",
  tomorrowGoals: "What would you like to focus on tomorrow?",
};

export default function JournalEntryPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ date: string; session: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const date = params.date;
  const session = params.session as "morning" | "evening";
  const isMorning = session === "morning";

  const [formData, setFormData] = useState({
    gratitude: "",
    intentions: "",
    reflections: "",
    highlights: "",
    challenges: "",
    tomorrowGoals: "",
  });

  const { data: purchases, isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
    enabled: !!user,
  });

  const hasAccess = purchases?.some(p => p.courseType === "course2" || p.courseType === "bundle");

  const { data: existingJournal, isLoading: journalLoading } = useQuery<Journal | null>({
    queryKey: ["/api/journals", date, session],
    enabled: !!user && hasAccess,
  });

  useEffect(() => {
    if (existingJournal) {
      setFormData({
        gratitude: existingJournal.gratitude || "",
        intentions: existingJournal.intentions || "",
        reflections: existingJournal.reflections || "",
        highlights: existingJournal.highlights || "",
        challenges: existingJournal.challenges || "",
        tomorrowGoals: existingJournal.tomorrowGoals || "",
      });
    }
  }, [existingJournal]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/journals", {
        date,
        session,
        ...formData,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Journal Saved",
        description: "Your journal entry has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/journals"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save journal entry.",
        variant: "destructive",
      });
    },
  });

  if (authLoading || purchasesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md p-8 text-center">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-bold mb-2">Access Required</h1>
          <p className="text-muted-foreground mb-6">
            You need to purchase the Transformation Journal course to access this feature.
          </p>
          <Button onClick={() => setLocation("/checkout/course2")} data-testid="button-purchase">
            Purchase Course
          </Button>
        </Card>
      </div>
    );
  }

  const formattedDate = date ? format(parseISO(date), "EEEE, MMMM d, yyyy") : "";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/course2")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              {isMorning ? (
                <Sun className="h-6 w-6 text-amber-500" />
              ) : (
                <Moon className="h-6 w-6 text-indigo-500" />
              )}
              <span className="font-serif text-lg font-medium capitalize">{session} Journal</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => saveMutation.mutate()} 
              disabled={saveMutation.isPending}
              data-testid="button-save"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold mb-2 capitalize">{session} Reflection</h1>
          <p className="text-muted-foreground">{formattedDate}</p>
        </div>

        {journalLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-6 w-48 bg-muted animate-pulse rounded" />
                </CardHeader>
                <CardContent>
                  <div className="h-24 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isMorning ? (
          <div className="space-y-6">
            <Card data-testid="card-gratitude">
              <CardHeader>
                <CardTitle className="font-serif text-lg">Gratitude</CardTitle>
                <CardDescription>{morningPrompts.gratitude}</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.gratitude}
                  onChange={(e) => setFormData({ ...formData, gratitude: e.target.value })}
                  placeholder="I am grateful for..."
                  className="min-h-[120px] resize-none"
                  data-testid="input-gratitude"
                />
              </CardContent>
            </Card>

            <Card data-testid="card-intentions">
              <CardHeader>
                <CardTitle className="font-serif text-lg">Intentions</CardTitle>
                <CardDescription>{morningPrompts.intentions}</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.intentions}
                  onChange={(e) => setFormData({ ...formData, intentions: e.target.value })}
                  placeholder="Today, I intend to..."
                  className="min-h-[120px] resize-none"
                  data-testid="input-intentions"
                />
              </CardContent>
            </Card>

            <Card data-testid="card-affirmation">
              <CardHeader>
                <CardTitle className="font-serif text-lg">Daily Affirmation</CardTitle>
                <CardDescription>{morningPrompts.affirmation}</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.reflections}
                  onChange={(e) => setFormData({ ...formData, reflections: e.target.value })}
                  placeholder="I am..."
                  className="min-h-[100px] resize-none"
                  data-testid="input-affirmation"
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <Card data-testid="card-highlights">
              <CardHeader>
                <CardTitle className="font-serif text-lg">Today's Highlights</CardTitle>
                <CardDescription>{eveningPrompts.highlights}</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.highlights}
                  onChange={(e) => setFormData({ ...formData, highlights: e.target.value })}
                  placeholder="The best parts of today were..."
                  className="min-h-[120px] resize-none"
                  data-testid="input-highlights"
                />
              </CardContent>
            </Card>

            <Card data-testid="card-reflections">
              <CardHeader>
                <CardTitle className="font-serif text-lg">Self-Reflection</CardTitle>
                <CardDescription>{eveningPrompts.reflections}</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.reflections}
                  onChange={(e) => setFormData({ ...formData, reflections: e.target.value })}
                  placeholder="Today I learned that..."
                  className="min-h-[120px] resize-none"
                  data-testid="input-reflections"
                />
              </CardContent>
            </Card>

            <Card data-testid="card-challenges">
              <CardHeader>
                <CardTitle className="font-serif text-lg">Challenges & Growth</CardTitle>
                <CardDescription>{eveningPrompts.challenges}</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.challenges}
                  onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
                  placeholder="A challenge I faced today was..."
                  className="min-h-[120px] resize-none"
                  data-testid="input-challenges"
                />
              </CardContent>
            </Card>

            <Card data-testid="card-tomorrow">
              <CardHeader>
                <CardTitle className="font-serif text-lg">Tomorrow's Focus</CardTitle>
                <CardDescription>{eveningPrompts.tomorrowGoals}</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.tomorrowGoals}
                  onChange={(e) => setFormData({ ...formData, tomorrowGoals: e.target.value })}
                  placeholder="Tomorrow, I will focus on..."
                  className="min-h-[100px] resize-none"
                  data-testid="input-tomorrow"
                />
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <Button 
            size="lg"
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending}
            data-testid="button-save-bottom"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Journal Entry
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
