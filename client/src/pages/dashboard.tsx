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

      <main className="container mx-auto px-4 py-10">
        <div className="mb-10">
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-lg text-muted-foreground">
            Continue your journey of self-discovery and transformation
          </p>
        </div>

        <div className="mb-8">
          <h2 className="font-serif text-2xl font-bold mb-6">Your Course</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="hover-elevate group relative overflow-visible" data-testid="card-phase12">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
                    <Layers className="h-7 w-7 text-primary" />
                  </div>
                  {hasPhase12 ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Owned
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      <Lock className="h-3 w-3 mr-1" />
                      $399
                    </Badge>
                  )}
                </div>
                <CardTitle className="font-serif text-xl mb-2">Phase 1 & 2: Self-Reflection & Structure</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Discover who you are, envision who you want to be, and build the daily systems to get there.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {hasPhase12 ? (
                  <Button 
                    className="w-full" 
                    onClick={() => setLocation("/course")}
                    data-testid="button-access-phase12"
                  >
                    Open Course
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setLocation("/checkout/phase12")}
                    data-testid="button-unlock-phase12"
                  >
                    Unlock Phase 1 & 2
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="hover-elevate group relative overflow-visible" data-testid="card-phase3">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
                    <Zap className="h-7 w-7 text-primary" />
                  </div>
                  {hasPhase3 ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Owned
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      <Lock className="h-3 w-3 mr-1" />
                      $299
                    </Badge>
                  )}
                </div>
                <CardTitle className="font-serif text-xl mb-2">Phase 3: Transformation</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Understand your patterns and transform them with AI-powered analysis and personalized insights.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {hasPhase3 ? (
                  <Button 
                    className="w-full" 
                    onClick={() => setLocation("/phase3")}
                    data-testid="button-access-phase3"
                  >
                    Open Phase 3
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setLocation("/checkout/phase3")}
                    data-testid="button-unlock-phase3"
                  >
                    Unlock Phase 3
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {!hasPhase12 && !hasPhase3 && (
          <Card className="mt-4 mb-8 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent overflow-visible" data-testid="card-allinone-promo">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shadow-sm">
                  <Package className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="font-serif text-xl mb-1">Complete Inner Journey</CardTitle>
                  <CardDescription className="text-base">Get all 3 phases and save $199</CardDescription>
                </div>
                <Button 
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => setLocation("/checkout/allinone")}
                  data-testid="button-buy-allinone"
                >
                  Get Everything for $499
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        {hasPhase12 && (
          <div className="mt-8">
            <h2 className="font-serif text-2xl font-bold mb-6">Quick Access</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/course1")} data-testid="card-quick-gpt">
                <CardHeader className="pb-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-3">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="font-serif text-lg">Self-Discovery GPT</CardTitle>
                  <CardDescription>AI-guided self-reflection</CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/course2")} data-testid="card-quick-journal">
                <CardHeader className="pb-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center mb-3">
                    <BookOpen className="h-6 w-6 text-amber-500" />
                  </div>
                  <CardTitle className="font-serif text-lg">Journal</CardTitle>
                  <CardDescription>Morning & evening sessions</CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/habits")} data-testid="card-quick-habits">
                <CardHeader className="pb-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center mb-3">
                    <CheckSquare className="h-6 w-6 text-cyan-500" />
                  </div>
                  <CardTitle className="font-serif text-lg">Habits & Tasks</CardTitle>
                  <CardDescription>Weekly habits & daily tasks</CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/meditation")} data-testid="card-quick-meditation">
                <CardHeader className="pb-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 flex items-center justify-center mb-3">
                    <Brain className="h-6 w-6 text-indigo-500" />
                  </div>
                  <CardTitle className="font-serif text-lg">Meditation</CardTitle>
                  <CardDescription>Integrative meditation</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        )}

        <div className="mt-12">
          <h2 className="font-serif text-2xl font-bold mb-6">Self-Development Tools</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/meditation")} data-testid="card-meditation">
              <CardHeader className="pb-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 flex items-center justify-center mb-3">
                  <Brain className="h-6 w-6 text-indigo-500" />
                </div>
                <CardTitle className="font-serif text-lg">Meditation</CardTitle>
                <CardDescription>Integrative meditation for subconscious processing</CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/emotional-processing")} data-testid="card-emotional">
              <CardHeader className="pb-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-rose-500/20 to-rose-500/5 flex items-center justify-center mb-3">
                  <Heart className="h-6 w-6 text-rose-500" />
                </div>
                <CardTitle className="font-serif text-lg">Emotional Processing</CardTitle>
                <CardDescription>Feel, name, regulate, and move forward</CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/eisenhower")} data-testid="card-eisenhower">
              <CardHeader className="pb-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center mb-3">
                  <Grid3X3 className="h-6 w-6 text-amber-500" />
                </div>
                <CardTitle className="font-serif text-lg">Eisenhower Matrix</CardTitle>
                <CardDescription>Weekly priority planning for health, wealth, relationships</CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/empathy")} data-testid="card-empathy">
              <CardHeader className="pb-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-emerald-500" />
                </div>
                <CardTitle className="font-serif text-lg">Empathy Module</CardTitle>
                <CardDescription>Reflect on interactions and build understanding</CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/habits")} data-testid="card-habits">
              <CardHeader className="pb-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center mb-3">
                  <CheckSquare className="h-6 w-6 text-cyan-500" />
                </div>
                <CardTitle className="font-serif text-lg">Habits & Tasks</CardTitle>
                <CardDescription>Track weekly habits and daily tasks</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
