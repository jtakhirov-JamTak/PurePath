import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BookOpen, ArrowLeft, Sun, Moon, Lock, Download, 
  Loader2, Check, ChevronLeft, ChevronRight 
} from "lucide-react";
import { useLocation } from "wouter";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import type { Journal, Purchase } from "@shared/schema";

export default function Course2JournalPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const { data: purchases, isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
    enabled: !!user,
  });

  const hasAccess = purchases?.some(p => p.courseType === "course2" || p.courseType === "bundle");

  const { data: journals = [], isLoading: journalsLoading } = useQuery<Journal[]>({
    queryKey: ["/api/journals"],
    enabled: !!user && hasAccess,
  });

  const journalDates = journals.map(j => new Date(j.date));
  const selectedDateJournals = journals.filter(j => 
    isSameDay(new Date(j.date), selectedDate)
  );

  const hasMorningEntry = selectedDateJournals.some(j => j.session === "morning");
  const hasEveningEntry = selectedDateJournals.some(j => j.session === "evening");

  if (authLoading || purchasesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md p-8 text-center">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-bold mb-2">Access Required</h1>
          <p className="text-muted-foreground mb-6">
            You need to purchase the Transformation Journal course to access this feature.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setLocation("/dashboard")} data-testid="button-back-dashboard">
              Go to Dashboard
            </Button>
            <Button onClick={() => setLocation("/checkout/course2")} data-testid="button-purchase-course2">
              Purchase Course
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const handleDownloadAll = async () => {
    const response = await fetch("/api/journals/export", { credentials: "include" });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-journals.txt";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="font-serif text-lg font-medium">Transformation Journal</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadAll} data-testid="button-download-all">
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[350px_1fr] gap-8">
          <div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-serif text-lg">Calendar</CardTitle>
                <CardDescription>Select a date to view or add journal entries</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  className="rounded-md"
                  modifiers={{
                    hasEntry: journalDates,
                  }}
                  modifiersStyles={{
                    hasEntry: {
                      fontWeight: "bold",
                      backgroundColor: "hsl(var(--primary) / 0.15)",
                    },
                  }}
                  data-testid="calendar"
                />
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="font-serif text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Entries</span>
                    <span className="font-medium">{journals.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Days Journaled</span>
                    <span className="font-medium">
                      {new Set(journals.map(j => j.date)).size}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-bold">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </h2>
              {isSameDay(selectedDate, new Date()) && (
                <Badge>Today</Badge>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="hover-elevate" data-testid="card-morning-session">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sun className="h-5 w-5 text-amber-500" />
                      <CardTitle className="font-serif text-lg">Morning Session</CardTitle>
                    </div>
                    {hasMorningEntry && (
                      <Badge variant="secondary">
                        <Check className="h-3 w-3 mr-1" />
                        Complete
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    Set your intentions and gratitude for the day ahead
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full"
                    variant={hasMorningEntry ? "outline" : "default"}
                    onClick={() => setLocation(`/journal/${format(selectedDate, "yyyy-MM-dd")}/morning`)}
                    data-testid="button-morning-journal"
                  >
                    {hasMorningEntry ? "View Entry" : "Start Session"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover-elevate" data-testid="card-evening-session">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Moon className="h-5 w-5 text-indigo-500" />
                      <CardTitle className="font-serif text-lg">Evening Session</CardTitle>
                    </div>
                    {hasEveningEntry && (
                      <Badge variant="secondary">
                        <Check className="h-3 w-3 mr-1" />
                        Complete
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    Reflect on your day and prepare for tomorrow
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full"
                    variant={hasEveningEntry ? "outline" : "default"}
                    onClick={() => setLocation(`/journal/${format(selectedDate, "yyyy-MM-dd")}/evening`)}
                    data-testid="button-evening-journal"
                  >
                    {hasEveningEntry ? "View Entry" : "Start Session"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {selectedDateJournals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-lg">Today's Entries</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedDateJournals.map((journal) => (
                    <div 
                      key={journal.id} 
                      className="p-4 rounded-md bg-muted/50 cursor-pointer hover-elevate"
                      onClick={() => setLocation(`/journal/${format(selectedDate, "yyyy-MM-dd")}/${journal.session}`)}
                      data-testid={`entry-${journal.session}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {journal.session === "morning" ? (
                          <Sun className="h-4 w-4 text-amber-500" />
                        ) : (
                          <Moon className="h-4 w-4 text-indigo-500" />
                        )}
                        <span className="font-medium capitalize">{journal.session} Session</span>
                      </div>
                      {journal.gratitude && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {journal.gratitude}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
