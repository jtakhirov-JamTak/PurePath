import { useState, useEffect, useRef } from "react";

/** Returns true for 1.2s when allDone transitions false→true. Resets immediately on true→false. */
export function useCelebrationBeat(allDone: boolean): boolean {
  const [celebrating, setCelebrating] = useState(false);
  const prevDone = useRef(allDone);
  const mounted = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; prevDone.current = allDone; return; }
    if (allDone && !prevDone.current) {
      setCelebrating(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCelebrating(false), 1200);
    } else if (!allDone) {
      setCelebrating(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    prevDone.current = allDone;
  }, [allDone]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  return celebrating;
}
