import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/app-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, BookOpen, Package, Lock, ArrowRight, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import type { Purchase } from "@shared/schema";

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: purchases, isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
    enabled: !!user,
  });

  const hasCourse1 = purchases?.some(p => p.courseType === "course1" || p.courseType === "bundle");
  const hasCourse2 = purchases?.some(p => p.courseType === "course2" || p.courseType === "bundle");

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-16 w-full mb-8" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-10">
        <div className="mb-10">
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-lg text-muted-foreground">
            Continue your journey of self-discovery and transformation
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="hover-elevate group relative overflow-visible" data-testid="card-course1">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                {hasCourse1 ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Owned
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Lock className="h-3 w-3 mr-1" />
                    $49
                  </Badge>
                )}
              </div>
              <CardTitle className="font-serif text-xl mb-2">Self-Discovery GPT</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Your AI-powered companion for deep personal insights and guided self-discovery conversations.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {hasCourse1 ? (
                <Button 
                  className="w-full h-12 text-base" 
                  onClick={() => setLocation("/course1")}
                  data-testid="button-access-course1"
                >
                  Start Conversation
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full h-12 text-base"
                  onClick={() => setLocation("/course1")}
                  data-testid="button-unlock-course1"
                >
                  Unlock Course
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="hover-elevate group relative overflow-visible" data-testid="card-course2">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
                  <BookOpen className="h-7 w-7 text-primary" />
                </div>
                {hasCourse2 ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Owned
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Lock className="h-3 w-3 mr-1" />
                    $39
                  </Badge>
                )}
              </div>
              <CardTitle className="font-serif text-xl mb-2">Transformation Journal</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Structured morning and evening journaling with guided templates for lasting personal growth.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {hasCourse2 ? (
                <Button 
                  className="w-full h-12 text-base" 
                  onClick={() => setLocation("/course2")}
                  data-testid="button-access-course2"
                >
                  Open Journal
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full h-12 text-base"
                  onClick={() => setLocation("/course2")}
                  data-testid="button-unlock-course2"
                >
                  Unlock Course
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {!hasCourse1 && !hasCourse2 && (
          <Card className="mt-10 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent" data-testid="card-bundle-promo">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shadow-sm">
                  <Package className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="font-serif text-xl mb-1">Complete Transformation Bundle</CardTitle>
                  <CardDescription className="text-base">Get both courses and save $19</CardDescription>
                </div>
                <Button 
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => setLocation("/checkout/bundle")}
                  data-testid="button-buy-bundle"
                >
                  Get Bundle for $69
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}
      </main>
    </div>
  );
}
