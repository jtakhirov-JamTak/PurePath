import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { FlowBar } from "@/components/flow-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Download, Trash2, Calendar, Pencil, Sparkles, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { EmpathyExercise } from "@shared/schema";

type PrepFormData = {
  exerciseType: "prep";
  date: string;
  who: string;
  context: string;
  myEmotionalState: string;
  theirEmotionalState: string;
  intention: string;
  leaveThemFeeling: string;
  triggerRiskIfThen: string;
  themHypothesis: string;
  realityCheckQuestion: string;
  reflectionValidation: string;
};

type DebriefFormData = {
  exerciseType: "debrief";
  date: string;
  who: string;
  context: string;
  theirEmotionalState: string;
  myEmotionalState: string;
  factsObserved: string;
  howICameAcross: string;
  howTheyLikelyFelt: string;
  whatMattersToThem: string;
  didConfirm: string;
  whatTheyNeed: string;
  nextAction: string;
};

const emptyPrep: PrepFormData = {
  exerciseType: "prep",
  date: format(new Date(), "yyyy-MM-dd"),
  who: "",
  context: "",
  myEmotionalState: "",
  theirEmotionalState: "",
  intention: "",
  leaveThemFeeling: "",
  triggerRiskIfThen: "",
  themHypothesis: "",
  realityCheckQuestion: "",
  reflectionValidation: "",
};

const emptyDebrief: DebriefFormData = {
  exerciseType: "debrief",
  date: format(new Date(), "yyyy-MM-dd"),
  who: "",
  context: "",
  theirEmotionalState: "",
  myEmotionalState: "",
  factsObserved: "",
  howICameAcross: "",
  howTheyLikelyFelt: "",
  whatMattersToThem: "",
  didConfirm: "",
  whatTheyNeed: "",
  nextAction: "",
};

function PrepFormFields({ data, onChange }: { data: PrepFormData; onChange: (d: PrepFormData) => void }) {
  const set = (field: keyof PrepFormData, value: string) => onChange({ ...data, [field]: value });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date</Label>
          <Input type="date" value={data.date} onChange={(e) => set("date", e.target.value)} data-testid="input-prep-date" />
        </div>
        <div>
          <Label>Who</Label>
          <Input placeholder="Person you'll be speaking with" value={data.who} onChange={(e) => set("who", e.target.value)} data-testid="input-prep-who" />
        </div>
      </div>
      <div>
        <Label>Context</Label>
        <Textarea placeholder="What is this conversation about?" value={data.context} onChange={(e) => set("context", e.target.value)} data-testid="input-prep-context" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>My Likely Emotional State</Label>
          <Textarea placeholder="How am I likely to feel going in?" value={data.myEmotionalState} onChange={(e) => set("myEmotionalState", e.target.value)} data-testid="input-prep-my-state" />
        </div>
        <div>
          <Label>Their Likely Emotional State</Label>
          <Textarea placeholder="How are they likely to feel?" value={data.theirEmotionalState} onChange={(e) => set("theirEmotionalState", e.target.value)} data-testid="input-prep-their-state" />
        </div>
      </div>
      <div>
        <Label>Intention: What value am I practicing?</Label>
        <Textarea placeholder="e.g. curiosity, calm, leadership" value={data.intention} onChange={(e) => set("intention", e.target.value)} data-testid="input-prep-intention" />
      </div>
      <div>
        <Label>Leave-them-feeling goal</Label>
        <Textarea placeholder={'"After this, I want them to feel ___."'} value={data.leaveThemFeeling} onChange={(e) => set("leaveThemFeeling", e.target.value)} data-testid="input-prep-leave-feeling" />
      </div>
      <div>
        <Label>My trigger risk + IF-THEN</Label>
        <Textarea placeholder={'"IF I feel ___, THEN I will ___."'} value={data.triggerRiskIfThen} onChange={(e) => set("triggerRiskIfThen", e.target.value)} data-testid="input-prep-trigger" />
      </div>
      <div>
        <Label>Them hypothesis (feelings + needs) with evidence</Label>
        <Textarea placeholder="What do I think they're feeling and needing, and what evidence do I have?" value={data.themHypothesis} onChange={(e) => set("themHypothesis", e.target.value)} data-testid="input-prep-hypothesis" />
      </div>
      <div>
        <Label>Reality-check question to confirm</Label>
        <Textarea placeholder="What question will I ask to check my hypothesis?" value={data.realityCheckQuestion} onChange={(e) => set("realityCheckQuestion", e.target.value)} data-testid="input-prep-reality-check" />
      </div>
      <div>
        <Label>Reflection/validation line (label + validate)</Label>
        <Textarea placeholder="A validation statement I can offer them" value={data.reflectionValidation} onChange={(e) => set("reflectionValidation", e.target.value)} data-testid="input-prep-reflection" />
      </div>
    </div>
  );
}

