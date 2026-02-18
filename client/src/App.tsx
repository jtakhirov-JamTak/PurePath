import { Switch, Route } from "wouter";
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
import CoursePage from "@/pages/course";
import Course1GPTPage from "@/pages/course1-gpt";
import Course2JournalPage from "@/pages/course2-journal";
import JournalEntryPage from "@/pages/journal-entry";
import Phase3Page from "@/pages/phase3";
import MeditationPage from "@/pages/meditation";
import EmotionalProcessingPage from "@/pages/emotional-processing";
import EisenhowerPage from "@/pages/eisenhower";
import EmpathyPage from "@/pages/empathy";
import HabitsPage from "@/pages/habits";
import TasksPage from "@/pages/tasks";
import ProgressPage from "@/pages/progress";
import LearnPage from "@/pages/learn";
import CoachPage from "@/pages/coach";
import PlanPage from "@/pages/plan";
import JournalHubPage from "@/pages/journal-hub";
import ToolsHubPage from "@/pages/tools-hub";
import IdentityDocPage from "@/pages/identity-doc";
import MonthlyGoalPage from "@/pages/monthly-goal";
import Lesson2WorksheetPage from "@/pages/lesson2-worksheet";
import QuarterlyGoalPage from "@/pages/quarterly-goal";
import RegulationPage from "@/pages/regulation";
import GoalWizardPage from "@/pages/goal-wizard";
import { Loader2 } from "lucide-react";

function AuthenticatedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/api/login";
    return null;
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
      <Route path="/course">
        {() => <AuthenticatedRoute component={CoursePage} />}
      </Route>
      <Route path="/course1">
        {() => <AuthenticatedRoute component={Course1GPTPage} />}
      </Route>
      <Route path="/course2">
        {() => <AuthenticatedRoute component={Course2JournalPage} />}
      </Route>
      <Route path="/journal/:date/:session">
        {() => <AuthenticatedRoute component={JournalEntryPage} />}
      </Route>
      <Route path="/phase3">
        {() => <AuthenticatedRoute component={Phase3Page} />}
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
      <Route path="/tasks">
        {() => <AuthenticatedRoute component={TasksPage} />}
      </Route>
      <Route path="/progress">
        {() => <AuthenticatedRoute component={ProgressPage} />}
      </Route>
      <Route path="/learn">
        {() => <AuthenticatedRoute component={LearnPage} />}
      </Route>
      <Route path="/coach">
        {() => <AuthenticatedRoute component={CoachPage} />}
      </Route>
      <Route path="/plan">
        {() => <AuthenticatedRoute component={PlanPage} />}
      </Route>
      <Route path="/journal">
        {() => <AuthenticatedRoute component={JournalHubPage} />}
      </Route>
      <Route path="/tools">
        {() => <AuthenticatedRoute component={ToolsHubPage} />}
      </Route>
      <Route path="/identity">
        {() => <AuthenticatedRoute component={IdentityDocPage} />}
      </Route>
      <Route path="/monthly-goal">
        {() => <AuthenticatedRoute component={MonthlyGoalPage} />}
      </Route>
      <Route path="/lesson2-worksheet">
        {() => <AuthenticatedRoute component={Lesson2WorksheetPage} />}
      </Route>
      <Route path="/quarterly-goal">
        {() => <AuthenticatedRoute component={QuarterlyGoalPage} />}
      </Route>
      <Route path="/regulation">
        {() => <AuthenticatedRoute component={RegulationPage} />}
      </Route>
      <Route path="/goal-wizard">
        {() => <AuthenticatedRoute component={GoalWizardPage} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="inner-journey-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
