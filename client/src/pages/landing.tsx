import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { COURSES, type CourseType } from "@shared/pricing";
import { 
  Sparkles, BookOpen, Package, Check, ArrowRight, Heart, Star, 
  Layers, Brain, Zap, MessageSquare, Video, CheckSquare, Grid3X3, 
  Users, FileText, Download, Target, Lightbulb, TrendingUp,
  Leaf, Sprout, TreePine, RefreshCcw
} from "lucide-react";
import { LeafLogo } from "@/components/leaf-logo";
import { useLocation } from "wouter";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  const handleGetStarted = (courseType: CourseType) => {
    setLocation(`/checkout/${courseType}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LeafLogo size={28} />
            <span className="font-serif text-xl font-semibold text-primary">Leaf</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" asChild data-testid="link-login">
              <a href="/api/login">Sign In</a>
            </Button>
            <Button asChild data-testid="link-get-started">
              <a href="#pricing">Get Started</a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="pt-40 pb-24 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-primary/[0.02] to-transparent pointer-events-none" />
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-primary/[0.03] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-40 right-1/4 w-48 h-48 bg-primary/[0.04] rounded-full blur-2xl pointer-events-none" />
          <div className="container mx-auto text-center max-w-3xl relative">
            <Badge variant="secondary" className="mb-8">
              A Natural Path to Self-Discovery
            </Badge>
            <h1 className="font-serif text-5xl md:text-7xl font-bold mb-8 leading-[1.1] tracking-tight">
              Grow Into Who You{" "}
              <span className="text-primary">Truly Are</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed">
              A 3-phase growth program that nurtures you from self-reflection through daily rhythms 
              to deep transformation, guided by AI conversations and proven personal growth tools.
            </p>
            <p className="text-base text-muted-foreground mb-12 max-w-xl mx-auto leading-relaxed">
              Video lessons, an AI self-discovery guide, journaling, habit tracking, and a 
              transformation agent that reveals your patterns and cultivates lasting change.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" onClick={() => handleGetStarted("allinone")} data-testid="button-hero-buy">
                Begin Your Growth - $499
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" asChild data-testid="button-hero-learn">
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-24 px-6">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
                What You Get
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-base leading-relaxed">
                Everything you need for a complete self-discovery and transformation experience.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="overflow-visible" data-testid="feature-video">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/[0.08] flex items-center justify-center shrink-0">
                      <Video className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium mb-1">Video Lessons</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">4 guided video lessons walking you through each phase of your growth</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="overflow-visible" data-testid="feature-gpt">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/[0.08] flex items-center justify-center shrink-0">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium mb-1">AI Self-Discovery Guide</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">Have deep conversations with a GPT trained to help you understand yourself</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="overflow-visible" data-testid="feature-journal">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/[0.08] flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium mb-1">Daily Journaling</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">Morning and evening journal sessions to track your growth over time</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="overflow-visible" data-testid="feature-habits">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/[0.08] flex items-center justify-center shrink-0">
                      <RefreshCcw className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium mb-1">Habit & Task Tracking</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">Build cyclical habits and manage daily tasks with Eisenhower quadrants</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="overflow-visible" data-testid="feature-tools">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/[0.08] flex items-center justify-center shrink-0">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium mb-1">6 Growth Tools</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">Meditation, emotional processing, Eisenhower matrix, empathy module, and more</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="overflow-visible" data-testid="feature-agent">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/[0.08] flex items-center justify-center shrink-0">
                      <Sprout className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium mb-1">Transformation Agent</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">Upload your notes and get an AI-generated report that maps your patterns</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-24 px-6">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-20">
              <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
                How the Program Works
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-base leading-relaxed">
                Three phases that build on each other, nurturing you from self-awareness to lasting change.
              </p>
            </div>

            <div className="relative">
              <div className="hidden md:block absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-primary/30 via-primary/20 to-primary/10" />

              <div className="space-y-20">
                <div className="flex flex-col md:flex-row gap-8 items-start" data-testid="section-phase1">
                  <div className="md:w-16 shrink-0 flex md:flex-col items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-primary/[0.12] flex items-center justify-center ring-4 ring-background">
                      <Leaf className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <Badge variant="secondary" className="mb-4">Phase 1 - Seed</Badge>
                    <h3 className="font-serif text-2xl font-bold mb-3">Self-Reflection</h3>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      Start by exploring who you really are, beyond the roles and labels. Through video lessons 
                      and deep AI-guided conversations, you'll uncover your core values, beliefs, and desires. 
                      Then you'll plant the seeds of who you want to become.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Lesson 1: Who Am I?</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Lesson 2: Who Do I Want To Be?</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Video lessons for each topic</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>AI self-discovery conversations</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-start" data-testid="section-phase2">
                  <div className="md:w-16 shrink-0 flex md:flex-col items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-primary/[0.12] flex items-center justify-center ring-4 ring-background">
                      <Sprout className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <Badge variant="secondary" className="mb-4">Phase 2 - Grow</Badge>
                    <h3 className="font-serif text-2xl font-bold mb-3">Structure</h3>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      Self-awareness alone isn't enough. In this phase, you'll cultivate the daily 
                      rhythms and habits that turn insight into action. A video lesson shows you how to use 
                      each tool, then you put them into practice.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Lesson 3: How To Get There</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Morning & evening journaling</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Meditation & emotional processing</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Eisenhower matrix & habit tracker</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-start" data-testid="section-phase3">
                  <div className="md:w-16 shrink-0 flex md:flex-col items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-primary/[0.12] flex items-center justify-center ring-4 ring-background">
                      <TreePine className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <Badge variant="secondary" className="mb-4">Phase 3 - Bloom</Badge>
                    <h3 className="font-serif text-2xl font-bold mb-3">Transformation</h3>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      The final phase brings it all together. Upload your self-discovery notes, journal entries, 
                      and GPT conversations into the Transformation Agent. It analyzes your patterns, 
                      surfaces blind spots, and creates a personalized report with actionable steps for change.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Lesson: You Are Your Patterns</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>AI pattern analysis agent</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Document upload & processing</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>Downloadable transformation report</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-24 px-6">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
                Choose Your Path
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-base leading-relaxed">
                Start with the phase that calls to you, or get the complete experience and save.
              </p>
            </div>

            <Card className="mb-10 border-primary relative overflow-visible" data-testid="card-pricing-allinone">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Best Value - Save $199
              </Badge>
              <CardHeader className="text-center pt-10 pb-4">
                <CardTitle className="font-serif text-2xl">Complete Leaf Program</CardTitle>
                <CardDescription className="text-base mt-2">All 3 phases - everything you need for the full transformation</CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-4">
                <div className="mb-6">
                  <span className="text-5xl font-bold">$499</span>
                  <span className="text-muted-foreground ml-2">one-time</span>
                </div>
                <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground mb-4 max-w-lg mx-auto">
                  <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> All video lessons</span>
                  <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> AI self-discovery guide</span>
                  <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Journaling & tools</span>
                  <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Transformation agent</span>
                  <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Pattern analysis report</span>
                </div>
              </CardContent>
              <CardFooter className="justify-center pb-10">
                <Button size="lg" onClick={() => handleGetStarted("allinone")} data-testid="button-buy-allinone">
                  Get the Complete Program
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="hover-elevate overflow-visible" data-testid="card-pricing-phase12">
                <CardHeader className="text-center">
                  <CardTitle className="font-serif text-xl">Phase 1 & 2: Self-Reflection & Structure</CardTitle>
                  <CardDescription className="mt-2">Discover yourself and build daily rhythms</CardDescription>
                </CardHeader>
                <CardContent className="text-center pb-4">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">$399</span>
                    <span className="text-muted-foreground ml-2">one-time</span>
                  </div>
                  <ul className="space-y-3 text-sm text-left max-w-xs mx-auto">
                    <li className="flex items-start gap-3">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">3 video lessons</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">AI self-discovery conversations</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Journaling & all growth tools</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Habit & task tracking</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter className="justify-center">
                  <Button variant="outline" className="w-full max-w-xs" onClick={() => handleGetStarted("phase12")} data-testid="button-buy-phase12">
                    Start Phase 1 & 2
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>

              <Card className="hover-elevate overflow-visible" data-testid="card-pricing-phase3">
                <CardHeader className="text-center">
                  <CardTitle className="font-serif text-xl">Phase 3: Transformation</CardTitle>
                  <CardDescription className="mt-2">AI-powered pattern analysis & insights</CardDescription>
                </CardHeader>
                <CardContent className="text-center pb-4">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">$299</span>
                    <span className="text-muted-foreground ml-2">one-time</span>
                  </div>
                  <ul className="space-y-3 text-sm text-left max-w-xs mx-auto">
                    <li className="flex items-start gap-3">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Video lesson on patterns</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">AI transformation agent</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Document upload & analysis</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Downloadable report</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter className="justify-center">
                  <Button variant="outline" className="w-full max-w-xs" onClick={() => handleGetStarted("phase3")} data-testid="button-buy-phase3">
                    Start Phase 3
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-24 px-6">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-6">
              Ready to Grow?
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
              Your path to growth begins with a single step. 
              Get the complete program and save $199, or choose the phase that fits your season.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" onClick={() => handleGetStarted("allinone")} data-testid="button-cta-buy">
                Get Everything for $499
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" asChild data-testid="button-cta-login">
                <a href="/api/login">Sign In</a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-10 px-6 border-t">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LeafLogo size={20} />
            <span className="font-serif font-medium text-primary">Leaf</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; 2026 Leaf. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
