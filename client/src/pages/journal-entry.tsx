import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { VoiceTextarea } from "@/components/voice-input";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, ArrowLeft, Sun, Moon, Save, Loader2, Lock, Heart, Shield, Wind, Star, Target, AlertTriangle, BarChart3, Power } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { format, parseISO } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Journal, Purchase, MonthlyGoal } from "@shared/schema";

interface MorningContent {
  intention: string;
  gratitude: string;
  joy: string;
  enjoy: string;
  avoidance: string;
  understanding: string;
  understandingEmotion: string;
  understandingEmotionOther: string;
  counterEvidence: string;
  courageAction: string;
  stress: string;
  perspectiveShift: string;
}

interface EveningContent {
  review: string;
  feedback: string;
  insight: string;
  lesson: string;
  trigger: string;
  triggerStory: string;
  triggerImpulse: string;
  triggerEmotion: string;
  triggerEmotionOther: string;
  triggerEmotionLevel: string;
  triggerUrge: string;
  triggerUrgeOther: string;
  triggerUrgeLevel: string;
  triggerBehavior: string;
  triggerOutcome: string;
  triggerNextTime: string;
  satisfied: string;
  dissatisfied: string;
  shutdownEnough: string;
  shutdownTomorrow: string;
}

const emptyMorning: MorningContent = {
  intention: "",
  gratitude: "",
  joy: "",
  enjoy: "",
  avoidance: "",
  understanding: "",
  understandingEmotion: "",
  understandingEmotionOther: "",
  counterEvidence: "",
  courageAction: "",
  stress: "",
  perspectiveShift: "",
};

const emptyEvening: EveningContent = {
  review: "",
  feedback: "",
  insight: "",
  lesson: "",
  trigger: "",
  triggerStory: "",
  triggerImpulse: "",
  triggerEmotion: "",
  triggerEmotionOther: "",
  triggerEmotionLevel: "",
  triggerUrge: "",
  triggerUrgeOther: "",
  triggerUrgeLevel: "",
  triggerBehavior: "",
  triggerOutcome: "",
  triggerNextTime: "",
  satisfied: "",
  dissatisfied: "",
  shutdownEnough: "",
  shutdownTomorrow: "",
};

const emotionOptions = ["fear", "anger", "sadness", "shame", "guilt", "anxiety", "disgust", "jealousy", "frustration", "other"];
const triggerEmotionOptions = ["fear", "anger", "sadness", "shame", "guilt", "anxiety", "disgust", "jealousy", "frustration", "other"];
const triggerUrgeOptions = ["defend", "withdraw", "attack", "freeze", "avoid", "people-please", "control", "numb", "overthink", "other"];

