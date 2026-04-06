import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { VoiceTextarea } from "@/components/voice-input";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Sun, Moon, Save, Loader2, Feather, BedDouble, Compass } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useReturnTo } from "@/hooks/use-return-to";
import { EveningJournal } from "@/components/journal/evening-journal";
import { format, parseISO } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Journal, IdentityDocument, MonthlyGoal, Habit, HabitCompletion, EisenhowerEntry } from "@shared/schema";
import { VisionCard } from "@/components/vision-card";
import { startOfWeek } from "date-fns";
import { getTodaysHabits } from "@/lib/habit-filters";
import { getTodaysFocusItems } from "@/lib/eisenhower-filters";

interface MorningContent {
  sleepHours: string;
  energyLevel: string;
  stressLevel: string;
  // Identity
  todayValue: string;
  proofAction: string;
  ifThenObstacle: string;
  ifThenResponse: string;
  // Courage / Avoidance
  avoidance: string;
  avoidanceValue: string;
  avoidanceDiscomfort: number | null;
  avoidanceFear: string;
  exposureTime: string;
  courageAction: string;
  lettingGo: string;
  // Happiness
  gratitude: string;
  // Legacy keys (kept for backward compat with old entries)
  intention: string;
  joy: string;
  enjoy: string;
  understanding: string;
  understandingEmotion: string;
  understandingEmotionOther: string;
  counterEvidence: string;
  stress: string;
  perspectiveShift: string;
}

export interface EveningContent {
  // Win of the Day
  promiseProof: string;
  // Trigger log fields (chip-based)
  triggerText: string;
  triggerAppraisal: string[];
  triggerAppraisalOther: string;
  triggerAppraisalText?: string;
  triggerEmotion: string;
  triggerEmotionIntensity: number | null;
  triggerUrge: string;
  triggerUrgeIntensity: number | null;
  triggerAction: string;
  triggerActionOther: string;
  triggerShowTier2: boolean;
  triggerBodyState: string[];
  triggerBodyStateText?: string;
  triggerOutcome: string;
  triggerRecoveryTime: string;
  triggerReflection: string;
  // Step-Back Reflection
  stepBackAdvice: string;
  stepBackLesson: string;
  // Shutdown
  shutdownEnough: string;
  // Positive pattern
  positiveEvent: string;
  positiveInput: string;
  positiveInputOther: string;
  positiveState: string;
  positiveStateOther: string;
  positiveDownstream: string;
  positiveDownstreamOther: string;
  positiveShowDetail: boolean;
  // Quick mode
  quickRating: number | null;
  quickRemember: string;
  // Legacy keys (kept for backwards compat with stored JSON)
  review: string;
  feedback: string;
  insight: string;
  lesson: string;
  trigger: string;
  triggerStory: string;
  triggerImpulse: string;
  triggerEmotionOther: string;
  triggerEmotionLevel: string;
  triggerUrgeOther: string;
  triggerUrgeLevel: string;
  triggerBehavior: string;
  triggerNextTime: string;
  satisfied: string;
  dissatisfied: string;
  winOfTheDay: string;
  // Skip reasons (chip-based, set in evening reflection)
  skipReasons: Record<string, string>;
}

const energyLabels = ["Depleted", "Enough", "Good", "Strong", "Supercharged"];
const stressLabels = ["Calm", "Noticeable", "Moderate", "Heavy", "Overloaded"];

const emptyMorning: MorningContent = {
  sleepHours: "",
  energyLevel: "",
  stressLevel: "",
  todayValue: "",
  proofAction: "",
  ifThenObstacle: "",
  ifThenResponse: "",
  avoidance: "",
  avoidanceValue: "",
  avoidanceDiscomfort: null,
  avoidanceFear: "",
  exposureTime: "",
  courageAction: "",
  lettingGo: "",
  gratitude: "",
  // Legacy
  intention: "",
  joy: "",
  enjoy: "",
  understanding: "",
  understandingEmotion: "",
  understandingEmotionOther: "",
  counterEvidence: "",
  stress: "",
  perspectiveShift: "",
};