function DebriefFormFields({ data, onChange }: { data: DebriefFormData; onChange: (d: DebriefFormData) => void }) {
  const set = (field: keyof DebriefFormData, value: string) => onChange({ ...data, [field]: value });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date</Label>
          <Input type="date" value={data.date} onChange={(e) => set("date", e.target.value)} data-testid="input-debrief-date" />
        </div>
        <div>
          <Label>Who</Label>
          <Input placeholder="Person involved" value={data.who} onChange={(e) => set("who", e.target.value)} data-testid="input-debrief-who" />
        </div>
      </div>
      <div>
        <Label>Context</Label>
        <Textarea placeholder="What was the situation?" value={data.context} onChange={(e) => set("context", e.target.value)} data-testid="input-debrief-context" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>What was their emotional state?</Label>
          <Textarea placeholder="How did they seem to feel?" value={data.theirEmotionalState} onChange={(e) => set("theirEmotionalState", e.target.value)} data-testid="input-debrief-their-state" />
        </div>
        <div>
          <Label>What was my emotional state? Why?</Label>
          <Textarea placeholder="How was I feeling and why?" value={data.myEmotionalState} onChange={(e) => set("myEmotionalState", e.target.value)} data-testid="input-debrief-my-state" />
        </div>
      </div>
      <div>
        <Label>What did I observe?</Label>
        <Textarea placeholder="Captured in Camera/Mic — just the facts" value={data.factsObserved} onChange={(e) => set("factsObserved", e.target.value)} data-testid="input-debrief-facts" />
      </div>
      <div>
        <Label>How I came across</Label>
        <Textarea placeholder={'"I came across as ___ because I ___"'} value={data.howICameAcross} onChange={(e) => set("howICameAcross", e.target.value)} data-testid="input-debrief-came-across" />
      </div>
      <div>
        <Label>How they likely felt</Label>
        <Textarea placeholder={'"I think they felt ___ because I observed ___."'} value={data.howTheyLikelyFelt} onChange={(e) => set("howTheyLikelyFelt", e.target.value)} data-testid="input-debrief-they-felt" />
      </div>
      <div>
        <Label>What likely matters the most to them</Label>
        <Textarea placeholder={'"I think ___ matters most to them"'} value={data.whatMattersToThem} onChange={(e) => set("whatMattersToThem", e.target.value)} data-testid="input-debrief-matters" />
      </div>
      <div>
        <Label>Did I confirm? What did I ask + what did they say?</Label>
        <Textarea placeholder="What did I ask and what did they say?" value={data.didConfirm} onChange={(e) => set("didConfirm", e.target.value)} data-testid="input-debrief-confirm" />
      </div>
      <div>
        <Label>What they likely need</Label>
        <Textarea placeholder={'"I think they need ___ because of ___."'} value={data.whatTheyNeed} onChange={(e) => set("whatTheyNeed", e.target.value)} data-testid="input-debrief-need" />
      </div>
      <div>
        <Label>What should I do next?</Label>
        <Textarea placeholder="Action or Conversation" value={data.nextAction} onChange={(e) => set("nextAction", e.target.value)} data-testid="input-debrief-next" />
      </div>
    </div>
  );
}

