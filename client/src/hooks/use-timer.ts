import { useState, useEffect, useCallback, useRef } from "react";

interface TimerState {
  seconds: number;
  isRunning: boolean;
  totalSeconds: number;
  isComplete: boolean;
}

function playBeepAlarm() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playBeep = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playBeep(880, now, 0.15);
    playBeep(880, now + 0.2, 0.15);
    playBeep(1100, now + 0.45, 0.3);
  } catch (_) {}
}

export function useTimer(defaultDuration: number) {
  const [state, setState] = useState<TimerState>({
    seconds: defaultDuration,
    isRunning: false,
    totalSeconds: defaultDuration,
    isComplete: false,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const unlockAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        const buffer = audioCtxRef.current.createBuffer(1, 1, 22050);
        const source = audioCtxRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtxRef.current.destination);
        source.start(0);
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    if (state.isRunning && state.seconds > 0) {
      intervalRef.current = setInterval(() => {
        setState(prev => {
          if (prev.seconds <= 1) {
            playBeepAlarm();
            return { ...prev, seconds: 0, isRunning: false, isComplete: true };
          }
          return { ...prev, seconds: prev.seconds - 1 };
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isRunning, state.seconds]);

  const start = useCallback(() => {
    unlockAudio();
    setState(prev => ({ ...prev, isRunning: true, isComplete: false }));
  }, [unlockAudio]);

  const pause = useCallback(() => setState(prev => ({ ...prev, isRunning: false })), []);

  const reset = useCallback(() => setState(prev => ({
    ...prev,
    seconds: prev.totalSeconds,
    isRunning: false,
    isComplete: false,
  })), []);

  const setDuration = useCallback((d: number) => setState({
    seconds: d,
    isRunning: false,
    totalSeconds: d,
    isComplete: false,
  }), []);

  const addTime = useCallback((extra: number) => setState(prev => ({
    ...prev,
    seconds: prev.seconds + extra,
    totalSeconds: prev.totalSeconds + extra,
    isComplete: false,
  })), []);

  const progress = state.totalSeconds > 0 ? ((state.totalSeconds - state.seconds) / state.totalSeconds) * 100 : 0;

  return { ...state, progress, start, pause, reset, setDuration, addTime };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
