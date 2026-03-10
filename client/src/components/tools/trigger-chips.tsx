import { useState } from "react";
import { cn } from "@/lib/utils";

// --- Chip option constants ---

export const APPRAISALS = [
  "Rejection", "Disrespect", "Failure", "Loss of control",
  "Being unseen", "Abandonment", "Shame", "Unfairness", "Overwhelm", "Other",
];

export const EMOTIONS = [
  "Anger", "Shame", "Fear", "Sadness",
  "Frustration", "Anxiety", "Disgust", "Hurt",
];

export const URGES = [
  "Yell/snap", "Withdraw", "Scroll/distract", "Eat/drink",
  "Shut down", "People-please", "Avoid", "Other",
];

export const ACTIONS = [
  "Acted on urge", "Paused then acted", "Contained it",
  "Used a tool", "Talked to someone", "Other",
];

export const BODY_STATES = [
  "Chest tightness", "Stomach drop", "Heat/flushing", "Jaw clenching",
  "Shallow breathing", "Numbness", "Trembling", "Nothing noticed",
];

export const RECOVERY_TIMES = [
  "Under 5 min", "5-15 min", "15-30 min",
  "30-60 min", "Over an hour", "Still not calm",
];

// --- Reusable chip component ---

export function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
        selected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
      )}
    >
      {label}
    </button>
  );
}

// --- Intensity dots (1-5) ---

export function IntensityDots({
  value,
  onChange,
  testIdPrefix,
}: {
  value: number | null;
  onChange: (n: number) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          data-testid={`${testIdPrefix}-${n}`}
          className={cn(
            "w-6 h-6 rounded-full border-2 transition-colors",
            value !== null && n <= value
              ? "bg-primary border-primary"
              : "bg-transparent border-border hover:border-primary/50"
          )}
          aria-label={`Intensity ${n}`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">
        {value ? `${value}/5` : ""}
      </span>
    </div>
  );
}

// --- Multi-select chip hook ---

export function useMultiChips(initial: string[] = []) {
  const [selected, setSelected] = useState<string[]>(initial);
  const toggle = (val: string) =>
    setSelected((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  return { selected, toggle, setSelected };
}
