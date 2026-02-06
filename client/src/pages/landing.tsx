import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { COURSES, type CourseType } from "@shared/schema";
import { Sparkles, BookOpen, Package, Check, ArrowRight, Compass, Heart, Star, Layers, Brain, Zap } from "lucide-react";
import { useLocation } from "wouter";

const courseIcons: Record<CourseType, React.ReactNode> = {
  phase12: <Layers className="h-6 w-6" />,
  phase3: <Zap className="h-6 w-6" />,
  allinone: <Package className="h-6 w-6" />,
};

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
          <div className="container mx-auto text-center max-w-4xl">
            <Badge variant="secondary" className="mb-6">
              Start Your Transformation Today
            </Badge>
            <h1 className="font-serif text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Discover Who You Were{" "}
              <span className="text-primary">Meant to Be</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              A 3-phase journey of self-discovery, structure, and transformation. 
              Combining AI-powered guidance with proven personal growth tools.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" asChild data-testid="button-hero-start">
                <a href="#pricing">
                  Begin Your Journey
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild data-testid="button-hero-learn">
                <a href="#phases">Learn More</a>
              </Button>
            </div>
          </div>
        </section>

        <section id="phases" className="py-20 px-4 bg-card/50">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
                Your 3-Phase Transformation
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Each phase builds on the last, taking you from self-awareness through structured growth to lasting transformation.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="hover-elevate overflow-visible">
                <CardHeader>
                  <Badge variant="secondary" className="w-fit mb-2">Phase 1</Badge>
                  <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                    <Heart className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="font-serif">Self-Reflection</CardTitle>
                  <CardDescription>
                    Explore who you are and who you want to become through video lessons and AI-guided conversations.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      Lesson 1: Who Am I?
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      Lesson 2: Who Do I Want To Be?
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      Video lessons + AI self-discovery guide
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="hover-elevate overflow-visible">
                <CardHeader>
                  <Badge variant="secondary" className="w-fit mb-2">Phase 2</Badge>
                  <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="font-serif">Structure</CardTitle>
                  <CardDescription>
                    Build the daily systems and habits that turn self-knowledge into lasting change.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      Lesson 3: How To Get There
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      Journaling, Meditation & Eisenhower Matrix
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      Weekly habits & daily task management
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="hover-elevate overflow-visible">
                <CardHeader>
                  <Badge variant="secondary" className="w-fit mb-2">Phase 3</Badge>
                  <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="font-serif">Transformation</CardTitle>
                  <CardDescription>
                    Understand your patterns and transform them with AI-powered analysis and insights.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      Lesson: You Are Your Patterns
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      AI pattern analysis agent
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      Personalized transformation report
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
                Choose Your Path to Transformation
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Select the program that resonates with your goals. Each path is designed to meet you where you are.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {(Object.keys(COURSES) as CourseType[]).map((key) => {
                const course = COURSES[key];
                const isAllinone = key === "allinone";
                return (
                  <Card 
                    key={key} 
                    className={`relative hover-elevate overflow-visible ${isAllinone ? "border-primary" : ""}`}
                    data-testid={`card-course-${key}`}
                  >
                    {isAllinone && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                        Best Value
                      </Badge>
                    )}
                    <CardHeader className="text-center">
                      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        {courseIcons[key]}
                      </div>
                      <CardTitle className="font-serif text-xl">{course.name}</CardTitle>
                      <CardDescription>{course.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center mb-6">
                        <span className="text-4xl font-bold">${(course.price / 100).toFixed(0)}</span>
                        <span className="text-muted-foreground"> one-time</span>
                      </div>
                      <ul className="space-y-3">
                        {course.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <span className="text-sm text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        className="w-full" 
                        variant={isAllinone ? "default" : "outline"}
                        onClick={() => handleGetStarted(key)}
                        data-testid={`button-buy-${key}`}
                      >
                        Get Started
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 bg-card/50">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-6">
              Ready to Begin Your Transformation?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join others who have discovered their true potential. 
              Your journey to self-discovery starts with a single step.
            </p>
            <Button size="lg" asChild data-testid="button-cta-start">
              <a href="#pricing">
                Start Your Journey Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
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
            © 2026 Inner Journey. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
