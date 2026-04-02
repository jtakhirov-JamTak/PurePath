import { Component, useEffect, type ReactNode } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import AccessGatePage from "@/pages/access-gate";
import DashboardPage from "@/pages/dashboard";
import JournalEntryPage from "@/pages/journal-entry";
import EisenhowerPage from "@/pages/eisenhower";
import HabitsPage from "@/pages/habits";

import PlanPage from "@/pages/plan";
import JournalHubPage from "@/pages/journal-hub";

import IdentityDocPage from "@/pages/identity-doc";
import DiscoveryProfilePage from "@/pages/discovery-profile";
import ScoreboardPage from "@/pages/scoreboard";
import MonthlyGoalPage from "@/pages/monthly-goal";
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

function AccessGatedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: accessStatus, isLoading: accessLoading } = useQuery<{ hasAccess: boolean }>({
    queryKey: ["/api/access-status"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (!accessLoading && accessStatus && !accessStatus.hasAccess) {
      window.location.href = "/access";
    }
  }, [accessLoading, accessStatus]);

  if (authLoading || accessLoading || !isAuthenticated || !accessStatus?.hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <Component />;
}

function HomePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: accessStatus, isLoading: accessLoading } = useQuery<{ hasAccess: boolean }>({
    queryKey: ["/api/access-status"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (isAuthenticated && !accessLoading && accessStatus && !accessStatus.hasAccess) {
      window.location.href = "/access";
    }
  }, [isAuthenticated, accessLoading, accessStatus]);

  if (authLoading || (isAuthenticated && accessLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated && accessStatus?.hasAccess) {
    return <DashboardPage />;
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // Authenticated but access status pending/redirecting — show loader
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/access">
        {() => <AuthenticatedRoute component={AccessGatePage} />}
      </Route>
      <Route path="/dashboard">
        {() => <AccessGatedRoute component={DashboardPage} />}
      </Route>
      <Route path="/journal/:date/:session">
        {() => <AccessGatedRoute component={JournalEntryPage} />}
      </Route>
      <Route path="/eisenhower">
        {() => <AccessGatedRoute component={EisenhowerPage} />}
      </Route>
      <Route path="/habits">
        {() => <AccessGatedRoute component={HabitsPage} />}
      </Route>
      <Route path="/plan">
        {() => <AccessGatedRoute component={PlanPage} />}
      </Route>
      <Route path="/journal">
        {() => <AccessGatedRoute component={JournalHubPage} />}
      </Route>
      <Route path="/identity">
        {() => <AccessGatedRoute component={IdentityDocPage} />}
      </Route>
      <Route path="/discovery-profile">
        {() => <AccessGatedRoute component={DiscoveryProfilePage} />}
      </Route>
      <Route path="/scoreboard">
        {() => <AccessGatedRoute component={ScoreboardPage} />}
      </Route>
      <Route path="/monthly-goal">
        {() => <AccessGatedRoute component={MonthlyGoalPage} />}
      </Route>
      <Route path="/setup">
        {() => <AccessGatedRoute component={SetupWizardPage} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function RedirectToHome() {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    const alreadyRedirected = sessionStorage.getItem("ij-session-started");
    if (!alreadyRedirected && location !== "/" && location !== "/access") {
      sessionStorage.setItem("ij-session-started", "1");
      setLocation("/");
    } else {
      sessionStorage.setItem("ij-session-started", "1");
    }
  }, []);
  return null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Uncaught render error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-lg font-semibold mb-2">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mb-4">Please refresh the page to continue.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

export default App;
