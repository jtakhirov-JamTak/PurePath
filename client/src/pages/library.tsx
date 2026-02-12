import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Brain, Heart, Target, Users, Lightbulb, Crosshair, X, ArrowRight, Sparkles, Footprints } from "lucide-react";
import { useLocation } from "wouter";

const documents = [
  {
    id: "goal-setting",
    title: "How to Set a Real Goal",
    description: "The complete guide to setting and executing meaningful goals — including mindset",
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

const SETTING_SECTIONS = [
  {
    title: "Do You Have a Goal?",
    content: "Ask yourself: Do you have a goal? How precise is it? If the goal is vague, you are not serious. Precision creates direction; vagueness creates drift.",
  },
  {
    title: "Know Your Strengths",
    content: "Ask yourself: What am I already good at? What do people consistently compliment me on? What do they notice without being prompted? If others struggle with something that you handle naturally — that's a signal. This is your competitive advantage. Put time and energy where you outperform others with the same effort.",
  },
  {
    title: "Select One Goal, Precisely Defined",
    content: "Be focused on one goal. Divided attention kills momentum. Get brutally precise. A real goal answers what, when, where, and how.",
  },
  {
    title: "Time Horizon",
    content: "Use one-month goals. One month is concrete, imaginable, and forces focus. Review daily. Rewrite the goal. Keep a visual cue. Repetition sustains urgency and excitement.",
  },
  {
    title: "Goals Eliminate Problems",
    content: "Pursuing what you want often removes what you don't. Goals dissolve irrelevant problems. Not every problem deserves attention. Ask one question: Does this block my goal? If not, ignore it and move forward.",
  },
  {
    title: "Direction Over Perfection",
    content: "The wrong goal is better than no goal. You must be on your way somewhere — even if the destination is imperfect. Goals are guidance systems. They provide direction, momentum and meaning. Even the wrong goal builds skills, reveals insights, and creates new connections. Action always pays.",
  },
];

const MINDSET_SECTIONS = [
  {
    title: "Purify Your Mind",
    content: "Remove false narratives that you have about yourself that are negative. Transform from being problem-focused to solution-focused.",
  },
  {
    title: "You Deserve to Be Happy",
    content: "Happiness requires the fundamental layer of self-love. Self-love shows up in choices. You don't chase goals you don't believe you deserve. Avoiding pursuit of the life you want usually reflects low self-belief or an internal block. Self-honesty and discipline are the clearest expressions of self-love. Honest assessment of yourself hurts briefly, then unlocks clarity. Discipline is an act of service to yourself and proof that you care about yourself.",
  },
  {
    title: "Stay Humble",
    content: "Keep your ego balanced, so that you have enough humility to listen and learn from others, while also having enough confidence to act.",
  },
  {
    title: "Enjoy the Process",
    content: "Happiness lives in the pursuit, not arrival. Ask yourself: How can I have fun with this? Set a prize for achieving your goal. A prize you desire — trips, experiences, purchases — gets you out of bed.",
  },
  {
    title: "A Journey of a Thousand Miles Begins with a Single Step",
    content: "Thinking delays momentum and disguises fear as intelligence. Once the goal is set, action beats planning. Progress is a chain of actions. Ask yourself: What's the next concrete step? Assign the step and execute it.",
  },
  {
    title: "Habits: The Hidden Drivers of Failure and Success",
    content: "Habits aren't accidents — they define who you are. When someone is truly pursuing a goal, it's unmistakable. It shows in their words, actions, and habits. Everything aligns.",
  },
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
              Most goals fail because they're wishes, not commitments. This guide covers how to choose the right goal — and the mindset you need to actually follow through.
            </p>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <Badge variant="secondary" className="no-default-active-elevate">
              <Crosshair className="h-3 w-3 mr-1" />
              Part 1: Setting the Goal
            </Badge>
          </div>

          <div className="space-y-4">
            {SETTING_SECTIONS.map((section, i) => (
              <Card key={i} className="overflow-visible" data-testid={`card-rule-${i}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-serif text-base">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-6 mt-10">
            <Badge variant="secondary" className="no-default-active-elevate">
              <Sparkles className="h-3 w-3 mr-1" />
              Part 2: The Right Mindset
            </Badge>
          </div>

          <div className="space-y-4">
            {MINDSET_SECTIONS.map((section, i) => (
              <Card key={i} className="overflow-visible" data-testid={`card-mindset-${i}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-serif text-base">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-10 text-center">
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
