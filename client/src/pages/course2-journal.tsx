import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sun, Moon, Download, ChevronLeft, ChevronRight,
  Check, Repeat, Grid3X3, Plus, Edit, AlertTriangle
} from "lucide-react";
import { useLocation } from "wouter";
import { format, addDays, subDays } from "date-fns";
import type { Journal, Habit, HabitCompletion, EisenhowerEntry } from "@shared/schema";
import { HABIT_CATEGORIES, type HabitCategory } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const CATEGORY_STYLES: Record<string, { dot: string; text: string }> = {
  health: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  wealth: { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  relationships: { dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
  career: { dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
  mindfulness: { dot: "bg-violet-500", text: "text-violet-600 dark:text-violet-400" },
  learning: { dot: "bg-cyan-500", text: "text-cyan-600 dark:text-cyan-400" },
};

export default function Course2JournalPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const dateStr = format(currentDate, "yyyy-MM-dd");
  const isToday = dateStr === format(new Date(), "yyyy-MM-dd");

  const weekStartStr = format(
    (() => { const d = new Date(currentDate); d.setDate(d.getDate() - d.getDay() + 1); return d; })(),
    "yyyy-MM-dd"
  );

  const { data: journals = [], isLoading: journalsLoading } = useQuery<Journal[]>({
    queryKey: ["/api/journals"],
    enabled: !!user,
  });

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: !!user,
  });

  const { data: eisenhowerEntries = [] } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower"],
    enabled: !!user,
  });

  const { data: habitCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions/range", dateStr, dateStr],
    enabled: !!user,
  });

  const dayJournals = useMemo(() => journals.filter((j) => j.date === dateStr), [journals, dateStr]);
  const morningEntry = dayJournals.find((j) => j.session === "morning");
  const eveningEntry = dayJournals.find((j) => j.session === "evening");

  const dayCode = DAY_CODES[currentDate.getDay()];
  const todaysHabits = useMemo(
    () => habits.filter((h) => h.cadence.split(",").includes(dayCode)),
    [habits, dayCode]
  );
  const completedHabitIds = useMemo(
    () => new Set(habitCompletions.map((hc) => hc.habitId)),
    [habitCompletions]
  );

  const q2Items = useMemo(
    () => eisenhowerEntries.filter((e) => e.quadrant === "q2" && e.weekStart === weekStartStr),
    [eisenhowerEntries, weekStartStr]
  );
  const q1Items = useMemo(
    () => eisenhowerEntries.filter((e) => e.quadrant === "q1" && e.weekStart === weekStartStr),
    [eisenhowerEntries, weekStartStr]
  );

  const toggleHabitMutation = useMutation({
    mutationFn: async ({ habitId, completed }: { habitId: number; completed: boolean }) => {
      if (completed) {
        await apiRequest("POST", "/api/habit-completions", { habitId, date: dateStr });
      } else {
        await apiRequest("DELETE", `/api/habit-completions/${habitId}/${dateStr}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habit-completions/range"] });
    },
  });

  const toggleEisenhowerMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      await apiRequest("PATCH", `/api/eisenhower/${id}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
    },
  });

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

  const totalItems = 2 + todaysHabits.length + q2Items.length + q1Items.length;
  const completedItems =
    (morningEntry ? 1 : 0) +
    (eveningEntry ? 1 : 0) +
    todaysHabits.filter((h) => completedHabitIds.has(h.id)).length +
    q2Items.filter((e) => e.completed).length +
    q1Items.filter((e) => e.completed).length;

  if (journalsLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-12 max-w-2xl space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
            <div className="flex items-center gap-3">
              <Button size="icon" variant="ghost" onClick={() => setCurrentDate((d) => subDays(d, 1))} data-testid="button-prev-day">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h1 className="font-serif text-2xl font-bold" data-testid="text-date-label">
                {isToday ? "Today" : format(currentDate, "EEE, MMM d")}
              </h1>
              <Button size="icon" variant="ghost" onClick={() => setCurrentDate((d) => addDays(d, 1))} data-testid="button-next-day">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={completedItems >= totalItems ? "default" : "outline"} data-testid="badge-progress">
                {completedItems}/{totalItems}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleDownloadAll} data-testid="button-download-all">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export
              </Button>
            </div>
          </div>
          {!isToday && (
            <p className="text-sm text-muted-foreground">
              {format(currentDate, "EEEE, MMMM d, yyyy")}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <JournalRow
            session="morning"
            icon={<Sun className="h-5 w-5 text-amber-500" />}
            title="Morning Journal"
            subtitle="Set intentions and gratitude"
            entry={morningEntry}
            dateStr={dateStr}
            setLocation={setLocation}
          />

          <SectionHeader icon={<Grid3X3 className="h-4 w-4" />} title="Q2 — Important, Not Urgent" count={q2Items.length} />
          {q2Items.length > 0 ? (
            q2Items.map((entry) => (
              <EisenhowerRow
                key={entry.id}
                entry={entry}
                onToggle={(completed) => toggleEisenhowerMutation.mutate({ id: entry.id, completed })}
              />
            ))
          ) : (
            <EmptyRow text="No Q2 items this week" />
          )}

          <SectionHeader icon={<AlertTriangle className="h-4 w-4" />} title="Q1 — Urgent and Important" count={q1Items.length} />
          {q1Items.length > 0 ? (
            q1Items.map((entry) => (
              <EisenhowerRow
                key={entry.id}
                entry={entry}
                onToggle={(completed) => toggleEisenhowerMutation.mutate({ id: entry.id, completed })}
              />
            ))
          ) : (
            <EmptyRow text="No Q1 items this week" />
          )}

          <SectionHeader icon={<Repeat className="h-4 w-4" />} title="Habits" count={todaysHabits.length} />
          {todaysHabits.length > 0 ? (
            todaysHabits.map((habit) => {
              const done = completedHabitIds.has(habit.id);
              const catStyle = CATEGORY_STYLES[habit.category || "health"];
              return (
                <Card key={habit.id} className="overflow-visible" data-testid={`card-habit-${habit.id}`}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={done}
                        onCheckedChange={(v) => toggleHabitMutation.mutate({ habitId: habit.id, completed: !!v })}
                        data-testid={`checkbox-habit-${habit.id}`}
                      />
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${catStyle?.dot || "bg-muted"}`} />
                      <span className={`text-sm flex-1 ${done ? "line-through text-muted-foreground" : ""}`}>
                        {habit.name}
                      </span>
                      {habit.duration && (
                        <span className="text-xs text-muted-foreground">{habit.duration} min</span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {HABIT_CATEGORIES[(habit.category as HabitCategory) || "health"]?.label || "Health"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <EmptyRow text="No habits scheduled today" />
          )}

          <JournalRow
            session="evening"
            icon={<Moon className="h-5 w-5 text-indigo-500" />}
            title="Evening Journal"
            subtitle="Reflect on your day"
            entry={eveningEntry}
            dateStr={dateStr}
            setLocation={setLocation}
          />
        </div>
      </div>
    </AppLayout>
  );
}

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-1" data-testid={`section-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
      {icon}
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</span>
      {count > 0 && <Badge variant="outline" className="text-xs ml-auto">{count}</Badge>}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="py-3 px-4 rounded-md border border-dashed">
      <p className="text-sm text-muted-foreground text-center">{text}</p>
    </div>
  );
}

function JournalRow({
  session,
  icon,
  title,
  subtitle,
  entry,
  dateStr,
  setLocation,
}: {
  session: "morning" | "evening";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  entry: Journal | undefined;
  dateStr: string;
  setLocation: (path: string) => void;
}) {
  const done = !!entry;
  return (
    <Card
      className="overflow-visible hover-elevate cursor-pointer"
      onClick={() => setLocation(`/journal/${dateStr}/${session}`)}
      data-testid={`card-${session}-journal`}
    >
      <CardContent className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-primary/[0.06] flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          {done ? (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 shrink-0">
              <Check className="h-3 w-3 mr-1" />
              Done
            </Badge>
          ) : (
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setLocation(`/journal/${dateStr}/${session}`); }} data-testid={`button-start-${session}`}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Start
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EisenhowerRow({
  entry,
  onToggle,
}: {
  entry: EisenhowerEntry;
  onToggle: (completed: boolean) => void;
}) {
  const catStyle = CATEGORY_STYLES[entry.role || "health"];
  return (
    <Card className="overflow-visible" data-testid={`card-eisenhower-${entry.id}`}>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={entry.completed || false}
            onCheckedChange={(v) => onToggle(!!v)}
            data-testid={`checkbox-eisenhower-${entry.id}`}
          />
          <span className={`text-sm flex-1 ${entry.completed ? "line-through text-muted-foreground" : ""}`}>
            {entry.task}
          </span>
          {entry.blocksGoal && (
            <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
              Blocks Goal
            </Badge>
          )}
          {entry.scheduledTime && (
            <span className="text-xs text-muted-foreground">{entry.scheduledTime}</span>
          )}
          <Badge variant="outline" className={`text-xs ${catStyle?.text || ""}`}>
            {HABIT_CATEGORIES[(entry.role as HabitCategory) || "health"]?.label || entry.role}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
