import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/app-header";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sparkles, BookOpen, Package, Lock, ArrowRight, CheckCircle,
  Brain, Heart, Grid3X3, Users, Zap,
  Video, MessageSquare, Repeat, ListTodo,
  Sun, Moon, Check, Clock, AlertTriangle, BarChart3
} from "lucide-react";
import { useLocation } from "wouter";
import { format, startOfWeek } from "date-fns";
import type { Purchase, Habit, HabitCompletion, Journal, EisenhowerEntry } from "@shared/schema";
import { HABIT_CATEGORIES, type HabitCategory } from "@shared/schema";

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const CATEGORY_STYLES: Record<string, { dot: string }> = {
  health: { dot: "bg-emerald-500" },
  wealth: { dot: "bg-amber-500" },
  relationships: { dot: "bg-rose-500" },
  career: { dot: "bg-blue-500" },
  mindfulness: { dot: "bg-violet-500" },
  learning: { dot: "bg-cyan-500" },
};

function getItemStatus(done: boolean, isPast: boolean): { label: string; className: string } {
  if (done) return { label: "Done", className: "bg-green-500/10 text-green-600 border-green-500/20" };
  if (isPast) return { label: "Behind", className: "bg-red-500/10 text-red-600 border-red-500/20" };
  return { label: "To Do", className: "bg-muted text-muted-foreground" };
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: purchases, isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
    enabled: !!user,
  });

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const currentHour = today.getHours();
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: !!user,
  });

  const { data: habitCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions", todayStr],
    enabled: !!user,
  });

  const { data: journals = [] } = useQuery<Journal[]>({
    queryKey: ["/api/journals"],
    enabled: !!user,
  });

  const { data: eisenhowerEntries = [] } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower"],
    enabled: !!user,
  });

  const hasPhase12 = purchases?.some(p => 
    p.courseType === "phase12" || p.courseType === "allinone" || 
    p.courseType === "course1" || p.courseType === "course2" || p.courseType === "bundle"
  );
  const hasPhase3 = purchases?.some(p => 
    p.courseType === "phase3" || p.courseType === "allinone" || p.courseType === "bundle"
  );

  const todayDayCode = DAY_CODES[today.getDay()];
  const todaysHabits = habits.filter(h => h.cadence.split(",").includes(todayDayCode));
  const completedHabitIds = new Set(habitCompletions.map(hc => hc.habitId));

  const todayJournals = journals.filter(j => j.date === todayStr);
  const hasMorning = todayJournals.some(j => j.session === "morning");
  const hasEvening = todayJournals.some(j => j.session === "evening");

  const todayPriority = eisenhowerEntries.filter(e => (e.quadrant === "q1" || e.quadrant === "q2") && e.deadline === todayStr);

  const totalItems = 2 + todaysHabits.length + todayPriority.length;
  let completedItems = 0;
  if (hasMorning) completedItems++;
  if (hasEvening) completedItems++;
  todaysHabits.forEach(h => { if (completedHabitIds.has(h.id)) completedItems++; });
  todayPriority.forEach(e => { if (e.completed) completedItems++; });
  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-16 w-full mb-8" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="mb-12 max-w-5xl">
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-lg text-muted-foreground">
            Continue your journey of self-discovery and transformation.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-8">
          <div>
            {!hasPhase12 && !hasPhase3 && (
              <Card className="mb-10 overflow-visible" data-testid="card-allinone-promo">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <Package className="h-6 w-6 text-primary" />
                        <CardTitle className="font-serif text-xl">Get the Complete Inner Journey</CardTitle>
                      </div>
                      <CardDescription className="text-base">All 3 phases for $499 (save $199 vs. buying separately)</CardDescription>
                    </div>
                    <Button 
                      size="lg"
                      className="w-full sm:w-auto shrink-0"
                      onClick={() => setLocation("/checkout/allinone")}
                      data-testid="button-buy-allinone"
                    >
                      Get Started - $499
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            )}

            <div className="mb-12">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <Heart className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-2xl font-bold">Phase 1: Self-Reflection</h2>
                {hasPhase12 ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Unlocked
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Lock className="h-3 w-3 mr-1" />
                    Locked
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mb-6">
                Explore who you are and who you want to become through video lessons and AI-guided conversations.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card 
                  className={`overflow-visible ${hasPhase12 ? "hover-elevate cursor-pointer" : "opacity-70"}`}
                  onClick={() => hasPhase12 && setLocation("/course")}
                  data-testid="card-lesson1"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                        <Video className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <Badge variant="outline" className="text-xs mb-1">Lesson 1</Badge>
                        <CardTitle className="font-serif text-base">Who Am I?</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-sm">Deep self-reflection through guided video</CardDescription>
                  </CardHeader>
                </Card>

                <Card 
                  className={`overflow-visible ${hasPhase12 ? "hover-elevate cursor-pointer" : "opacity-70"}`}
                  onClick={() => hasPhase12 && setLocation("/course")}
                  data-testid="card-lesson2"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                        <Video className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <Badge variant="outline" className="text-xs mb-1">Lesson 2</Badge>
                        <CardTitle className="font-serif text-base">Who Do I Want To Be?</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-sm">Build a clear vision of your future self</CardDescription>
                  </CardHeader>
                </Card>

                <Card 
                  className={`overflow-visible ${hasPhase12 ? "hover-elevate cursor-pointer" : "opacity-70"}`}
                  onClick={() => hasPhase12 && setLocation("/course1")}
                  data-testid="card-gpt-chat"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="font-serif text-base">Self-Discovery GPT</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-sm">AI-guided conversations for deep self-exploration</CardDescription>
                  </CardHeader>
                </Card>
              </div>
              {!hasPhase12 && (
                <div className="mt-4">
                  <Button variant="outline" onClick={() => setLocation("/checkout/phase12")} data-testid="button-unlock-phase12">
                    Unlock Phase 1 & 2 - $399
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="mb-12">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-2xl font-bold">Phase 2: Structure</h2>
                {hasPhase12 ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Unlocked
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Lock className="h-3 w-3 mr-1" />
                    Locked
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mb-6">
                Build the daily systems and habits that turn self-knowledge into lasting change.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card 
                  className={`overflow-visible ${hasPhase12 ? "hover-elevate cursor-pointer" : "opacity-70"}`}
                  onClick={() => hasPhase12 && setLocation("/course")}
                  data-testid="card-lesson3"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                        <Video className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <Badge variant="outline" className="text-xs mb-1">Lesson 3</Badge>
                        <CardTitle className="font-serif text-base">How To Get There</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-sm">Learn how to use your daily tools</CardDescription>
                  </CardHeader>
                </Card>

                <Card 
                  className={`overflow-visible ${hasPhase12 ? "hover-elevate cursor-pointer" : "opacity-70"}`}
                  onClick={() => hasPhase12 && setLocation("/course2")}
                  data-testid="card-journal"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="font-serif text-base">Journaling</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-sm">Morning & evening reflection sessions</CardDescription>
                  </CardHeader>
                </Card>

                <Card 
                  className={`overflow-visible ${hasPhase12 ? "hover-elevate cursor-pointer" : "opacity-70"}`}
                  onClick={() => hasPhase12 && setLocation("/habits")}
                  data-testid="card-habits"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                        <Repeat className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="font-serif text-base">Habits</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-sm">Build recurring habits with flexible scheduling</CardDescription>
                  </CardHeader>
                </Card>

                <Card 
                  className={`overflow-visible ${hasPhase12 ? "hover-elevate cursor-pointer" : "opacity-70"}`}
                  onClick={() => hasPhase12 && setLocation("/tasks")}
                  data-testid="card-tasks"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                        <ListTodo className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="font-serif text-base">Daily Tasks</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-sm">Track up to 3 daily tasks with quadrant labels</CardDescription>
                  </CardHeader>
                </Card>
              </div>
              {!hasPhase12 && (
                <div className="mt-4">
                  <Button variant="outline" onClick={() => setLocation("/checkout/phase12")} data-testid="button-unlock-phase12-2">
                    Unlock Phase 1 & 2 - $399
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="mb-12">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <Zap className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-2xl font-bold">Phase 3: Transformation</h2>
                {hasPhase3 ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Unlocked
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Lock className="h-3 w-3 mr-1" />
                    Locked
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mb-6">
                Understand your patterns and transform them with AI-powered analysis and personalized insights.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card 
                  className={`overflow-visible ${hasPhase3 ? "hover-elevate cursor-pointer" : "opacity-70"}`}
                  onClick={() => hasPhase3 && setLocation("/phase3")}
                  data-testid="card-phase3-lesson"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                        <Video className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <Badge variant="outline" className="text-xs mb-1">Lesson</Badge>
                        <CardTitle className="font-serif text-base">You Are Your Patterns</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-sm">Understand the patterns shaping your life</CardDescription>
                  </CardHeader>
                </Card>

                <Card 
                  className={`overflow-visible ${hasPhase3 ? "hover-elevate cursor-pointer" : "opacity-70"}`}
                  onClick={() => hasPhase3 && setLocation("/phase3")}
                  data-testid="card-transformation-agent"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="font-serif text-base">Transformation Agent</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-sm">Upload documents & get AI pattern analysis</CardDescription>
                  </CardHeader>
                </Card>
              </div>
              {!hasPhase3 && (
                <div className="mt-4">
                  <Button variant="outline" onClick={() => setLocation("/checkout/phase3")} data-testid="button-unlock-phase3">
                    Unlock Phase 3 - $299
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="mb-10">
              <h2 className="font-serif text-2xl font-bold mb-4">Self-Development Tools</h2>
              <p className="text-muted-foreground mb-6">
                Free tools available to all users to support your growth practice.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/meditation")} data-testid="card-meditation">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                        <Brain className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="font-serif text-base">Meditation</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-sm">Integrative meditation for subconscious processing</CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/emotional-processing")} data-testid="card-emotional">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                        <Heart className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="font-serif text-base">Emotional Processing</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-sm">Feel, name, regulate, and move forward</CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/eisenhower")} data-testid="card-eisenhower">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                        <Grid3X3 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="font-serif text-base">Eisenhower Matrix</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-sm">Weekly priority planning by category & quadrant</CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/empathy")} data-testid="card-empathy">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="font-serif text-base">Empathy Module</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-sm">Reflect on interactions and build understanding</CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/progress")} data-testid="card-progress">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                        <BarChart3 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="font-serif text-base">Weekly Progress</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-sm">Track your program adherence over time</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start" data-testid="sidebar-today-progress">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="font-serif text-lg">Today's Progress</CardTitle>
                  <Badge variant={completedItems >= totalItems ? "default" : "outline"} data-testid="badge-progress">
                    {completedItems}/{totalItems}
                  </Badge>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden mt-3">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${progressPct}%` }}
                    data-testid="progress-bar"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    Journaling
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-amber-500" />
                        <span className="text-sm">Morning</span>
                      </div>
                      <Badge variant="outline" className={`text-xs ${getItemStatus(hasMorning, currentHour >= 12).className}`} data-testid="status-morning">
                        {hasMorning && <Check className="h-3 w-3 mr-1" />}
                        {!hasMorning && currentHour >= 12 && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {getItemStatus(hasMorning, currentHour >= 12).label}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4 text-indigo-500" />
                        <span className="text-sm">Evening</span>
                      </div>
                      <Badge variant="outline" className={`text-xs ${getItemStatus(hasEvening, currentHour >= 22).className}`} data-testid="status-evening">
                        {hasEvening && <Check className="h-3 w-3 mr-1" />}
                        {!hasEvening && currentHour >= 22 && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {getItemStatus(hasEvening, currentHour >= 22).label}
                      </Badge>
                    </div>
                  </div>
                </div>

                {todaysHabits.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-1.5">
                      <Repeat className="h-3.5 w-3.5" />
                      Habits
                    </p>
                    <div className="space-y-2">
                      {todaysHabits.map(habit => {
                        const done = completedHabitIds.has(habit.id);
                        const catStyle = CATEGORY_STYLES[habit.category || "health"];
                        const isPast = habit.endTime ? currentHour >= parseInt(habit.endTime.split(":")[0]) : false;
                        const status = getItemStatus(done, isPast);
                        return (
                          <div key={habit.id} className="flex items-center justify-between gap-3 py-1.5" data-testid={`sidebar-habit-${habit.id}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${catStyle?.dot || "bg-muted"}`} />
                              <span className={`text-sm truncate ${done ? "line-through text-muted-foreground" : ""}`}>{habit.name}</span>
                            </div>
                            <Badge variant="outline" className={`text-xs shrink-0 ${status.className}`}>
                              {done && <Check className="h-3 w-3 mr-1" />}
                              {!done && isPast && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {status.label}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {todayPriority.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-1.5">
                      <Grid3X3 className="h-3.5 w-3.5" />
                      Priority Items
                    </p>
                    <div className="space-y-2">
                      {todayPriority.map(entry => {
                        const done = entry.completed || false;
                        const status = getItemStatus(done, !done);
                        return (
                          <div key={entry.id} className="flex items-center justify-between gap-3 py-1.5" data-testid={`sidebar-q2-${entry.id}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`text-sm truncate ${done ? "line-through text-muted-foreground" : ""}`}>{entry.task}</span>
                            </div>
                            <Badge variant="outline" className={`text-xs shrink-0 ${status.className}`}>
                              {done && <Check className="h-3 w-3 mr-1" />}
                              {!done && <Clock className="h-3 w-3 mr-1" />}
                              {status.label}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {totalItems === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No items scheduled for today
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
