import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useActiveSprint } from "@/hooks/use-active-sprint";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, ChevronLeft, ChevronRight, BookOpen, Repeat, ListChecks, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { buildProcessUrl } from "@/hooks/use-return-to";
import { format, addDays } from "date-fns";
import { getWeekBounds } from "@/lib/week-utils";
import type { Habit, HabitCompletion, Journal, EisenhowerEntry, IdentityDocument, AnnualCommitment } from "@shared/schema";
import { buildHabitStatusMap } from "@/lib/completion";
import { getTodaysFocusItems } from "@/lib/eisenhower-filters";
import { getTodaysHabits } from "@/lib/habit-filters";
import { TIMING_LABELS } from "@/lib/constants";
import { StuckRouter } from "@/components/stuck-router";
import { CompletionCircle } from "@/components/dashboard/completion-circle";
import { FocusItem } from "@/components/dashboard/focus-item";
import { SeasonBackground } from "@/components/season-background";
import { getSprintBackgroundForDate } from "@/lib/sprint-background";


// ─── Week strip constants ───────────────────────────────────────────
const RING_R = 14;
const RING_R_TODAY = 18;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getHeatmapClass = (progress: number, isFuture: boolean, isToday: boolean) => {
  if (isFuture) return "fill-transparent";
  if (isToday) {
    if (progress === 0) return "fill-muted";
    if (progress < 1) return "fill-primary/20";
    return "fill-emerald-400/70";
  }
  if (progress === 0) return "fill-muted";
  if (progress < 1) return "fill-lime-400/50";
  return "fill-primary/55";
};

// ─── Needs Now types + helpers ──────────────────────────────────────
type NeedsNowKind = "journal" | "habit" | "focus";
type NeedsNowStatus = "upcoming" | "due" | "overdue" | "done";
type BadgeType = "none" | "pending" | "due" | "overdue" | "complete";

interface NeedsNowItem {
  id: string;
  label: string;
  dueTime: Date;
  isDone: boolean;
  kind: NeedsNowKind;
  status: NeedsNowStatus;
}

function getOverdueThresholdHours(kind: NeedsNowKind): number {
  if (kind === "focus") return 0.5;
  if (kind === "habit") return Infinity; // habits never go red
  return 2; // journals
}

function computeStatus(dueTime: Date, isDone: boolean, now: Date, kind: NeedsNowKind): NeedsNowStatus {
  if (isDone) return "done";
  if (now < dueTime) return "upcoming";
  const hoursLate = (now.getTime() - dueTime.getTime()) / 3600000;
  return hoursLate > getOverdueThresholdHours(kind) ? "overdue" : "due";
}

// Local-time Date constructors — explicit numeric args avoid ISO-string parsing ambiguity.
function habitDueTime(todayStr: string, timing: string | null | undefined): Date {
  const hour = timing === "morning" ? 6 : timing === "evening" ? 17 : 12;
  const [y, m, d] = todayStr.split("-").map(Number);
  return new Date(y, m - 1, d, hour, 0, 0);
}

function parseTimeOnDate(todayStr: string, hhmm: string): Date {
  const [y, mo, d] = todayStr.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0);
}

function endOfDay(todayStr: string): Date {
  const [y, m, d] = todayStr.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 0);
}

function statusDotClass(status: NeedsNowStatus): string {
  if (status === "overdue") return "bg-red-500";
  if (status === "due") return "bg-amber-500";
  return "bg-muted-foreground/40";
}

function computeBadge(bucketItems: NeedsNowItem[]): { type: BadgeType; count: number } {
  if (bucketItems.length === 0) return { type: "none", count: 0 };
  const pend = bucketItems.filter(i => !i.isDone);
  if (pend.length === 0) return { type: "complete", count: 0 };
  const active = pend.filter(i => i.status === "due" || i.status === "overdue");
  if (active.length === 0) return { type: "pending", count: pend.length };
  const hasOverdue = active.some(i => i.status === "overdue");
  return { type: hasOverdue ? "overdue" : "due", count: active.length };
}

