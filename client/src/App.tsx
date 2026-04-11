import { Component, useEffect, lazy, Suspense, type ReactNode } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import DashboardPage from "@/pages/dashboard";
import JournalEntryPage from "@/pages/journal-entry";
import EisenhowerPage from "@/pages/eisenhower";
import HabitsPage from "@/pages/habits";

import PlanPage from "@/pages/plan";
import SprintPage from "@/pages/sprint";
import MePage from "@/pages/me";
import SetupWizardPage from "@/pages/setup-wizard";
import AdminPage from "@/pages/admin";
const ProofPage = lazy(() => import("@/pages/proof"));
import { Loader2 } from "lucide-react";
import { UnsavedGuardProvider } from "@/hooks/use-unsaved-guard";

function AuthenticatedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/auth");
    }
  }, [isLoading, isAuthenticated, setLocation]);

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
  const [, setLocation] = useLocation();
  const { data: accessStatus, isLoading: accessLoading } = useQuery<{ hasAccess: boolean }>({
    queryKey: ["/api/access-status"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/auth");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    if (!accessLoading && accessStatus && !accessStatus.hasAccess) {
      setLocation("/auth");
    }
  }, [accessLoading, accessStatus, setLocation]);

  if (authLoading || accessLoading || !isAuthenticated || !accessStatus?.hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { data: adminCheck, isLoading: adminLoading, isError } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
    enabled: isAuthenticated,
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/auth");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    if (isError) {
      setLocation("/");
    }
  }, [isError, setLocation]);

  if (authLoading || adminLoading || !isAuthenticated || !adminCheck) {
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
  const [, setLocation] = useLocation();
  const { data: accessStatus, isLoading: accessLoading } = useQuery<{ hasAccess: boolean }>({
    queryKey: ["/api/access-status"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (isAuthenticated && !accessLoading && accessStatus && !accessStatus.hasAccess) {
      setLocation("/auth");
    }
  }, [isAuthenticated, accessLoading, accessStatus, setLocation]);

  if (authLoading || (isAuthenticated && accessLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated && accessStatus?.hasAccess) {
    return <Redirect to="/today" />;
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

function JournalRedirect({ params }: { params: { date: string; session: string } }) {
  return <Redirect to={`/today/journal/${params.date}/${params.session}`} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />

      {/* Primary routes — each wrapped in TabErrorBoundary for graceful per-tab recovery */}
      <Route path="/today">
        {() => <TabErrorBoundary tabName="Today"><AccessGatedRoute component={DashboardPage} /></TabErrorBoundary>}
      </Route>
      <Route path="/today/journal/:date/:session">
        {() => <TabErrorBoundary tabName="Journal"><AccessGatedRoute component={JournalEntryPage} /></TabErrorBoundary>}
      </Route>
      <Route path="/week">
        {() => <TabErrorBoundary tabName="Week"><AccessGatedRoute component={PlanPage} /></TabErrorBoundary>}
      </Route>
      <Route path="/week/plan">
        {() => <TabErrorBoundary tabName="Week"><AccessGatedRoute component={EisenhowerPage} /></TabErrorBoundary>}
      </Route>
      <Route path="/week/habits">
        {() => <TabErrorBoundary tabName="Week"><AccessGatedRoute component={HabitsPage} /></TabErrorBoundary>}
      </Route>
      <Route path="/sprint">
        {() => <TabErrorBoundary tabName="Sprint"><AccessGatedRoute component={SprintPage} /></TabErrorBoundary>}
      </Route>
      <Route path="/proof">
        {() => <TabErrorBoundary tabName="Proof"><Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-border" /></div>}><AccessGatedRoute component={ProofPage} /></Suspense></TabErrorBoundary>}
      </Route>
      <Route path="/me">
        {() => <TabErrorBoundary tabName="Me"><AccessGatedRoute component={MePage} /></TabErrorBoundary>}
      </Route>
      <Route path="/me/identity">{() => <Redirect to="/me" />}</Route>
      <Route path="/me/patterns">{() => <Redirect to="/me" />}</Route>
      <Route path="/me/scoreboard">{() => <Redirect to="/me" />}</Route>
      <Route path="/setup">
        {() => <TabErrorBoundary tabName="Setup"><AccessGatedRoute component={SetupWizardPage} /></TabErrorBoundary>}
      </Route>
      <Route path="/admin">
        {() => <TabErrorBoundary tabName="Admin"><AdminRoute component={AdminPage} /></TabErrorBoundary>}
      </Route>

      {/* Backward-compatibility redirects */}
      <Route path="/dashboard">{() => <Redirect to="/today" />}</Route>
      <Route path="/journal/:date/:session">
        {(params) => <JournalRedirect params={params} />}
      </Route>
      <Route path="/journal">{() => <Redirect to="/today" />}</Route>
      <Route path="/plan">{() => <Redirect to="/week" />}</Route>
      <Route path="/eisenhower">{() => <Redirect to="/week/plan" />}</Route>
      <Route path="/habits">{() => <Redirect to="/me" />}</Route>
      <Route path="/profile">{() => <Redirect to="/me" />}</Route>
      <Route path="/identity">{() => <Redirect to="/me/identity" />}</Route>
      <Route path="/pattern-profile">{() => <Redirect to="/me/patterns" />}</Route>
      <Route path="/scoreboard">{() => <Redirect to="/me/scoreboard" />}</Route>
      <Route path="/monthly-goal">{() => <Redirect to="/sprint" />}</Route>
      <Route path="/month">{() => <Redirect to="/sprint" />}</Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function RedirectToHome() {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    const alreadyRedirected = sessionStorage.getItem("tl-session-started");
    if (!alreadyRedirected && location !== "/" && location !== "/auth") {
      sessionStorage.setItem("tl-session-started", "1");
      setLocation("/");
    } else {
      sessionStorage.setItem("tl-session-started", "1");
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
            className="px-4 py-2 min-h-[44px] bg-primary text-primary-foreground rounded-md text-sm"
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

class TabErrorBoundary extends Component<
  { children: ReactNode; tabName: string },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; tabName: string }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`Tab error in ${this.props.tabName}:`, (error as Error).message, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
          <h2 className="text-lg font-semibold mb-2">
            Something went wrong in {this.props.tabName}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Your other tabs still work. Tap below to retry.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 min-h-[44px] bg-primary text-primary-foreground rounded-md text-sm"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// One-time migration of theme preference from old storage key
if (!localStorage.getItem("the-leaf-theme") && localStorage.getItem("inner-journey-theme")) {
  localStorage.setItem("the-leaf-theme", localStorage.getItem("inner-journey-theme")!);
  localStorage.removeItem("inner-journey-theme");
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="the-leaf-theme">
          <UnsavedGuardProvider>
            <Toaster />
            <RedirectToHome />
            <Router />
          </UnsavedGuardProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