export default function EmpathyPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"prep" | "debrief">("prep");
  const [prepDialogOpen, setPrepDialogOpen] = useState(false);
  const [debriefDialogOpen, setDebriefDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingType, setEditingType] = useState<"prep" | "debrief">("debrief");
  const [newPrep, setNewPrep] = useState<PrepFormData>({ ...emptyPrep });
  const [newDebrief, setNewDebrief] = useState<DebriefFormData>({ ...emptyDebrief });
  const [editPrep, setEditPrep] = useState<PrepFormData>({ ...emptyPrep });
  const [editDebrief, setEditDebrief] = useState<DebriefFormData>({ ...emptyDebrief });

  const { data: exercises = [], isLoading } = useQuery<EmpathyExercise[]>({
    queryKey: ["/api/empathy"],
  });

  const prepExercises = exercises.filter(e => e.exerciseType === "prep");
  const debriefExercises = exercises.filter(e => e.exerciseType !== "prep");

  const createMutation = useMutation({
    mutationFn: async (exercise: PrepFormData | DebriefFormData) => {
      const res = await apiRequest("POST", "/api/empathy", exercise);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/empathy"] });
      setPrepDialogOpen(false);
      setDebriefDialogOpen(false);
      setNewPrep({ ...emptyPrep, date: format(new Date(), "yyyy-MM-dd") });
      setNewDebrief({ ...emptyDebrief, date: format(new Date(), "yyyy-MM-dd") });
    },
    onError: (error: Error) => {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: PrepFormData | DebriefFormData }) => {
      const res = await apiRequest("PATCH", `/api/empathy/${id}`, data);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/empathy"] });
      setEditDialogOpen(false);
      setEditingId(null);
      toast({ title: "Updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not update", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/empathy/${id}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to delete");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/empathy"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not delete", description: error.message, variant: "destructive" });
    },
  });

  const openEdit = (exercise: EmpathyExercise) => {
    const type = exercise.exerciseType === "prep" ? "prep" : "debrief";
    setEditingId(exercise.id);
    setEditingType(type);
    if (type === "prep") {
      setEditPrep({
        exerciseType: "prep",
        date: exercise.date,
        who: exercise.who,
        context: exercise.context || "",
        myEmotionalState: exercise.myEmotionalState || "",
        theirEmotionalState: exercise.theirEmotionalState || "",
        intention: exercise.intention || "",
        leaveThemFeeling: exercise.leaveThemFeeling || "",
        triggerRiskIfThen: exercise.triggerRiskIfThen || "",
        themHypothesis: exercise.themHypothesis || "",
        realityCheckQuestion: exercise.realityCheckQuestion || "",
        reflectionValidation: exercise.reflectionValidation || "",
      });
    } else {
      setEditDebrief({
        exerciseType: "debrief",
        date: exercise.date,
        who: exercise.who,
        context: exercise.context || "",
        theirEmotionalState: exercise.theirEmotionalState || "",
        myEmotionalState: exercise.myEmotionalState || "",
        factsObserved: exercise.factsObserved || "",
        howICameAcross: exercise.howICameAcross || "",
        howTheyLikelyFelt: exercise.howTheyLikelyFelt || "",
        whatMattersToThem: exercise.whatMattersToThem || "",
        didConfirm: exercise.didConfirm || "",
        whatTheyNeed: exercise.whatTheyNeed || "",
        nextAction: exercise.nextAction || "",
      });
    }
    setEditDialogOpen(true);
  };

  const handleExport = () => {
    window.open("/api/empathy/export", "_blank");
  };

  const renderExerciseCard = (exercise: EmpathyExercise) => {
    const isPrep = exercise.exerciseType === "prep";
    return (
      <Card key={exercise.id} data-testid={`card-exercise-${exercise.id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="font-serif text-lg">{exercise.who}</CardTitle>
                <Badge variant={isPrep ? "default" : "secondary"} className="text-[10px]">
                  {isPrep ? "PREP" : "DEBRIEF"}
                </Badge>
              </div>
              <CardDescription className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(exercise.date), "MMM d, yyyy")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openEdit(exercise)}
                data-testid={`button-edit-exercise-${exercise.id}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate(exercise.id)}
                data-testid={`button-delete-exercise-${exercise.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {exercise.context && (
            <div>
              <span className="font-medium">Context:</span>
              <p className="text-muted-foreground">{exercise.context}</p>
            </div>
          )}
          {isPrep ? (
            <>
              {exercise.intention && (
                <div>
                  <span className="font-medium">Intention:</span>
                  <p className="text-muted-foreground">{exercise.intention}</p>
                </div>
              )}
              {exercise.leaveThemFeeling && (
                <div>
                  <span className="font-medium">Leave-them-feeling goal:</span>
                  <p className="text-muted-foreground">{exercise.leaveThemFeeling}</p>
                </div>
              )}
              {exercise.triggerRiskIfThen && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <span className="font-medium">Trigger risk + IF-THEN:</span>
                  <p className="text-muted-foreground">{exercise.triggerRiskIfThen}</p>
                </div>
              )}
            </>
          ) : (
            <>
              {exercise.howTheyLikelyFelt && (
                <div>
                  <span className="font-medium">How they likely felt:</span>
                  <p className="text-muted-foreground">{exercise.howTheyLikelyFelt}</p>
                </div>
              )}
              {exercise.didConfirm && (
                <div>
                  <span className="font-medium">Did I confirm?</span>
                  <p className="text-muted-foreground">{exercise.didConfirm}</p>
                </div>
              )}
              {exercise.nextAction && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <span className="font-medium">Next action:</span>
                  <p className="text-muted-foreground">{exercise.nextAction}</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  const emptyState = (type: "prep" | "debrief") => (
    <Card>
      <CardContent className="py-12 text-center">
        {type === "prep" ? (
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        ) : (
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        )}
        <p className="text-muted-foreground">
          {type === "prep" ? "No prep entries yet" : "No debrief entries yet"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {type === "prep"
            ? "Prepare for an upcoming conversation"
            : "Reflect on a past interaction"}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        rightContent={
          <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        }
      />
      <FlowBar fallback="/dashboard" />

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl bg-primary/[0.08] flex items-center justify-center">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold">EQ Module</h1>
              <p className="text-muted-foreground">Prepare for and reflect on conversations</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "prep" | "debrief")} className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="prep" data-testid="tab-prep">
                <Sparkles className="h-4 w-4 mr-1.5" />
                Prep
              </TabsTrigger>
              <TabsTrigger value="debrief" data-testid="tab-debrief">
                <BookOpen className="h-4 w-4 mr-1.5" />
                Debrief
              </TabsTrigger>
            </TabsList>

            {activeTab === "prep" ? (
              <Dialog open={prepDialogOpen} onOpenChange={setPrepDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-prep">
                    <Plus className="h-4 w-4 mr-2" />
                    New Prep
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Conversation Prep</DialogTitle>
                    <DialogDescription>Prepare for an upcoming conversation</DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[60vh] pr-4">
                    <PrepFormFields data={newPrep} onChange={setNewPrep} />
                  </ScrollArea>
                  <DialogFooter>
                    <Button
                      onClick={() => createMutation.mutate(newPrep)}
                      disabled={!newPrep.who || createMutation.isPending}
                      data-testid="button-save-prep"
                    >
                      Save Prep
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <Dialog open={debriefDialogOpen} onOpenChange={setDebriefDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-debrief">
                    <Plus className="h-4 w-4 mr-2" />
                    New Debrief
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Conversation Debrief</DialogTitle>
                    <DialogDescription>Reflect on a past interaction to build understanding</DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[60vh] pr-4">
                    <DebriefFormFields data={newDebrief} onChange={setNewDebrief} />
                  </ScrollArea>
                  <DialogFooter>
                    <Button
                      onClick={() => createMutation.mutate(newDebrief)}
                      disabled={!newDebrief.who || createMutation.isPending}
                      data-testid="button-save-debrief"
                    >
                      Save Debrief
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <TabsContent value="prep" className="space-y-4">
            {prepExercises.length === 0
              ? emptyState("prep")
              : prepExercises.map(renderExerciseCard)}
          </TabsContent>

          <TabsContent value="debrief" className="space-y-4">
            {debriefExercises.length === 0
              ? emptyState("debrief")
              : debriefExercises.map(renderExerciseCard)}
          </TabsContent>
        </Tabs>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingType === "prep" ? "Edit Prep" : "Edit Debrief"}</DialogTitle>
              <DialogDescription>
                {editingType === "prep" ? "Update your conversation prep" : "Update your debrief reflection"}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              {editingType === "prep" ? (
                <PrepFormFields data={editPrep} onChange={setEditPrep} />
              ) : (
                <DebriefFormFields data={editDebrief} onChange={setEditDebrief} />
              )}
            </ScrollArea>
            <DialogFooter>
              <Button
                onClick={() => {
                  if (!editingId) return;
                  const data = editingType === "prep" ? editPrep : editDebrief;
                  updateMutation.mutate({ id: editingId, data });
                }}
                disabled={updateMutation.isPending || (editingType === "prep" ? !editPrep.who : !editDebrief.who)}
                data-testid="button-update-exercise"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
