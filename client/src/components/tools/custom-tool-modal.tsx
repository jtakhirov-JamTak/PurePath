import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ExerciseModal } from "@/components/exercise-modal";
import { useMoodTracking } from "@/hooks/use-mood-tracking";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Sparkles, Zap, Flame, Heart, Target, HandHeart, Activity,
  Plus, Trash2, ArrowRight,
} from "lucide-react";
import type { CustomTool } from "@shared/schema";

const CUSTOM_TOOL_ICONS: Record<string, typeof Sparkles> = {
  Sparkles, Zap, Flame, Heart, Target, HandHeart, Activity,
};

export function CustomToolsCard({
  customTools,
  onAdd,
  onUse,
}: {
  customTools: CustomTool[];
  onAdd: () => void;
  onUse: (tool: CustomTool) => void;
}) {
  const qc = useQueryClient();
  const activeTools = customTools.filter(t => t.active);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/custom-tools/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/custom-tools"] }); },
  });

  return (
    <Card className="overflow-visible" data-testid="card-custom-tools">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-[13px]">My Tools</CardTitle>
        <Badge variant="secondary" className="text-[10px]">{activeTools.length}/3</Badge>
      </CardHeader>
      <CardContent className="pb-4">
        {activeTools.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">Add custom tools from your GPT course</p>
            <Button variant="outline" size="sm" onClick={onAdd} data-testid="button-add-first-custom-tool">
              <Plus className="h-3 w-3 mr-1" />
              Add Tool
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {activeTools.map((tool) => {
              const Icon = CUSTOM_TOOL_ICONS[tool.icon || "Sparkles"] || Sparkles;
              return (
                <div key={tool.id} className="flex items-center gap-2" data-testid={`custom-tool-${tool.id}`}>
                  <Button
                    variant="outline"
                    className="flex-1 justify-start gap-2 h-auto py-2"
                    onClick={() => onUse(tool)}
                    data-testid={`button-use-custom-tool-${tool.id}`}
                  >
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex flex-col items-start">
                      <span className="text-sm">{tool.name}</span>
                      {tool.description && (
                        <span className="text-[10px] text-muted-foreground line-clamp-1">{tool.description}</span>
                      )}
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(tool.id)}
                    data-testid={`button-delete-custom-tool-${tool.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
            {activeTools.length < 3 && (
              <Button variant="ghost" size="sm" onClick={onAdd} className="w-full" data-testid="button-add-custom-tool">
                <Plus className="h-3 w-3 mr-1" />
                Add Tool
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AddCustomToolModal({
  open,
  onClose,
  existingCount,
}: {
  open: boolean;
  onClose: () => void;
  existingCount: number;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [icon, setIcon] = useState("Sparkles");

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/custom-tools", {
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        icon,
        active: true,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create tool");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/custom-tools"] });
      resetAndClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Could not add tool",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetAndClose = () => {
    setName(""); setDescription(""); setInstructions(""); setIcon("Sparkles");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
      <DialogContent className="sm:max-w-md" data-testid="modal-add-custom-tool">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Custom Tool
          </DialogTitle>
        </DialogHeader>

        {existingCount >= 3 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">You already have 3 active tools. Remove one to add another.</p>
            <Button variant="ghost" size="sm" onClick={resetAndClose} className="mt-3">Close</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Tool Name</p>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 5-4-3-2-1 Grounding"
                className="text-sm"
                data-testid="input-custom-tool-name"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Description <span className="text-xs text-muted-foreground">(optional)</span></p>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the tool"
                className="text-sm"
                data-testid="input-custom-tool-description"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Instructions</p>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Step-by-step instructions for the exercise..."
                rows={4}
                className="text-sm resize-none"
                data-testid="input-custom-tool-instructions"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Icon</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CUSTOM_TOOL_ICONS).map(([key, Icon]) => (
                  <button
                    key={key}
                    onClick={() => setIcon(key)}
                    className={`p-2 rounded-md ${icon === key ? "bg-primary/10 ring-2 ring-primary" : "hover-elevate"}`}
                    data-testid={`icon-option-${key.toLowerCase()}`}
                  >
                    <Icon className={`h-5 w-5 ${icon === key ? "text-primary" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={resetAndClose} data-testid="button-cancel-custom-tool">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => createMutation.mutate()}
                disabled={!name.trim() || !instructions.trim() || createMutation.isPending}
                data-testid="button-save-custom-tool"
              >
                Add Tool
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CustomToolExerciseModal({
  open,
  onClose,
  tool,
}: {
  open: boolean;
  onClose: () => void;
  tool: CustomTool | null;
}) {
  const mood = useMoodTracking(tool?.name || "Custom Tool");

  if (!tool) return null;

  const Icon = CUSTOM_TOOL_ICONS[tool.icon || "Sparkles"] || Sparkles;

  return (
    <ExerciseModal
      open={open}
      onClose={onClose}
      mood={mood}
      title={tool.name}
      icon={<Icon className="h-5 w-5 text-primary" />}
      className="sm:max-w-md"
      testId="modal-custom-tool-exercise"
    >
      <div className="space-y-4">
        {tool.description && (
          <p className="text-sm text-muted-foreground">{tool.description}</p>
        )}
        <div className="space-y-2 p-3 rounded-md bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Instructions</p>
          <p className="text-sm whitespace-pre-wrap">{tool.instructions}</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-custom-exercise-cancel">
            Cancel
          </Button>
          <Button size="sm" onClick={() => mood.finishExercise()} data-testid="button-custom-exercise-done">
            Done
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>
    </ExerciseModal>
  );
}