const emptyEvening: EveningContent = {
  promiseProof: "",
  // Trigger fields
  triggerText: "",
  triggerAppraisal: [],
  triggerAppraisalOther: "",
  triggerAppraisalText: "",
  triggerEmotion: "",
  triggerEmotionIntensity: null,
  triggerUrge: "",
  triggerUrgeIntensity: null,
  triggerAction: "",
  triggerActionOther: "",
  triggerShowTier2: false,
  triggerBodyState: [],
  triggerBodyStateText: "",
  triggerOutcome: "",
  triggerRecoveryTime: "",
  triggerReflection: "",
  // Step-Back
  stepBackAdvice: "",
  stepBackLesson: "",
  // Shutdown
  shutdownEnough: "",
  // Positive pattern
  positiveEvent: "",
  positiveInput: "",
  positiveInputOther: "",
  positiveState: "",
  positiveStateOther: "",
  positiveDownstream: "",
  positiveDownstreamOther: "",
  positiveShowDetail: false,
  // Quick mode
  quickRating: null,
  quickRemember: "",
  // Legacy
  review: "",
  feedback: "",
  insight: "",
  lesson: "",
  trigger: "",
  triggerStory: "",
  triggerImpulse: "",
  triggerEmotionOther: "",
  triggerEmotionLevel: "",
  triggerUrgeOther: "",
  triggerUrgeLevel: "",
  triggerBehavior: "",
  triggerNextTime: "",
  satisfied: "",
  dissatisfied: "",
  winOfTheDay: "",
  skipReasons: {},
};

