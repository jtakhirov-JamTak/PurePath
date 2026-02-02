import { useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Compass } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function CheckoutSuccessPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md text-center" data-testid="card-success">
        <CardHeader>
          <div className="mx-auto mb-4">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="font-serif text-2xl">Payment Successful!</CardTitle>
          <CardDescription className="text-base">
            Thank you for your purchase. Your transformation journey begins now.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            You now have full access to your course. We're excited to be part of your self-discovery journey.
          </p>
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => setLocation("/dashboard")}
            data-testid="button-go-dashboard"
          >
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
