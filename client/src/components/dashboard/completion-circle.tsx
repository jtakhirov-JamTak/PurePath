import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface CompletionCircleProps {
  done: boolean;
  onToggle: () => void;
  disabled?: boolean;
  testId?: string;
}

export function CompletionCircle({ done, onToggle, disabled, testId }: CompletionCircleProps) {
  // Track toggles so the spring animation only fires on actual state changes, not re-renders
  const [animKey, setAnimKey] = useState(0);
  const prevDone = useRef(done);
  useEffect(() => {
    if (done !== prevDone.current) {
      setAnimKey(k => k + 1);
      prevDone.current = done;
    }
  }, [done]);

  return (
    <motion.button
      key={animKey}
      onClick={disabled ? undefined : onToggle}
      whileTap={disabled ? undefined : { scale: 0.85 }}
      animate={done && animKey > 0 ? { scale: [0.95, 1.05, 1] } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className={`h-[22px] w-[22px] rounded-[4px] border shrink-0 flex items-center justify-center transition-colors ${
        disabled ? "cursor-default opacity-50" : "cursor-pointer"
      } ${
        done
          ? "bg-primary border-primary"
          : "border-border bg-background"
      }`}
      data-testid={testId}
    >
      {done && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
    </motion.button>
  );
}
