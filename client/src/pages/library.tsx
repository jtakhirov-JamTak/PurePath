import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Brain, Heart, Target, Users, Lightbulb, Crosshair, X, ArrowRight, Sparkles } from "lucide-react";
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

interface LibraryDoc {
  id: string;
  title: string;
  description: string;
  icon: typeof Crosshair;
  intro: string;
  groups: DocGroup[];
  cta?: { label: string; path: string };
}

const documents: LibraryDoc[] = [
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
    id: "identity",
    title: "Identity & Values",
    description: "Define who you are and what matters most to you",
    icon: Target,
    intro: "Your identity shapes every decision you make. Clarifying who you are and what you value is the foundation of meaningful growth.",
    groups: [
      {
        label: "Who You Are",
        icon: Target,
        sections: [
          { title: "Identity Is a Choice", content: "Most people inherit their identity from their past — from what happened to them, what they were told, or what they defaulted into. But identity is not fixed. You can choose who you want to be and build toward it, one decision at a time." },
          { title: "The Identity Document", content: "Write a short document that describes who you are becoming. Not who you were. Not who others expect. Include your strengths, your values, and the kind of person you want to show up as every day. Review it regularly." },
          { title: "Your Strengths", content: "What do people consistently praise you for? What comes easily to you but seems hard for others? These are signals of your natural strengths. Build your life around them rather than constantly fixing weaknesses." },
        ],
      },
      {
        label: "Your Values",
        icon: Sparkles,
        sections: [
          { title: "Values Drive Behavior", content: "When your actions align with your values, you feel energized and purposeful. When they don't, you feel drained and conflicted. Identifying your core values removes confusion about what to prioritize." },
          { title: "How to Find Your Values", content: "Think about moments when you felt most alive, proud, or fulfilled. What was present in those moments? Freedom? Connection? Mastery? Growth? Those recurring themes are your values." },
          { title: "Living by Your Values", content: "Once you know your values, use them as a filter. Before commitments, habits, or goals, ask: Does this align with what I value most? If not, let it go — no matter how \"productive\" it seems." },
          { title: "Values vs. Goals", content: "Values are directions; goals are destinations. You never \"finish\" a value — you live it. Your monthly goal should serve at least one core value. That's what gives it staying power." },
        ],
      },
    ],
    cta: { label: "Open Lesson 2 Worksheet", path: "/lesson2-worksheet" },
  },
  {
    id: "meditation-guide",
    title: "Meditation Guide",
    description: "Step-by-step instructions for integrative meditation practice",
    icon: Brain,
    intro: "Integrative meditation lets your subconscious process thoughts freely. It's not about emptying your mind — it's about letting it work.",
    groups: [
      {
        label: "Setup",
        icon: Brain,
        sections: [
          { title: "Environment", content: "Find a comfortable couch or chair in a dim or dark room. Put on headphones with black noise at low volume. Set a timer for 25-30 minutes. Close your eyes and settle in." },
          { title: "Why Black Noise?", content: "Black noise provides a consistent audio backdrop that blocks external distractions without adding stimulation. It creates a neutral sound environment that helps your mind turn inward." },
        ],
      },
      {
        label: "The Process",
        icon: Sparkles,
        sections: [
          { title: "Phase 1: Downshift (5 minutes)", content: "Use box breathing — inhale for 4 counts, hold for 4, exhale for 4, hold for 4. Continue for about 5 minutes. Move on when your body feels slower and heavier, and your jaw and shoulders soften." },
          { title: "Phase 2: Let Your Subconscious Flow (20 minutes)", content: "Let your thoughts, memories, and images arise freely. Don't judge or direct them — let them come and go. You might experience random memories resurfacing, emotional waves passing through, creative ideas or connections appearing, or moments of deep stillness. All of this is normal and useful." },
          { title: "Phase 3: Seal It (1-2 minutes)", content: "When your timer sounds, take three slow, deep breaths. Gently open your eyes. Stay still for a moment and notice how you feel." },
          { title: "Post-Meditation Integration", content: "Immediately after, write down one sentence: \"The insight I gained was ______.\" This captures what your subconscious surfaced before your conscious mind filters it out. Don't overthink it — just write." },
        ],
      },
    ],
    cta: { label: "Start Meditation", path: "/meditation" },
  },
  {
    id: "emotional-containment",
    title: "Emotional Containment",
    description: "The 4-step containment process for processing difficult emotions",
    icon: Heart,
    intro: "Emotions aren't problems to solve — they're signals to process. This 4-step method helps you move through difficult feelings without being controlled by them.",
    groups: [
      {
        label: "The 4-Step Process",
        icon: Heart,
        sections: [
          { title: "1. FEEL (10-20 seconds)", content: "Notice the emotion in your body — throat, chest, jaw, stomach. Don't push it away. Don't analyze it. Just notice where it lives physically. This breaks the pattern of suppression and avoidance." },
          { title: "2. LABEL (1 sentence)", content: "Name what you're feeling using this format: \"I feel ___ right now because ____, and it's okay to feel that way.\" This shifts control from your limbic system (emotional) to your prefrontal cortex (reasoning). It's called affect labeling — it literally processes emotion biologically." },
          { title: "3. REGULATE (2-3 slow exhales)", content: "Take 2-3 slow, deep exhales. Focus on making the exhale longer than the inhale. This activates your parasympathetic nervous system and stabilizes your stress response." },
          { title: "4. MOVE", content: "Take a small, grounding action. Use the prompt: \"Given that, the next small thing is ___.\" This could be getting a glass of water, writing one sentence, taking a short walk, or sending a message you've been avoiding. You're telling your nervous system: \"I'm allowed to feel this, AND I'm capable of taking a calm action anyway.\"" },
        ],
      },
      {
        label: "Key Principles",
        icon: Sparkles,
        sections: [
          { title: "Why This Works", content: "Most people either suppress emotions (push them down) or act them out (react impulsively). Both create more problems. This process creates a third path: feel fully, then choose your response consciously." },
          { title: "When to Use It", content: "Use this whenever you notice a strong emotional reaction — frustration, anxiety, sadness, anger, shame. The sooner you catch it, the faster you process it. Over time, this becomes automatic." },
          { title: "Containment vs. Suppression", content: "Containment isn't ignoring your emotions. It's giving them space without letting them drive your behavior. You acknowledge the feeling, reduce the physiological intensity, and then act from a calmer state." },
        ],
      },
    ],
    cta: { label: "Practice Now", path: "/emotional-processing" },
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
  {
    id: "eq-framework",
    title: "Emotional Intelligence",
    description: "Understanding and developing your emotional intelligence",
    icon: Users,
    intro: "Emotional intelligence is the ability to recognize, understand, and manage your own emotions — and to navigate the emotions of others skillfully.",
    groups: [
      {
        label: "Self-Awareness",
        icon: Users,
        sections: [
          { title: "Recognize Your Patterns", content: "Everyone has emotional patterns — default reactions to stress, conflict, rejection, or success. The first step is noticing them. When do you shut down? When do you get defensive? When do you avoid? Awareness is the prerequisite to change." },
          { title: "Name Your Emotions Precisely", content: "\"I feel bad\" isn't enough. Are you frustrated? Disappointed? Anxious? Ashamed? The more precisely you can name what you feel, the more power you have over it. Vague emotions control you; named emotions become manageable." },
          { title: "Body Signals", content: "Your body often knows before your mind does. Tight chest, clenched jaw, shallow breathing, knot in the stomach — these are emotional data points. Learn to read them as signals rather than ignoring them." },
        ],
      },
      {
        label: "Self-Regulation",
        icon: Sparkles,
        sections: [
          { title: "The Space Between Stimulus and Response", content: "Between something happening and your reaction, there's a space. Emotional intelligence is about expanding that space. The longer the pause, the more intentional your response." },
          { title: "Regulate, Don't Suppress", content: "Regulation isn't about being emotionless. It's about choosing how you respond instead of reacting automatically. Feel the emotion, reduce the intensity, then act. This is what the 4-step containment process trains." },
          { title: "Emotional Hygiene", content: "Just like physical hygiene, emotional hygiene is a daily practice. Journaling, meditation, honest conversation, and regular self-check-ins keep your emotional system clean and responsive." },
        ],
      },
      {
        label: "Social Awareness",
        icon: Heart,
        sections: [
          { title: "Empathy as a Skill", content: "Empathy isn't just \"feeling what others feel.\" It's actively trying to understand someone's perspective, motivations, and emotional state. It requires listening more than speaking and asking more than assuming." },
          { title: "Read the Room", content: "Pay attention to body language, tone, and what's not being said. People communicate far more nonverbally than verbally. The ability to read these signals separates surface relationships from deep ones." },
        ],
      },
    ],
    cta: { label: "Try Empathy Exercise", path: "/empathy" },
  },
  {
    id: "patterns",
    title: "Pattern Recognition",
    description: "How to identify and transform recurring behavioral patterns",
    icon: Lightbulb,
    intro: "You are your patterns. The behaviors you repeat — especially the unconscious ones — define your life more than any single decision. Recognizing them is the first step to changing them.",
    groups: [
      {
        label: "Finding Your Patterns",
        icon: Lightbulb,
        sections: [
          { title: "What Is a Pattern?", content: "A pattern is any behavior, thought, or emotional response that repeats across different situations. It's the way you always react to criticism, the way you avoid hard conversations, or the way you sabotage yourself right before a breakthrough." },
          { title: "Where to Look", content: "Look at recurring conflicts in relationships. Look at goals you've set and abandoned repeatedly. Look at the stories you tell yourself when things go wrong. Look at what triggers your strongest emotional reactions. Patterns hide in repetition." },
          { title: "The Trigger-Story-Behavior Loop", content: "Most patterns follow this loop: Something triggers you. You tell yourself a story about it (often unconscious). That story drives a behavior. The behavior creates a consequence. The consequence reinforces the story. Breaking the pattern starts with catching the story." },
        ],
      },
      {
        label: "Transforming Patterns",
        icon: Sparkles,
        sections: [
          { title: "Awareness Before Change", content: "You can't change what you can't see. Before trying to fix a pattern, spend time simply noticing it. Journal about it. Track when it shows up. The more you observe it, the more space you create between the trigger and your automatic response." },
          { title: "Challenge the Story", content: "The story you tell yourself is usually not the whole truth. Ask: Is this really true? What evidence contradicts this? What would someone who loves me say about this? Counter-evidence weakens the grip of the old narrative." },
          { title: "Replace, Don't Remove", content: "You can't just delete a pattern — you need to replace it with something better. If your pattern is avoidance, replace it with one small brave action. If your pattern is perfectionism, replace it with \"good enough, done.\" New habits overwrite old patterns." },
          { title: "Use Your Tools", content: "The Trigger Log in your evening journal, the Courage section in your morning journal, and the Emotional Containment process are all designed to help you catch and transform patterns in real time. Use them consistently." },
        ],
      },
    ],
    cta: { label: "Explore Phase 3", path: "/phase3" },
  },
];

function DocDetailView({ doc, onBack }: { doc: LibraryDoc; onBack: () => void }) {
  const [, setLocation] = useLocation();
  const Icon = doc.icon;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-6" data-testid="button-back-library">
          <X className="h-4 w-4 mr-1.5" />
          Back to Library
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

export default function LibraryPage() {
  const [openDoc, setOpenDoc] = useState<string | null>(null);

  const activeDoc = documents.find((d) => d.id === openDoc);
  if (activeDoc) {
    return <DocDetailView doc={activeDoc} onBack={() => setOpenDoc(null)} />;
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
                onClick={() => setOpenDoc(doc.id)}
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
