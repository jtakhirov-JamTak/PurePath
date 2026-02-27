import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { COURSES, type CourseType } from "@shared/schema";
import { ArrowLeft, Check, Loader2, Lock, Layers, Zap, Package } from "lucide-react";
import { LeafLogo } from "@/components/leaf-logo";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const courseIcons: Record<CourseType, React.ReactNode> = {
  phase12: <Layers className="h-8 w-8" />,
  phase3: <Zap className="h-8 w-8" />,
  allinone: <Package className="h-8 w-8" />,
};

export default function CheckoutPage() {
  const params = useParams<{ courseType: string }>();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const courseType = params.courseType as CourseType;
  const course = COURSES[courseType];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const returnUrl = encodeURIComponent(`/checkout/${courseType}`);
      window.location.href = `/api/login?return_to=${returnUrl}`;
    }
  }, [authLoading, isAuthenticated, courseType]);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/checkout", { courseType });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Checkout Error",
        description: error.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Course Not Found</CardTitle>
            <CardDescription>The course you're looking for doesn't exist.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setLocation("/")} data-testid="button-back-home">
              Go Back Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Button variant="ghost" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <LeafLogo size={24} />
            <span className="font-serif text-lg font-medium text-primary">Leaf</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold mb-2">Complete Your Purchase</h1>
          <p className="text-muted-foreground">You're one step away from starting your transformation</p>
        </div>

        <Card data-testid="card-checkout">
          <CardHeader className="text-center border-b">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
              {courseIcons[courseType]}
            </div>
            <CardTitle className="font-serif text-2xl">{course.name}</CardTitle>
            <CardDescription className="text-base">{course.description}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4 mb-6">
              <h3 className="font-medium">What's included:</h3>
              <ul className="space-y-3">
                {course.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-muted/50 rounded-md p-4 mb-6">
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium">Total</span>
                <span className="text-2xl font-bold">${(course.price / 100).toFixed(2)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">One-time payment, lifetime access</p>
            </div>

            {user && (
              <div className="text-sm text-muted-foreground mb-4">
                <p>Purchasing as: <span className="font-medium text-foreground">{user.email || user.firstName}</span></p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              data-testid="button-proceed-checkout"
            >
              {checkoutMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Proceed to Secure Checkout
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center flex items-center gap-1 flex-wrap">
              <Lock className="h-3 w-3" />
              Secured by Stripe. Your payment information is protected.
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
