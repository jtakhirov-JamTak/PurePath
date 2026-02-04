import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { LockedCourseModal } from "@/components/locked-course-modal";
import { 
  BookOpen, ArrowLeft, Sun, Moon, Download, 
  Loader2, Check, Flame, Trophy, Star, Gift
} from "lucide-react";
import { useLocation } from "wouter";
import { format, isSameDay, subDays, differenceInDays, parseISO } from "date-fns";
import type { Journal, Purchase } from "@shared/schema";

// Helper to calculate streak information
function calculateStreak(journals: Journal[]): { currentStreak: number; longestStreak: number; completedDays: Set<string> } {
  // Group journals by date and check for both morning AND evening completion
  const dayCompletion = new Map<string, { morning: boolean; evening: boolean }>();
  
  journals.forEach(j => {
    const dateStr = j.date;
    if (!dayCompletion.has(dateStr)) {
      dayCompletion.set(dateStr, { morning: false, evening: false });
    }
    const day = dayCompletion.get(dateStr)!;
    if (j.session === "morning") day.morning = true;
    if (j.session === "evening") day.evening = true;
  });

  // Get all fully completed days (both sessions)
  const completedDays = new Set<string>();
  dayCompletion.forEach((completion, dateStr) => {
    if (completion.morning && completion.evening) {
      completedDays.add(dateStr);
    }
  });

  // Calculate current streak (consecutive days ending today or yesterday)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let currentStreak = 0;
  let checkDate = today;
  
  // Check if today is complete, if not start from yesterday
  const todayStr = format(today, "yyyy-MM-dd");
  if (!completedDays.has(todayStr)) {
    checkDate = subDays(today, 1);
  }
  
  while (true) {
    const dateStr = format(checkDate, "yyyy-MM-dd");
    if (completedDays.has(dateStr)) {
      currentStreak++;
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
  }

  // Calculate longest streak
  const sortedDates = Array.from(completedDays).sort();
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  sortedDates.forEach(dateStr => {
    const date = parseISO(dateStr);
    if (prevDate && differenceInDays(date, prevDate) === 1) {
      tempStreak++;
    } else {
      tempStreak = 1;
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    prevDate = date;
  });

  return { currentStreak, longestStreak, completedDays };
}

// Get reward milestones - rewards unlock based on longest streak (permanent achievement)
// Days remaining is calculated based on current streak (what user needs to keep going)
function getRewardMilestones(currentStreak: number, longestStreak: number) {
  const milestones = [
    { days: 7, title: "Week Warrior", description: "7 days of consistent journaling!", icon: Star, unlocked: false },
    { days: 30, title: "Monthly Master", description: "30 days of transformation!", icon: Trophy, unlocked: false },
  ];
  
  return milestones.map(m => ({
    ...m,
    // Unlocked if ever achieved (longestStreak)
    unlocked: longestStreak >= m.days,
    // Days remaining based on current streak (so user sees progress)
    daysRemaining: Math.max(0, m.days - currentStreak),
  }));
}

export default function Course2JournalPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [showLockedModal, setShowLockedModal] = useState(false);

  const { data: purchases, isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
    enabled: !!user,
  });

  const hasAccess = purchases?.some(p => p.courseType === "course2" || p.courseType === "bundle");

  useEffect(() => {
    if (!purchasesLoading && !authLoading) {
      setShowLockedModal(!hasAccess);
    }
  }, [hasAccess, purchasesLoading, authLoading]);

  const handleCloseModal = () => {
    setShowLockedModal(false);
    setLocation("/dashboard");
  };

  const { data: journals = [], isLoading: journalsLoading } = useQuery<Journal[]>({
    queryKey: ["/api/journals"],
    enabled: !!user && hasAccess,
  });

  // Calculate day completion status for calendar
  const dayStatus = useMemo(() => {
    const status = new Map<string, { morning: boolean; evening: boolean }>();
    journals.forEach(j => {
      const dateStr = j.date;
      if (!status.has(dateStr)) {
        status.set(dateStr, { morning: false, evening: false });
      }
      const day = status.get(dateStr)!;
      if (j.session === "morning") day.morning = true;
      if (j.session === "evening") day.evening = true;
    });
    return status;
  }, [journals]);

  // Calculate streak and rewards
  const { currentStreak, longestStreak, completedDays } = useMemo(() => 
    calculateStreak(journals), [journals]);
  
  const rewards = useMemo(() => 
    getRewardMilestones(currentStreak, longestStreak), [currentStreak, longestStreak]);

  // Days for calendar modifiers - derive from dayStatus to avoid duplicates
  const daysWithMorningOnly = useMemo(() => {
    const dates: Date[] = [];
    dayStatus.forEach((status, dateStr) => {
      if (status.morning && !status.evening) {
        dates.push(parseISO(dateStr));
      }
    });
    return dates;
  }, [dayStatus]);
  
  const daysWithEveningOnly = useMemo(() => {
    const dates: Date[] = [];
    dayStatus.forEach((status, dateStr) => {
      if (status.evening && !status.morning) {
        dates.push(parseISO(dateStr));
      }
    });
    return dates;
  }, [dayStatus]);
  
  const daysFullyComplete = useMemo(() => 
    Array.from(completedDays).map(d => parseISO(d)), [completedDays]);

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
      <LockedCourseModal 
        courseType="course2" 
        open={showLockedModal && !hasAccess} 
        onClose={handleCloseModal}
      />
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
                    fullyComplete: daysFullyComplete,
                    hasMorningOnly: daysWithMorningOnly,
                    hasEveningOnly: daysWithEveningOnly,
                  }}
                  modifiersClassNames={{
                    fullyComplete: "bg-primary/20 font-bold text-primary",
                    hasMorningOnly: "bg-amber-500/15 font-medium",
                    hasEveningOnly: "bg-indigo-500/15 font-medium",
                  }}
                  components={{
                    DayContent: ({ date }) => {
                      const dateStr = format(date, "yyyy-MM-dd");
                      const status = dayStatus.get(dateStr);
                      const hasMorning = status?.morning || false;
                      const hasEvening = status?.evening || false;
                      const isComplete = hasMorning && hasEvening;
                      
                      return (
                        <div className="relative flex flex-col items-center">
                          <span>{date.getDate()}</span>
                          {(hasMorning || hasEvening) && (
                            <div className="flex gap-1 mt-0.5">
                              {hasMorning && (
                                <Check className={`w-3 h-3 ${isComplete ? 'text-primary' : 'text-amber-500'}`} />
                              )}
                              {hasEvening && (
                                <Check className={`w-3 h-3 ${isComplete ? 'text-primary' : 'text-indigo-500'}`} />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    },
                  }}
                  data-testid="calendar"
                />
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-amber-500" />
                    <span>Morning</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-indigo-500" />
                    <span>Evening</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-primary" />
                    <Check className="w-3 h-3 text-primary" />
                    <span>Both</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <CardTitle className="font-serif text-lg">Your Streak</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-primary">{currentStreak}</p>
                      <p className="text-sm text-muted-foreground">Current streak</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-semibold">{longestStreak}</p>
                      <p className="text-sm text-muted-foreground">Best streak</p>
                    </div>
                  </div>
                  
                  {currentStreak > 0 && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-primary/10">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">
                        Keep it up! {currentStreak} day{currentStreak > 1 ? 's' : ''} and counting!
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-purple-500" />
                  <CardTitle className="font-serif text-lg">Rewards</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rewards.map((reward, idx) => {
                    const Icon = reward.icon;
                    return (
                      <div 
                        key={idx}
                        className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${
                          reward.unlocked 
                            ? 'bg-primary/10 border-primary/30' 
                            : 'bg-muted/30 border-border opacity-60'
                        }`}
                        data-testid={`reward-${reward.days}`}
                      >
                        <div className={`p-2 rounded-full ${
                          reward.unlocked ? 'bg-primary/20' : 'bg-muted'
                        }`}>
                          <Icon className={`h-5 w-5 ${
                            reward.unlocked ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{reward.title}</p>
                            {reward.unlocked && (
                              <Badge variant="secondary" className="text-xs">
                                <Check className="h-3 w-3 mr-1" />
                                Unlocked
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{reward.description}</p>
                        </div>
                        {!reward.unlocked && (
                          <div className="text-right">
                            <p className="text-sm font-medium">{reward.daysRemaining} days</p>
                            <p className="text-xs text-muted-foreground">to unlock</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Complete Days</span>
                    <span className="font-medium">{completedDays.size}</span>
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
                    {hasMorningEntry ? "Edit Entry" : "Start Session"}
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
                    {hasEveningEntry ? "Edit Entry" : "Start Session"}
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
