import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, ArrowLeft } from "lucide-react";

export default function CheckoutCancelPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md text-center" data-testid="card-cancel">
        <CardHeader>
          <div className="mx-auto mb-4">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto">
              <XCircle className="h-10 w-10 text-muted-foreground" />
            </div>
          </div>
          <CardTitle className="font-serif text-2xl">Checkout Cancelled</CardTitle>
          <CardDescription className="text-base">
            Your payment was not completed. No charges were made.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            If you have any questions or encountered an issue, please don't hesitate to reach out.
          </p>
          <div className="flex gap-3 justify-center">
            <Button 
              variant="outline"
              onClick={() => setLocation("/")}
              data-testid="button-go-home"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            <Button 
              onClick={() => setLocation("/dashboard")}
              data-testid="button-go-dashboard"
            >
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
