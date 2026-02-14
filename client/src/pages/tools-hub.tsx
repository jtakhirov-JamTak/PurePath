import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Heart, Users, Grid3X3, FileText, Crosshair, BookOpen, Sparkles, Lightbulb, X, ArrowRight, Target } from "lucide-react";
import { useLocation } from "wouter";

interface DocSection {
  title: string;
  content: string;
}

interface DocGroup {
  label: string;
  icon: typeof Crosshair;
  sections: DocSection[];
}

interface GuideDoc {
  id: string;
  title: string;
  description: string;
  icon: typeof Crosshair;
  intro: string;
  groups: DocGroup[];
  cta?: { label: string; path: string };
}

const guides: GuideDoc[] = [
  {
    id: "goal-setting",
    title: "How to Set a Real Goal",
    description: "The complete guide to setting and executing meaningful goals — including mindset",
    icon: Crosshair,
    intro: "Most goals fail because they're wishes, not commitments. This guide covers how to choose the right goal — and the mindset you need to actually follow through.",
    groups: [
      {
        label: "Part 1: Setting the Goal",
        icon: Crosshair,
        sections: [
          { title: "Do You Have a Goal?", content: "Ask yourself: Do you have a goal? How precise is it? If the goal is vague, you are not serious. Precision creates direction; vagueness creates drift." },
          { title: "Know Your Strengths", content: "Ask yourself: What am I already good at? What do people consistently compliment me on? What do they notice without being prompted? If others struggle with something that you handle naturally — that's a signal. This is your competitive advantage. Put time and energy where you outperform others with the same effort." },
          { title: "Select One Goal, Precisely Defined", content: "Be focused on one goal. Divided attention kills momentum. Get brutally precise. A real goal answers what, when, where, and how." },
          { title: "Time Horizon", content: "Use one-month goals. One month is concrete, imaginable, and forces focus. Review daily. Rewrite the goal. Keep a visual cue. Repetition sustains urgency and excitement." },
          { title: "Goals Eliminate Problems", content: "Pursuing what you want often removes what you don't. Goals dissolve irrelevant problems. Not every problem deserves attention. Ask one question: Does this block my goal? If not, ignore it and move forward." },
          { title: "Direction Over Perfection", content: "The wrong goal is better than no goal. You must be on your way somewhere — even if the destination is imperfect. Goals are guidance systems. They provide direction, momentum and meaning. Even the wrong goal builds skills, reveals insights, and creates new connections. Action always pays." },
        ],
      },
      {
        label: "Part 2: The Right Mindset",
        icon: Sparkles,
        sections: [
          { title: "Purify Your Mind", content: "Remove false narratives that you have about yourself that are negative. Transform from being problem-focused to solution-focused." },
          { title: "You Deserve to Be Happy", content: "Happiness requires the fundamental layer of self-love. Self-love shows up in choices. You don't chase goals you don't believe you deserve. Avoiding pursuit of the life you want usually reflects low self-belief or an internal block. Self-honesty and discipline are the clearest expressions of self-love. Honest assessment of yourself hurts briefly, then unlocks clarity. Discipline is an act of service to yourself and proof that you care about yourself." },
          { title: "Stay Humble", content: "Keep your ego balanced, so that you have enough humility to listen and learn from others, while also having enough confidence to act." },
          { title: "Enjoy the Process", content: "Happiness lives in the pursuit, not arrival. Ask yourself: How can I have fun with this? Set a prize for achieving your goal. A prize you desire — trips, experiences, purchases — gets you out of bed." },
          { title: "A Journey of a Thousand Miles Begins with a Single Step", content: "Thinking delays momentum and disguises fear as intelligence. Once the goal is set, action beats planning. Progress is a chain of actions. Ask yourself: What's the next concrete step? Assign the step and execute it." },
          { title: "Habits: The Hidden Drivers of Failure and Success", content: "Habits aren't accidents — they define who you are. When someone is truly pursuing a goal, it's unmistakable. It shows in their words, actions, and habits. Everything aligns." },
        ],
      },
    ],
    cta: { label: "Set Your Monthly Goal", path: "/monthly-goal" },
  },
  {
    id: "journaling-guide",
    title: "Journaling Framework",
    description: "Morning and evening journaling templates and best practices",
    icon: BookOpen,
    intro: "Journaling is the backbone of self-awareness. This framework gives you two sessions — morning for intention, evening for reflection — with Quick and Deep Dive modes.",
    groups: [
      {
        label: "Morning Journal",
        icon: BookOpen,
        sections: [
          { title: "Self-Awareness (Core)", content: "Set one clear intention for the day. This is the anchor that guides your decisions. In Deep Dive mode, you'll also see your monthly goal for context and a prompt for one small action toward it." },
          { title: "Happiness", content: "Write what you're grateful for and what brings you joy right now. In Deep Dive mode, you also plan one thing to enjoy today. Gratitude rewires your brain to notice what's working." },
          { title: "Courage", content: "Name one thing you're avoiding. In Deep Dive mode, explore the belief behind the avoidance, the emotion driving it, counter-evidence against that belief, and one small action to move toward it. This is where real growth happens." },
          { title: "Release (Deep Dive only)", content: "Write what's weighing on you and then shift perspective. Ask: Will this matter in a year? What would I tell a friend in this situation? This prevents stress from accumulating." },
        ],
      },
      {
        label: "Evening Journal",
        icon: Sparkles,
        sections: [
          { title: "Daily Review (Deep Dive only)", content: "Reflect on the most important moment of the day. What feedback did you get? What insight did it give you? What lesson are you taking forward? This turns experience into wisdom." },
          { title: "Trigger Log (Deep Dive only)", content: "If something triggered a strong reaction today, log it: What triggered it? What story did you tell yourself? What impulse arose? Rate the emotion (0-10) and urge (0-10). What did you actually do? What would you do differently? This builds emotional intelligence over time." },
          { title: "80/20 Tracker", content: "Name one thing you're satisfied with and one thing you're dissatisfied with today. This simple practice keeps you honest about what's working and what needs to change." },
          { title: "Shutdown", content: "Declare that you did enough today. Write the one most important step for tomorrow. This creates closure and prevents nighttime rumination." },
        ],
      },
      {
        label: "Tips",
        icon: Lightbulb,
        sections: [
          { title: "Quick vs. Deep Dive", content: "Quick mode takes about 2 minutes and covers the essentials. Use it on busy days. Deep Dive covers everything and takes 10-15 minutes. Use it when you have the space. Consistency matters more than depth." },
          { title: "Don't Overthink It", content: "Journaling isn't about writing perfectly. It's about showing up honestly. One real sentence beats three polished paragraphs." },
        ],
      },
    ],
    cta: { label: "Open Journal", path: "/course2" },
  },
];

