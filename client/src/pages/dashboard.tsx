import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { Compass, Sparkles, BookOpen, Package, Lock, ArrowRight, LogOut, CreditCard } from "lucide-react";
import { useLocation } from "wouter";
import type { Purchase } from "@shared/schema";

export default function DashboardPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
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

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Compass className="h-7 w-7 text-primary" />
            <span className="font-serif text-xl font-semibold">Inner Journey</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/billing")}
              data-testid="button-billing"
            >
              <CreditCard className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline">
                {user?.firstName || user?.email?.split("@")[0]}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold mb-2">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-muted-foreground">
            Continue your journey of self-discovery and transformation
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover-elevate" data-testid="card-course1">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                {hasCourse1 ? (
                  <Badge variant="secondary">Purchased</Badge>
                ) : (
                  <Badge variant="outline">
                    <Lock className="h-3 w-3 mr-1" />
                    Locked
                  </Badge>
                )}
              </div>
              <CardTitle className="font-serif">Self-Discovery GPT</CardTitle>
              <CardDescription>
                Your AI-powered companion for deep personal insights and guided self-discovery conversations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasCourse1 ? (
                <Button 
                  className="w-full" 
                  onClick={() => setLocation("/course1")}
                  data-testid="button-access-course1"
                >
                  Start Conversation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setLocation("/checkout/course1")}
                  data-testid="button-unlock-course1"
                >
                  Unlock for $49
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="hover-elevate" data-testid="card-course2">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                {hasCourse2 ? (
                  <Badge variant="secondary">Purchased</Badge>
                ) : (
                  <Badge variant="outline">
                    <Lock className="h-3 w-3 mr-1" />
                    Locked
                  </Badge>
                )}
              </div>
              <CardTitle className="font-serif">Transformation Journal</CardTitle>
              <CardDescription>
                Structured morning and evening journaling with guided templates for lasting personal growth.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasCourse2 ? (
                <Button 
                  className="w-full" 
                  onClick={() => setLocation("/course2")}
                  data-testid="button-access-course2"
                >
                  Open Journal
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setLocation("/checkout/course2")}
                  data-testid="button-unlock-course2"
                >
                  Unlock for $39
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {!hasCourse1 && !hasCourse2 && (
          <Card className="mt-8 border-primary/50" data-testid="card-bundle-promo">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-serif">Complete Transformation Bundle</CardTitle>
                  <CardDescription>Get both courses and save $19</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setLocation("/checkout/bundle")}
                data-testid="button-buy-bundle"
              >
                Get the Bundle for $69
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
