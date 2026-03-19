import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { VoiceTextarea } from "@/components/voice-input";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Sun, Moon, Save, Loader2, Heart, Shield, Target, Power, BedDouble, AlertTriangle, ChevronDown, Compass, Eye } from "lucide-react";
import {
  APPRAISALS, EMOTIONS, URGES, ACTIONS, BODY_STATES, RECOVERY_TIMES,
  Chip, IntensityDots,
} from "@/components/tools/trigger-chips";
import { useLocation, useParams } from "wouter";
import { format, parseISO } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Journal, MonthlyGoal, IdentityDocument } from "@shared/schema";

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

interface EveningContent {
  // Win of the Day
  promiseProof: string;
  // Trigger log fields (chip-based)
  triggerText: string;
  triggerAppraisal: string[];
  triggerAppraisalOther: string;
  triggerEmotion: string;
  triggerEmotionIntensity: number | null;
  triggerUrge: string;
  triggerUrgeIntensity: number | null;
  triggerAction: string;
  triggerActionOther: string;
  triggerShowTier2: boolean;
  triggerBodyState: string[];
  triggerOutcome: string;
  triggerRecoveryTime: string;
  triggerReflection: string;
  // Step-Back Reflection
  stepBackAdvice: string;
  stepBackLesson: string;
  // Shutdown
  shutdownEnough: string;
  shutdownTomorrow: string;
  tomorrowStepTime: string;
  // Quick mode
  quickRating: number | null;
  quickRemember: string;
  // Legacy keys
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
  triggerEmotion: "",
  triggerEmotionIntensity: null,
  triggerUrge: "",
  triggerUrgeIntensity: null,
  triggerAction: "",
  triggerActionOther: "",
  triggerShowTier2: false,
  triggerBodyState: [],
  triggerOutcome: "",
  triggerRecoveryTime: "",
  triggerReflection: "",
  // Step-Back
  stepBackAdvice: "",
  stepBackLesson: "",
  // Shutdown
  shutdownEnough: "",
  shutdownTomorrow: "",
  tomorrowStepTime: "08:00",
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
  const identityStatement = identityDoc?.identity?.trim() || "";

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
        challenges: isMorning ? morningData.avoidance : eveningData.triggerText,
        tomorrowGoals: isMorning ? "" : eveningData.shutdownTomorrow,
      });

      // Also save trigger log entry if evening trigger data is filled
      if (!isMorning && eveningData.triggerText.trim() && eveningData.triggerEmotion && eveningData.triggerUrge) {
        const appraisalParts = [...eveningData.triggerAppraisal.filter((a) => a !== "Other")];
        if (eveningData.triggerAppraisal.includes("Other") && eveningData.triggerAppraisalOther.trim()) {
          appraisalParts.push(eveningData.triggerAppraisalOther.trim());
        }
        const actionValue = eveningData.triggerAction === "Other" && eveningData.triggerActionOther.trim()
          ? eveningData.triggerActionOther.trim()
          : eveningData.triggerAction || undefined;

        await apiRequest("POST", "/api/trigger-logs", {
          date,
          triggerText: eveningData.triggerText,
          appraisal: appraisalParts.length > 0 ? appraisalParts.join(", ") : undefined,
          emotion: eveningData.triggerEmotion,
          emotionIntensity: eveningData.triggerEmotionIntensity,
          urge: eveningData.triggerUrge,
          urgeIntensity: eveningData.triggerUrgeIntensity,
          whatIDid: actionValue,
          actionTaken: actionValue,
          bodyState: eveningData.triggerBodyState.length > 0 ? eveningData.triggerBodyState.join(", ") : undefined,
          outcome: eveningData.triggerOutcome.trim() || undefined,
          recoveryTime: eveningData.triggerRecoveryTime || undefined,
          reflection: eveningData.triggerReflection.trim() || undefined,
        });
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Journal Saved",
        description: "Your journal entry has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/journals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journals", date, session] });
      if (!isMorning && eveningData.triggerText.trim()) {
        queryClient.invalidateQueries({ queryKey: ["/api/trigger-logs"] });
      }
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

  const updateMorningField = <K extends keyof MorningContent>(field: K, value: MorningContent[K]) => {
    setMorningData(prev => ({ ...prev, [field]: value }));
  };

  const toggleEveningChip = (field: "triggerAppraisal" | "triggerBodyState", val: string) => {
    setEveningData(prev => {
      const arr = prev[field];
      return { ...prev, [field]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
    });
  };

  // Identity context card shared between morning Identity section and evening Step-Back
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/journal")} data-testid="button-back">
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
          <div className="space-y-10">
            {/* Section 1 — Check-In */}
            <Card data-testid="card-check-in">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                    <BedDouble className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-lg">Check-In</CardTitle>
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
                                ? "bg-emerald-500 border-emerald-500"
                                : "bg-transparent border-border hover:border-emerald-500/50"
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
              </CardContent>
            </Card>

            {/* Section 2 — Identity */}
            <Card data-testid="card-identity">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                    <Compass className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-lg">Identity</CardTitle>
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
                  <div className="rounded-lg border-l-4 border-primary bg-primary/[0.04] px-4 py-3 space-y-1" data-testid="identity-read-aloud">
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

            {/* Section 3 — Avoidance (full mode only) */}
            {journalMode === "full" && (
              <Card data-testid="card-courage">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="font-serif text-lg">Courage</CardTitle>
                      <CardDescription>Face what you're avoiding</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasGoal && (
                    <div className="rounded-md bg-muted/50 px-4 py-3" data-testid="goal-context">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Monthly Goal</p>
                      <p className="text-sm">{goalDisplayText}</p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">What am I avoiding?</Label>
                    <Textarea
                      value={morningData.avoidance}
                      onChange={(e) => updateMorning("avoidance", e.target.value)}
                      placeholder="The thing I'm avoiding is..."
                      rows={2}
                      className="resize-none text-sm"
                      data-testid="input-avoidance"
                    />
                  </div>

                  {morningData.avoidance.trim() ? (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Which value does facing this serve?</Label>
                        {valuesItems.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {valuesItems.map((value, i) => {
                              const selected = morningData.avoidanceValue === value;
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => updateMorning("avoidanceValue", selected ? "" : value)}
                                  className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors cursor-pointer ${
                                    selected
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-primary/40 text-primary hover:bg-primary/[0.08]"
                                  }`}
                                  data-testid={`chip-avoidance-value-${i}`}
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

                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Discomfort level</Label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Button
                              key={n}
                              variant={morningData.avoidanceDiscomfort === n ? "default" : "outline"}
                              size="sm"
                              className="flex-1"
                              type="button"
                              onClick={() => updateMorningField("avoidanceDiscomfort", n)}
                              data-testid={`button-avoidance-discomfort-${n}`}
                            >
                              {n}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">What do I think will happen if I do this?</Label>
                        <Input
                          value={morningData.avoidanceFear}
                          onChange={(e) => updateMorning("avoidanceFear", e.target.value)}
                          placeholder="My fear is that..."
                          data-testid="input-avoidance-fear"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Smallest exposure rep</Label>
                        <Textarea
                          value={morningData.courageAction}
                          onChange={(e) => updateMorning("courageAction", e.target.value)}
                          placeholder="The tiniest step I could take..."
                          rows={2}
                          className="resize-none text-sm"
                          data-testid="input-courage-action"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">I'll do this at:</Label>
                        <Input
                          type="time"
                          value={morningData.exposureTime}
                          onChange={(e) => updateMorning("exposureTime", e.target.value)}
                          className="w-32"
                          data-testid="input-exposure-time"
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Nothing to avoid? That's a win — skip this section.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Section 4 — Happiness (full mode only) */}
            {journalMode === "full" && (
              <Card data-testid="card-happiness">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                      <Heart className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="font-serif text-lg">Happiness</CardTitle>
                      <CardDescription className="italic">"Every day should be a happy day"</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Who or what am I grateful for today?</Label>
                    <Textarea
                      value={morningData.gratitude}
                      onChange={(e) => updateMorning("gratitude", e.target.value)}
                      placeholder="I am grateful for..."
                      className="min-h-[60px] max-h-[80px] resize-none"
                      data-testid="input-gratitude"
                    />
                  </div>
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
          <div className="space-y-10">
            {journalMode === "quick" ? (
              /* Evening Quick Mode */
              <>
                <Card data-testid="card-quick-evening">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                        <Moon className="h-4 w-4 text-indigo-500" />
                      </div>
                      <div>
                        <CardTitle className="font-serif text-lg">Quick Close</CardTitle>
                        <CardDescription>15-second evening check-in</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">How was today overall?</Label>
                      <div className="flex items-center justify-center gap-3" data-testid="quick-rating">
                        {[1, 2, 3, 4, 5].map((n) => {
                          const selected = eveningData.quickRating === n;
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => updateEveningField("quickRating", selected ? null : n)}
                              className={`h-10 w-10 rounded-full border-2 text-sm font-bold transition-all cursor-pointer ${
                                selected
                                  ? "border-primary bg-primary text-primary-foreground scale-110"
                                  : "border-border text-muted-foreground hover:border-primary/40"
                              }`}
                              data-testid={`button-quick-rating-${n}`}
                            >
                              {n}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground px-1">
                        <span>Rough</span>
                        <span>Great</span>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">One thing to remember</Label>
                      <Input
                        value={eveningData.quickRemember}
                        onChange={(e) => updateEvening("quickRemember", e.target.value)}
                        placeholder="Today I learned..."
                        data-testid="input-quick-remember"
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              /* Evening Full Mode */
              <>
                {/* Section 1 — Trigger Check */}
                <Card data-testid="card-trigger-check">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-md bg-amber-500/[0.08] flex items-center justify-center shrink-0">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <CardTitle className="font-serif text-lg">Trigger Check</CardTitle>
                        <CardDescription>Log any triggers from today <Badge variant="outline" className="ml-2 text-xs">Optional</Badge></CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 1. What happened */}
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">What happened?</Label>
                      <Input
                        value={eveningData.triggerText}
                        onChange={(e) => updateEvening("triggerText", e.target.value)}
                        placeholder="Brief description of the situation"
                        className="text-sm"
                        data-testid="input-journal-trigger-text"
                      />
                    </div>

                    {eveningData.triggerText.trim() && (
                      <>
                        {/* 2. This felt like... */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">This felt like...</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {APPRAISALS.map((a) => (
                              <Chip
                                key={a}
                                label={a}
                                selected={eveningData.triggerAppraisal.includes(a)}
                                onClick={() => toggleEveningChip("triggerAppraisal", a)}
                              />
                            ))}
                          </div>
                          {eveningData.triggerAppraisal.includes("Other") && (
                            <Input
                              value={eveningData.triggerAppraisalOther}
                              onChange={(e) => updateEvening("triggerAppraisalOther", e.target.value)}
                              placeholder="Describe..."
                              className="text-sm mt-1.5"
                            />
                          )}
                        </div>

                        {/* 3. Emotion + intensity */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Emotion</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {EMOTIONS.map((e) => (
                              <Chip
                                key={e}
                                label={e}
                                selected={eveningData.triggerEmotion === e}
                                onClick={() => updateEvening("triggerEmotion", eveningData.triggerEmotion === e ? "" : e)}
                              />
                            ))}
                          </div>
                          {eveningData.triggerEmotion && (
                            <IntensityDots
                              value={eveningData.triggerEmotionIntensity}
                              onChange={(n) => updateEveningField("triggerEmotionIntensity", n)}
                              testIdPrefix="journal-emotion-intensity"
                            />
                          )}
                        </div>

                        {/* 4. Urge + intensity */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Urge</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {URGES.map((u) => (
                              <Chip
                                key={u}
                                label={u}
                                selected={eveningData.triggerUrge === u}
                                onClick={() => updateEvening("triggerUrge", eveningData.triggerUrge === u ? "" : u)}
                              />
                            ))}
                          </div>
                          {eveningData.triggerUrge && (
                            <IntensityDots
                              value={eveningData.triggerUrgeIntensity}
                              onChange={(n) => updateEveningField("triggerUrgeIntensity", n)}
                              testIdPrefix="journal-urge-intensity"
                            />
                          )}
                        </div>

                        {/* 5. What did you do? */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">What did you do?</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {ACTIONS.map((a) => (
                              <Chip
                                key={a}
                                label={a}
                                selected={eveningData.triggerAction === a}
                                onClick={() => updateEvening("triggerAction", eveningData.triggerAction === a ? "" : a)}
                              />
                            ))}
                          </div>
                          {eveningData.triggerAction === "Other" && (
                            <Input
                              value={eveningData.triggerActionOther}
                              onChange={(e) => updateEvening("triggerActionOther", e.target.value)}
                              placeholder="Describe..."
                              className="text-sm mt-1.5"
                            />
                          )}
                        </div>

                        {/* Tier 2 expand */}
                        {!eveningData.triggerShowTier2 && (
                          <button
                            type="button"
                            onClick={() => updateEveningField("triggerShowTier2", true)}
                            className="flex items-center justify-center gap-1 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                          >
                            Add more detail
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        )}

                        {/* Tier 2 — Enrichment */}
                        {eveningData.triggerShowTier2 && (
                          <div className="space-y-4 pt-2 border-t border-border">
                            <div className="space-y-1.5">
                              <Label className="text-sm font-medium">What did you feel in your body?</Label>
                              <div className="flex flex-wrap gap-1.5">
                                {BODY_STATES.map((b) => (
                                  <Chip
                                    key={b}
                                    label={b}
                                    selected={eveningData.triggerBodyState.includes(b)}
                                    onClick={() => toggleEveningChip("triggerBodyState", b)}
                                  />
                                ))}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-sm font-medium">What happened right after?</Label>
                              <Input
                                value={eveningData.triggerOutcome}
                                onChange={(e) => updateEvening("triggerOutcome", e.target.value)}
                                placeholder="Brief description..."
                                className="text-sm"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-sm font-medium">How long until you felt calm?</Label>
                              <div className="flex flex-wrap gap-1.5">
                                {RECOVERY_TIMES.map((r) => (
                                  <Chip
                                    key={r}
                                    label={r}
                                    selected={eveningData.triggerRecoveryTime === r}
                                    onClick={() => updateEvening("triggerRecoveryTime", eveningData.triggerRecoveryTime === r ? "" : r)}
                                  />
                                ))}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-sm font-medium">
                                Reflection <span className="text-xs text-muted-foreground">(optional)</span>
                              </Label>
                              <VoiceTextarea
                                value={eveningData.triggerReflection}
                                onChange={(val) => updateEvening("triggerReflection", val)}
                                placeholder="Any insight about this pattern?"
                                className="min-h-[60px] resize-none"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {!eveningData.triggerText.trim() && (
                      <p className="text-xs text-muted-foreground">No trigger? That's a win — skip this section.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Section 3 — Step-Back Reflection */}
                <Card data-testid="card-step-back">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                        <Eye className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="font-serif text-lg">Step-Back Reflection</CardTitle>
                        <CardDescription>See your day through compassionate eyes</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <IdentityContext />

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">If someone I care about had my day today, what would I tell them?</Label>
                      <VoiceTextarea
                        value={eveningData.stepBackAdvice}
                        onChange={(val) => updateEvening("stepBackAdvice", val)}
                        placeholder="I would tell them..."
                        className="min-h-[100px] max-h-[150px] resize-none"
                        data-testid="input-step-back-advice"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">The lesson I would want them to remember:</Label>
                      <Input
                        value={eveningData.stepBackLesson}
                        onChange={(e) => updateEvening("stepBackLesson", e.target.value)}
                        placeholder="Remember that..."
                        data-testid="input-step-back-lesson"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Section 4 — Shutdown */}
                <Card data-testid="card-shutdown">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                        <Power className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="font-serif text-lg">Shutdown</CardTitle>
                        <CardDescription>Close out your day with intention</CardDescription>
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
              </>
            )}
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
