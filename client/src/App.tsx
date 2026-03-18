import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import CheckoutPage from "@/pages/checkout";
import CheckoutSuccessPage from "@/pages/checkout-success";
import CheckoutCancelPage from "@/pages/checkout-cancel";
import DashboardPage from "@/pages/dashboard";
import BillingPage from "@/pages/billing";
import JournalEntryPage from "@/pages/journal-entry";
import MeditationPage from "@/pages/meditation";
import EmotionalProcessingPage from "@/pages/emotional-processing";
import EisenhowerPage from "@/pages/eisenhower";
import EmpathyPage from "@/pages/empathy";
import HabitsPage from "@/pages/habits";

import LearnPage from "@/pages/learn";

import PlanPage from "@/pages/plan";
import JournalHubPage from "@/pages/journal-hub";

import IdentityDocPage from "@/pages/identity-doc";
import DiscoveryProfilePage from "@/pages/discovery-profile";
import ScoreboardPage from "@/pages/scoreboard";
import MonthlyGoalPage from "@/pages/monthly-goal";
import GoalWizardPage from "@/pages/goal-wizard";
import SetupWizardPage from "@/pages/setup-wizard";
import { Loader2 } from "lucide-react";
import { UnsavedGuardProvider } from "@/hooks/use-unsaved-guard";

function AuthenticatedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <Component />;
}

function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <DashboardPage />;
  }

  return <LandingPage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/checkout/success" component={CheckoutSuccessPage} />
      <Route path="/checkout/cancel" component={CheckoutCancelPage} />
      <Route path="/checkout/:courseType" component={CheckoutPage} />
      <Route path="/dashboard">
        {() => <AuthenticatedRoute component={DashboardPage} />}
      </Route>
      <Route path="/billing">
        {() => <AuthenticatedRoute component={BillingPage} />}
      </Route>
      <Route path="/journal/:date/:session">
        {() => <AuthenticatedRoute component={JournalEntryPage} />}
      </Route>
      <Route path="/meditation">
        {() => <AuthenticatedRoute component={MeditationPage} />}
      </Route>
      <Route path="/emotional-processing">
        {() => <AuthenticatedRoute component={EmotionalProcessingPage} />}
      </Route>
      <Route path="/eisenhower">
        {() => <AuthenticatedRoute component={EisenhowerPage} />}
      </Route>
      <Route path="/empathy">
        {() => <AuthenticatedRoute component={EmpathyPage} />}
      </Route>
      <Route path="/habits">
        {() => <AuthenticatedRoute component={HabitsPage} />}
      </Route>
      <Route path="/learn">
        {() => <AuthenticatedRoute component={LearnPage} />}
      </Route>
      <Route path="/plan">
        {() => <AuthenticatedRoute component={PlanPage} />}
      </Route>
      <Route path="/journal">
        {() => <AuthenticatedRoute component={JournalHubPage} />}
      </Route>
      <Route path="/identity">
        {() => <AuthenticatedRoute component={IdentityDocPage} />}
      </Route>
      <Route path="/discovery-profile">
        {() => <AuthenticatedRoute component={DiscoveryProfilePage} />}
      </Route>
      <Route path="/scoreboard">
        {() => <AuthenticatedRoute component={ScoreboardPage} />}
      </Route>
      <Route path="/monthly-goal">
        {() => <AuthenticatedRoute component={MonthlyGoalPage} />}
      </Route>
      <Route path="/goal-wizard">
        {() => <AuthenticatedRoute component={GoalWizardPage} />}
      </Route>
      <Route path="/setup">
        {() => <AuthenticatedRoute component={SetupWizardPage} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function RedirectToHome() {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    const alreadyRedirected = sessionStorage.getItem("ij-session-started");
    if (!alreadyRedirected && location !== "/" && location !== "/checkout/success" && location !== "/checkout/cancel" && !location.startsWith("/checkout/")) {
      sessionStorage.setItem("ij-session-started", "1");
      setLocation("/");
    } else {
      sessionStorage.setItem("ij-session-started", "1");
    }
  }, []);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="inner-journey-theme">
        <TooltipProvider>
          <UnsavedGuardProvider>
            <Toaster />
            <RedirectToHome />
            <Router />
          </UnsavedGuardProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
