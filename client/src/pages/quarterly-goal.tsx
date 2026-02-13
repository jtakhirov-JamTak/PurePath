import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Save, ChevronLeft, ChevronRight, Eye, Pencil, ArrowRight } from "lucide-react";
import type { QuarterlyGoal, MonthlyGoal, IdentityDocument } from "@shared/schema";
import { Link } from "wouter";

function getQuarterLabel(q: number) {
  const months = [
    ["Jan", "Feb", "Mar"],
    ["Apr", "May", "Jun"],
    ["Jul", "Aug", "Sep"],
    ["Oct", "Nov", "Dec"],
  ];
  return `Q${q} (${months[q - 1].join(" / ")})`;
}

function getMonthsInQuarter(year: number, q: number): string[] {
  const startMonth = (q - 1) * 3 + 1;
  return [
    `${year}-${String(startMonth).padStart(2, "0")}`,
    `${year}-${String(startMonth + 1).padStart(2, "0")}`,
    `${year}-${String(startMonth + 2).padStart(2, "0")}`,
  ];
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long" });
}

interface QuarterState {
  outcomeStatement: string;
}

export default function QuarterlyGoalPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentYear = new Date().getFullYear();
  const currentQ = Math.ceil((new Date().getMonth() + 1) / 3);
  const [year, setYear] = useState(currentYear);

  const quarterKeys = [1, 2, 3, 4].map((q) => `${year}-Q${q}`);

  const { data: identityDoc } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
    enabled: !!user,
  });

  const q1Query = useQuery<QuarterlyGoal>({
    queryKey: ["/api/quarterly-goal", quarterKeys[0]],
    queryFn: async () => {
      const res = await fetch(`/api/quarterly-goal?quarter=${quarterKeys[0]}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });
  const q2Query = useQuery<QuarterlyGoal>({
    queryKey: ["/api/quarterly-goal", quarterKeys[1]],
    queryFn: async () => {
      const res = await fetch(`/api/quarterly-goal?quarter=${quarterKeys[1]}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });
  const q3Query = useQuery<QuarterlyGoal>({
    queryKey: ["/api/quarterly-goal", quarterKeys[2]],
    queryFn: async () => {
      const res = await fetch(`/api/quarterly-goal?quarter=${quarterKeys[2]}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });
  const q4Query = useQuery<QuarterlyGoal>({
    queryKey: ["/api/quarterly-goal", quarterKeys[3]],
    queryFn: async () => {
      const res = await fetch(`/api/quarterly-goal?quarter=${quarterKeys[3]}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });

  const queries = [q1Query, q2Query, q3Query, q4Query];
  const isLoading = queries.some((q) => q.isLoading);

  const [forms, setForms] = useState<QuarterState[]>([
    { outcomeStatement: "" },
    { outcomeStatement: "" },
    { outcomeStatement: "" },
    { outcomeStatement: "" },
  ]);

  useEffect(() => {
    const goals = queries.map((q) => q.data);
    setForms(
      goals.map((g) => ({
        outcomeStatement: g?.outcomeStatement || "",
      }))
    );
  }, [q1Query.data, q2Query.data, q3Query.data, q4Query.data]);

  const updateForm = (idx: number, field: keyof QuarterState, value: string) => {
    setForms((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (idx: number) => {
      const qk = quarterKeys[idx];
      await apiRequest("PUT", "/api/quarterly-goal", {
        quarterKey: qk,
        outcomeStatement: forms[idx].outcomeStatement.trim(),
      });
    },
    onSuccess: (_, idx) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quarterly-goal", quarterKeys[idx]] });
      toast({ title: "Saved", description: `Q${idx + 1} goal updated.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not save. Please try again.", variant: "destructive" });
    },
  });

  const hasChanges = (idx: number) => {
    const g = queries[idx].data;
    return (
      forms[idx].outcomeStatement !== (g?.outcomeStatement || "")
    );
  };

  const yearVision = identityDoc?.yearVision?.trim() || "";

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-12 max-w-3xl space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setYear((y) => y - 1)}
              data-testid="button-prev-year"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-serif text-3xl font-bold" data-testid="text-year-label">
              {year}
            </h1>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setYear((y) => y + 1)}
              data-testid="button-next-year"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-muted-foreground text-lg">
            Break your yearly vision into four quarterly goals.
          </p>
        </div>

        {yearVision ? (
          <Card className="overflow-visible mb-8 border-primary/20" data-testid="card-year-vision">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                  <Eye className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-serif text-lg">1-Year Vision</CardTitle>
                  <CardDescription>What you're building toward this year</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap" data-testid="text-year-vision">{yearVision}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-visible mb-8 border-dashed" data-testid="card-year-vision-empty">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                No 1-year vision set yet. Define where you want to be in a year to guide your quarters.
              </p>
              <Link href="/lesson2-worksheet">
                <Button variant="outline" size="sm" data-testid="button-set-vision">
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Set Your Vision
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {[1, 2, 3, 4].map((q) => {
            const idx = q - 1;
            const isCurrent = year === currentYear && q === currentQ;
            const monthKeys = getMonthsInQuarter(year, q);

            return (
              <Card
                key={q}
                className={`overflow-visible ${isCurrent ? "border-primary/30" : ""}`}
                data-testid={`card-q${q}`}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={isCurrent ? "default" : "outline"}
                      className={`shrink-0 no-default-active-elevate ${isCurrent ? "" : ""}`}
                    >
                      Q{q}
                    </Badge>
                    <div className="flex-1">
                      <CardTitle className="font-serif text-lg">{getQuarterLabel(q)}</CardTitle>
                      {isCurrent && (
                        <CardDescription>Current quarter</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      What is the specific outcome that means I progressed?
                    </Label>
                    <Textarea
                      value={forms[idx].outcomeStatement}
                      onChange={(e) => updateForm(idx, "outcomeStatement", e.target.value)}
                      placeholder="e.g. I can regulate emotions in real-time, I shipped the MVP, I run 5K without stopping..."
                      className="min-h-[70px] text-base"
                      data-testid={`input-q${q}-outcome`}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => saveMutation.mutate(idx)}
                      disabled={!hasChanges(idx) || saveMutation.isPending}
                      data-testid={`button-save-q${q}`}
                    >
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      Save
                    </Button>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Monthly Goals</p>
                    <div className="space-y-1.5">
                      {monthKeys.map((mk) => {
                        return (
                          <MonthRow key={mk} monthKey={mk} />
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

function MonthRow({ monthKey }: { monthKey: string }) {
  const { user } = useAuth();
  const { data: mg } = useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal", monthKey],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-goal?month=${monthKey}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });

  const goalText = mg?.goalWhat?.trim() || mg?.goalStatement?.trim() || "";

  return (
    <div className="flex items-center gap-3 py-1.5 px-2 rounded-md" data-testid={`month-row-${monthKey}`}>
      <div className={`h-2 w-2 rounded-full shrink-0 ${goalText ? "bg-green-500" : "bg-muted-foreground/30"}`} />
      <span className="text-sm flex-1 min-w-0">
        <span className="font-medium">{formatMonthLabel(monthKey)}:</span>{" "}
        <span className={goalText ? "" : "text-muted-foreground"}>{goalText || "Not set"}</span>
      </span>
      <Link href="/monthly-goal">
        <Button variant="ghost" size="icon" data-testid={`button-month-${monthKey}`}>
          {goalText ? <Pencil className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
        </Button>
      </Link>
    </div>
  );
}
