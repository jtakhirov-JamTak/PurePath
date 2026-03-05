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
import { BookOpen, ArrowLeft, Sun, Moon, Save, Loader2, Lock, Heart, Shield, Wind, Star, Target, Power, BedDouble } from "lucide-react";
import { AvoidanceToolModal } from "@/components/tools/avoidance-tool-modal";
import { useLocation, useParams } from "wouter";
import { format, parseISO } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Journal, Purchase, MonthlyGoal, IdentityDocument } from "@shared/schema";

interface MorningContent {
  sleepHours: string;
  energyLevel: string;
  stressLevel: string;
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
  winOfTheDay: string;
  shutdownEnough: string;
  shutdownTomorrow: string;
  tomorrowStepTime: string;
}

const energyLabels = ["Depleted", "Enough", "Good", "Strong", "Supercharged"];
const stressLabels = ["Calm", "Noticeable", "Moderate", "Heavy", "Overloaded"];

const emptyMorning: MorningContent = {
  sleepHours: "",
  energyLevel: "",
  stressLevel: "",
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
  winOfTheDay: "",
  shutdownEnough: "",
  shutdownTomorrow: "",
  tomorrowStepTime: "08:00",
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

  const [morningData, setMorningData] = useState<MorningContent>(emptyMorning);
  const [eveningData, setEveningData] = useState<EveningContent>(emptyEvening);
  const [isEditing, setIsEditing] = useState(false);
  const [journalMode, setJournalMode] = useState<"quick" | "deep">("deep");
  const [avoidanceToolOpen, setAvoidanceToolOpen] = useState(false);

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

  const { data: identityDoc } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
    enabled: !!user,
  });
  const valuesItems = identityDoc?.values?.split(",").map(s => s.trim()).filter(Boolean) || [];
  const othersWillSeeItems = identityDoc?.othersWillSee?.split("|||").filter(s => s.trim()) || [];
  const beYourselfItems = identityDoc?.beYourself?.split(",").map(s => s.trim()).filter(Boolean) || [];

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
            <Card data-testid="card-check-in">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                    <BedDouble className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-lg">Check-In</CardTitle>
                    <CardDescription>How are you starting today? <Badge variant="outline" className="ml-2 text-xs">Core</Badge></CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sleep — Approximate hours slept</Label>
                  <Input
                    type="number"
                    min="0"
                    max="14"
                    step="0.5"
                    value={morningData.sleepHours}
                    onChange={(e) => updateMorning("sleepHours", e.target.value)}
                    placeholder="Hours slept (0–14)"
                    className="w-40"
                    data-testid="input-sleep-hours"
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Energy — How charged do you feel?</Label>
                  <div className="flex flex-wrap gap-2">
                    {energyLabels.map((label, i) => {
                      const selected = morningData.energyLevel === String(i);
                      const totalBars = i === 4 ? 5 : 4;
                      const filledBars = i + 1;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => updateMorning("energyLevel", String(i))}
                          className={`flex flex-col items-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-colors cursor-pointer ${
                            selected
                              ? "border-primary bg-primary/[0.08] text-foreground"
                              : "border-border bg-background text-muted-foreground hover-elevate"
                          }`}
                          data-testid={`button-energy-${i}`}
                        >
                          <div className="flex items-end gap-px h-5">
                            {Array.from({ length: totalBars }, (_, bar) => {
                              const isBonusBar = i === 4 && bar === 4;
                              const filled = bar < filledBars;
                              return (
                                <div
                                  key={bar}
                                  className={`w-1.5 rounded-sm ${
                                    isBonusBar
                                      ? selected ? "bg-yellow-400" : "bg-yellow-400/40"
                                      : filled
                                        ? selected ? "bg-emerald-500" : "bg-muted-foreground/60"
                                        : "bg-muted-foreground/20"
                                  }`}
                                  style={{ height: `${8 + bar * 3}px` }}
                                />
                              );
                            })}
                          </div>
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Stress — How much pressure do you feel?</Label>
                  <div className="flex flex-wrap gap-2">
                    {stressLabels.map((label, i) => {
                      const selected = morningData.stressLevel === String(i);
                      const totalBars = i === 4 ? 5 : 4;
                      const filledBars = i + 1;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => updateMorning("stressLevel", String(i))}
                          className={`flex flex-col items-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-colors cursor-pointer ${
                            selected
                              ? "border-orange-400 bg-orange-50 dark:bg-orange-950/30 text-foreground"
                              : "border-border bg-background text-muted-foreground hover-elevate"
                          }`}
                          data-testid={`button-stress-${i}`}
                        >
                          <div className="flex items-end gap-px h-5">
                            {Array.from({ length: totalBars }, (_, bar) => {
                              const isBonusBar = i === 4 && bar === 4;
                              const filled = bar < filledBars;
                              return (
                                <div
                                  key={bar}
                                  className={`w-1.5 rounded-sm ${
                                    isBonusBar
                                      ? selected ? "bg-red-500" : "bg-red-500/40"
                                      : filled
                                        ? selected ? "bg-orange-400" : "bg-muted-foreground/60"
                                        : "bg-muted-foreground/20"
                                  }`}
                                  style={{ height: `${8 + bar * 3}px` }}
                                />
                              );
                            })}
                          </div>
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

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
                {valuesItems.length > 0 && (
                  <div className="rounded-md bg-muted/50 px-4 py-3" data-testid="identity-values">
                    <p className="text-xs font-medium text-muted-foreground mb-1">My Values</p>
                    <div className="flex flex-wrap gap-1.5">
                      {valuesItems.map((item, i) => (
                        <Badge key={i} variant="default" className="text-xs font-normal" data-testid={`badge-value-${i}`}>{item}</Badge>
                      ))}
                    </div>
                  </div>
                )}
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
                {othersWillSeeItems.length > 0 && (
                  <div className="rounded-md bg-muted/50 px-4 py-3" data-testid="identity-others">
                    <p className="text-xs font-medium text-muted-foreground mb-1">How Others Will See Me</p>
                    <div className="flex flex-wrap gap-1.5">
                      {othersWillSeeItems.map((item, i) => (
                        <Badge key={i} variant="outline" className="text-xs font-normal" data-testid={`badge-others-${i}`}>{item}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Gratitude — Who or what am I grateful for today?</Label>
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
                  <Label className="text-sm font-medium">Joy — What's one thing I'm looking forward to today?</Label>
                  <VoiceTextarea
                    value={morningData.joy}
                    onChange={(val) => updateMorning("joy", val)}
                    placeholder="I'm looking forward to..."
                    className="min-h-[60px] resize-none"
                    data-testid="input-joy"
                  />
                </div>
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
                {hasGoal && (
                  <div className="rounded-md bg-muted/50 px-4 py-3" data-testid="goal-context">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Monthly Goal</p>
                    <p className="text-sm">{goalDisplayText}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">What am I avoiding?</Label>
                  <VoiceTextarea
                    value={morningData.avoidance}
                    onChange={(val) => updateMorning("avoidance", val)}
                    placeholder="The thing I'm avoiding is..."
                    className="min-h-[60px] resize-none"
                    data-testid="input-avoidance"
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">What is the smallest exposure rep?</Label>
                  <VoiceTextarea
                    value={morningData.courageAction}
                    onChange={(val) => updateMorning("courageAction", val)}
                    placeholder="My one small step will be..."
                    className="min-h-[60px] resize-none"
                    data-testid="input-courage-action"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setAvoidanceToolOpen(true)}
                  className="mt-2"
                  data-testid="button-open-avoidance-tool"
                >
                  <Shield className="mr-2 h-3.5 w-3.5" />
                  Go to Avoidance Tool
                </Button>
              </CardContent>
            </Card>

            <Card data-testid="card-release">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                    <Wind className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-lg">Release</CardTitle>
                    <CardDescription>Let go of what's weighing on you <Badge variant="outline" className="ml-2 text-xs">Core</Badge></CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">One thing I am letting go of today:</Label>
                  <VoiceTextarea
                    value={morningData.stress}
                    onChange={(val) => updateMorning("stress", val)}
                    placeholder="Today I'm letting go of..."
                    className="min-h-[60px] resize-none"
                    data-testid="input-stress"
                  />
                </div>
              </CardContent>
            </Card>
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

            <Card data-testid="card-win-of-the-day">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                    <Star className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-lg">Win of the Day</CardTitle>
                    <CardDescription>One small observable win <Badge variant="outline" className="ml-2 text-xs">Core</Badge></CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <VoiceTextarea
                    value={eveningData.winOfTheDay}
                    onChange={(val) => updateEvening("winOfTheDay", val)}
                    placeholder="My win today was..."
                    className="min-h-[80px] resize-none"
                    data-testid="input-win-of-the-day"
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label className="text-sm font-medium">Tomorrow's first 2-minute step:</Label>
                    <span className="text-sm text-muted-foreground">at</span>
                    <Input
                      type="time"
                      value={eveningData.tomorrowStepTime}
                      onChange={(e) => updateEvening("tomorrowStepTime", e.target.value)}
                      className="w-28"
                      data-testid="input-tomorrow-step-time"
                    />
                  </div>
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
      {session === "morning" && (
        <AvoidanceToolModal open={avoidanceToolOpen} onClose={() => setAvoidanceToolOpen(false)} />
      )}
    </div>
  );
}
