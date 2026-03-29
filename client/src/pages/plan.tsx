import { AppLayout } from "@/components/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { buildProcessUrl } from "@/hooks/use-return-to";
import { format, startOfWeek } from "date-fns";
import type { EisenhowerEntry, Habit, MonthlyGoal, IdentityDocument } from "@shared/schema";
import { getDayOfYear } from "date-fns";
import { CATEGORY_COLORS } from "@/lib/constants";
import { getWeekFocusItems } from "@/lib/eisenhower-filters";


export default function PlanPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const today = new Date();
  const weekStartStr = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const currentMonthKey = format(today, "yyyy-MM");

  const { data: eisenhowerEntries = [] } = useQuery<EisenhowerEntry[]>({ queryKey: ["/api/eisenhower"], enabled: !!user });
  const { data: habits = [] } = useQuery<Habit[]>({ queryKey: ["/api/habits"], enabled: !!user });
  const { data: monthlyGoal } = useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal", currentMonthKey],
    queryFn: async () => { const res = await fetch(`/api/monthly-goal?month=${currentMonthKey}`, { credentials: "include" }); if (!res.ok) throw new Error("Failed to fetch"); return res.json(); },
    enabled: !!user,
  });
  const { data: identityDoc } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
    enabled: !!user,
  });

  const goalDisplay = monthlyGoal?.goalWhat?.trim() || monthlyGoal?.goalStatement?.trim() || "";
  const activeHabits = habits.filter(h => h.active !== false);
  const focusItems = getWeekFocusItems(eisenhowerEntries, weekStartStr);

  // Completion heuristics for document cards
  const discoveryFilled = !!(identityDoc?.strengths?.trim() || identityDoc?.helpingPatterns?.trim());
  const identityFilled = !!(identityDoc?.identity?.trim() || identityDoc?.vision?.trim());
  const scoreboardFilled = !!(identityDoc?.yearVision?.trim());

  // Daily Anchor — rotating excerpt from identity document
  const anchorExcerpt = (() => {
    if (!identityDoc) return null;
    const fields = [
      identityDoc.identity?.trim(),
      identityDoc.vision?.trim(),
      identityDoc.values?.trim(),
      identityDoc.purpose?.trim(),
    ];
    const dayIndex = getDayOfYear(today) % 4;
    // Try the day's field first, then cycle through others
    for (let i = 0; i < 4; i++) {
      const text = fields[(dayIndex + i) % 4];
      if (text) return text;
    }
    return null;
  })();

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-sm font-medium" data-testid="text-plan-title">Plan</h1>
          <p className="text-xs text-muted-foreground">Your documents, goal, and habits.</p>
        </div>

        <div className="space-y-6">
          {/* Documents */}
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-bark font-medium">Documents</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation(buildProcessUrl("/discovery-profile", "/plan"))} data-testid="card-nav-discovery">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 mt-0.5 ${discoveryFilled ? "bg-emerald-500" : "bg-rose-400"}`} />
                    <div>
                      <p className="text-xs font-medium">Discovery Profile</p>
                      <p className="text-[10px] text-muted-foreground">Values, strengths, patterns</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation(buildProcessUrl("/identity", "/plan"))} data-testid="card-nav-identity">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 mt-0.5 ${identityFilled ? "bg-emerald-500" : "bg-rose-400"}`} />
                    <div>
                      <p className="text-xs font-medium">Identity Document</p>
                      <p className="text-[10px] text-muted-foreground">Vision, identity, purpose</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation(buildProcessUrl("/scoreboard", "/plan"))} data-testid="card-nav-scoreboard">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 mt-0.5 ${scoreboardFilled ? "bg-emerald-500" : "bg-rose-400"}`} />
                    <div>
                      <p className="text-xs font-medium">1-Year Scoreboard</p>
                      <p className="text-[10px] text-muted-foreground">Outcome, obstacles, IF-THEN</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Daily Anchor */}
          {anchorExcerpt && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-bark font-medium">Your Words</p>
              <div className="rounded-lg bg-bark/5 p-3" data-testid="daily-anchor">
                <p className="text-[13px] text-foreground italic line-clamp-3">{anchorExcerpt}</p>
                <button
                  className="text-[11px] text-primary hover:underline cursor-pointer mt-2"
                  onClick={() => setLocation(buildProcessUrl("/identity", "/plan"))}
                  data-testid="link-anchor-identity"
                >
                  View full document →
                </button>
              </div>
            </div>
          )}

          {/* Monthly Goal */}
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-bark font-medium">Monthly Goal</p>
            {goalDisplay ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium" data-testid="text-plan-goal">{goalDisplay}</p>
                {monthlyGoal?.nextConcreteStep && (
                  <p className="text-[10px] text-muted-foreground">Next step: {monthlyGoal.nextConcreteStep}</p>
                )}
                {monthlyGoal?.deadline && (
                  <p className="text-[10px] text-muted-foreground">By: {format(new Date(monthlyGoal.deadline + "T00:00:00"), "MMM d, yyyy")}</p>
                )}
                {monthlyGoal?.fun && (
                  <p className="text-[10px] text-muted-foreground">Prize: {monthlyGoal.fun}</p>
                )}
                <Button variant="outline" size="sm" className="text-xs mt-1" onClick={() => setLocation(buildProcessUrl("/monthly-goal", "/plan"))} data-testid="button-plan-edit-goal">
                  <Pencil className="h-3 w-3 mr-1" />Edit
                </Button>
              </div>
            ) : (
              <button className="text-xs text-rose-500 hover:underline cursor-pointer" onClick={() => setLocation(buildProcessUrl("/monthly-goal", "/plan"))} data-testid="button-plan-set-goal">
                Set your monthly goal →
              </button>
            )}
          </div>

          {/* Habits */}
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-bark font-medium">Habits</p>
            {activeHabits.length > 0 ? (
              <div className="space-y-1">
                {activeHabits.slice(0, 5).map(habit => (
                  <div key={habit.id} className="flex items-center gap-2 py-0.5" data-testid={`habit-plan-${habit.id}`}>
                    <div className={`h-2 w-2 rounded-full shrink-0 ${CATEGORY_COLORS[(habit.category as string) || "health"] || "bg-emerald-500"}`} />
                    <span className="text-xs flex-1">{habit.name}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">{habit.timing || "afternoon"}</span>
                  </div>
                ))}
                {activeHabits.length > 5 && <p className="text-[10px] text-muted-foreground">+{activeHabits.length - 5} more</p>}
                <button className="text-xs text-primary hover:underline cursor-pointer mt-1" onClick={() => setLocation(buildProcessUrl("/habits", "/plan"))} data-testid="button-open-habits">
                  Edit habits →
                </button>
              </div>
            ) : (
              <button className="text-xs text-primary hover:underline cursor-pointer" onClick={() => setLocation(buildProcessUrl("/habits", "/plan"))} data-testid="button-create-habits">
                Add your first habit →
              </button>
            )}
          </div>

          {/* Weekly Planning */}
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-bark font-medium">Weekly Planning</p>
            <button className="text-xs text-primary hover:underline cursor-pointer" onClick={() => setLocation(buildProcessUrl("/eisenhower", "/plan"))} data-testid="button-plan-eisenhower">
              {focusItems.length > 0 ? "Edit your week →" : "Figure out what matters →"}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
