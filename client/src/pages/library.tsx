import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Brain, Heart, Target, Users, Lightbulb, Crosshair, X, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

const documents = [
  {
    id: "goal-setting",
    title: "How to Set a Real Goal",
    description: "A practical guide for setting one meaningful, achievable monthly goal",
    icon: Crosshair,
    hasDetail: true,
  },
  {
    id: "identity",
    title: "Identity & Values",
    description: "Define who you are and what matters most to you",
    icon: Target,
  },
  {
    id: "meditation-guide",
    title: "Meditation Guide",
    description: "Step-by-step instructions for integrative meditation practice",
    icon: Brain,
  },
  {
    id: "emotional-containment",
    title: "Emotional Containment",
    description: "The 4-step containment process for processing difficult emotions",
    icon: Heart,
  },
  {
    id: "journaling-guide",
    title: "Journaling Framework",
    description: "Morning and evening journaling templates and best practices",
    icon: BookOpen,
  },
  {
    id: "eq-framework",
    title: "Emotional Intelligence",
    description: "Understanding and developing your emotional intelligence",
    icon: Users,
  },
  {
    id: "patterns",
    title: "Pattern Recognition",
    description: "How to identify and transform recurring behavioral patterns",
    icon: Lightbulb,
  },
];

const GOAL_SETTING_RULES = [
  { title: "Pick ONE goal", detail: "Not three. Not five. One. The rest wait. Spreading thin guarantees you finish nothing." },
  { title: "Make it specific enough to measure", detail: "\"Get healthier\" isn't a goal. \"Run 3x/week and complete a 5K by month-end\" is. You should know, without debating yourself, whether you did it." },
  { title: "Attach it to a value you actually hold", detail: "If it's not connected to something you care about, you'll abandon it the first hard week. Ask: What value does this serve?" },
  { title: "Know your success marker", detail: "Write down exactly what \"done\" looks like. If you can't describe it, you can't achieve it." },
  { title: "Identify the very next physical action", detail: "Not \"plan my workouts.\" That's still thinking. \"Lay out running clothes tonight\" is an action. Make it something you can do in under 5 minutes." },
  { title: "Set a prize", detail: "You finished something hard. Reward yourself. Make it specific and proportional. This isn't optional — it's how you teach your brain that following through pays off." },
  { title: "Write the Why — and make it personal", detail: "Not \"because I should.\" Why now? What happens if you don't? What opens up if you do? The Why is what gets you through the inevitable hard days." },
];

export default function LibraryPage() {
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  if (openDoc === "goal-setting") {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <Button variant="ghost" size="sm" onClick={() => setOpenDoc(null)} className="mb-6" data-testid="button-back-library">
            <X className="h-4 w-4 mr-1.5" />
            Back to Library
          </Button>

          <div className="mb-10">
            <div className="h-12 w-12 rounded-md bg-primary/[0.08] flex items-center justify-center mb-4">
              <Crosshair className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-serif text-3xl font-bold mb-3" data-testid="text-goal-guide-title">How to Set a Real Goal</h1>
            <p className="text-muted-foreground text-lg">
              Most goals fail because they're wishes, not commitments. Here are the rules that separate goals that get done from goals that get forgotten.
            </p>
          </div>

          <div className="space-y-4">
            {GOAL_SETTING_RULES.map((rule, i) => (
              <Card key={i} className="overflow-visible" data-testid={`card-rule-${i}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-serif text-base">{i + 1}. {rule.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{rule.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Button onClick={() => setLocation("/monthly-goal")} data-testid="button-set-goal-from-guide">
              <Target className="h-4 w-4 mr-2" />
              Set Your Monthly Goal
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-10 max-w-2xl">
          <h1 className="font-serif text-3xl font-bold mb-3" data-testid="text-library-title">Library</h1>
          <p className="text-muted-foreground text-lg">
            Supporting documents and reference materials for your practice.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
          {documents.map((doc) => {
            const Icon = doc.icon;
            return (
              <Card
                key={doc.id}
                className="hover-elevate cursor-pointer overflow-visible"
                onClick={() => {
                  if ((doc as any).hasDetail) {
                    setOpenDoc(doc.id);
                  }
                }}
                data-testid={`card-doc-${doc.id}`}
              >
                <CardHeader>
                  <div className="h-12 w-12 rounded-md bg-primary/[0.08] flex items-center justify-center mb-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="font-serif text-base">{doc.title}</CardTitle>
                  <CardDescription className="text-sm">{doc.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
