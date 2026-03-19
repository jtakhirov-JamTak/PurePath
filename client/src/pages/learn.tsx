import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";

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
  const [, setLocation] = useLocation();

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
          {lessons.map((section) => (
              <div key={section.phase}>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <h2 className="font-serif text-xl font-semibold">Phase {section.phase}: {section.phaseTitle}</h2>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Unlocked
                  </Badge>
                </div>
                <div className="space-y-3">
                  {section.items.map((lesson) => (
                    <Card
                      key={lesson.id}
                      className="overflow-visible hover-elevate cursor-pointer"
                      onClick={() => setLocation("/dashboard")}
                      data-testid={`card-${lesson.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                            <Play className="h-5 w-5 text-primary" />
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
              </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
