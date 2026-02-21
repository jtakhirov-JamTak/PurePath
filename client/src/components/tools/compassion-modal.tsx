import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ExerciseModal } from "@/components/exercise-modal";
import { useMoodTracking } from "@/hooks/use-mood-tracking";
import { VoiceTextarea } from "@/components/voice-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { HandHeart, ArrowRight, Check, Plus } from "lucide-react";
import { format } from "date-fns";

function convertPronouns(text: string): string {
  return text
    .replace(/\byou're\b/gi, "I'm")
    .replace(/\byou are\b/gi, "I am")
    .replace(/\byour\b/gi, "my")
    .replace(/\byours\b/gi, "mine")
    .replace(/\byou\b/gi, "I")
    .replace(/\byourself\b/gi, "myself");
}

export function CompassionModal({
  open,
  onClose,
  todayStr,
}: {
  open: boolean;
  onClose: () => void;
  todayStr: string;
}) {
  const qc = useQueryClient();
  const [situation, setSituation] = useState("");
  const [lovedOneMsg, setLovedOneMsg] = useState("");
  const [selfMsg, setSelfMsg] = useState("");
  const [convertToggle, setConvertToggle] = useState(false);
  const [saved, setSaved] = useState(false);
  const [taskAdded, setTaskAdded] = useState(false);
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);
  const [nextStepInput, setNextStepInput] = useState("");
  const [showNextStepPrompt, setShowNextStepPrompt] = useState(false);
  const mood = useMoodTracking("Self-Compassion");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const content = [
        situation ? `Situation: ${situation}` : "",
        lovedOneMsg ? `To a loved one: ${lovedOneMsg}` : "",
        selfMsg ? `To myself: ${selfMsg}` : "",
      ].filter(Boolean).join("\n");
      return apiRequest("PUT", "/api/journals", {
        date: todayStr,
        session: "morning",
        reflections: content,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/journals"] });
      setSaved(true);
    },
  });

  const addTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      return apiRequest("POST", "/api/tasks", {
        title,
        date: todayStr,
        time: "09:00",
        quadrant: "q2",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/tasks"] });
      setTaskAdded(true);
      setShowNextStepPrompt(false);
    },
  });

  const handleClose = () => {
    setSituation(""); setLovedOneMsg(""); setSelfMsg("");
    setConvertToggle(false); setSaved(false); setTaskAdded(false);
    setShowCopyConfirm(false); setNextStepInput(""); setShowNextStepPrompt(false);
    onClose();
  };

  const handleCopyToSelf = () => {
    if (selfMsg.trim()) {
      setShowCopyConfirm(true);
    } else {
      const msg = convertToggle ? convertPronouns(lovedOneMsg) : lovedOneMsg;
      setSelfMsg(msg);
    }
  };

  const confirmCopy = (mode: "replace" | "append") => {
    const msg = convertToggle ? convertPronouns(lovedOneMsg) : lovedOneMsg;
    if (mode === "replace") {
      setSelfMsg(msg);
    } else {
      setSelfMsg((prev) => prev + "\n" + msg);
    }
    setShowCopyConfirm(false);
  };

  const handleAddNextStep = () => {
    const match = lovedOneMsg.match(/let's just do (.+?) for/i) || lovedOneMsg.match(/let's just do (.+)/i);
    if (match) {
      addTaskMutation.mutate(match[1].trim());
    } else {
      setShowNextStepPrompt(true);
    }
  };

  const insertChip = (text: string) => {
    setLovedOneMsg((prev) => prev ? prev + " " + text : text);
  };

  return (
    <ExerciseModal
      open={open}
      onClose={handleClose}
      mood={mood}
      title="Loved One Mirror"
      icon={<HandHeart className="h-5 w-5 text-violet-500" />}
      className="sm:max-w-lg max-h-[85vh] overflow-y-auto"
      testId="modal-compassion"
    >
      <>
        <p className="text-xs text-muted-foreground -mt-2">Treat yourself like you would a loved one.</p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">What's going on? <span className="text-xs">(optional)</span></p>
            <VoiceTextarea
              value={situation}
              onChange={setSituation}
              placeholder="Briefly describe the situation..."
              rows={1}
              className="resize-none text-sm"
              data-testid="textarea-mirror-situation"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">What would you say to a loved one in this exact situation?</p>
            <VoiceTextarea
              value={lovedOneMsg}
              onChange={setLovedOneMsg}
              placeholder="Imagine someone you deeply care about is going through this..."
              rows={3}
              className="resize-none text-sm"
              data-testid="textarea-mirror-loved-one"
            />
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant="outline"
                className="cursor-pointer text-xs"
                onClick={() => insertChip("Of course you feel this. It makes sense because ___.")}
                data-testid="chip-validate"
              >
                Validate
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer text-xs"
                onClick={() => insertChip("You're not broken. I'm with you.")}
                data-testid="chip-kindness"
              >
                Kindness
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer text-xs"
                onClick={() => insertChip("Let's just do ___ for 2 minutes.")}
                data-testid="chip-next-step"
              >
                Next step
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyToSelf}
              disabled={!lovedOneMsg.trim()}
              data-testid="button-mirror-copy"
            >
              <ArrowRight className="h-3 w-3 mr-1" />
              Copy to myself
            </Button>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={convertToggle}
                onChange={(e) => setConvertToggle(e.target.checked)}
                className="rounded"
                data-testid="checkbox-convert-pronouns"
              />
              <span className="text-xs text-muted-foreground">Convert to I/me wording</span>
            </label>
          </div>

          {showCopyConfirm && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm">
              <span className="text-xs text-muted-foreground">You already have text below.</span>
              <Button variant="outline" size="sm" onClick={() => confirmCopy("replace")} data-testid="button-copy-replace">Replace</Button>
              <Button variant="outline" size="sm" onClick={() => confirmCopy("append")} data-testid="button-copy-append">Append</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowCopyConfirm(false)}>Cancel</Button>
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Now say that to yourself as if you're that loved one.</p>
            <VoiceTextarea
              value={selfMsg}
              onChange={setSelfMsg}
              placeholder="Speak to yourself with the same warmth..."
              rows={3}
              className="resize-none text-sm"
              data-testid="textarea-mirror-self"
            />
          </div>

          {showNextStepPrompt && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
              <Input
                value={nextStepInput}
                onChange={(e) => setNextStepInput(e.target.value)}
                placeholder="What's a 2-minute next step?"
                className="text-sm flex-1"
                data-testid="input-mirror-next-step"
              />
              <Button
                size="sm"
                onClick={() => addTaskMutation.mutate(nextStepInput.trim())}
                disabled={!nextStepInput.trim() || addTaskMutation.isPending}
                data-testid="button-add-next-step-confirm"
              >
                Add
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saved || saveMutation.isPending || (!lovedOneMsg.trim() && !selfMsg.trim())}
              data-testid="button-mirror-save"
            >
              {saved ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Saved
                </>
              ) : (
                "Save to journal"
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddNextStep}
              disabled={taskAdded || addTaskMutation.isPending}
              data-testid="button-mirror-add-task"
            >
              {taskAdded ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Added
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3 mr-1" />
                  Add next step to Today
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => mood.finishExercise()}
              className="ml-auto"
              data-testid="button-mirror-close"
            >
              Finish
            </Button>
          </div>
        </div>
      </>
    </ExerciseModal>
  );
}
