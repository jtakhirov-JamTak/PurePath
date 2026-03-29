import { AppLayout } from "@/components/app-layout";
import { Card, CardContent } from "@/components/ui/card";
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

  const q1Items = focusItems.filter(e => e.quadrant === "q1");
  const q2Items = focusItems.filter(e => e.quadrant === "q2");

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-sm font-medium" data-testid="text-plan-title">Plan</h1>
        </div>

        <div className="space-y-6">
          {/* Your Words — emotional anchor at top */}
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

          {/* YEAR */}
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-bark font-medium">Year</p>
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

          {/* MONTH */}
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-bark font-medium">Month</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* Monthly Goal card */}
              <Card className="overflow-visible hover-elevate cursor-pointer" onClick={() => setLocation(buildProcessUrl("/monthly-goal", "/plan"))} data-testid="card-monthly-goal">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 mt-0.5 ${goalDisplay ? "bg-emerald-500" : "bg-rose-400"}`} />
                    <div>
                      <p className="text-xs font-medium">Monthly Goal</p>
                      {goalDisplay ? (
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{goalDisplay}</p>
                      ) : (
                        <p className="text-[10px] text-rose-500">Not set</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Habits card */}
              <Card className="overflow-visible hover-elevate cursor-pointer" onClick={() => setLocation(buildProcessUrl("/habits", "/plan"))} data-testid="card-habits">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 mt-0.5 ${activeHabits.length > 0 ? "bg-emerald-500" : "bg-rose-400"}`} />
                    <div>
                      <p className="text-xs font-medium">Habits</p>
                      {activeHabits.length > 0 ? (
                        <p className="text-[10px] text-muted-foreground">{activeHabits.length} active</p>
                      ) : (
                        <p className="text-[10px] text-rose-500">None set</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* WEEK */}
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-bark font-medium">Week</p>
            <Card className="overflow-visible" data-testid="card-this-week">
              <CardContent className="p-3">
                {focusItems.length > 0 ? (
                  <div className="space-y-2">
                    {q1Items.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Urgent</p>
                        {q1Items.map(item => (
                          <div key={item.id} className="flex items-center gap-2 py-0.5">
                            <span className="h-2 w-2 rounded-full shrink-0 bg-rose-400" />
                            <span className={`text-xs flex-1 ${item.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{item.task}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {q2Items.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Important</p>
                        {q2Items.map(item => (
                          <div key={item.id} className="flex items-center gap-2 py-0.5">
                            <span className="h-2 w-2 rounded-full shrink-0 bg-amber-400" />
                            <span className={`text-xs flex-1 ${item.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{item.task}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button className="text-xs text-primary hover:underline cursor-pointer mt-1" onClick={() => setLocation(buildProcessUrl("/eisenhower", "/plan"))} data-testid="button-plan-eisenhower">
                      Edit your week →
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-muted-foreground">No commitments yet.</p>
                    <button className="text-xs text-primary hover:underline cursor-pointer mt-1" onClick={() => setLocation(buildProcessUrl("/eisenhower", "/plan"))} data-testid="button-plan-eisenhower">
                      Figure out what matters →
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
