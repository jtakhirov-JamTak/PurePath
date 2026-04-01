import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FreeTextOrChipsProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  presets: string[];
  placeholder?: string;
}

export function FreeTextOrChips({
  label,
  value,
  onChange,
  presets,
  placeholder,
}: FreeTextOrChipsProps) {
  const [showPresets, setShowPresets] = useState(false);
  const isPresetSelected = presets.some(
    (p) => p.toLowerCase() === value.toLowerCase()
  );

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || `Type or choose below...`}
        className="text-sm"
      />
      {!showPresets && !isPresetSelected && (
        <button
          type="button"
          onClick={() => setShowPresets(true)}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          or choose from list
        </button>
      )}
      {(showPresets || isPresetSelected) && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => {
            const selected = preset.toLowerCase() === value.toLowerCase();
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  onChange(selected ? "" : preset);
                }}
                className={cn(
                  "px-3 py-1 rounded-full text-[11px] font-medium border transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border/60 hover:border-primary/50"
                )}
              >
                {preset}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
