import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Sun, Moon, Calendar, ArrowRight, Lock, BarChart3, Wrench } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import type { Purchase, Journal } from "@shared/schema";

export default function JournalHubPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: purchases = [] } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
    enabled: !!user,
  });

  const { data: journals = [] } = useQuery<Journal[]>({
    queryKey: ["/api/journals"],
    enabled: !!user,
  });

  const hasAccess = purchases.some(p =>
    p.courseType === "phase12" || p.courseType === "allinone" ||
    p.courseType === "course1" || p.courseType === "course2" || p.courseType === "bundle"
  );

  const todayJournals = journals.filter(j => j.date === today);
  const hasMorning = todayJournals.some(j => j.session === "morning");
  const hasEvening = todayJournals.some(j => j.session === "evening");

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-10 max-w-2xl">
          <h1 className="font-serif text-3xl font-bold mb-3" data-testid="text-journal-title">Journal</h1>
          <p className="text-muted-foreground text-lg">
            Morning and evening reflection sessions for self-awareness and growth.
          </p>
        </div>

        <div className="max-w-3xl space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card
              className={`overflow-visible ${hasAccess ? "hover-elevate cursor-pointer" : "opacity-60"}`}
              onClick={() => hasAccess && setLocation(`/journal/${today}/morning`)}
              data-testid="card-morning-journal"
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Sun className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-base">Morning Check-in</CardTitle>
                    <CardDescription className="text-sm">Set your intention for today</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {hasMorning ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Completed today</Badge>
                ) : (
                  <Badge variant="outline">Not started</Badge>
                )}
              </CardContent>
            </Card>

            <Card
              className={`overflow-visible ${hasAccess ? "hover-elevate cursor-pointer" : "opacity-60"}`}
              onClick={() => hasAccess && setLocation(`/journal/${today}/evening`)}
              data-testid="card-evening-journal"
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-md bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <Moon className="h-5 w-5 text-indigo-500" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-base">Evening Review</CardTitle>
                    <CardDescription className="text-sm">Reflect on your day</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {hasEvening ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Completed today</Badge>
                ) : (
                  <Badge variant="outline">Not started</Badge>
                )}
              </CardContent>
            </Card>
          </div>

          <Card
            className={`overflow-visible ${hasAccess ? "hover-elevate cursor-pointer" : "opacity-60"}`}
            onClick={() => hasAccess && setLocation("/course2")}
            data-testid="card-journal-calendar"
          >
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="font-serif text-base">Journal Calendar</CardTitle>
                <CardDescription className="text-sm">View your full journaling history</CardDescription>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </CardHeader>
          </Card>

          {!hasAccess && (
            <div className="text-center py-4">
              <Button onClick={() => setLocation("/checkout/phase12")} data-testid="button-unlock-journal">
                <Lock className="h-4 w-4 mr-2" />
                Unlock Journaling — Phase 1 & 2
              </Button>
            </div>
          )}

          <div className="pt-6 border-t space-y-3">
            <Card
              className="overflow-visible hover-elevate cursor-pointer"
              onClick={() => setLocation("/progress")}
              data-testid="card-link-progress"
            >
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="font-serif text-base">Progress</CardTitle>
                  <CardDescription className="text-sm">Track your habits, goals, and overall growth</CardDescription>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardHeader>
            </Card>

            <Card
              className="overflow-visible hover-elevate cursor-pointer"
              onClick={() => setLocation("/tools")}
              data-testid="card-link-tools"
            >
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Wrench className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="font-serif text-base">Tools</CardTitle>
                  <CardDescription className="text-sm">Meditation, emotional processing, empathy, and regulation</CardDescription>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
