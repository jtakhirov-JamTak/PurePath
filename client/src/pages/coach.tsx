import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ArrowRight, Lock, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Purchase } from "@shared/schema";

export default function CoachPage() {
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

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-10 max-w-2xl">
          <h1 className="font-serif text-3xl font-bold mb-3" data-testid="text-coach-title">Coach</h1>
          <p className="text-muted-foreground text-lg">
            AI-powered guidance for self-discovery and transformation.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl">
          <Card
            className={`overflow-visible ${hasPhase12 ? "hover-elevate cursor-pointer" : "opacity-60"}`}
            onClick={() => hasPhase12 && setLocation("/course1")}
            data-testid="card-gpt-coach"
          >
            <CardHeader>
              <div className="h-12 w-12 rounded-md bg-primary/[0.08] flex items-center justify-center mb-3">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="font-serif text-lg">Self-Discovery GPT</CardTitle>
              <CardDescription>
                AI-guided conversations to explore who you are and who you want to become.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasPhase12 ? (
                <Button className="w-full" data-testid="button-start-gpt">
                  Start Conversation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button variant="outline" onClick={(e) => { e.stopPropagation(); setLocation("/checkout/phase12"); }} data-testid="button-unlock-gpt">
                  <Lock className="h-4 w-4 mr-2" />
                  Unlock Phase 1 & 2
                </Button>
              )}
            </CardContent>
          </Card>

          <Card
            className={`overflow-visible ${hasPhase3 ? "hover-elevate cursor-pointer" : "opacity-60"}`}
            onClick={() => hasPhase3 && setLocation("/phase3")}
            data-testid="card-transformation-agent"
          >
            <CardHeader>
              <div className="h-12 w-12 rounded-md bg-primary/[0.08] flex items-center justify-center mb-3">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="font-serif text-lg">Transformation Agent</CardTitle>
              <CardDescription>
                Upload documents and get AI-powered pattern analysis and insights.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasPhase3 ? (
                <Button className="w-full" data-testid="button-start-transform">
                  Start Analysis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button variant="outline" onClick={(e) => { e.stopPropagation(); setLocation("/checkout/phase3"); }} data-testid="button-unlock-transform">
                  <Lock className="h-4 w-4 mr-2" />
                  Unlock Phase 3
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
