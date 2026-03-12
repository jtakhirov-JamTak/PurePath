import { useState, useRef, useCallback, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { VoiceTextarea } from "@/components/voice-input";
import {
  Target, Grid3X3, Repeat, ArrowRight, ArrowLeft, Pencil, ImagePlus, X, Eye,
  Check, Save, Trash2, RotateCcw, Copy, Clock, ChevronDown, ChevronUp, Lock
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { buildProcessUrl } from "@/hooks/use-return-to";
import { format, startOfWeek, endOfWeek } from "date-fns";
import type { EisenhowerEntry, Habit, MonthlyGoal, IdentityDocument, PlanVersion } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

function VisionBoardSingle({
  imageData,
}: {
  imageData: string;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (base64: string) => {
      const res = await apiRequest("PUT", "/api/vision-board", { slot: "main", imageData: base64 });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to upload image");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not upload image", description: error.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/vision-board", { slot: "main", imageData: "" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to remove image");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not remove image", description: error.message, variant: "destructive" });
    },
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      uploadMutation.mutate(result);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [uploadMutation]);

  const hasImage = imageData && imageData.length > 0;

  return (
    <div className="relative group" data-testid="vision-slot-main">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        data-testid="input-vision-main"
      />
      {hasImage ? (
        <div className="relative overflow-hidden rounded-md border aspect-[16/9] max-w-lg mx-auto">
          <img
            src={imageData}
            alt="Vision Board"
            className="w-full h-full object-cover"
            data-testid="img-vision-main"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="invisible group-hover:visible text-white"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-replace-vision-main"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="invisible group-hover:visible text-white"
              onClick={() => removeMutation.mutate()}
              data-testid="button-remove-vision-main"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {(uploadMutation.isPending || removeMutation.isPending) && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Saving...</p>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full max-w-lg mx-auto block border-2 border-dashed border-muted-foreground/20 rounded-md aspect-[16/9] flex flex-col items-center justify-center gap-2 cursor-pointer hover-elevate transition-colors"
          data-testid="button-upload-vision-main"
        >
          <ImagePlus className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Upload your vision image</span>
          <span className="text-xs text-muted-foreground">Max 5MB</span>
          {uploadMutation.isPending && (
            <span className="text-xs text-muted-foreground">Uploading...</span>
          )}
        </button>
      )}
    </div>
  );
}

function VisionStepContent({ identityDoc }: { identityDoc: IdentityDocument | undefined }) {
  const queryClient = useQueryClient();
  const [personStatement, setPersonStatement] = useState(identityDoc?.identity || "");
  const [proofStatement, setProofStatement] = useState(identityDoc?.vision || "");
  const [hasEdited, setHasEdited] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (identityDoc && !initialized) {
      setPersonStatement(identityDoc.identity || "");
      setProofStatement(identityDoc.vision || "");
      setInitialized(true);
    }
  }, [identityDoc, initialized]);

  const { toast: visionToast } = useToast();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/identity-document", {
        identity: personStatement,
        vision: proofStatement,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to save vision");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] });
      setHasEdited(false);
    },
    onError: (error: Error) => {
      visionToast({ title: "Could not save vision", description: error.message, variant: "destructive" });
    },
  });

  const handleChange = (field: "person" | "proof", val: string) => {
    if (field === "person") setPersonStatement(val);
    else setProofStatement(val);
    setHasEdited(true);
  };

  useEffect(() => {
    if (!hasEdited) return;
    const timer = setTimeout(() => {
      saveMutation.mutate();
    }, 1200);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personStatement, proofStatement]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">In one year, I'm the kind of person who's...</Label>
          <VoiceTextarea
            value={personStatement}
            onChange={(val) => handleChange("person", val)}
            placeholder="Describe who you want to become..."
            className="min-h-[70px] text-sm"
            data-testid="textarea-vision-person"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">The closest proof of that is...</Label>
          <VoiceTextarea
            value={proofStatement}
            onChange={(val) => handleChange("proof", val)}
            placeholder="What evidence would show you're on track?"
            className="min-h-[70px] text-sm"
            data-testid="textarea-vision-proof"
          />
        </div>
        {saveMutation.isPending && (
          <p className="text-xs text-muted-foreground text-center">Saving...</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground text-center">
          Optionally upload an image that represents your vision
        </p>
        <VisionBoardSingle imageData={identityDoc?.visionBoardMain || ""} />
      </div>
    </div>
  );
}

const WIZARD_STEPS = [
  { key: "vision", label: "Vision", icon: Eye, description: "Define who you want to become" },
  { key: "monthly", label: "Monthly Goal", icon: Target, description: "Set your monthly goal" },
  { key: "habits", label: "Habits", icon: Repeat, description: "Set up recurring habits" },
  { key: "eisenhower", label: "Weekly Plan", icon: Grid3X3, description: "Plan this week's priorities" },
];

function PlanVersioningPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showVersions, setShowVersions] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<number | null>(null);

  const { data: versions = [] } = useQuery<PlanVersion[]>({
    queryKey: ["/api/plan-versions"],
  });

  const saveMutation = useMutation({
    mutationFn: async (mode: string) => {
      const res = await apiRequest("POST", "/api/plan-versions/save", {
        mode,
        versionName: versionName || undefined,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to save plan");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plan-versions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-goal"] });
      setVersionName("");
      toast({ title: "Plan saved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not save plan", description: error.message, variant: "destructive" });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/plan-versions/clear", {});
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to clear plan");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-goal"] });
      setConfirmClear(false);
      toast({ title: "Plan data cleared" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not clear plan", description: error.message, variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/plan-versions/${id}/restore`, {});
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to restore plan");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identity-document"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-goal"] });
      setConfirmRestore(null);
      toast({ title: "Plan restored from saved version" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not restore plan", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/plan-versions/${id}`, undefined);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to delete version");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plan-versions"] });
      toast({ title: "Version deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not delete version", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card className="overflow-visible" data-testid="card-plan-versioning">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-10 w-10 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
            <Save className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="font-serif text-lg">Plan Versions</CardTitle>
            <CardDescription>Save your current plan, restore previous ones, or start fresh</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            placeholder="Version name (optional)"
            className="flex-1 min-w-[180px]"
            data-testid="input-version-name"
          />
          <Button
            size="sm"
            onClick={() => saveMutation.mutate("save")}
            disabled={saveMutation.isPending}
            data-testid="button-save-plan"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => saveMutation.mutate("save_and_copy")}
            disabled={saveMutation.isPending}
            data-testid="button-save-copy"
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Save & Copy
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmClear(true)}
            data-testid="button-clear-plan"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Clear
          </Button>
        </div>

        {versions.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVersions(!showVersions)}
              className="w-full justify-between"
              data-testid="button-toggle-versions"
            >
              <span className="text-sm">{versions.length} saved version{versions.length !== 1 ? "s" : ""}</span>
              {showVersions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            {showVersions && (
              <div className="space-y-2 mt-2">
                {versions.map(v => (
                  <div key={v.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50" data-testid={`version-row-${v.id}`}>
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{v.versionName}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(v.createdAt), "MMM d, yyyy h:mm a")}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmRestore(v.id)}
                      data-testid={`button-restore-${v.id}`}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(v.id)}
                      data-testid={`button-delete-version-${v.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Plan Data?</DialogTitle>
            <DialogDescription>
              This will clear your current vision board, monthly goal, and deactivate all habits. You can save a version first to restore later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmClear(false)}>Cancel</Button>
            <Button
              variant="outline"
              onClick={() => { saveMutation.mutate("save_and_clear"); setConfirmClear(false); }}
              disabled={saveMutation.isPending}
            >
              Save First, Then Clear
            </Button>
            <Button
              variant="destructive"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
              data-testid="button-confirm-clear"
            >
              Clear Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmRestore !== null} onOpenChange={(o) => { if (!o) setConfirmRestore(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore This Version?</DialogTitle>
            <DialogDescription>
              This will overwrite your current plan data with the saved version. New habits will be added alongside existing ones.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmRestore(null)}>Cancel</Button>
            <Button
              onClick={() => confirmRestore !== null && restoreMutation.mutate(confirmRestore)}
              disabled={restoreMutation.isPending}
              data-testid="button-confirm-restore"
            >
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function PlanPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [wizardStep, setWizardStep] = useState(0);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");

  const { data: eisenhowerEntries = [] } = useQuery<EisenhowerEntry[]>({
    queryKey: ["/api/eisenhower"],
    enabled: !!user,
  });

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: !!user,
  });

  const { data: identityDoc } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
    enabled: !!user,
  });

  const currentMonthKey = format(today, "yyyy-MM");


  const { data: monthlyGoal } = useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal", currentMonthKey],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-goal?month=${currentMonthKey}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user,
  });

  const hasVision = !!(identityDoc?.visionBoardMain || identityDoc?.identity?.trim() || identityDoc?.vision?.trim());
  const goalDisplay = monthlyGoal?.goalWhat?.trim() || monthlyGoal?.goalStatement?.trim() || "";
  const hasGoal = goalDisplay.length > 0;
  const activeHabits = habits.filter(h => h.active !== false);
  const hasHabits = activeHabits.length > 0;
  const thisWeekEntries = eisenhowerEntries.filter(e => e.weekStart === weekStartStr);
  const q2Items = thisWeekEntries.filter(e => e.quadrant === "q2");
  const hasEisenhower = thisWeekEntries.length > 0;

  const stepCompletion = [hasVision, hasGoal, hasHabits, hasEisenhower];

  const canAccessStep = (idx: number) => {
    if (idx === 0) return true;
    return stepCompletion[idx - 1];
  };

  const renderStepContent = () => {
    const step = WIZARD_STEPS[wizardStep];
    switch (step.key) {
      case "vision":
        return (
          <VisionStepContent identityDoc={identityDoc} />
        );

      case "monthly":
        return (
          <div className="space-y-4">
            {hasGoal ? (
              <div className="space-y-3">
                <div className="p-4 rounded-md bg-muted/50">
                  <p className="text-sm font-medium" data-testid="text-plan-goal">{goalDisplay}</p>
                  {monthlyGoal?.deadline && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Deadline: {format(new Date(monthlyGoal.deadline + "T00:00:00"), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setLocation(buildProcessUrl("/monthly-goal", "/plan"))} data-testid="button-plan-edit-goal">
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit Monthly Goal
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  A monthly goal gives direction to your weekly priorities and daily habits.
                </p>
                <Button onClick={() => setLocation(buildProcessUrl("/monthly-goal", "/plan"))} data-testid="button-plan-set-goal">
                  <Target className="h-4 w-4 mr-2" />
                  Set Monthly Goal
                </Button>
              </div>
            )}
          </div>
        );

      case "habits":
        return (
          <div className="space-y-4">
            {hasHabits ? (
              <div className="space-y-2">
                {activeHabits.slice(0, 5).map(habit => {
                  const dotColor = ({
                    health: "bg-emerald-500",
                    wealth: "bg-yellow-400",
                    relationships: "bg-rose-500",
                    "self-development": "bg-blue-500",
                    happiness: "bg-slate-300 dark:bg-slate-400",
                    career: "bg-blue-500",
                    mindfulness: "bg-blue-500",
                    learning: "bg-blue-500",
                    leisure: "bg-slate-300 dark:bg-slate-400",
                  } as Record<string, string>)[(habit.category as string) || "health"] || "bg-emerald-500";
                  return (
                    <div key={habit.id} className="flex items-center gap-3 py-1.5" data-testid={`habit-plan-${habit.id}`}>
                      <div className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
                      <span className="text-sm flex-1">{habit.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">{habit.category}</span>
                    </div>
                  );
                })}
                {activeHabits.length > 5 && (
                  <p className="text-xs text-muted-foreground">+{activeHabits.length - 5} more</p>
                )}
                <Button variant="outline" size="sm" onClick={() => setLocation(buildProcessUrl("/habits", "/plan"))} data-testid="button-open-habits">
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Manage Habits
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Set up the daily and weekly habits that will move you toward your goal.
                </p>
                <Button onClick={() => setLocation(buildProcessUrl("/habits", "/plan"))} data-testid="button-create-habits">
                  <Repeat className="h-4 w-4 mr-2" />
                  Create Habits
                </Button>
              </div>
            )}
          </div>
        );

      case "eisenhower":
        return (
          <div className="space-y-4">
            {hasEisenhower ? (
              <div className="space-y-2">
                {q2Items.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Q2 Focus Items</p>
                    {q2Items.map(item => {
                      const roleDot = ({
                        health: "bg-emerald-500",
                        wealth: "bg-yellow-400",
                        relationships: "bg-rose-500",
                        "self-development": "bg-blue-500",
                        happiness: "bg-slate-300 dark:bg-slate-400",
                        career: "bg-blue-500",
                        mindfulness: "bg-blue-500",
                        learning: "bg-blue-500",
                        leisure: "bg-slate-300 dark:bg-slate-400",
                      } as Record<string, string>)[(item.role as string) || "health"] || "bg-emerald-500";
                      return (
                        <div key={item.id} className="flex items-center gap-3 py-1" data-testid={`q2-item-${item.id}`}>
                          <div className={`h-2 w-2 rounded-full shrink-0 ${item.completed ? "bg-green-500" : roleDot}`} />
                          <span className={`text-sm ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                            {item.task}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <Badge variant="outline">{thisWeekEntries.length} items planned</Badge>
                <div className="mt-2">
                  <Button variant="outline" size="sm" onClick={() => setLocation(buildProcessUrl("/eisenhower", "/plan"))} data-testid="button-open-eisenhower">
                    <Grid3X3 className="h-3.5 w-3.5 mr-1.5" />
                    Open Matrix
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Use the Eisenhower Matrix to plan your week's priorities and focus on what matters most.
                </p>
                <Button onClick={() => setLocation(buildProcessUrl("/eisenhower", "/plan"))} data-testid="button-plan-eisenhower">
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Plan This Week
                </Button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const allComplete = stepCompletion.every(Boolean);
  const isLastStep = wizardStep === WIZARD_STEPS.length - 1;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 max-w-2xl mx-auto">
          <h1 className="font-serif text-3xl font-bold mb-2" data-testid="text-plan-title">Plan</h1>
          <p className="text-muted-foreground">
            Build your plan step by step. Each step unlocks when the previous one is complete.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Week of {format(weekStart, "MMM d")} — {format(weekEnd, "MMM d, yyyy")}
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide" data-testid="text-your-documents">Your Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation(buildProcessUrl("/discovery-profile", "/plan"))} data-testid="card-nav-discovery">
                <CardContent className="p-4">
                  <p className="font-medium text-sm" data-testid="text-nav-discovery-title">Discovery Profile</p>
                  <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-nav-discovery-desc">Who you are today</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1" data-testid="text-nav-discovery-detail">Values, strengths, patterns, triggers</p>
                </CardContent>
              </Card>
              <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation(buildProcessUrl("/identity", "/plan"))} data-testid="card-nav-identity">
                <CardContent className="p-4">
                  <p className="font-medium text-sm" data-testid="text-nav-identity-title">Identity Document</p>
                  <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-nav-identity-desc">Who you're becoming</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1" data-testid="text-nav-identity-detail">Vision, identity, purpose</p>
                </CardContent>
              </Card>
              <Card className="hover-elevate cursor-pointer overflow-visible" onClick={() => setLocation(buildProcessUrl("/scoreboard", "/plan"))} data-testid="card-nav-scoreboard">
                <CardContent className="p-4">
                  <p className="font-medium text-sm" data-testid="text-nav-scoreboard-title">1-Year Scoreboard</p>
                  <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-nav-scoreboard-desc">How you'll get there</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1" data-testid="text-nav-scoreboard-detail">Proof points, obstacles, IF-THEN plans</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex items-center justify-center gap-0 mb-2" data-testid="wizard-stepper">
            {WIZARD_STEPS.map((step, idx) => {
              const done = stepCompletion[idx];
              const isActive = idx === wizardStep;
              const locked = !canAccessStep(idx);
              return (
                <div key={step.key} className="flex items-center">
                  <button
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                      isActive ? "bg-primary/[0.08]" : locked ? "opacity-40 cursor-not-allowed" : "hover-elevate cursor-pointer"
                    }`}
                    onClick={() => { if (!locked) setWizardStep(idx); }}
                    disabled={locked}
                    data-testid={`wizard-tab-${step.key}`}
                  >
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 transition-colors ${
                      done ? "bg-primary text-primary-foreground" : isActive ? "border-2 border-primary text-primary" : "border border-muted-foreground/30 text-muted-foreground"
                    }`}>
                      {done ? <Check className="h-3 w-3" /> : locked ? <Lock className="h-2.5 w-2.5" /> : idx + 1}
                    </div>
                    <span className={`text-xs font-medium hidden sm:inline ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </button>
                  {idx < WIZARD_STEPS.length - 1 && (
                    <div className={`w-6 h-px mx-0.5 ${stepCompletion[idx] ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>

          <Card className="overflow-visible" data-testid="card-plan-wizard">
            <CardContent className="pt-6">
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-1">
                  {(() => { const Icon = WIZARD_STEPS[wizardStep].icon; return <Icon className="h-5 w-5 text-primary" />; })()}
                  <h3 className="font-serif text-lg font-semibold">{WIZARD_STEPS[wizardStep].label}</h3>
                  {stepCompletion[wizardStep] && <Badge variant="secondary" className="text-[10px]">Complete</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{WIZARD_STEPS[wizardStep].description}</p>
              </div>

              {renderStepContent()}

              <div className="flex justify-between items-center mt-6 pt-4 border-t gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWizardStep(Math.max(0, wizardStep - 1))}
                  disabled={wizardStep === 0}
                  data-testid="button-wizard-prev"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Step {wizardStep + 1} of {WIZARD_STEPS.length}
                </span>
                {isLastStep && allComplete ? (
                  <Button
                    size="sm"
                    onClick={() => setLocation("/")}
                    data-testid="button-wizard-done"
                  >
                    Done
                    <Check className="h-3.5 w-3.5 ml-1" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setWizardStep(Math.min(WIZARD_STEPS.length - 1, wizardStep + 1))}
                    disabled={isLastStep || !canAccessStep(wizardStep + 1)}
                    data-testid="button-wizard-next"
                  >
                    Next
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <PlanVersioningPanel />

          <p className="text-center text-sm text-muted-foreground italic">
            Begin — to begin is half the work.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