// ─── Bucket config ──────────────────────────────────────────────────
type BucketKey = "journal" | "habits" | "items";
const BUCKETS: { key: BucketKey; icon: LucideIcon; bgClass: string; iconClass: string; baseLabel: string }[] = [
  { key: "journal", icon: BookOpen, bgClass: "bg-blue-50 dark:bg-blue-950/30", iconClass: "text-blue-700 dark:text-blue-300", baseLabel: "Journal" },
  { key: "habits", icon: Repeat, bgClass: "bg-green-50 dark:bg-green-950/30", iconClass: "text-green-700 dark:text-green-300", baseLabel: "Habits" },
  { key: "items", icon: ListChecks, bgClass: "bg-amber-50 dark:bg-amber-950/30", iconClass: "text-amber-700 dark:text-amber-300", baseLabel: "Items" },
];

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // ─── Time ticker — also drives todayStr rollover past midnight ──
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const interval = setInterval(tick, 60000);
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", tick);
    };
  }, []);

  const todayStr = format(now, "yyyy-MM-dd");
  const [weekOffset, setWeekOffset] = useState(0);
  const { weekStartStr, weekEndStr } = useMemo(() => getWeekBounds(now, weekOffset), [todayStr, weekOffset]);
  // weekStartDate derived from stable weekStartStr to avoid 60s-tick identity churn downstream
  const weekStartDate = useMemo(() => new Date(weekStartStr + "T00:00:00"), [weekStartStr]);

  // ─── Queries ─────────────────────────────────────────────────────
  const { data: onboarding, isLoading: onboardingLoading } = useQuery<{ onboardingStep: number; onboardingComplete: boolean }>({
    queryKey: ["/api/onboarding"],
    enabled: !!user,
  });

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: !!user,
  });

  const { data: habitCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions", todayStr],
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: journals = [] } = useQuery<Journal[]>({
    queryKey: ["/api/journals"],
    enabled: !!user,
  });

  const { data: weekStreakCompletions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["/api/habit-completions/range/" + weekStartStr + "/" + weekEndStr],
    enabled: !!user,
  });

  const { data: eisenhowerEntries = [] } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower"],
    enabled: !!user,
  });

  const { data: activeSprint, isSuccess: activeSprintLoaded } = useActiveSprint(!!user);

  const { data: identityDoc, isSuccess: identityDocLoaded } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
    enabled: !!user,
  });

  const { data: annualCommitment } = useQuery<AnnualCommitment | null>({
    queryKey: ["/api/annual-commitment"],
    enabled: !!user,
  });

  // ─── Today's data (always today, never selectedDate) ────────────
  const todayHabits = useMemo(() => getTodaysHabits(habits, todayStr), [habits, todayStr]);
  const habitStatusMap = useMemo(() => buildHabitStatusMap(habitCompletions), [habitCompletions]);

  const todayJournals = journals.filter((j) => j.date === todayStr);
  const hasMorning = todayJournals.some((j) => j.session === "morning");
  const hasEvening = todayJournals.some((j) => j.session === "evening");

  const journalDayMap = useMemo(() => {
    const morning = new Set<string>();
    const evening = new Set<string>();
    journals.forEach((j) => {
      if (j.date >= weekStartStr && j.date <= weekEndStr) {
        if (j.session === "morning") morning.add(j.date);
        else if (j.session === "evening") evening.add(j.date);
      }
    });
    return { morning, evening };
  }, [journals, weekStartStr, weekEndStr]);

  const focusItems = useMemo(
    () => getTodaysFocusItems(eisenhowerEntries, weekStartStr, todayStr, todayStr),
    [eisenhowerEntries, weekStartStr, todayStr]
  );

  // ─── Habit tiers by source ────────────────────────────────────────
  const annualHabits = useMemo(() => todayHabits.filter(h => h.source === "annual"), [todayHabits]);
  const sprintHabits = useMemo(() => todayHabits.filter(h => h.source === "sprint"), [todayHabits]);
  const supportHabits = useMemo(
    () => todayHabits.filter(h => !h.source || h.source === "support"),
    [todayHabits]
  );
  const hasAnyPinned = supportHabits.some(h => h.isPinned);
  const pinnedSupportHabits = useMemo(() => {
    if (!hasAnyPinned && supportHabits.length <= 3) return supportHabits;
    return supportHabits.filter(h => h.isPinned).slice(0, 3);
  }, [supportHabits, hasAnyPinned]);

  // ─── Week days ──────────────────────────────────────────────────
  const weekDays = useMemo(() => {
    const monday = new Date(weekStartStr + "T12:00:00");
    return Array.from({ length: 7 }, (_, i) => format(addDays(monday, i), "yyyy-MM-dd"));
  }, [weekStartStr]);

  // ─── Stories ring per-day progress ───────────────────────────────
  const ringData = useMemo(() => {
    return weekDays.map((dayStr, i) => {
      const dayHabits = getTodaysHabits(habits, dayStr);
      const dayFocus = getTodaysFocusItems(eisenhowerEntries, weekStartStr, dayStr, todayStr);
      const dayHabitCompletions = new Set<number>();
      weekStreakCompletions.forEach(hc => {
        if (hc.date === dayStr && hc.status === "completed") dayHabitCompletions.add(hc.habitId);
      });
      const completedH = dayHabits.filter(h => dayHabitCompletions.has(h.id)).length;
      const completedF = dayFocus.filter(e => e.status === "completed").length;
      const hasMorn = journalDayMap.morning.has(dayStr);
      const hasEve = journalDayMap.evening.has(dayStr);
      const total = dayHabits.length + dayFocus.length + 2;
      const done = completedH + completedF + (hasMorn ? 1 : 0) + (hasEve ? 1 : 0);
      const isFuture = dayStr > todayStr;
      const progress = isFuture ? 0 : total > 0 ? done / total : 0;

      const dayWeekItems = eisenhowerEntries.filter(e =>
        e.weekStart === weekStartStr && e.scheduledDate === dayStr
      );
      const handleItems = dayWeekItems.filter(e =>
        e.proofBucket ? e.proofBucket === "handle" : e.quadrant === "q1"
      );
      const protectItems = dayWeekItems.filter(e =>
        e.proofBucket ? e.proofBucket === "protect" : (e.quadrant === "q2" && e.blocksGoal)
      );
      const handleDone = handleItems.filter(e => e.status === "completed").length;
      const protectDone = protectItems.filter(e => e.status === "completed").length;
      const totalPlanned = handleItems.length + protectItems.length;

      return {
        dateStr: dayStr,
        label: DAY_LABELS[i],
        dayNum: format(new Date(dayStr + "T12:00:00"), "d"),
        isToday: dayStr === todayStr,
        isFuture,
        progress,
        handleCount: handleItems.length,
        protectCount: protectItems.length,
        handleDone,
        protectDone,
        totalPlanned,
      };
    });
  }, [weekDays, habits, eisenhowerEntries, weekStartStr, todayStr, weekStreakCompletions, journalDayMap]);

  // ─── Panel lists (no `now` dep — static for display) ─────────────
  const panelLists = useMemo(() => {
    const journalItems = [
      { id: "journal-morning" as const, session: "morning" as const, label: "Morning journal", isDone: hasMorning, dueTime: parseTimeOnDate(todayStr, "07:00") },
      { id: "journal-evening" as const, session: "evening" as const, label: "Evening reflection", isDone: hasEvening, dueTime: parseTimeOnDate(todayStr, "19:00") },
    ];
    const habitsList = [...annualHabits, ...sprintHabits, ...pinnedSupportHabits];
    // Sort focus items: timed by time asc, untimed last
    const focusList = [...focusItems].sort((a, b) => {
      const ta = a.scheduledStartTime;
      const tb = b.scheduledStartTime;
      if (ta && tb) return ta.localeCompare(tb);
      if (ta && !tb) return -1;
      if (!ta && tb) return 1;
      return 0;
    });
    return { journalItems, habitsList, focusList };
  }, [todayStr, hasMorning, hasEvening, annualHabits, sprintHabits, pinnedSupportHabits, focusItems]);

  // ─── Needs Now + bucket badges (consumes `now`) ──────────────────
  const { needsNowLabel, needsNowItems, bucketBadges } = useMemo(() => {
    const items: NeedsNowItem[] = [];

    panelLists.journalItems.forEach(j => {
      items.push({
        id: j.id, label: j.label, dueTime: j.dueTime, isDone: j.isDone, kind: "journal",
        status: computeStatus(j.dueTime, j.isDone, now, "journal"),
      });
    });

    panelLists.habitsList.forEach(h => {
      const due = habitDueTime(todayStr, h.timing);
      const done = habitStatusMap.get(h.id) === "completed";
      items.push({
        id: `habit-${h.id}`, label: h.name, dueTime: due, isDone: done, kind: "habit",
        status: computeStatus(due, done, now, "habit"),
      });
    });

    const timedFocus: NeedsNowItem[] = [];
    const untimedFocus: NeedsNowItem[] = [];
    panelLists.focusList.forEach(f => {
      const done = f.status === "completed";
      if (f.scheduledStartTime) {
        const due = parseTimeOnDate(todayStr, f.scheduledStartTime);
        const entry: NeedsNowItem = {
          id: `focus-${f.id}`, label: f.task, dueTime: due, isDone: done, kind: "focus",
          status: computeStatus(due, done, now, "focus"),
        };
        items.push(entry);
        timedFocus.push(entry);
      } else {
        untimedFocus.push({
          id: `focus-${f.id}`, label: f.task, dueTime: endOfDay(todayStr), isDone: done, kind: "focus",
          status: done ? "done" : "upcoming",
        });
      }
    });

    // Needs Now list (exclude done)
    const pending = items.filter(i => i.status !== "done");
    const overdue = pending.filter(i => i.status === "overdue").sort((a, b) => a.dueTime.getTime() - b.dueTime.getTime());
    const due = pending.filter(i => i.status === "due").sort((a, b) => a.dueTime.getTime() - b.dueTime.getTime());
    const upcoming = pending.filter(i => i.status === "upcoming").sort((a, b) => a.dueTime.getTime() - b.dueTime.getTime());

    const urgent = [...overdue, ...due];
    let nnItems: NeedsNowItem[];
    let nnLabel: "needs" | "upcoming" | "clear";
    if (urgent.length > 0) {
      nnItems = urgent.slice(0, 3);
      nnLabel = "needs";
    } else if (upcoming.length > 0) {
      nnItems = upcoming.slice(0, 3);
      nnLabel = "upcoming";
    } else {
      nnItems = [];
      nnLabel = "clear";
    }

    const journalBucket = items.filter(i => i.kind === "journal");
    const habitsBucket = items.filter(i => i.kind === "habit");
    const itemsBucket = [...timedFocus, ...untimedFocus];

    return {
      needsNowLabel: nnLabel,
      needsNowItems: nnItems,
      bucketBadges: {
        journal: computeBadge(journalBucket),
        habits: computeBadge(habitsBucket),
        items: computeBadge(itemsBucket),
      },
    };
  }, [now, todayStr, panelLists, habitStatusMap]);

  // ─── Morning journal memo (consumed by proof move) ──────────────
  const todayMorningJournal = useMemo(() => {
    return journals.find(j => j.date === todayStr && j.session === "morning") || null;
  }, [journals, todayStr]);

  // ─── Mutations ───────────────────────────────────────────────────
  const setHabitLevelMutation = useToastMutation<{ habitId: number; level: number | null }>({
    mutationFn: async ({ habitId, level }) => {
      let res;
      if (level === null) {
        res = await apiRequest("DELETE", `/api/habit-completions/${habitId}/${todayStr}`);
      } else {
        const existing = habitCompletions.some(hc => hc.habitId === habitId);
        const payload = { status: "completed", completionLevel: 2 };
        if (existing) {
          res = await apiRequest("PATCH", `/api/habit-completions/${habitId}/${todayStr}`, payload);
        } else {
          res = await apiRequest("POST", "/api/habit-completions", { habitId, date: todayStr, ...payload });
        }
      }
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update habit status");
      }
    },
    invalidateKeys: [["/api/habit-completions", todayStr]],
    invalidatePredicates: [(q) => typeof q.queryKey[0] === "string" && (q.queryKey[0].startsWith("/api/habit-completions/range/") || q.queryKey[0].startsWith("/api/habit-completions/"))],
    errorToast: "Could not update habit",
  });

  const setEisenhowerLevelMutation = useToastMutation<{ id: number; done: boolean }>({
    mutationFn: async ({ id, done }) => {
      const body = done
        ? { status: null, completionLevel: null, completed: false }
        : { status: "completed", completionLevel: 2, completed: true };
      const res = await apiRequest("PATCH", `/api/eisenhower/${id}`, body);
      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.error || "Failed to update status");
      }
    },
    invalidateKeys: ["/api/eisenhower"],
    errorToast: "Could not update status",
  });

  const toggleProofMoveMutation = useToastMutation<void>({
    mutationFn: async () => {
      if (!todayMorningJournal) return;
      const newVal = !todayMorningJournal.proofMoveCompleted;
      const { id, createdAt, updatedAt, userId, ...journalFields } = todayMorningJournal;
      const res = await apiRequest("POST", "/api/journals", {
        ...journalFields,
        proofMoveCompleted: newVal,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update proof move");
      }
    },
    invalidateKeys: [["/api/journals"]],
    errorToast: "Could not update proof move",
  });

  // ─── Redirects ───────────────────────────────────────────────────
  const redirectedRef = useRef(false);
  useEffect(() => {
    if (
      activeSprintLoaded &&
      onboarding?.onboardingComplete &&
      (!activeSprint || !activeSprint.goalStatement?.trim()) &&
      !redirectedRef.current
    ) {
      redirectedRef.current = true;
      toast({ title: "Sprint needed", description: "Let's set your active sprint." });
      setLocation(buildProcessUrl("/sprint", "/today"));
    }
  }, [activeSprintLoaded, activeSprint, onboarding, setLocation]);

  const [stuckOpen, setStuckOpen] = useState(false);

  // ─── Bucket open state + auto-open largest on first load ────────
  // Only mark the ref done once we've actually opened a bucket — so a
  // slow network that returns empty arrays first won't lock us into "nothing open".
  const [openBucket, setOpenBucket] = useState<BucketKey | null>(null);
  const hasAutoOpenedRef = useRef(false);

  useEffect(() => {
    if (hasAutoOpenedRef.current) return;
    if (authLoading || onboardingLoading) return;

    const counts: Record<BucketKey, number> = {
      journal: panelLists.journalItems.filter(i => !i.isDone).length,
      items: panelLists.focusList.filter(f => f.status !== "completed").length,
      habits: panelLists.habitsList.filter(h => habitStatusMap.get(h.id) !== "completed").length,
    };
    const order: BucketKey[] = ["journal", "items", "habits"];
    let best: BucketKey | null = null;
    let bestCount = 0;
    for (const b of order) {
      if (counts[b] > bestCount) {
        best = b;
        bestCount = counts[b];
      }
    }
    if (best) {
      setOpenBucket(best);
      hasAutoOpenedRef.current = true;
    }
  }, [authLoading, onboardingLoading, panelLists, habitStatusMap]);

  // ─── Commitment context (Year / Sprint / Why) ───────────────────
  const commitmentContext = useMemo(() => {
    const yearValue =
      annualCommitment?.personStatement?.trim() ||
      identityDoc?.identity?.trim() ||
      null;

    const sprintValue =
      activeSprint?.sprintName?.trim() ||
      activeSprint?.goalStatement?.trim() ||
      null;

    const whyValue =
      annualCommitment?.proofPoint?.trim() ||
      annualCommitment?.visualization?.trim() ||
      annualCommitment?.proofMetric?.trim() ||
      null;

    let daysLeft: number | null = null;
    if (activeSprint?.endDate) {
      const end = new Date(activeSprint.endDate + "T00:00:00");
      const today = new Date(todayStr + "T00:00:00");
      if (!isNaN(end.getTime())) {
        daysLeft = Math.max(0, Math.round((end.getTime() - today.getTime()) / 86_400_000));
      }
    }

    const domain = annualCommitment?.domain?.trim() || null;
    const proofMetric = annualCommitment?.proofMetric?.trim() || null;

    const hasAnnual = !!annualCommitment;
    const hasAny = !!(yearValue || sprintValue || whyValue);

    return { yearValue, sprintValue, whyValue, daysLeft, domain, proofMetric, hasAnnual, hasAny };
  }, [annualCommitment, identityDoc, activeSprint, todayStr]);

  // ⚠️ ALL hooks MUST be above this line — early returns below break React rules of hooks

  // ─── Loading / guard ─────────────────────────────────────────────
  if (authLoading || onboardingLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-3 max-w-2xl space-y-2">
          <Skeleton className="h-16 w-full" data-testid="skeleton-header" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" data-testid="skeleton-habits" />
        </div>
      </AppLayout>
    );
  }

  // ─── Sprint background ──────────────────────────────────────────
  const sprintBg = activeSprint?.startDate && activeSprint?.endDate
    ? getSprintBackgroundForDate(activeSprint.startDate, activeSprint.endDate, todayStr)
    : null;

  const anchorIdentity = identityDoc?.identity?.trim() || "";
  const todayProofMove = todayMorningJournal?.proofMove?.trim() || "";
  const proofMoveDone = todayMorningJournal?.proofMoveCompleted === true;

  // Journal bucket label — symmetric: show 1/2 when exactly one session done
  const journalCount = (hasMorning ? 1 : 0) + (hasEvening ? 1 : 0);
  const journalLabel = journalCount === 1 ? "Journal 1/2" : "Journal";

  // Badge rendering
  const renderBadge = (bucket: BucketKey) => {
    const badge = bucketBadges[bucket];
    if (badge.type === "none") return null;
    const badgeClass =
      badge.type === "overdue" ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
      : badge.type === "due" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
      : badge.type === "pending" ? "bg-muted text-muted-foreground"
      : "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300";
    const content =
      badge.type === "complete" ? <Check className="h-3 w-3" strokeWidth={3} />
      : badge.count === 1 ? "!"
      : String(badge.count);
    return (
      <span
        className={`absolute -top-1 -right-1 min-w-[20px] h-[20px] rounded-[10px] text-[11px] font-semibold flex items-center justify-center px-1 ${badgeClass}`}
      >
        {content}
      </span>
    );
  };

  const toggleBucket = (b: BucketKey) => setOpenBucket(prev => (prev === b ? null : b));

  return (
    <AppLayout>
      <SeasonBackground src={sprintBg}>
      <div className="container mx-auto px-5 py-6 max-w-2xl space-y-5">

        {/* ─── 1. Identity anchor ─────────────────────────────── */}
        {anchorIdentity && (
          <p className="font-serif text-base italic text-foreground/90 leading-relaxed line-clamp-3" data-testid="identity-anchor">
            I am {anchorIdentity}
          </p>
        )}

        {/* ─── 2. Commitment context (Year / Sprint / Why) ────── */}
        {commitmentContext.hasAny && (
          <div className="rounded-[10px] p-4 border border-border/40 bg-card space-y-2" data-testid="commitment-context">
            {commitmentContext.yearValue && (
              <div className="flex gap-3 items-start" data-testid="commitment-year">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground mt-0.5 w-12 shrink-0">Year</span>
                <p className="text-sm flex-1 min-w-0">{commitmentContext.yearValue}</p>
              </div>
            )}

            {commitmentContext.sprintValue ? (
              <div className="flex gap-3 items-start" data-testid="commitment-sprint">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground mt-0.5 w-12 shrink-0">Sprint</span>
                <p className="text-sm flex-1 min-w-0">{commitmentContext.sprintValue}</p>
              </div>
            ) : commitmentContext.hasAnnual ? (
              <div className="flex gap-3 items-start" data-testid="commitment-sprint">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground mt-0.5 w-12 shrink-0">Sprint</span>
                <button
                  type="button"
                  className="text-sm text-primary flex-1 min-w-0 text-left min-h-[24px]"
                  onClick={() => { setLocation("/sprint"); window.scrollTo(0, 0); }}
                  data-testid="commitment-set-sprint"
                >
                  No active sprint &rarr;
                </button>
              </div>
            ) : null}

            {commitmentContext.whyValue && (
              <div className="flex gap-3 items-start" data-testid="commitment-why">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground mt-0.5 w-12 shrink-0">Why</span>
                <p className="text-sm flex-1 min-w-0">{commitmentContext.whyValue}</p>
              </div>
            )}

            {(commitmentContext.domain || commitmentContext.daysLeft !== null || commitmentContext.proofMetric) && (
              <p className="text-[11px] text-muted-foreground pt-1" data-testid="commitment-meta">
                {[
                  commitmentContext.domain,
                  commitmentContext.daysLeft !== null
                    ? `${commitmentContext.daysLeft} ${commitmentContext.daysLeft === 1 ? "day" : "days"} left`
                    : null,
                  commitmentContext.proofMetric,
                ].filter(Boolean).join(" • ")}
              </p>
            )}
          </div>
        )}

        {/* ─── 3. Today's Proof Move (hero) ───────────────────── */}
        <div className="rounded-[10px] p-4 border border-border/40 bg-card" data-testid="today-proof-move">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Today's proof move</p>
          {todayProofMove ? (
            <div className="flex items-center gap-3 min-h-[44px]">
              <CompletionCircle
                done={proofMoveDone}
                onToggle={() => {
                  // Guard against double-POST on rapid taps (creates duplicate journal rows)
                  if (toggleProofMoveMutation.isPending) return;
                  toggleProofMoveMutation.mutate();
                }}
                testId="proof-move-toggle"
              />
              <p className={`text-sm flex-1 min-w-0 ${proofMoveDone ? "line-through text-muted-foreground" : "font-medium"}`}>
                {todayProofMove}
              </p>
            </div>
          ) : (
            <button
              className="text-sm text-primary font-medium min-h-[44px] text-left flex items-center"
              onClick={() => { setLocation(`/today/journal/${todayStr}/morning?returnTo=/today`); window.scrollTo(0, 0); }}
              data-testid="set-proof-move-cta"
            >
              Set your proof move &rarr;
            </button>
          )}
        </div>

        {/* ─── 4. Needs You Now / Coming Up / All Clear ───────── */}
        <div className="space-y-1.5" data-testid="needs-now">
          {needsNowLabel === "clear" ? (
            <p className="text-sm text-muted-foreground text-center py-3">All clear</p>
          ) : (
            <>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {needsNowLabel === "needs" ? "Needs you now" : "Coming up"}
              </p>
              {needsNowItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 min-h-[44px]"
                  data-testid={`needs-now-${item.id}`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDotClass(item.status)}`} />
                  <span className="text-sm flex-1 min-w-0 truncate">{item.label}</span>
                  <span className={`text-[11px] shrink-0 ${item.status === "overdue" ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                    {format(item.dueTime, "h:mma").toLowerCase()}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ─── 5. Bucket row ──────────────────────────────────── */}
        <div className="flex items-start justify-around pt-1" data-testid="bucket-row">
          {BUCKETS.map(b => {
            const Icon = b.icon;
            const label = b.key === "journal" ? journalLabel : b.baseLabel;
            const isOpen = openBucket === b.key;
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => toggleBucket(b.key)}
                className="flex flex-col items-center gap-1.5 min-h-[44px] min-w-[44px] px-2"
                data-testid={`bucket-${b.key}`}
              >
                <div className="relative">
                  <div
                    className={`h-[46px] w-[46px] rounded-full border border-black/5 dark:border-white/10 flex items-center justify-center ${b.bgClass} ${isOpen ? "ring-2 ring-primary/60" : ""}`}
                  >
                    <Icon className={`h-[18px] w-[18px] ${b.iconClass}`} />
                  </div>
                  {renderBadge(b.key)}
                </div>
                <span className="text-xs text-muted-foreground">{label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── 6. Expandable bucket panel ─────────────────────── */}
        <AnimatePresence initial={false}>
          {openBucket && (
            <motion.div
              key={openBucket}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden rounded-[10px] border border-border/40 bg-card"
              data-testid={`bucket-panel-${openBucket}`}
            >
              <div className="p-3 space-y-1.5">

                {/* Journal panel */}
                {openBucket === "journal" && panelLists.journalItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-muted/30 min-h-[44px] text-left"
                    onClick={() => { setLocation(`/today/journal/${todayStr}/${item.session}?returnTo=/today`); window.scrollTo(0, 0); }}
                    data-testid={`panel-journal-${item.session}`}
                  >
                    <CompletionCircle done={item.isDone} onToggle={() => {}} disabled />
                    <span className={`text-sm flex-1 min-w-0 truncate ${item.isDone ? "line-through text-muted-foreground" : ""}`}>
                      {item.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {format(item.dueTime, "h:mma").toLowerCase()}
                    </span>
                  </button>
                ))}

                {/* Habits panel */}
                {openBucket === "habits" && (
                  panelLists.habitsList.length > 0 ? panelLists.habitsList.map(h => {
                    const done = habitStatusMap.get(h.id) === "completed";
                    return (
                      <div
                        key={h.id}
                        className="flex items-center gap-3 px-2 py-2 min-h-[44px]"
                        data-testid={`panel-habit-${h.id}`}
                      >
                        <CompletionCircle
                          done={done}
                          onToggle={() => setHabitLevelMutation.mutate({ habitId: h.id, level: done ? null : 2 })}
                          testId={`habit-level-${h.id}`}
                        />
                        <span className={`text-sm flex-1 min-w-0 truncate ${done ? "line-through text-muted-foreground" : ""}`}>
                          {h.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {TIMING_LABELS[h.timing || "afternoon"] || "PM"}
                        </span>
                      </div>
                    );
                  }) : (
                    <p className="text-sm text-muted-foreground text-center py-3">No habits for today</p>
                  )
                )}

                {/* Items panel */}
                {openBucket === "items" && (
                  panelLists.focusList.length > 0 ? panelLists.focusList.map(f => (
                    <FocusItem
                      key={f.id}
                      item={f}
                      weekStartDate={weekStartDate}
                      isToday={true}
                      onToggleDone={(id, currentlyDone) =>
                        setEisenhowerLevelMutation.mutate({ id, done: currentlyDone })
                      }
                    />
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-3">No items scheduled</p>
                  )
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── 7. Weekly circles (visual only) ────────────────── */}
        <div className="flex items-end justify-between py-2">
          <button
            type="button"
            onClick={() => { setWeekOffset(o => Math.max(o - 1, -52)); }}
            className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex justify-between flex-1 px-1">
            {ringData.map((day) => {
              const isLarge = day.isToday;
              const svgSize = isLarge ? 44 : 34;
              const vb = isLarge ? "0 0 44 44" : "0 0 36 36";
              const cx = isLarge ? 22 : 18;
              const cy = isLarge ? 22 : 18;
              const r = isLarge ? RING_R_TODAY : RING_R;

              return (
                <div
                  key={day.dateStr}
                  className={`flex flex-col items-center gap-0.5 ${day.isFuture ? "opacity-40" : ""}`}
                >
                  <svg width={svgSize} height={svgSize} viewBox={vb}>
                    <circle cx={cx} cy={cy} r={r}
                      className={getHeatmapClass(day.progress, day.isFuture, day.isToday)}
                      stroke={day.isToday ? "hsl(var(--primary))" : "none"}
                      strokeWidth={day.isToday ? "1.5" : "0"}
                    />
                    {day.isToday && day.progress < 1 && (
                      <circle cx={cx + r - 2} cy={cy - r + 2} r="3" fill="#ef4444" />
                    )}
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                      className={`fill-current ${isLarge ? "text-[11px]" : "text-[10px]"} font-semibold ${
                        day.isToday ? "text-primary" : "text-foreground/70"
                      }`}
                    >
                      {day.dayNum}
                    </text>
                  </svg>
                  <span className={`text-[10px] font-medium ${
                    day.isToday ? "text-primary" : day.isFuture ? "text-muted-foreground/40" : "text-muted-foreground"
                  }`}>
                    {day.label}
                  </span>
                  <div className="flex items-center gap-[1px] mt-0.5 h-[4px]">
                    {day.totalPlanned > 0 && (
                      <>
                        {Array.from({ length: Math.min(day.handleCount, 5) }, (_, idx) => (
                          <span key={`h${idx}`} className={`block w-[3px] h-[3px] rounded-full ${
                            idx < day.handleDone ? "bg-primary" : "bg-primary/20"
                          }`} />
                        ))}
                        {Array.from({ length: Math.min(day.protectCount, 2) }, (_, idx) => (
                          <span key={`p${idx}`} className={`block w-[3px] h-[3px] rounded-full ${
                            idx < day.protectDone ? "bg-amber-500" : "bg-amber-500/20"
                          }`} />
                        ))}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => { setWeekOffset(o => Math.min(o + 1, 0)); }}
            disabled={weekOffset === 0}
            className="p-2 -mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 disabled:opacity-20"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {weekOffset !== 0 && (
          <button
            type="button"
            onClick={() => { setWeekOffset(0); }}
            className="text-[11px] text-primary hover:underline w-full text-center -mt-1 mb-1 min-h-[44px] flex items-center justify-center"
          >
            Back to this week
          </button>
        )}

        {/* ─── 8. I'm stuck ───────────────────────────────────── */}
        <button
          className="flex items-center justify-center gap-2 py-3 rounded-[10px] border border-border/40 bg-card hover:bg-muted/30 transition-colors w-full cursor-pointer"
          onClick={() => setStuckOpen(true)}
          data-testid="button-stuck"
        >
          <Zap className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">I'm stuck</span>
        </button>
      </div>

      <StuckRouter open={stuckOpen} onClose={() => setStuckOpen(false)} />
      </SeasonBackground>
    </AppLayout>
  );
}
