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
  Loader2, Check, Flame, Trophy, Star, Gift, Calendar as CalendarIcon, Plus, Edit, Eye,
  ZoomIn, ZoomOut, Repeat, Grid3X3
} from "lucide-react";
import { useLocation } from "wouter";
import { 
  format, isSameDay, subDays, differenceInDays, parseISO, 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, 
  isSameMonth, addMonths, subMonths, addWeeks, subWeeks, isWithinInterval
} from "date-fns";
import type { Journal, Purchase, Habit, HabitCompletion, EisenhowerEntry } from "@shared/schema";
import { HABIT_CATEGORIES, type HabitCategory } from "@shared/schema";

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const CATEGORY_STYLES: Record<string, { dot: string; text: string }> = {
  health: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  wealth: { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  relationships: { dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
  career: { dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
  mindfulness: { dot: "bg-violet-500", text: "text-violet-600 dark:text-violet-400" },
  learning: { dot: "bg-cyan-500", text: "text-cyan-600 dark:text-cyan-400" },
};

function getHabitsForDate(habits: Habit[], date: Date): Habit[] {
  const dayCode = DAY_CODES[date.getDay()];
  return habits.filter(h => h.cadence.split(",").includes(dayCode));
}

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
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [viewEntryDialogOpen, setViewEntryDialogOpen] = useState(false);
  const [selectedViewDate, setSelectedViewDate] = useState<Date | null>(null);

  const { data: purchases, isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
    enabled: !!user,
  });

  const hasAccess = purchases?.some(p => 
    p.courseType === "phase12" || p.courseType === "allinone" || 
    p.courseType === "course2" || p.courseType === "bundle"
  );

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
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: eisenhowerEntries = [] } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower"],
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const calendarRange = useMemo(() => {
    if (viewMode === "week") {
      return { start: currentWeek, end: addDays(currentWeek, 6) };
    }
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return {
      start: startOfWeek(monthStart, { weekStartsOn: 0 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
    };
  }, [viewMode, currentWeek, currentMonth]);

  const rangeStartStr = format(calendarRange.start, "yyyy-MM-dd");
  const rangeEndStr = format(calendarRange.end, "yyyy-MM-dd");

  const { data: habitCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions/range", rangeStartStr, rangeEndStr],
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

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

  const completionsByDate = useMemo(() => {
    const map = new Map<string, Set<number>>();
    habitCompletions.forEach(hc => {
      if (!map.has(hc.date)) map.set(hc.date, new Set());
      map.get(hc.date)!.add(hc.habitId);
    });
    return map;
  }, [habitCompletions]);

  const q2ByDate = useMemo(() => {
    const map = new Map<string, EisenhowerEntry[]>();
    eisenhowerEntries
      .filter(e => e.quadrant === "q2" && e.deadline)
      .forEach(e => {
        const d = e.deadline!;
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(e);
      });
    return map;
  }, [eisenhowerEntries]);

  const { currentStreak, longestStreak, completedDays } = useMemo(() => 
    calculateStreak(journals), [journals]);
  
  const rewards = useMemo(() => 
    getRewardMilestones(currentStreak, longestStreak), [currentStreak, longestStreak]);

  const calendarDays = useMemo(() => {
    if (viewMode === "week") {
      const days: Date[] = [];
      for (let i = 0; i < 7; i++) {
        days.push(addDays(currentWeek, i));
      }
      return days;
    }
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
  }, [viewMode, currentWeek, currentMonth]);

  const selectedDateJournals = useMemo(() => {
    if (!selectedViewDate) return [];
    return journals.filter(j => isSameDay(parseISO(j.date), selectedViewDate));
  }, [journals, selectedViewDate]);

  const handleDayClick = (date: Date) => {
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

  const navTitle = viewMode === "week"
    ? `${format(currentWeek, "MMM d")} - ${format(addDays(currentWeek, 6), "MMM d, yyyy")}`
    : format(currentMonth, "MMMM yyyy");

  const handlePrev = () => {
    if (viewMode === "week") setCurrentWeek(subWeeks(currentWeek, 1));
    else setCurrentMonth(subMonths(currentMonth, 1));
  };
  const handleNext = () => {
    if (viewMode === "week") setCurrentWeek(addWeeks(currentWeek, 1));
    else setCurrentMonth(addMonths(currentMonth, 1));
  };

  function getDayRequirements(date: Date) {
    const dateStr = format(date, "yyyy-MM-dd");
    const journalStatus = dayStatus.get(dateStr);
    const habitsForDay = getHabitsForDate(habits, date);
    const completedIds = completionsByDate.get(dateStr) || new Set();
    const q2Items = q2ByDate.get(dateStr) || [];

    const totalRequired = 2 + habitsForDay.length + q2Items.length;
    let completedCount = 0;
    if (journalStatus?.morning) completedCount++;
    if (journalStatus?.evening) completedCount++;
    habitsForDay.forEach(h => { if (completedIds.has(h.id)) completedCount++; });
    q2Items.forEach(e => { if (e.completed) completedCount++; });

    return { dateStr, journalStatus, habitsForDay, completedIds, q2Items, totalRequired, completedCount };
  }

  function renderSelectedDayDetails() {
    if (!selectedViewDate) return null;
    const reqs = getDayRequirements(selectedViewDate);
    const dateStr = reqs.dateStr;
    const morningEntry = selectedDateJournals.find(j => j.session === "morning");
    const eveningEntry = selectedDateJournals.find(j => j.session === "evening");

    return (
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Daily Progress</span>
          <Badge variant={reqs.completedCount >= reqs.totalRequired ? "default" : "outline"}>
            {reqs.completedCount}/{reqs.totalRequired}
          </Badge>
        </div>

        <div className="p-4 rounded-lg border">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-amber-500" />
              <span className="font-medium">Morning Journal</span>
            </div>
            {morningEntry ? (
              <Button 
                size="sm" variant="outline"
                onClick={() => { setViewEntryDialogOpen(false); setLocation(`/journal/${dateStr}/morning`); }}
                data-testid="button-edit-morning"
              >
                <Edit className="h-4 w-4 mr-2" />Edit
              </Button>
            ) : (
              <Button 
                size="sm"
                onClick={() => { setViewEntryDialogOpen(false); setLocation(`/journal/${dateStr}/morning`); }}
                data-testid="button-new-morning"
              >
                <Plus className="h-4 w-4 mr-2" />New Entry
              </Button>
            )}
          </div>
          {morningEntry && (
            <div className="space-y-2 text-sm">
              {morningEntry.gratitude && <div><p className="text-xs text-muted-foreground mb-1">Gratitude</p><p className="line-clamp-2">{morningEntry.gratitude}</p></div>}
              {morningEntry.intentions && <div><p className="text-xs text-muted-foreground mb-1">Intentions</p><p className="line-clamp-2">{morningEntry.intentions}</p></div>}
            </div>
          )}
          {!morningEntry && <p className="text-sm text-muted-foreground">Required - No entry yet</p>}
        </div>

        <div className="p-4 rounded-lg border">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-indigo-500" />
              <span className="font-medium">Evening Journal</span>
            </div>
            {eveningEntry ? (
              <Button 
                size="sm" variant="outline"
                onClick={() => { setViewEntryDialogOpen(false); setLocation(`/journal/${dateStr}/evening`); }}
                data-testid="button-edit-evening"
              >
                <Edit className="h-4 w-4 mr-2" />Edit
              </Button>
            ) : (
              <Button 
                size="sm"
                onClick={() => { setViewEntryDialogOpen(false); setLocation(`/journal/${dateStr}/evening`); }}
                data-testid="button-new-evening"
              >
                <Plus className="h-4 w-4 mr-2" />New Entry
              </Button>
            )}
          </div>
          {eveningEntry && (
            <div className="space-y-2 text-sm">
              {eveningEntry.highlights && <div><p className="text-xs text-muted-foreground mb-1">Highlights</p><p className="line-clamp-2">{eveningEntry.highlights}</p></div>}
              {eveningEntry.reflections && <div><p className="text-xs text-muted-foreground mb-1">Reflections</p><p className="line-clamp-2">{eveningEntry.reflections}</p></div>}
            </div>
          )}
          {!eveningEntry && <p className="text-sm text-muted-foreground">Required - No entry yet</p>}
        </div>

        {reqs.habitsForDay.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Repeat className="h-4 w-4 text-primary" />
              Habits
            </p>
            {reqs.habitsForDay.map(habit => {
              const done = reqs.completedIds.has(habit.id);
              const catStyle = CATEGORY_STYLES[habit.category || "health"];
              return (
                <div key={habit.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 ${done ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                    {done && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${catStyle?.dot || "bg-muted"}`} />
                  <span className={`text-sm flex-1 ${done ? "line-through text-muted-foreground" : ""}`}>{habit.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {HABIT_CATEGORIES[(habit.category as HabitCategory) || "health"]?.label || "Health"}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {reqs.q2Items.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Grid3X3 className="h-4 w-4 text-green-600 dark:text-green-400" />
              Q2 Scheduled Items
            </p>
            {reqs.q2Items.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 ${entry.completed ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                  {entry.completed && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <span className={`text-sm flex-1 ${entry.completed ? "line-through text-muted-foreground" : ""}`}>{entry.task}</span>
                {entry.scheduledTime && <span className="text-xs text-muted-foreground">{entry.scheduledTime}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LockedCourseModal 
        courseType="phase12" 
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

      <main className="container mx-auto px-4 py-10">
        <div className="mb-10">
          <h1 className="font-serif text-3xl font-bold mb-2">Transformation Journal</h1>
          <p className="text-muted-foreground">Track your daily reflections, habits, and scheduled items</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="hover-elevate" data-testid="card-morning-session">
            <CardContent className="py-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/[0.08] flex items-center justify-center">
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
                      <><Edit className="h-4 w-4 mr-2" />Edit</>
                    ) : (
                      <><Plus className="h-4 w-4 mr-2" />Start</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate" data-testid="card-evening-session">
            <CardContent className="py-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/[0.08] flex items-center justify-center">
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
                      <><Edit className="h-4 w-4 mr-2" />Edit</>
                    ) : (
                      <><Plus className="h-4 w-4 mr-2" />Start</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-10">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  <CardTitle className="font-serif text-xl">Journal Calendar</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" size="icon"
                    onClick={handlePrev}
                    data-testid="button-prev-period"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[160px] text-center font-medium text-sm">
                    {navTitle}
                  </span>
                  <Button 
                    variant="outline" size="icon"
                    onClick={handleNext}
                    data-testid="button-next-period"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline" size="icon"
                    onClick={() => setViewMode(viewMode === "week" ? "month" : "week")}
                    data-testid="button-toggle-view"
                    title={viewMode === "week" ? "Zoom out to month" : "Zoom in to week"}
                  >
                    {viewMode === "week" ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <CardDescription>
                {viewMode === "week" ? "Week view" : "Month view"} — Click a day to see details. Zoom {viewMode === "week" ? "out for month" : "in for week"}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className={`grid grid-cols-7 gap-1`} data-testid="calendar-grid">
                {calendarDays.map((date, idx) => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  const reqs = getDayRequirements(date);
                  const isCurrentMonth = viewMode === "month" ? isSameMonth(date, currentMonth) : true;
                  const isToday = isSameDay(date, new Date());
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => handleDayClick(date)}
                      disabled={viewMode === "month" && !isCurrentMonth}
                      className={`
                        relative p-2 rounded-lg text-sm transition-colors
                        flex flex-col items-center justify-start gap-0.5
                        ${viewMode === "week" ? "min-h-[150px] py-2" : "aspect-square"}
                        ${!isCurrentMonth && viewMode === "month" ? 'text-muted-foreground/30 cursor-not-allowed' : 'hover-elevate cursor-pointer'}
                        ${isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}
                      `}
                      data-testid={`calendar-day-${dateStr}`}
                    >
                      <span className={`font-medium ${isToday ? 'text-primary' : ''}`}>
                        {viewMode === "week" ? format(date, "d") : date.getDate()}
                      </span>
                      {viewMode === "week" && (
                        <span className="text-xs text-muted-foreground mb-1">{format(date, "EEE")}</span>
                      )}
                      {isCurrentMonth && viewMode === "week" && (
                        <div className="flex flex-col items-start gap-0.5 w-full px-1 text-left overflow-hidden">
                          <div className="flex items-center gap-1 w-full">
                            <div className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${reqs.journalStatus?.morning ? "bg-amber-500 border-amber-500" : "border-muted-foreground/30"}`}>
                              {reqs.journalStatus?.morning && <Check className="h-2 w-2 text-white" />}
                            </div>
                            <span className={`text-[10px] leading-tight truncate ${reqs.journalStatus?.morning ? "text-muted-foreground line-through" : ""}`}>AM</span>
                          </div>
                          <div className="flex items-center gap-1 w-full">
                            <div className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${reqs.journalStatus?.evening ? "bg-indigo-500 border-indigo-500" : "border-muted-foreground/30"}`}>
                              {reqs.journalStatus?.evening && <Check className="h-2 w-2 text-white" />}
                            </div>
                            <span className={`text-[10px] leading-tight truncate ${reqs.journalStatus?.evening ? "text-muted-foreground line-through" : ""}`}>PM</span>
                          </div>
                          {reqs.habitsForDay.map(h => {
                            const done = reqs.completedIds.has(h.id);
                            const catStyle = CATEGORY_STYLES[h.category || "health"];
                            return (
                              <div key={h.id} className="flex items-center gap-1 w-full">
                                <div className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${done ? `${catStyle?.dot} border-transparent` : "border-muted-foreground/30"}`}>
                                  {done && <Check className="h-2 w-2 text-white" />}
                                </div>
                                <span className={`text-[10px] leading-tight truncate ${done ? "text-muted-foreground line-through" : ""}`}>{h.name}</span>
                              </div>
                            );
                          })}
                          {reqs.q2Items.map(e => (
                            <div key={e.id} className="flex items-center gap-1 w-full">
                              <div className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${e.completed ? "bg-green-500 border-green-500" : "border-muted-foreground/30"}`}>
                                {e.completed && <Check className="h-2 w-2 text-white" />}
                              </div>
                              <span className={`text-[10px] leading-tight truncate ${e.completed ? "text-muted-foreground line-through" : ""}`}>{e.task}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {isCurrentMonth && viewMode === "month" && (
                        <div className="flex flex-col items-center gap-0.5 mt-0.5">
                          <div className="flex gap-0.5">
                            <div className={`w-2 h-2 rounded-full ${reqs.journalStatus?.morning ? "bg-amber-500" : "bg-muted-foreground/20"}`} />
                            <div className={`w-2 h-2 rounded-full ${reqs.journalStatus?.evening ? "bg-indigo-500" : "bg-muted-foreground/20"}`} />
                          </div>
                          {(reqs.habitsForDay.length > 0 || reqs.q2Items.length > 0) && (
                            <div className="flex gap-0.5 flex-wrap justify-center">
                              {reqs.habitsForDay.map(h => {
                                const done = reqs.completedIds.has(h.id);
                                const catStyle = CATEGORY_STYLES[h.category || "health"];
                                return <div key={h.id} className={`w-2 h-2 rounded-full ${done ? catStyle?.dot : "bg-muted-foreground/20"}`} title={h.name} />;
                              })}
                              {reqs.q2Items.map(e => (
                                <div key={e.id} className={`w-2 h-2 rounded-sm ${e.completed ? "bg-green-500" : "bg-muted-foreground/20"}`} title={e.task} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {viewMode === "week" && reqs.totalRequired > 0 && isCurrentMonth && (
                        <div className="mt-auto text-xs text-muted-foreground">
                          {reqs.completedCount}/{reqs.totalRequired}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              
              <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span>Morning</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-500" />
                  <span>Evening</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
                  <span>Not Done</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-green-500" />
                  <span>Q2 Items</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <CardTitle className="font-serif text-lg">Your Streak</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-primary">{currentStreak}</p>
                      <p className="text-sm text-muted-foreground">Current streak</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-semibold">{longestStreak}</p>
                      <p className="text-sm text-muted-foreground">Best streak</p>
                    </div>
                  </div>
                  
                  {currentStreak > 0 && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-primary/[0.06]">
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
              <CardHeader className="pb-3">
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
                            ? 'bg-primary/[0.06] border-primary/20' 
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
              <CardHeader className="pb-3">
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

      <Dialog open={viewEntryDialogOpen} onOpenChange={setViewEntryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {selectedViewDate ? format(selectedViewDate, "EEEE, MMMM d, yyyy") : ""}
            </DialogTitle>
            <DialogDescription>
              Daily requirements: journaling, scheduled habits, and Q2 items
            </DialogDescription>
          </DialogHeader>
          {renderSelectedDayDetails()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
