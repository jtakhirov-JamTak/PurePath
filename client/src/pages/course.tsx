import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/app-header";
import { LockedCourseModal } from "@/components/locked-course-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Video, MessageSquare, BookOpen, Brain, Heart, Grid3X3, 
  CheckSquare, ArrowRight, Lock, Play, Loader2, ChevronDown,
  Sparkles, Zap, Calendar, Repeat, Target
} from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import type { Purchase } from "@shared/schema";

export default function CoursePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(1);

  const { data: purchases, isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
    enabled: !!user,
  });

  const hasPhase12 = purchases?.some(p => 
    p.courseType === "phase12" || p.courseType === "allinone" || 
    p.courseType === "course1" || p.courseType === "course2" || p.courseType === "bundle"
  );

  useEffect(() => {
    if (!purchasesLoading && !authLoading) {
      setShowLockedModal(!hasPhase12);
    }
  }, [hasPhase12, purchasesLoading, authLoading]);

  if (authLoading || purchasesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const togglePhase = (phase: number) => {
    setExpandedPhase(expandedPhase === phase ? null : phase);
  };

  return (
    <div className="min-h-screen bg-background">
      <LockedCourseModal 
        courseType="phase12" 
        open={showLockedModal && !hasPhase12} 
        onClose={() => setShowLockedModal(false)}
      />
      <AppHeader />

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-12">
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4">
            Your Growth Path
          </h1>
          <p className="text-lg text-muted-foreground">
            A structured path through self-discovery, building systems, and lasting transformation.
          </p>
        </div>

        <div className="space-y-6">
          <Card className={`overflow-visible ${expandedPhase === 1 ? "border-primary/20" : ""}`} data-testid="card-phase1">
            <CardHeader 
              className="cursor-pointer" 
              onClick={() => togglePhase(1)}
              data-testid="button-toggle-phase1"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/[0.08] flex items-center justify-center">
                    <Heart className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">Phase 1</Badge>
                      <CardTitle className="font-serif text-xl">Self-Reflection</CardTitle>
                    </div>
                    <CardDescription className="mt-1">Discover who you are and who you want to become</CardDescription>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedPhase === 1 ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>

            {expandedPhase === 1 && (
              <CardContent className="pt-0 space-y-5">
                <Card className="hover-elevate overflow-visible" data-testid="card-lesson1">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">Lesson 1</Badge>
                        <CardTitle className="text-lg font-serif">Who Am I?</CardTitle>
                      </div>
                    </div>
                    <CardDescription>
                      Explore your identity, values, patterns, and beliefs through deep self-reflection.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <Card className="overflow-visible">
                        <CardHeader className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center">
                              <Video className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Video Lesson</p>
                              <p className="text-xs text-muted-foreground">Coming soon</p>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                      <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => hasPhase12 && setLocation("/course1")} data-testid="card-lesson1-gpt">
                        <CardHeader className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center">
                              <MessageSquare className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Self-Discovery GPT</p>
                              <p className="text-xs text-muted-foreground">AI-guided exploration</p>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover-elevate overflow-visible" data-testid="card-lesson2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">Lesson 2</Badge>
                        <CardTitle className="text-lg font-serif">Who Do I Want To Be?</CardTitle>
                      </div>
                    </div>
                    <CardDescription>
                      Envision your future self and define the person you're working to become.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid sm:grid-cols-3 gap-3">
                      <Card className="overflow-visible">
                        <CardHeader className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center">
                              <Video className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Video Lesson</p>
                              <p className="text-xs text-muted-foreground">Coming soon</p>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                      <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => hasPhase12 && setLocation("/course1")} data-testid="card-lesson2-gpt">
                        <CardHeader className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center">
                              <MessageSquare className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Self-Discovery GPT</p>
                              <p className="text-xs text-muted-foreground">AI-guided exploration</p>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                      <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/lesson2-worksheet")} data-testid="card-lesson2-worksheet">
                        <CardHeader className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center">
                              <Target className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Lesson 2 Worksheet</p>
                              <p className="text-xs text-muted-foreground">Vision, identity, values</p>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            )}
          </Card>

          <Card className={`overflow-visible ${expandedPhase === 2 ? "border-primary/20" : ""}`} data-testid="card-phase2">
            <CardHeader 
              className="cursor-pointer" 
              onClick={() => togglePhase(2)}
              data-testid="button-toggle-phase2"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/[0.08] flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">Phase 2</Badge>
                      <CardTitle className="font-serif text-xl">Structure</CardTitle>
                    </div>
                    <CardDescription className="mt-1">Build the daily systems and habits for lasting change</CardDescription>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedPhase === 2 ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>

            {expandedPhase === 2 && (
              <CardContent className="pt-0 space-y-5">
                <Card className="hover-elevate overflow-visible" data-testid="card-lesson3">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">Lesson 3</Badge>
                        <CardTitle className="text-lg font-serif">How To Get There</CardTitle>
                      </div>
                    </div>
                    <CardDescription>
                      Learn how to use each of the tools below to build your daily structure for growth.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Card className="overflow-visible">
                      <CardHeader className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center">
                            <Video className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Video Lesson</p>
                            <p className="text-xs text-muted-foreground">Coming soon</p>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </CardContent>
                </Card>

                <div>
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-4">Your Tools</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/course2")} data-testid="card-tool-journal">
                      <CardHeader className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Journaling</p>
                            <p className="text-xs text-muted-foreground">Morning & evening sessions</p>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                    <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/meditation")} data-testid="card-tool-meditation">
                      <CardHeader className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center">
                            <Brain className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Meditation</p>
                            <p className="text-xs text-muted-foreground">Integrative meditation</p>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                    <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/emotional-processing")} data-testid="card-tool-emotional">
                      <CardHeader className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center">
                            <Heart className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Emotional Integration</p>
                            <p className="text-xs text-muted-foreground">Feel, label, regulate, move</p>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                    <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/eisenhower")} data-testid="card-tool-eisenhower">
                      <CardHeader className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center">
                            <Grid3X3 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Eisenhower Matrix</p>
                            <p className="text-xs text-muted-foreground">Weekly priority planning</p>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                    <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/habits")} data-testid="card-tool-habits">
                      <CardHeader className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center">
                            <Repeat className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Habits</p>
                            <p className="text-xs text-muted-foreground">Build recurring habits</p>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          <Card className={`overflow-visible ${expandedPhase === 3 ? "border-primary/20" : ""}`} data-testid="card-phase3">
            <CardHeader 
              className="cursor-pointer" 
              onClick={() => togglePhase(3)}
              data-testid="button-toggle-phase3"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/[0.08] flex items-center justify-center">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">Phase 3</Badge>
                      <CardTitle className="font-serif text-xl">Transformation</CardTitle>
                    </div>
                    <CardDescription className="mt-1">Understand your patterns and transform them</CardDescription>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedPhase === 3 ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>

            {expandedPhase === 3 && (
              <CardContent className="pt-0 space-y-5">
                <Card className="hover-elevate overflow-visible" data-testid="card-lesson4">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">Lesson</Badge>
                        <CardTitle className="text-lg font-serif">You Are Your Patterns</CardTitle>
                      </div>
                    </div>
                    <CardDescription>
                      Understand the patterns that shape your life and learn how to transform them.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Card className="overflow-visible">
                      <CardHeader className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center">
                            <Video className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Video Lesson</p>
                            <p className="text-xs text-muted-foreground">Coming soon</p>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </CardContent>
                </Card>

                <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation("/phase3")} data-testid="card-tool-phase3-agent">
                  <CardHeader className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Transformation Agent</p>
                        <p className="text-xs text-muted-foreground">Upload docs & get personalized insights</p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </CardContent>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
