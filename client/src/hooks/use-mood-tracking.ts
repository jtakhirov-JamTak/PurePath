import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export type MoodPhase = "before" | "exercise" | "after" | "done";

export interface MoodTrackingState {
  phase: MoodPhase;
  moodBefore: number | null;
  setMoodBefore: (v: number) => void;
  emotionBefore: string;
  setEmotionBefore: (v: string) => void;
  moodAfter: number | null;
  setMoodAfter: (v: number) => void;
  emotionAfter: string;
  setEmotionAfter: (v: string) => void;
  startExercise: () => Promise<void>;
  finishExercise: () => void;
  completeTracking: () => Promise<void>;
  reset: () => void;
  saving: boolean;
}

export function useMoodTracking(toolName: string): MoodTrackingState {
  const [phase, setPhase] = useState<MoodPhase>("before");
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [emotionBefore, setEmotionBefore] = useState("");
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [emotionAfter, setEmotionAfter] = useState("");
  const [logId, setLogId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const qc = useQueryClient();

  const startExercise = async () => {
    if (!moodBefore || !emotionBefore.trim()) return;
    setSaving(true);
    try {
      const res = await apiRequest("POST", "/api/tool-usage", {
        toolName,
        moodBefore,
        emotionBefore: emotionBefore.trim(),
        date: todayStr,
        completed: false,
      });
      const data = await res.json();
      setLogId(data.id);
      qc.invalidateQueries({ queryKey: ["/api/tool-usage"] });
      setPhase("exercise");
    } catch (e) {
      console.error("Failed to create tool usage log:", e);
    } finally {
      setSaving(false);
    }
  };

  const finishExercise = () => {
    setPhase("after");
  };

  const completeTracking = async () => {
    if (!moodAfter || !emotionAfter.trim() || !logId) return;
    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/tool-usage/${logId}`, {
        moodAfter,
        emotionAfter: emotionAfter.trim(),
        completed: true,
      });
      qc.invalidateQueries({ queryKey: ["/api/tool-usage"] });
      setPhase("done");
    } catch (e) {
      console.error("Failed to update tool usage log:", e);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setPhase("before");
    setMoodBefore(null);
    setEmotionBefore("");
    setMoodAfter(null);
    setEmotionAfter("");
    setLogId(null);
    setSaving(false);
  };

  return {
    phase, moodBefore, setMoodBefore, emotionBefore, setEmotionBefore,
    moodAfter, setMoodAfter, emotionAfter, setEmotionAfter,
    startExercise, finishExercise, completeTracking, reset, saving,
  };
}
