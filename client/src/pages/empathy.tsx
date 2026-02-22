import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Plus, Download, Trash2, Calendar, Pencil } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { EmpathyExercise } from "@shared/schema";

type ExerciseFormData = {
  date: string;
  who: string;
  context: string;
  theirEmotionalState: string;
  myEmotionalState: string;
  factsObserved: string;
  howICameAcross: string;
  howTheyLikelyFelt: string;
  whatMattersToThem: string;
  whatTheyNeed: string;
  nextAction: string;
};

const emptyForm: ExerciseFormData = {
  date: format(new Date(), "yyyy-MM-dd"),
  who: "",
  context: "",
  theirEmotionalState: "",
  myEmotionalState: "",
  factsObserved: "",
  howICameAcross: "",
  howTheyLikelyFelt: "",
  whatMattersToThem: "",
  whatTheyNeed: "",
  nextAction: "",
};

function ExerciseFormFields({ data, onChange }: { data: ExerciseFormData; onChange: (d: ExerciseFormData) => void }) {
  const set = (field: keyof ExerciseFormData, value: string) => onChange({ ...data, [field]: value });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date</Label>
          <Input type="date" value={data.date} onChange={(e) => set("date", e.target.value)} data-testid="input-date" />
        </div>
        <div>
          <Label>Who</Label>
          <Input placeholder="Person involved" value={data.who} onChange={(e) => set("who", e.target.value)} data-testid="input-who" />
        </div>
      </div>
      <div>
        <Label>Context</Label>
        <Textarea placeholder="What was the situation?" value={data.context} onChange={(e) => set("context", e.target.value)} data-testid="input-context" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>What was their emotional state?</Label>
          <Textarea placeholder="How did they seem to feel?" value={data.theirEmotionalState} onChange={(e) => set("theirEmotionalState", e.target.value)} data-testid="input-their-emotional-state" />
        </div>
        <div>
          <Label>What was my emotional state? Why?</Label>
          <Textarea placeholder="How was I feeling and why?" value={data.myEmotionalState} onChange={(e) => set("myEmotionalState", e.target.value)} data-testid="input-my-emotional-state" />
        </div>
      </div>
      <div>
        <Label>Facts Only: What did I observe?</Label>
        <Textarea placeholder="Just the facts, no interpretation" value={data.factsObserved} onChange={(e) => set("factsObserved", e.target.value)} data-testid="input-facts-observed" />
      </div>
      <div>
        <Label>How I came across</Label>
        <Textarea placeholder='"I came across as ___ because I ___"' value={data.howICameAcross} onChange={(e) => set("howICameAcross", e.target.value)} data-testid="input-how-i-came-across" />
      </div>
      <div>
        <Label>How they likely felt</Label>
        <Textarea placeholder='"I think they felt ___ because I observed ___"' value={data.howTheyLikelyFelt} onChange={(e) => set("howTheyLikelyFelt", e.target.value)} data-testid="input-how-they-likely-felt" />
      </div>
      <div>
        <Label>What likely matters the most to them</Label>
        <Textarea placeholder='"I think ___ matters most to them"' value={data.whatMattersToThem} onChange={(e) => set("whatMattersToThem", e.target.value)} data-testid="input-what-matters-to-them" />
      </div>
      <div>
        <Label>What they likely need</Label>
        <Textarea placeholder='"I think they need ___ because of ___"' value={data.whatTheyNeed} onChange={(e) => set("whatTheyNeed", e.target.value)} data-testid="input-what-they-need" />
      </div>
      <div>
        <Label>What should I do next?</Label>
        <Textarea placeholder="Action or Conversation" value={data.nextAction} onChange={(e) => set("nextAction", e.target.value)} data-testid="input-next-action" />
      </div>
    </div>
  );
}

export default function EmpathyPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newExercise, setNewExercise] = useState<ExerciseFormData>({ ...emptyForm });
  const [editExercise, setEditExercise] = useState<ExerciseFormData>({ ...emptyForm });

  const { data: exercises = [], isLoading } = useQuery<EmpathyExercise[]>({
    queryKey: ["/api/empathy"],
  });

  const createMutation = useMutation({
    mutationFn: async (exercise: ExerciseFormData) => {
      const res = await apiRequest("POST", "/api/empathy", exercise);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to save exercise");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/empathy"] });
      setDialogOpen(false);
      setNewExercise({ ...emptyForm, date: format(new Date(), "yyyy-MM-dd") });
    },
    onError: (error: Error) => {
      toast({ title: "Could not save exercise", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ExerciseFormData }) => {
      const res = await apiRequest("PATCH", `/api/empathy/${id}`, data);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update exercise");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/empathy"] });
      setEditDialogOpen(false);
      setEditingId(null);
      toast({ title: "Reflection updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not update exercise", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/empathy/${id}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to delete exercise");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/empathy"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not delete exercise", description: error.message, variant: "destructive" });
    },
  });

  const openEdit = (exercise: EmpathyExercise) => {
    setEditingId(exercise.id);
    setEditExercise({
      date: exercise.date,
      who: exercise.who,
      context: exercise.context || "",
      theirEmotionalState: exercise.theirEmotionalState || "",
      myEmotionalState: exercise.myEmotionalState || "",
      factsObserved: exercise.factsObserved || "",
      howICameAcross: exercise.howICameAcross || "",
      howTheyLikelyFelt: exercise.howTheyLikelyFelt || "",
      whatMattersToThem: exercise.whatMattersToThem || "",
      whatTheyNeed: exercise.whatTheyNeed || "",
      nextAction: exercise.nextAction || "",
    });
    setEditDialogOpen(true);
  };

  const handleExport = () => {
    window.open("/api/empathy/export", "_blank");
  };

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

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl bg-primary/[0.08] flex items-center justify-center">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold">Empathy Module</h1>
              <p className="text-muted-foreground">Reflect on interactions and build understanding</p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-exercise">
                <Plus className="h-4 w-4 mr-2" />
                New Reflection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Empathy Reflection</DialogTitle>
                <DialogDescription>Reflect on an interaction to build understanding</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4">
                <ExerciseFormFields data={newExercise} onChange={setNewExercise} />
              </ScrollArea>
              <DialogFooter>
                <Button 
                  onClick={() => createMutation.mutate(newExercise)} 
                  disabled={!newExercise.who || createMutation.isPending}
                  data-testid="button-save-reflection"
                >
                  Save Reflection
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Edit Reflection</DialogTitle>
              <DialogDescription>Update this empathy reflection</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <ExerciseFormFields data={editExercise} onChange={setEditExercise} />
            </ScrollArea>
            <DialogFooter>
              <Button 
                onClick={() => editingId && updateMutation.mutate({ id: editingId, data: editExercise })} 
                disabled={!editExercise.who || updateMutation.isPending}
                data-testid="button-update-reflection"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="space-y-4">
          {exercises.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No empathy reflections yet</p>
                <p className="text-sm text-muted-foreground mt-1">Click "New Reflection" to start building understanding</p>
              </CardContent>
            </Card>
          ) : (
            exercises.map(exercise => (
              <Card key={exercise.id} data-testid={`card-exercise-${exercise.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="font-serif text-lg">{exercise.who}</CardTitle>
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
                  {exercise.howTheyLikelyFelt && (
                    <div>
                      <span className="font-medium">How they likely felt:</span>
                      <p className="text-muted-foreground">{exercise.howTheyLikelyFelt}</p>
                    </div>
                  )}
                  {exercise.nextAction && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <span className="font-medium">Next action:</span>
                      <p className="text-muted-foreground">{exercise.nextAction}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