const tools = [
  {
    id: "identity",
    title: "Identity Document",
    description: "Define your identity, vision, and core values",
    icon: FileText,
    path: "/identity",
  },
  {
    id: "meditation",
    title: "Meditation",
    description: "Integrative meditation for subconscious processing and insight",
    icon: Brain,
    path: "/meditation",
  },
  {
    id: "emotional",
    title: "Emotional Containment",
    description: "Feel, name, regulate, and move forward in 60 seconds",
    icon: Heart,
    path: "/emotional-processing",
  },
  {
    id: "eisenhower",
    title: "Eisenhower Matrix",
    description: "Weekly priority planning by category and quadrant",
    icon: Grid3X3,
    path: "/eisenhower",
  },
  {
    id: "empathy",
    title: "EQ Module",
    description: "Reflect on interactions and build emotional understanding",
    icon: Users,
    path: "/empathy",
  },
];

function GuideDetailView({ doc, onBack }: { doc: GuideDoc; onBack: () => void }) {
  const [, setLocation] = useLocation();
  const Icon = doc.icon;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-6" data-testid="button-back-tools">
          <X className="h-4 w-4 mr-1.5" />
          Back to Tools
        </Button>

        <div className="mb-10">
          <div className="h-12 w-12 rounded-md bg-primary/[0.08] flex items-center justify-center mb-4">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-serif text-3xl font-bold mb-3" data-testid="text-guide-title">{doc.title}</h1>
          <p className="text-muted-foreground text-lg">{doc.intro}</p>
        </div>

        {doc.groups.map((group, gi) => {
          const GroupIcon = group.icon;
          return (
            <div key={gi}>
              <div className="flex items-center gap-2 mb-6 mt-10 first:mt-0">
                <Badge variant="secondary" className="no-default-active-elevate">
                  <GroupIcon className="h-3 w-3 mr-1" />
                  {group.label}
                </Badge>
              </div>
              <div className="space-y-4">
                {group.sections.map((section, si) => (
                  <Card key={si} className="overflow-visible" data-testid={`card-section-${gi}-${si}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-serif text-base">{section.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        {doc.cta && (
          <div className="mt-10 text-center">
            <Button onClick={() => setLocation(doc.cta!.path)} data-testid="button-guide-cta">
              <Target className="h-4 w-4 mr-2" />
              {doc.cta.label}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function ToolsHubPage() {
  const [, setLocation] = useLocation();
  const [openGuide, setOpenGuide] = useState<string | null>(null);

  const activeGuide = guides.find((g) => g.id === openGuide);
  if (activeGuide) {
    return <GuideDetailView doc={activeGuide} onBack={() => setOpenGuide(null)} />;
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-10 max-w-2xl">
          <h1 className="font-serif text-3xl font-bold mb-3" data-testid="text-tools-title">Tools</h1>
          <p className="text-muted-foreground text-lg">
            Self-development tools and reference guides to support your daily practice.
          </p>
        </div>

        <div className="max-w-4xl space-y-10">
          <div>
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold mb-4">Guides</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {guides.map((guide) => {
                const Icon = guide.icon;
                return (
                  <Card
                    key={guide.id}
                    className="hover-elevate cursor-pointer overflow-visible"
                    onClick={() => setOpenGuide(guide.id)}
                    data-testid={`card-guide-${guide.id}`}
                  >
                    <CardHeader>
                      <div className="h-12 w-12 rounded-md bg-primary/[0.08] flex items-center justify-center mb-3">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="font-serif text-base">{guide.title}</CardTitle>
                      <CardDescription className="text-sm">{guide.description}</CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold mb-4">Practice Tools</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Card
                    key={tool.id}
                    className="hover-elevate cursor-pointer overflow-visible"
                    onClick={() => setLocation(tool.path)}
                    data-testid={`card-tool-${tool.id}`}
                  >
                    <CardHeader>
                      <div className="h-12 w-12 rounded-md bg-primary/[0.08] flex items-center justify-center mb-3">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="font-serif text-base">{tool.title}</CardTitle>
                      <CardDescription className="text-sm">{tool.description}</CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
