import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/app-header";
import { LockedCourseModal } from "@/components/locked-course-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sun, Moon, Download, ChevronLeft, ChevronRight,
  Loader2, Check, Flame, Trophy, Star, Gift, Calendar as CalendarIcon, Plus, Edit, Eye
} from "lucide-react";
import { useLocation } from "wouter";
import { 
  format, isSameDay, subDays, differenceInDays, parseISO, 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, 
  isSameMonth, addMonths, subMonths 
} from "date-fns";
import type { Journal, Purchase } from "@shared/schema";

// Helper to calculate streak information
function calculateStreak(journals: Journal[]): { currentStreak: number; longestStreak: number; completedDays: Set<string> } {
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

  const completedDays = new Set<string>();
  dayCompletion.forEach((completion, dateStr) => {
    if (completion.morning && completion.evening) {
      completedDays.add(dateStr);
    }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let currentStreak = 0;
  let checkDate = today;
  
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

function getRewardMilestones(currentStreak: number, longestStreak: number) {
  const milestones = [
    { days: 7, title: "Week Warrior", description: "7 days of consistent journaling!", icon: Star, unlocked: false },
    { days: 30, title: "Monthly Master", description: "30 days of transformation!", icon: Trophy, unlocked: false },
  ];
  
  return milestones.map(m => ({
    ...m,
    unlocked: longestStreak >= m.days,
    daysRemaining: Math.max(0, m.days - currentStreak),
  }));
}

export default function Course2JournalPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [viewEntryDialogOpen, setViewEntryDialogOpen] = useState(false);
  const [selectedViewDate, setSelectedViewDate] = useState<Date | null>(null);

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

  const { currentStreak, longestStreak, completedDays } = useMemo(() => 
    calculateStreak(journals), [journals]);
  
  const rewards = useMemo(() => 
    getRewardMilestones(currentStreak, longestStreak), [currentStreak, longestStreak]);

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  // Get entries for selected view date
  const selectedDateJournals = useMemo(() => {
    if (!selectedViewDate) return [];
    return journals.filter(j => isSameDay(parseISO(j.date), selectedViewDate));
  }, [journals, selectedViewDate]);

  const handleDayClick = (date: Date) => {
    // Allow clicking any date in current month to view/add entries
    setSelectedViewDate(date);
    setViewEntryDialogOpen(true);
  };

  if (authLoading || purchasesLoading || journalsLoading) {
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

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const todayStatus = dayStatus.get(todayStr);
  const hasTodayMorning = todayStatus?.morning || false;
  const hasTodayEvening = todayStatus?.evening || false;

  return (
    <div className="min-h-screen bg-background">
      <LockedCourseModal 
        courseType="course2" 
        open={showLockedModal && !hasAccess} 
        onClose={handleCloseModal}
      />
      <AppHeader 
        rightContent={
          <Button variant="outline" size="sm" onClick={handleDownloadAll} data-testid="button-download-all">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        }
      />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold mb-2">Transformation Journal</h1>
          <p className="text-muted-foreground">Track your daily reflections and build a journaling habit</p>
        </div>

        {/* Today's Actions - Quick Access */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card className="hover-elevate" data-testid="card-morning-session">
            <CardContent className="py-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Sun className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Morning Session</h3>
                    <p className="text-sm text-muted-foreground">Set intentions & gratitude</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasTodayMorning && (
                    <Badge variant="secondary" className="shrink-0">
                      <Check className="h-3 w-3 mr-1" />
                      Done
                    </Badge>
                  )}
                  <Button 
                    variant={hasTodayMorning ? "outline" : "default"}
                    onClick={() => setLocation(`/journal/${todayStr}/morning`)}
                    data-testid="button-morning-journal"
                  >
                    {hasTodayMorning ? (
                      <>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Start
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate" data-testid="card-evening-session">
            <CardContent className="py-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <Moon className="h-6 w-6 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Evening Session</h3>
                    <p className="text-sm text-muted-foreground">Reflect on your day</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasTodayEvening && (
                    <Badge variant="secondary" className="shrink-0">
                      <Check className="h-3 w-3 mr-1" />
                      Done
                    </Badge>
                  )}
                  <Button 
                    variant={hasTodayEvening ? "outline" : "default"}
                    onClick={() => setLocation(`/journal/${todayStr}/evening`)}
                    data-testid="button-evening-journal"
                  >
                    {hasTodayEvening ? (
                      <>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Start
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          {/* Large Calendar */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  <CardTitle className="font-serif text-xl">Journal Calendar</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    data-testid="button-prev-month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[140px] text-center font-medium">
                    {format(currentMonth, "MMMM yyyy")}
                  </span>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    data-testid="button-next-month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>Click on a date to view or add journal entries</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Calendar Header */}
              <div className="grid grid-cols-7 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1" data-testid="calendar-grid">
                {calendarDays.map((date, idx) => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  const status = dayStatus.get(dateStr);
                  const hasMorning = status?.morning || false;
                  const hasEvening = status?.evening || false;
                  const isComplete = hasMorning && hasEvening;
                  const hasAnyEntry = hasMorning || hasEvening;
                  const isCurrentMonth = isSameMonth(date, currentMonth);
                  const isToday = isSameDay(date, new Date());
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => handleDayClick(date)}
                      disabled={!isCurrentMonth}
                      className={`
                        relative aspect-square p-1 rounded-lg text-sm transition-colors
                        flex flex-col items-center justify-center gap-0.5
                        ${!isCurrentMonth ? 'text-muted-foreground/30 cursor-not-allowed' : 'hover-elevate cursor-pointer'}
                        ${isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                        ${isComplete ? 'bg-primary/15' : hasMorning ? 'bg-amber-500/10' : hasEvening ? 'bg-indigo-500/10' : ''}
                      `}
                      data-testid={`calendar-day-${dateStr}`}
                    >
                      <span className={`font-medium ${isToday ? 'text-primary' : ''}`}>
                        {date.getDate()}
                      </span>
                      {hasAnyEntry && isCurrentMonth && (
                        <div className="flex gap-0.5">
                          {hasMorning && (
                            <div className={`w-2 h-2 rounded-full ${isComplete ? 'bg-primary' : 'bg-amber-500'}`} />
                          )}
                          {hasEvening && (
                            <div className={`w-2 h-2 rounded-full ${isComplete ? 'bg-primary' : 'bg-indigo-500'}`} />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* Legend */}
              <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span>Morning</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-500" />
                  <span>Evening</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span>Both Complete</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar - Stats & Rewards */}
          <div className="space-y-4">
            <Card>
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

            <Card>
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
                          <Icon className={`h-4 w-4 ${
                            reward.unlocked ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{reward.title}</p>
                            {reward.unlocked && (
                              <Badge variant="secondary" className="text-xs">
                                <Check className="h-3 w-3 mr-1" />
                                Unlocked
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{reward.description}</p>
                        </div>
                        {!reward.unlocked && (
                          <div className="text-right shrink-0">
                            <p className="text-sm font-medium">{reward.daysRemaining}</p>
                            <p className="text-xs text-muted-foreground">days</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
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
        </div>
      </main>

      {/* View Entry Dialog */}
      <Dialog open={viewEntryDialogOpen} onOpenChange={setViewEntryDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {selectedViewDate ? format(selectedViewDate, "EEEE, MMMM d, yyyy") : ""}
            </DialogTitle>
            <DialogDescription>
              {selectedDateJournals.length > 0 
                ? "View or edit your journal entries for this day"
                : "Start a new journal entry for this day"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            {selectedViewDate && (() => {
              const dateStr = format(selectedViewDate, "yyyy-MM-dd");
              const morningEntry = selectedDateJournals.find(j => j.session === "morning");
              const eveningEntry = selectedDateJournals.find(j => j.session === "evening");
              
              return (
                <>
                  {/* Morning Entry */}
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <Sun className="h-5 w-5 text-amber-500" />
                        <span className="font-medium">Morning Session</span>
                      </div>
                      {morningEntry ? (
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setViewEntryDialogOpen(false);
                            setLocation(`/journal/${dateStr}/morning`);
                          }}
                          data-testid="button-edit-morning"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      ) : (
                        <Button 
                          size="sm"
                          onClick={() => {
                            setViewEntryDialogOpen(false);
                            setLocation(`/journal/${dateStr}/morning`);
                          }}
                          data-testid="button-new-morning"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          New Entry
                        </Button>
                      )}
                    </div>
                    {morningEntry && (
                      <div className="space-y-2 text-sm">
                        {morningEntry.gratitude && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Gratitude</p>
                            <p className="line-clamp-2">{morningEntry.gratitude}</p>
                          </div>
                        )}
                        {morningEntry.intentions && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Intentions</p>
                            <p className="line-clamp-2">{morningEntry.intentions}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {!morningEntry && (
                      <p className="text-sm text-muted-foreground">No entry yet</p>
                    )}
                  </div>

                  {/* Evening Entry */}
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <Moon className="h-5 w-5 text-indigo-500" />
                        <span className="font-medium">Evening Session</span>
                      </div>
                      {eveningEntry ? (
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setViewEntryDialogOpen(false);
                            setLocation(`/journal/${dateStr}/evening`);
                          }}
                          data-testid="button-edit-evening"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      ) : (
                        <Button 
                          size="sm"
                          onClick={() => {
                            setViewEntryDialogOpen(false);
                            setLocation(`/journal/${dateStr}/evening`);
                          }}
                          data-testid="button-new-evening"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          New Entry
                        </Button>
                      )}
                    </div>
                    {eveningEntry && (
                      <div className="space-y-2 text-sm">
                        {eveningEntry.highlights && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Highlights</p>
                            <p className="line-clamp-2">{eveningEntry.highlights}</p>
                          </div>
                        )}
                        {eveningEntry.reflections && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Reflections</p>
                            <p className="line-clamp-2">{eveningEntry.reflections}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {!eveningEntry && (
                      <p className="text-sm text-muted-foreground">No entry yet</p>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
