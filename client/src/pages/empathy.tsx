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
import { Users, Plus, Download, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { EmpathyExercise } from "@shared/schema";

export default function EmpathyPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newExercise, setNewExercise] = useState({
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
  });

  const { data: exercises = [], isLoading } = useQuery<EmpathyExercise[]>({
    queryKey: ["/api/empathy"],
  });

  const createMutation = useMutation({
    mutationFn: async (exercise: typeof newExercise) => {
      return apiRequest("POST", "/api/empathy", exercise);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/empathy"] });
      setDialogOpen(false);
      setNewExercise({
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
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/empathy/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/empathy"] });
    },
  });

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

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
              <Users className="h-7 w-7 text-emerald-500" />
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
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Date</Label>
                      <Input 
                        type="date" 
                        value={newExercise.date} 
                        onChange={(e) => setNewExercise({ ...newExercise, date: e.target.value })}
                        data-testid="input-date"
                      />
                    </div>
                    <div>
                      <Label>Who</Label>
                      <Input 
                        placeholder="Person involved"
                        value={newExercise.who} 
                        onChange={(e) => setNewExercise({ ...newExercise, who: e.target.value })}
                        data-testid="input-who"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Context</Label>
                    <Textarea 
                      placeholder="What was the situation?"
                      value={newExercise.context} 
                      onChange={(e) => setNewExercise({ ...newExercise, context: e.target.value })}
                      data-testid="input-context"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>What was their emotional state?</Label>
                      <Textarea 
                        placeholder="How did they seem to feel?"
                        value={newExercise.theirEmotionalState} 
                        onChange={(e) => setNewExercise({ ...newExercise, theirEmotionalState: e.target.value })}
                        data-testid="input-their-emotional-state"
                      />
                    </div>
                    <div>
                      <Label>What was my emotional state? Why?</Label>
                      <Textarea 
                        placeholder="How was I feeling and why?"
                        value={newExercise.myEmotionalState} 
                        onChange={(e) => setNewExercise({ ...newExercise, myEmotionalState: e.target.value })}
                        data-testid="input-my-emotional-state"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Facts Only: What did I observe?</Label>
                    <Textarea 
                      placeholder="Just the facts, no interpretation"
                      value={newExercise.factsObserved} 
                      onChange={(e) => setNewExercise({ ...newExercise, factsObserved: e.target.value })}
                      data-testid="input-facts-observed"
                    />
                  </div>

                  <div>
                    <Label>How I came across</Label>
                    <Textarea 
                      placeholder='"I came across as ___ because I ___"'
                      value={newExercise.howICameAcross} 
                      onChange={(e) => setNewExercise({ ...newExercise, howICameAcross: e.target.value })}
                      data-testid="input-how-i-came-across"
                    />
                  </div>

                  <div>
                    <Label>How they likely felt</Label>
                    <Textarea 
                      placeholder='"I think they felt ___ because I observed ___"'
                      value={newExercise.howTheyLikelyFelt} 
                      onChange={(e) => setNewExercise({ ...newExercise, howTheyLikelyFelt: e.target.value })}
                      data-testid="input-how-they-likely-felt"
                    />
                  </div>

                  <div>
                    <Label>What likely matters the most to them</Label>
                    <Textarea 
                      placeholder='"I think ___ matters most to them"'
                      value={newExercise.whatMattersToThem} 
                      onChange={(e) => setNewExercise({ ...newExercise, whatMattersToThem: e.target.value })}
                      data-testid="input-what-matters-to-them"
                    />
                  </div>

                  <div>
                    <Label>What they likely need</Label>
                    <Textarea 
                      placeholder='"I think they need ___ because I of ___"'
                      value={newExercise.whatTheyNeed} 
                      onChange={(e) => setNewExercise({ ...newExercise, whatTheyNeed: e.target.value })}
                      data-testid="input-what-they-need"
                    />
                  </div>

                  <div>
                    <Label>What should I do next?</Label>
                    <Textarea 
                      placeholder="Action or Conversation"
                      value={newExercise.nextAction} 
                      onChange={(e) => setNewExercise({ ...newExercise, nextAction: e.target.value })}
                      data-testid="input-next-action"
                    />
                  </div>
                </div>
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
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteMutation.mutate(exercise.id)}
                      data-testid={`button-delete-exercise-${exercise.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