export default function JournalEntryPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { returnTo, finish } = useReturnTo("/journal");
  const params = useParams<{ date: string; session: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const date = params.date;
  const session = params.session as "morning" | "evening";
  const isMorning = session === "morning";

  const [morningData, setMorningData] = useState<MorningContent>(emptyMorning);
  const [eveningData, setEveningData] = useState<EveningContent>(emptyEvening);
  const [isEditing, setIsEditing] = useState(false);
  const [showDayClosed, setShowDayClosed] = useState(false);
  const [journalMode, setJournalMode] = useState<"quick" | "full">(() => {
    return (localStorage.getItem("leaf-journal-mode") as "quick" | "full") || "full";
  });
  useEffect(() => {
    localStorage.setItem("leaf-journal-mode", journalMode);
  }, [journalMode]);

  const { data: existingJournal, isLoading: journalLoading } = useQuery<Journal | null>({
    queryKey: ["/api/journals", date, session],
    enabled: !!user,
  });

  const { data: identityDoc } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
    enabled: !!user,
  });
  const valuesItems = (() => {
    try {
      const parsed = JSON.parse(identityDoc?.values || "");
      if (Array.isArray(parsed)) return parsed.map((v: { value: string }) => v.value).filter(Boolean);
    } catch { /* legacy plain text */ }
    return identityDoc?.values?.split(",").map(s => s.trim()).filter(Boolean) || [];
  })();
  const identityStatement = identityDoc?.identity?.trim() || "";

  // Tuesday/Friday vision reminder in morning journal
  const dayOfWeek = date ? new Date(date + "T12:00:00").getDay() : -1;
  const showVisionReminder = isMorning && (dayOfWeek === 2 || dayOfWeek === 5);
  const visionMonth = date ? format(new Date(date + "T12:00:00"), "yyyy-MM") : "";
  const { data: visionGoal } = useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal", visionMonth],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-goal?month=${visionMonth}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user && showVisionReminder && !!identityDoc?.yearVision,
  });

  // Queries for skipped items (evening journal)
  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: !!user && !isMorning,
  });

  const { data: habitCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions", date],
    enabled: !!user && !isMorning,
  });

  const weekStartStr = date ? format(startOfWeek(new Date(date + "T12:00:00"), { weekStartsOn: 1 }), "yyyy-MM-dd") : "";
  const { data: eisenhowerEntries = [] } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower"],
    enabled: !!user && !isMorning,
  });

  const skippedItems = (() => {
    if (isMorning || !date) return [];
    const items: { id: string; name: string; type: "habit" | "eisenhower" }[] = [];
    const todaysHabits = getTodaysHabits(habits, date);
    const completedHabitIds = new Set(
      habitCompletions.filter(hc => hc.status === "completed").map(hc => hc.habitId)
    );
    todaysHabits.forEach(h => {
      if (!completedHabitIds.has(h.id)) {
        items.push({ id: `habit_${h.id}`, name: h.name, type: "habit" });
      }
    });
    const todaysFocus = getTodaysFocusItems(eisenhowerEntries, weekStartStr, date, date);
    todaysFocus.forEach(e => {
      if (e.status !== "completed") {
        items.push({ id: `eisenhower_${e.id}`, name: e.task, type: "eisenhower" });
      }
    });
    return items;
  })();

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
        challenges: isMorning ? (existingJournal?.challenges || "") : eveningData.triggerText,
      });

      // Write skip reasons back to habit completions and eisenhower entries
      if (!isMorning && eveningData.skipReasons) {
        for (const [key, reason] of Object.entries(eveningData.skipReasons)) {
          if (!reason) continue;
          if (key.startsWith("habit_")) {
            const habitId = key.replace("habit_", "");
            await apiRequest("PATCH", `/api/habit-completions/${habitId}/${date}`, {
              status: "skipped",
              completionLevel: null,
              skipReason: reason,
              skipReasonSource: "reflection",
              skipReasonTimestamp: new Date().toISOString(),
            });
          } else if (key.startsWith("eisenhower_")) {
            const eisId = key.replace("eisenhower_", "");
            await apiRequest("PATCH", `/api/eisenhower/${eisId}`, {
              skipReason: reason,
            });
          }
        }
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journals", date, session] });
      if (!isMorning) {
        queryClient.invalidateQueries({ queryKey: ["/api/habit-completions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
        // "Day closed." moment — fade content, show text, then navigate
        setShowDayClosed(true);
        setTimeout(() => {
          finish();
          window.scrollTo(0, 0);
        }, 1800);
        return;
      }
      toast({
        title: "Journal Saved",
        description: "Your journal entry has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save journal entry.",
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  const updateEveningField = <K extends keyof EveningContent>(field: K, value: EveningContent[K]) => {
    setEveningData(prev => ({ ...prev, [field]: value }));
  };

  // Identity context for morning section
  const IdentityContext = () => {
    if (!identityStatement && valuesItems.length === 0) return null;
    return (
      <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 space-y-1.5" data-testid="identity-context">
        {identityStatement && (
          <p className="text-sm text-muted-foreground italic">{identityStatement}</p>
        )}
        {valuesItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {valuesItems.map((item, i) => (
              <Badge key={i} variant="outline" className="text-xs font-normal text-muted-foreground" data-testid={`badge-value-${i}`}>{item}</Badge>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (showDayClosed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-lg font-medium text-foreground animate-fade-in">Day closed.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => finish()} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/[0.08] flex items-center justify-center">
                {isMorning ? (
                  <Sun className="h-4 w-4 text-amber-500" />
                ) : (
                  <Moon className="h-4 w-4 text-indigo-500" />
                )}
              </div>
              <div>
                <span className="text-sm font-medium capitalize">
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
        {/* Quick mode toggle */}
        <div className="flex justify-center mb-8">
          <button
            type="button"
            onClick={() => setJournalMode(journalMode === "full" ? "quick" : "full")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-toggle-quick"
          >
            {journalMode === "full" ? "Short on time? Try quick check-in" : "Switch to full journal"}
          </button>
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
          /* ==================== MORNING JOURNAL ==================== */
          <div className="space-y-6">
            {/* Section 1 — Check-In */}
            <Card data-testid="card-check-in">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                    <BedDouble className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Check-In</CardTitle>
                    <CardDescription>How are you starting today?</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Sleep */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Sleep</Label>
                    <Input
                      type="number"
                      min="0"
                      max="14"
                      step="0.5"
                      value={morningData.sleepHours}
                      onChange={(e) => updateMorning("sleepHours", e.target.value)}
                      placeholder="Hours"
                      className="w-20"
                      data-testid="input-sleep-hours"
                    />
                  </div>
                  {/* Energy */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Energy</Label>
                    <div className="flex items-center gap-1.5">
                      {energyLabels.map((label, i) => {
                        const selected = morningData.energyLevel === String(i);
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => updateMorning("energyLevel", String(i))}
                            title={label}
                            className={`w-5 h-5 rounded-full border-2 transition-colors cursor-pointer ${
                              selected
                                ? "bg-primary border-primary"
                                : "bg-transparent border-border hover:border-primary/50"
                            }`}
                            data-testid={`button-energy-${i}`}
                            aria-label={label}
                          />
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {morningData.energyLevel ? energyLabels[Number(morningData.energyLevel)] : "Tap to select"}
                    </p>
                  </div>
                  {/* Stress */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Stress</Label>
                    <div className="flex items-center gap-1.5">
                      {stressLabels.map((label, i) => {
                        const selected = morningData.stressLevel === String(i);
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => updateMorning("stressLevel", String(i))}
                            title={label}
                            className={`w-5 h-5 rounded-full border-2 transition-colors cursor-pointer ${
                              selected
                                ? "bg-orange-400 border-orange-400"
                                : "bg-transparent border-border hover:border-orange-400/50"
                            }`}
                            data-testid={`button-stress-${i}`}
                            aria-label={label}
                          />
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {morningData.stressLevel ? stressLabels[Number(morningData.stressLevel)] : "Tap to select"}
                    </p>
                  </div>
                </div>

                {/* Gratitude */}
                <div className="space-y-2 mt-4">
                  <Label className="text-sm font-medium">What I'm grateful for</Label>
                  <Textarea
                    value={morningData.gratitude}
                    onChange={(e) => updateMorning("gratitude", e.target.value)}
                    placeholder="I am grateful for..."
                    className="min-h-[60px] max-h-[80px] resize-none"
                    data-testid="input-gratitude"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 2 — Identity */}
            <Card data-testid="card-identity">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                    <Compass className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Identity</CardTitle>
                    <CardDescription>Live from your values today</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Which value matters most today?</Label>
                  {valuesItems.length > 0 ? (
                    <div className="flex flex-wrap gap-2" data-testid="value-chips">
                      {valuesItems.map((value, i) => {
                        const selected = morningData.todayValue === value;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => updateMorning("todayValue", selected ? "" : value)}
                            className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors cursor-pointer ${
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-primary/40 text-primary hover:bg-primary/[0.08]"
                            }`}
                            data-testid={`chip-value-${i}`}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Set up your values in your <button type="button" onClick={() => setLocation("/identity")} className="underline hover:text-foreground transition-colors">Identity Document</button> first.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">One observable action that would prove it today is...</Label>
                  <Input
                    value={morningData.proofAction}
                    onChange={(e) => updateMorning("proofAction", e.target.value)}
                    placeholder="e.g. Send the message I've been avoiding"
                    data-testid="input-proof-action"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">If ___ gets in the way, then I will ___</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      value={morningData.ifThenObstacle}
                      onChange={(e) => updateMorning("ifThenObstacle", e.target.value)}
                      placeholder="The obstacle"
                      data-testid="input-if-then-obstacle"
                    />
                    <Input
                      value={morningData.ifThenResponse}
                      onChange={(e) => updateMorning("ifThenResponse", e.target.value)}
                      placeholder="My response"
                      data-testid="input-if-then-response"
                    />
                  </div>
                </div>

                {/* Read this aloud — identity statement */}
                {identityStatement ? (
                  <div className="rounded-lg border-l-4 border-l-primary bg-primary/[0.04] px-4 py-3 space-y-1" data-testid="identity-read-aloud">
                    <p className="text-xs font-medium text-muted-foreground">Read this aloud:</p>
                    <p className="text-base italic text-foreground">{identityStatement}</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                      Set up your identity statement in your{" "}
                      <button type="button" onClick={() => setLocation("/identity")} className="underline hover:text-foreground transition-colors">Identity Document</button>{" "}
                      first.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vision Reminder — Tuesday/Friday */}
            {showVisionReminder && identityDoc?.yearVision && (
              <VisionCard
                domain={identityDoc.visionDomain || ""}
                scene={identityDoc.yearVision || ""}
                proofPoint={visionGoal?.successProof || ""}
                metric={visionGoal?.proofMetric || ""}
                ifThenPlan={visionGoal?.ifThenPlan1 || ""}
              />
            )}

            {/* Section 3 — Let Go (full mode only) */}
            {journalMode === "full" && (
              <Card data-testid="card-let-go">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                      <Feather className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">Let Go</CardTitle>
                      <CardDescription>Release what doesn't serve you</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">One thing I am letting go of today:</Label>
                    <Input
                      value={morningData.lettingGo}
                      onChange={(e) => updateMorning("lettingGo", e.target.value)}
                      placeholder="Today I'm letting go of..."
                      data-testid="input-letting-go"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* ==================== EVENING JOURNAL ==================== */
          <EveningJournal
            eveningData={eveningData}
            updateEvening={updateEvening}
            updateEveningField={updateEveningField}
            setEveningData={setEveningData}
            journalMode={journalMode}
            skippedItems={skippedItems}
            identityStatement={identityStatement}
          />
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