export default function JournalEntryPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ date: string; session: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const date = params.date;
  const session = params.session as "morning" | "evening";
  const isMorning = session === "morning";

  const [morningData, setMorningData] = useState<MorningContent>(emptyMorning);
  const [eveningData, setEveningData] = useState<EveningContent>(emptyEvening);
  const [isEditing, setIsEditing] = useState(false);
  const [journalMode, setJournalMode] = useState<"quick" | "deep">("deep");

  const { data: purchases, isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
    enabled: !!user,
  });

  const hasAccess = purchases?.some(p =>
    p.courseType === "phase12" || p.courseType === "allinone" ||
    p.courseType === "course2" || p.courseType === "bundle"
  );

  const { data: existingJournal, isLoading: journalLoading } = useQuery<Journal | null>({
    queryKey: ["/api/journals", date, session],
    enabled: !!user && hasAccess,
  });

  const currentMonthKey = date ? date.substring(0, 7) : format(new Date(), "yyyy-MM");
  const { data: monthlyGoal } = useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal", currentMonthKey],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-goal?month=${currentMonthKey}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user,
  });
  const goalDisplayText = monthlyGoal?.goalWhat?.trim() || monthlyGoal?.goalStatement?.trim() || "";
  const hasGoal = goalDisplayText.length > 0;

  useEffect(() => {
    if (existingJournal) {
      setIsEditing(true);
      if (existingJournal.content) {
        try {
          const parsed = JSON.parse(existingJournal.content);
          if (isMorning) {
            setMorningData({ ...emptyMorning, ...parsed });
          } else {
            setEveningData({ ...emptyEvening, ...parsed });
          }
        } catch {
          if (isMorning) {
            setMorningData({
              ...emptyMorning,
              intention: existingJournal.intentions || "",
              gratitude: existingJournal.gratitude || "",
            });
          } else {
            setEveningData({
              ...emptyEvening,
              review: existingJournal.highlights || "",
              insight: existingJournal.reflections || "",
              shutdownTomorrow: existingJournal.tomorrowGoals || "",
            });
          }
        }
      } else {
        if (isMorning) {
          setMorningData({
            ...emptyMorning,
            intention: existingJournal.intentions || "",
            gratitude: existingJournal.gratitude || "",
          });
        } else {
          setEveningData({
            ...emptyEvening,
            review: existingJournal.highlights || "",
            insight: existingJournal.reflections || "",
            shutdownTomorrow: existingJournal.tomorrowGoals || "",
          });
        }
      }
    } else {
      setIsEditing(false);
      if (isMorning) setMorningData(emptyMorning);
      else setEveningData(emptyEvening);
    }
  }, [existingJournal, isMorning]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const contentData = isMorning ? morningData : eveningData;
      const response = await apiRequest("POST", "/api/journals", {
        date,
        session,
        content: JSON.stringify(contentData),
        gratitude: isMorning ? morningData.gratitude : "",
        intentions: isMorning ? morningData.intention : "",
        reflections: isMorning ? "" : eveningData.insight,
        highlights: isMorning ? "" : eveningData.review,
        challenges: isMorning ? morningData.avoidance : eveningData.trigger,
        tomorrowGoals: isMorning ? "" : eveningData.shutdownTomorrow,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Journal Saved",
        description: "Your journal entry has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/journals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journals", date, session] });
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
          <Button onClick={() => setLocation("/checkout/phase12")} data-testid="button-purchase">
            Purchase Course
          </Button>
        </Card>
      </div>
    );
  }

  const formattedDate = date ? format(parseISO(date), "EEEE, MMMM d, yyyy") : "";

  const updateMorning = (field: keyof MorningContent, value: string) => {
    setMorningData(prev => ({ ...prev, [field]: value }));
  };

  const updateEvening = (field: keyof EveningContent, value: string) => {
    setEveningData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/course2")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/[0.08] flex items-center justify-center">
                {isMorning ? (
                  <Sun className="h-5 w-5 text-amber-500" />
                ) : (
                  <Moon className="h-5 w-5 text-indigo-500" />
                )}
              </div>
              <div>
                <span className="font-serif text-lg font-medium capitalize">
                  {isEditing ? "Edit" : "New"} {session} Journal
                </span>
                <p className="text-xs text-muted-foreground">{formattedDate}</p>
              </div>
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
        <div className="flex items-center justify-center gap-1 mb-8 p-1 bg-muted rounded-lg w-fit mx-auto" data-testid="mode-toggle">
          <Button
            variant={journalMode === "quick" ? "default" : "ghost"}
            size="sm"
            onClick={() => setJournalMode("quick")}
            data-testid="button-mode-quick"
          >
            Quick (2 min)
          </Button>
          <Button
            variant={journalMode === "deep" ? "default" : "ghost"}
            size="sm"
            onClick={() => setJournalMode("deep")}
            data-testid="button-mode-deep"
          >
            Deep Dive
          </Button>
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
          <div className="space-y-10">
            <Card data-testid="card-self-awareness">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-lg">Self-Awareness</CardTitle>
                    <CardDescription>Set your intention for the day <Badge variant="outline" className="ml-2 text-xs">Core</Badge></CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Intention — What value do I want to practice today?</Label>
                  <VoiceTextarea
                    value={morningData.intention}
                    onChange={(val) => updateMorning("intention", val)}
                    placeholder="Today I want to practice..."
                    className="min-h-[80px] resize-none"
                    data-testid="input-intention"
                  />
                </div>
                {hasGoal && (
                  <div className="rounded-md bg-muted/50 px-4 py-3 mt-2" data-testid="goal-context">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Monthly Goal</p>
                    <p className="text-sm">{goalDisplayText}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-happiness">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                    <Heart className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-lg">Happiness</CardTitle>
                    <CardDescription>Cultivate gratitude and joy <Badge variant="outline" className="ml-2 text-xs">Core</Badge></CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Gratitude — Who am I grateful for? Do one small action.</Label>
                  <VoiceTextarea
                    value={morningData.gratitude}
                    onChange={(val) => updateMorning("gratitude", val)}
                    placeholder="I am grateful for..."
                    className="min-h-[80px] resize-none"
                    data-testid="input-gratitude"
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Joy — What's one thing I'm excited about?</Label>
                  <VoiceTextarea
                    value={morningData.joy}
                    onChange={(val) => updateMorning("joy", val)}
                    placeholder="I'm excited about..."
                    className="min-h-[60px] resize-none"
                    data-testid="input-joy"
                  />
                </div>
                {journalMode === "deep" && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Enjoy — Make an exciting plan!</Label>
                      <VoiceTextarea
                        value={morningData.enjoy}
                        onChange={(val) => updateMorning("enjoy", val)}
                        placeholder="My exciting plan for today..."
                        className="min-h-[60px] resize-none"
                        data-testid="input-enjoy"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-courage">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-lg">Courage</CardTitle>
                    <CardDescription>Face what you're avoiding <Badge variant="outline" className="ml-2 text-xs">Core</Badge></CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Avoidance — What's the one thing I'm avoiding?</Label>
                  <VoiceTextarea
                    value={morningData.avoidance}
                    onChange={(val) => updateMorning("avoidance", val)}
                    placeholder="The thing I'm avoiding is..."
                    className="min-h-[60px] resize-none"
                    data-testid="input-avoidance"
                  />
                </div>
                {journalMode === "deep" && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Understanding — What belief or emotion is under the avoidance?</Label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Select
                          value={morningData.understandingEmotion}
                          onValueChange={(v) => updateMorning("understandingEmotion", v)}
                        >
                          <SelectTrigger className="sm:w-[180px]" data-testid="select-understanding-emotion">
                            <SelectValue placeholder="Select emotion..." />
                          </SelectTrigger>
                          <SelectContent>
                            {emotionOptions.map(e => (
                              <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {morningData.understandingEmotion === "other" && (
                          <Input
                            value={morningData.understandingEmotionOther}
                            onChange={(e) => updateMorning("understandingEmotionOther", e.target.value)}
                            placeholder="Specify emotion..."
                            className="sm:w-[180px]"
                            data-testid="input-understanding-emotion-other"
                          />
                        )}
                        <VoiceTextarea
                          value={morningData.understanding}
                          onChange={(val) => updateMorning("understanding", val)}
                          placeholder="The belief underneath is..."
                          className="min-h-[60px] resize-none flex-1"
                          data-testid="input-understanding"
                        />
                      </div>
                    </div>
                    <div className="rounded-md bg-primary/[0.04] p-3">
                      <p className="text-sm text-muted-foreground italic">Containment — Do Emotional Containment exercise</p>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Counter-evidence — One real example that contradicts this belief</Label>
                      <VoiceTextarea
                        value={morningData.counterEvidence}
                        onChange={(val) => updateMorning("counterEvidence", val)}
                        placeholder="A real example that contradicts this..."
                        className="min-h-[60px] resize-none"
                        data-testid="input-counter-evidence"
                      />
                    </div>
                  </>
                )}
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Action — One small exposure rep to begin</Label>
                  <VoiceTextarea
                    value={morningData.courageAction}
                    onChange={(val) => updateMorning("courageAction", val)}
                    placeholder="My one small step will be..."
                    className="min-h-[60px] resize-none"
                    data-testid="input-courage-action"
                  />
                </div>
              </CardContent>
            </Card>

            {journalMode === "deep" && (
              <Card data-testid="card-release">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                      <Wind className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="font-serif text-lg">Release</CardTitle>
                      <CardDescription>Let go of what's weighing on you <Badge variant="outline" className="ml-2 text-xs">Optional</Badge></CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Stress — What's the one thing I'm overly fixated on?</Label>
                    <VoiceTextarea
                      value={morningData.stress}
                      onChange={(val) => updateMorning("stress", val)}
                      placeholder="I'm overly fixated on..."
                      className="min-h-[60px] resize-none"
                      data-testid="input-stress"
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Perspective Shift — What would it look like to loosen by 50%?</Label>
                    <VoiceTextarea
                      value={morningData.perspectiveShift}
                      onChange={(val) => updateMorning("perspectiveShift", val)}
                      placeholder="If I loosened my grip, it would look like..."
                      className="min-h-[60px] resize-none"
                      data-testid="input-perspective-shift"
                    />
                  </div>
                  <div className="rounded-md bg-primary/[0.04] p-3">
                    <p className="text-sm text-muted-foreground italic">Release — Loosen your grip</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            {journalMode === "deep" && (
            <Card data-testid="card-daily-review">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                    <Star className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-lg">Daily Review</CardTitle>
                    <CardDescription>Reflect on your most important moment <Badge variant="outline" className="ml-2 text-xs">Optional</Badge></CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Review — What was the most important moment today? (keep it simple)</Label>
                  <VoiceTextarea
                    value={eveningData.review}
                    onChange={(val) => updateEvening("review", val)}
                    placeholder="The most important moment was..."
                    className="min-h-[80px] resize-none"
                    data-testid="input-review"
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Feedback — What did I feel? What did I do?</Label>
                  <VoiceTextarea
                    value={eveningData.feedback}
                    onChange={(val) => updateEvening("feedback", val)}
                    placeholder="I felt... and I did..."
                    className="min-h-[80px] resize-none"
                    data-testid="input-feedback"
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Insight — What value or need was underneath that?</Label>
                  <VoiceTextarea
                    value={eveningData.insight}
                    onChange={(val) => updateEvening("insight", val)}
                    placeholder="Underneath that was..."
                    className="min-h-[60px] resize-none"
                    data-testid="input-insight"
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Lesson — What can I learn from this that will help me moving forward?</Label>
                  <VoiceTextarea
                    value={eveningData.lesson}
                    onChange={(val) => updateEvening("lesson", val)}
                    placeholder="Moving forward, I'll remember..."
                    className="min-h-[60px] resize-none"
                    data-testid="input-lesson"
                  />
                </div>
              </CardContent>
            </Card>
            )}

            {journalMode === "deep" && (
            <Card data-testid="card-trigger-log">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-lg">Trigger Log</CardTitle>
                    <CardDescription>Track and understand your emotional triggers <Badge variant="outline" className="ml-2 text-xs">Optional</Badge></CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Trigger (observable — a camera/mic would capture this)</Label>
                  <VoiceTextarea
                    value={eveningData.trigger}
                    onChange={(val) => updateEvening("trigger", val)}
                    placeholder="What happened..."
                    className="min-h-[60px] resize-none"
                    data-testid="input-trigger"
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Story I told myself (1 sentence)</Label>
                  <VoiceTextarea
                    value={eveningData.triggerStory}
                    onChange={(val) => updateEvening("triggerStory", val)}
                    placeholder="The story I told myself was..."
                    className="min-h-[50px] resize-none"
                    data-testid="input-trigger-story"
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">My first impulse/urge</Label>
                  <VoiceTextarea
                    value={eveningData.triggerImpulse}
                    onChange={(val) => updateEvening("triggerImpulse", val)}
                    placeholder="My first impulse was to..."
                    className="min-h-[50px] resize-none"
                    data-testid="input-trigger-impulse"
                  />
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Emotion (0–10)</Label>
                    <div className="flex gap-2">
                      <Select
                        value={eveningData.triggerEmotion}
                        onValueChange={(v) => updateEvening("triggerEmotion", v)}
                      >
                        <SelectTrigger className="flex-1" data-testid="select-trigger-emotion">
                          <SelectValue placeholder="Emotion..." />
                        </SelectTrigger>
                        <SelectContent>
                          {triggerEmotionOptions.map(e => (
                            <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={eveningData.triggerEmotionLevel}
                        onChange={(e) => updateEvening("triggerEmotionLevel", e.target.value)}
                        placeholder="0-10"
                        className="w-20"
                        data-testid="input-trigger-emotion-level"
                      />
                    </div>
                    {eveningData.triggerEmotion === "other" && (
                      <Input
                        value={eveningData.triggerEmotionOther}
                        onChange={(e) => updateEvening("triggerEmotionOther", e.target.value)}
                        placeholder="Specify emotion..."
                        data-testid="input-trigger-emotion-other"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Urge (0–10)</Label>
                    <div className="flex gap-2">
                      <Select
                        value={eveningData.triggerUrge}
                        onValueChange={(v) => updateEvening("triggerUrge", v)}
                      >
                        <SelectTrigger className="flex-1" data-testid="select-trigger-urge">
                          <SelectValue placeholder="Urge..." />
                        </SelectTrigger>
                        <SelectContent>
                          {triggerUrgeOptions.map(e => (
                            <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={eveningData.triggerUrgeLevel}
                        onChange={(e) => updateEvening("triggerUrgeLevel", e.target.value)}
                        placeholder="0-10"
                        className="w-20"
                        data-testid="input-trigger-urge-level"
                      />
                    </div>
                    {eveningData.triggerUrge === "other" && (
                      <Input
                        value={eveningData.triggerUrgeOther}
                        onChange={(e) => updateEvening("triggerUrgeOther", e.target.value)}
                        placeholder="Specify urge..."
                        data-testid="input-trigger-urge-other"
                      />
                    )}
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">What I did (behavior)</Label>
                  <VoiceTextarea
                    value={eveningData.triggerBehavior}
                    onChange={(val) => updateEvening("triggerBehavior", val)}
                    placeholder="What I actually did..."
                    className="min-h-[50px] resize-none"
                    data-testid="input-trigger-behavior"
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Outcome (what happened)</Label>
                  <VoiceTextarea
                    value={eveningData.triggerOutcome}
                    onChange={(val) => updateEvening("triggerOutcome", val)}
                    placeholder="What happened as a result..."
                    className="min-h-[50px] resize-none"
                    data-testid="input-trigger-outcome"
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Next Time — "If X happens, I will do Y."</Label>
                  <VoiceTextarea
                    value={eveningData.triggerNextTime}
                    onChange={(val) => updateEvening("triggerNextTime", val)}
                    placeholder="If this happens again, I will..."
                    className="min-h-[60px] resize-none"
                    data-testid="input-trigger-next-time"
                  />
                </div>
              </CardContent>
            </Card>
            )}

            <Card data-testid="card-8020-tracker">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-lg">80/20 Tracker</CardTitle>
                    <CardDescription>What's working and what isn't <Badge variant="outline" className="ml-2 text-xs">Core</Badge></CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">What am I satisfied with?</Label>
                  <VoiceTextarea
                    value={eveningData.satisfied}
                    onChange={(val) => updateEvening("satisfied", val)}
                    placeholder="I'm satisfied with..."
                    className="min-h-[80px] resize-none"
                    data-testid="input-satisfied"
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">What am I dissatisfied with?</Label>
                  <VoiceTextarea
                    value={eveningData.dissatisfied}
                    onChange={(val) => updateEvening("dissatisfied", val)}
                    placeholder="I'm dissatisfied with..."
                    className="min-h-[80px] resize-none"
                    data-testid="input-dissatisfied"
                  />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-shutdown">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                    <Power className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-lg">Shutdown</CardTitle>
                    <CardDescription>Close out your day with intention <Badge variant="outline" className="ml-2 text-xs">Core</Badge></CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Today was enough because:</Label>
                  <VoiceTextarea
                    value={eveningData.shutdownEnough}
                    onChange={(val) => updateEvening("shutdownEnough", val)}
                    placeholder="Today was enough because..."
                    className="min-h-[60px] resize-none"
                    data-testid="input-shutdown-enough"
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tomorrow's first 2-minute step:</Label>
                  <VoiceTextarea
                    value={eveningData.shutdownTomorrow}
                    onChange={(val) => updateEvening("shutdownTomorrow", val)}
                    placeholder="Tomorrow I'll start with..."
                    className="min-h-[60px] resize-none"
                    data-testid="input-shutdown-tomorrow"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-10 flex justify-end">
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
