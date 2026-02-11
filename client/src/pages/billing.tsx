import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { Compass, CreditCard, RefreshCw, CheckCircle, ArrowLeft, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Purchase } from "@shared/schema";
import { COURSES } from "@shared/schema";
import { format } from "date-fns";

export default function BillingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: purchases, isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
    enabled: !!user,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing/refresh");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      if (data.updated) {
        toast({
          title: "Access Refreshed",
          description: data.message || "Your access has been updated.",
        });
      } else {
        toast({
          title: "Already Up to Date",
          description: data.message || "Your access is already current.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh access. Please try again later.",
        variant: "destructive",
      });
    },
  });

  if (authLoading || purchasesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-16 w-full mb-8" />
          <Skeleton className="h-64" />
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

  const getCourseName = (courseType: string) => {
    const courseMap: Record<string, string> = {
      phase12: COURSES.phase12.name,
      phase3: COURSES.phase3.name,
      allinone: COURSES.allinone.name,
      course1: "Self-Discovery GPT (Legacy)",
      course2: "Transformation Journal (Legacy)",
      bundle: "Complete Bundle (Legacy)",
    };
    return courseMap[courseType] || courseType;
  };

  const formatAmount = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
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
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline">
                {user?.firstName || user?.email?.split("@")[0]}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <Button 
          variant="ghost" 
          className="mb-6" 
          onClick={() => setLocation("/dashboard")}
          data-testid="button-back-dashboard"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold mb-2 flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-primary" />
            Billing & Access
          </h1>
          <p className="text-muted-foreground">
            View your purchases and manage your course access
          </p>
        </div>

        <Card className="mb-6" data-testid="card-refresh-access">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Payment Issue?
            </CardTitle>
            <CardDescription>
              If you recently paid but your course isn't unlocked, click the button below to refresh your access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              data-testid="button-refresh-access"
            >
              {refreshMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Access
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card data-testid="card-purchase-history">
          <CardHeader>
            <CardTitle className="text-lg">Purchase History</CardTitle>
            <CardDescription>
              Your completed course purchases
            </CardDescription>
          </CardHeader>
          <CardContent>
            {purchases && purchases.length > 0 ? (
              <div className="space-y-4">
                {purchases.map((purchase) => (
                  <div 
                    key={purchase.id} 
                    className="flex items-center justify-between p-4 rounded-lg border"
                    data-testid={`purchase-item-${purchase.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{getCourseName(purchase.courseType)}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(purchase.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{formatAmount(purchase.amount)}</span>
                      <Badge 
                        variant={purchase.status === "completed" ? "secondary" : "outline"}
                      >
                        {purchase.status === "completed" ? "Paid" : purchase.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No purchases yet</p>
                <Button 
                  variant="ghost" 
                  onClick={() => setLocation("/dashboard")}
                  className="mt-2"
                  data-testid="button-browse-courses"
                >
                  Browse courses
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
