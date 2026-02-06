import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/app-header";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sparkles, BookOpen, Package, Lock, ArrowRight, CheckCircle,
  Brain, Heart, Grid3X3, Users, CheckSquare, Layers, Zap,
  Video, MessageSquare, Calendar, Compass
} from "lucide-react";
import { useLocation } from "wouter";
import type { Purchase } from "@shared/schema";

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: purchases, isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
    enabled: !!user,
  });

  const hasPhase12 = purchases?.some(p => 
    p.courseType === "phase12" || p.courseType === "allinone" || 
    p.courseType === "course1" || p.courseType === "course2" || p.courseType === "bundle"
  );
  const hasPhase3 = purchases?.some(p => 
    p.courseType === "phase3" || p.courseType === "allinone" || p.courseType === "bundle"
  );

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

      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="mb-10">
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-lg text-muted-foreground">
            Continue your journey of self-discovery and transformation.
          </p>
        </div>

        {!hasPhase12 && !hasPhase3 && (
          <Card className="mb-10 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent overflow-visible" data-testid="card-allinone-promo">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shadow-sm shrink-0">
                  <Package className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="font-serif text-xl mb-1">Get the Complete Inner Journey</CardTitle>
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

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <Heart className="h-6 w-6 text-primary" />
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
          <p className="text-muted-foreground mb-4">
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
                  <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Video className="h-5 w-5 text-muted-foreground" />
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
                  <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Video className="h-5 w-5 text-muted-foreground" />
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
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
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

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="h-6 w-6 text-primary" />
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
          <p className="text-muted-foreground mb-4">
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
                  <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Video className="h-5 w-5 text-muted-foreground" />
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
                  <div className="h-10 w-10 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-amber-500" />
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
              data-testid="card-habits-tasks"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-md bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <CheckSquare className="h-5 w-5 text-cyan-500" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-base">Habits & Tasks</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-sm">Weekly habits & daily tasks with quadrants</CardDescription>
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

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="h-6 w-6 text-primary" />
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
          <p className="text-muted-foreground mb-4">
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
                  <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Video className="h-5 w-5 text-muted-foreground" />
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
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
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
          <h2 className="font-serif text-2xl font-bold mb-6">Self-Development Tools</h2>
          <p className="text-muted-foreground mb-4">
            Free tools available to all users to support your growth practice.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/meditation")} data-testid="card-meditation">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-md bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <Brain className="h-6 w-6 text-indigo-500" />
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
                  <div className="h-10 w-10 rounded-md bg-rose-500/10 flex items-center justify-center shrink-0">
                    <Heart className="h-6 w-6 text-rose-500" />
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
                  <div className="h-10 w-10 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Grid3X3 className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-base">Eisenhower Matrix</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-sm">Weekly priority planning by role & quadrant</CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/empathy")} data-testid="card-empathy">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Users className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-base">Empathy Module</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-sm">Reflect on interactions and build understanding</CardDescription>
              </CardHeader>
            </Card>

          </div>
        </div>
      </main>
    </div>
  );
}
