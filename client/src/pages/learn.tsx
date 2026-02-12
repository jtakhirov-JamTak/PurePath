import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, Play, Lock, CheckCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Purchase } from "@shared/schema";

const lessons = [
  {
    phase: 1,
    phaseTitle: "Self-Reflection",
    items: [
      { id: "lesson1", title: "Who Am I?", description: "Deep self-reflection through guided video and exercises", duration: "45 min" },
      { id: "lesson2", title: "Who Do I Want To Be?", description: "Build a clear vision of your future self", duration: "40 min" },
    ],
  },
  {
    phase: 2,
    phaseTitle: "Structure",
    items: [
      { id: "lesson3", title: "How To Get There", description: "Learn how to use your daily tools effectively", duration: "35 min" },
    ],
  },
  {
    phase: 3,
    phaseTitle: "Transformation",
    items: [
      { id: "lesson4", title: "You Are Your Patterns", description: "Understand the patterns shaping your life", duration: "50 min" },
    ],
  },
];

export default function LearnPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: purchases = [] } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
    enabled: !!user,
  });

  const hasPhase12 = purchases.some(p =>
    p.courseType === "phase12" || p.courseType === "allinone" ||
    p.courseType === "course1" || p.courseType === "course2" || p.courseType === "bundle"
  );
  const hasPhase3 = purchases.some(p =>
    p.courseType === "phase3" || p.courseType === "allinone" || p.courseType === "bundle"
  );

  const isUnlocked = (phase: number) => {
    if (phase <= 2) return hasPhase12;
    return hasPhase3;
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-10 max-w-2xl">
          <h1 className="font-serif text-3xl font-bold mb-3" data-testid="text-learn-title">Learn</h1>
          <p className="text-muted-foreground text-lg">
            Video lessons and guided exercises for each phase of your journey.
          </p>
        </div>

        <div className="space-y-10 max-w-3xl">
          {lessons.map((section) => {
            const unlocked = isUnlocked(section.phase);
            return (
              <div key={section.phase}>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <h2 className="font-serif text-xl font-semibold">Phase {section.phase}: {section.phaseTitle}</h2>
                  {unlocked ? (
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
                <div className="space-y-3">
                  {section.items.map((lesson) => (
                    <Card
                      key={lesson.id}
                      className={`overflow-visible ${unlocked ? "hover-elevate cursor-pointer" : "opacity-60"}`}
                      onClick={() => unlocked && setLocation("/course")}
                      data-testid={`card-${lesson.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                            {unlocked ? <Play className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="font-serif text-base">{lesson.title}</CardTitle>
                            <CardDescription className="text-sm mt-1">{lesson.description}</CardDescription>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-xs">{lesson.duration}</Badge>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
                {!unlocked && (
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      onClick={() => setLocation(section.phase <= 2 ? "/checkout/phase12" : "/checkout/phase3")}
                      data-testid={`button-unlock-phase${section.phase}`}
                    >
                      Unlock Phase {section.phase <= 2 ? "1 & 2" : "3"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
