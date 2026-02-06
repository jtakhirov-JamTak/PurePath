import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { COURSES, type CourseType } from "@shared/schema";
import { 
  Sparkles, BookOpen, Package, Check, ArrowRight, Compass, Heart, Star, 
  Layers, Brain, Zap, MessageSquare, Video, CheckSquare, Grid3X3, 
  Users, FileText, Download, Target, Lightbulb, TrendingUp
} from "lucide-react";
import { useLocation } from "wouter";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  const handleGetStarted = (courseType: CourseType) => {
    setLocation(`/checkout/${courseType}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Compass className="h-7 w-7 text-primary" />
            <span className="font-serif text-xl font-semibold">Inner Journey</span>
          </div>
          <div className="flex items-center gap-2">
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
        <section className="pt-32 pb-20 px-4">
          <div className="container mx-auto text-center max-w-3xl">
            <Badge variant="secondary" className="mb-6">
              A Guided Self-Discovery Program
            </Badge>
            <h1 className="font-serif text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Discover Who You Were{" "}
              <span className="text-primary">Meant to Be</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
              A structured 3-phase program that takes you from self-reflection through daily habits 
              to deep transformation, powered by AI-guided conversations and proven personal growth tools.
            </p>
            <p className="text-base text-muted-foreground mb-10 max-w-xl mx-auto">
              Video lessons, an AI self-discovery guide, journaling, habit tracking, and a 
              transformation agent that analyzes your patterns and creates a personalized growth report.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" onClick={() => handleGetStarted("allinone")} data-testid="button-hero-buy">
                Get the Complete Program - $499
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" asChild data-testid="button-hero-learn">
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-card/50">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="font-serif text-3xl md:text-4xl font-bold mb-3">
                What You Get
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Everything you need for a complete self-discovery and transformation experience.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-start gap-4 p-4" data-testid="feature-video">
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Video className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium mb-1">Video Lessons</p>
                  <p className="text-sm text-muted-foreground">4 guided video lessons walking you through each phase of the journey</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4" data-testid="feature-gpt">
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium mb-1">AI Self-Discovery Guide</p>
                  <p className="text-sm text-muted-foreground">Have deep conversations with a GPT trained to help you understand yourself</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4" data-testid="feature-journal">
                <div className="h-10 w-10 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium mb-1">Daily Journaling</p>
                  <p className="text-sm text-muted-foreground">Morning and evening journal sessions to track your growth over time</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4" data-testid="feature-habits">
                <div className="h-10 w-10 rounded-md bg-cyan-500/10 flex items-center justify-center shrink-0">
                  <CheckSquare className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <p className="font-medium mb-1">Habit & Task Tracking</p>
                  <p className="text-sm text-muted-foreground">Build weekly habits and manage daily tasks with Eisenhower quadrants</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4" data-testid="feature-tools">
                <div className="h-10 w-10 rounded-md bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <Brain className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <p className="font-medium mb-1">6 Growth Tools</p>
                  <p className="text-sm text-muted-foreground">Meditation, emotional processing, Eisenhower matrix, empathy module, and more</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4" data-testid="feature-agent">
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium mb-1">Transformation Agent</p>
                  <p className="text-sm text-muted-foreground">Upload your notes and get an AI-generated report that maps your patterns</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-20 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl md:text-4xl font-bold mb-3">
                How the Program Works
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Three phases that build on each other, taking you from self-awareness to lasting change.
              </p>
            </div>

            <div className="space-y-16">
              <div className="flex flex-col md:flex-row gap-8 items-start" data-testid="section-phase1">
                <div className="md:w-16 shrink-0 flex md:flex-col items-center gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Heart className="h-7 w-7 text-primary" />
                  </div>
                  <div className="hidden md:block w-0.5 h-16 bg-border mx-auto" />
                </div>
                <div className="flex-1">
                  <Badge variant="secondary" className="mb-3">Phase 1</Badge>
                  <h3 className="font-serif text-2xl font-bold mb-2">Self-Reflection</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by exploring who you really are, beyond the roles and labels. Through video lessons 
                    and deep AI-guided conversations, you'll uncover your core values, beliefs, and desires. 
                    Then you'll build a clear vision of who you want to become.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>Lesson 1: Who Am I?</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>Lesson 2: Who Do I Want To Be?</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>Video lessons for each topic</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>AI self-discovery conversations</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-8 items-start" data-testid="section-phase2">
                <div className="md:w-16 shrink-0 flex md:flex-col items-center gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-7 w-7 text-primary" />
                  </div>
                  <div className="hidden md:block w-0.5 h-16 bg-border mx-auto" />
                </div>
                <div className="flex-1">
                  <Badge variant="secondary" className="mb-3">Phase 2</Badge>
                  <h3 className="font-serif text-2xl font-bold mb-2">Structure</h3>
                  <p className="text-muted-foreground mb-4">
                    Self-awareness alone isn't enough. In this phase, you'll learn how to build the daily 
                    systems and habits that turn insight into action. A video lesson shows you how to use 
                    each tool, then you put them into practice.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>Lesson 3: How To Get There</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>Morning & evening journaling</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>Meditation & emotional processing</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>Eisenhower matrix & habit tracker</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-8 items-start" data-testid="section-phase3">
                <div className="md:w-16 shrink-0 flex md:flex-col items-center gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Zap className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <div className="flex-1">
                  <Badge variant="secondary" className="mb-3">Phase 3</Badge>
                  <h3 className="font-serif text-2xl font-bold mb-2">Transformation</h3>
                  <p className="text-muted-foreground mb-4">
                    The final phase brings it all together. Upload your self-discovery notes, journal entries, 
                    and GPT conversations into the Transformation Agent. It analyzes your patterns, 
                    surfaces blind spots, and creates a personalized report with actionable steps for change.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>Lesson: You Are Your Patterns</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>AI pattern analysis agent</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>Document upload & processing</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>Downloadable transformation report</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20 px-4 bg-card/50">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="font-serif text-3xl md:text-4xl font-bold mb-3">
                Choose Your Path
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Start with the phase that speaks to you, or get the complete experience and save.
              </p>
            </div>

            <Card className="mb-8 border-primary relative overflow-visible" data-testid="card-pricing-allinone">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Best Value - Save $199
              </Badge>
              <CardHeader className="text-center pt-8 pb-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="font-serif text-2xl">Complete Inner Journey</CardTitle>
                <CardDescription className="text-base">All 3 phases - everything you need for the full transformation</CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-2">
                <div className="mb-4">
                  <span className="text-5xl font-bold">$499</span>
                  <span className="text-muted-foreground ml-2">one-time</span>
                </div>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground mb-6 max-w-lg mx-auto">
                  <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> All video lessons</span>
                  <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> AI self-discovery guide</span>
                  <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Journaling & tools</span>
                  <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Transformation agent</span>
                  <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Pattern analysis report</span>
                </div>
              </CardContent>
              <CardFooter className="justify-center pb-8">
                <Button size="lg" onClick={() => handleGetStarted("allinone")} data-testid="button-buy-allinone">
                  Get the Complete Program
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="hover-elevate overflow-visible" data-testid="card-pricing-phase12">
                <CardHeader className="text-center">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Layers className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="font-serif text-xl">Phase 1 & 2: Self-Reflection & Structure</CardTitle>
                  <CardDescription>Discover yourself and build daily systems</CardDescription>
                </CardHeader>
                <CardContent className="text-center pb-2">
                  <div className="mb-4">
                    <span className="text-4xl font-bold">$399</span>
                    <span className="text-muted-foreground ml-2">one-time</span>
                  </div>
                  <ul className="space-y-2 text-sm text-left max-w-xs mx-auto">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">3 video lessons</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">AI self-discovery conversations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Journaling & all growth tools</span>
                    </li>
                    <li className="flex items-start gap-2">
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
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Zap className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="font-serif text-xl">Phase 3: Transformation</CardTitle>
                  <CardDescription>AI-powered pattern analysis & insights</CardDescription>
                </CardHeader>
                <CardContent className="text-center pb-2">
                  <div className="mb-4">
                    <span className="text-4xl font-bold">$299</span>
                    <span className="text-muted-foreground ml-2">one-time</span>
                  </div>
                  <ul className="space-y-2 text-sm text-left max-w-xs mx-auto">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Video lesson on patterns</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">AI transformation agent</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Document upload & analysis</span>
                    </li>
                    <li className="flex items-start gap-2">
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

        <section className="py-20 px-4">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-6">
              Ready to Begin?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Your journey to self-discovery starts with a single step. 
              Get the complete program and save $199, or choose the phase that fits your needs.
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

      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            <span className="font-serif font-medium">Inner Journey</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; 2026 Inner Journey. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
