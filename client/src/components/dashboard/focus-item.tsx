import { useState, useRef, useEffect, useMemo } from "react";
import { Zap, Target, Pencil, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { EisenhowerEntry } from "@shared/schema";
import { fmtTime } from "@/lib/format";
import { getCompletionLabel, getFocusBoxClass, getNextFocusLevel } from "@/lib/completion";
import { CATEGORY_COLORS, CATEGORY_LABELS, CATEGORY_BADGE, QUADRANT_BORDER, QUADRANT_BG_UNDONE, QUADRANT_ICON_COLOR } from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";

interface FocusItemProps {
  item: EisenhowerEntry;
  weekStartDate: Date;
  onCycleLevel: (id: number, level: number | null, isBinary?: boolean) => void;
}

const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const totalMinutes = 8 * 60 + i * 30;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const label = `${h12}:${String(m).padStart(2, "0")}${h >= 12 ? "p" : "a"}`;
  return { value: `${hh}:${mm}`, label };
});

export function FocusItem({ item, weekStartDate, onCycleLevel }: FocusItemProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [editPanel, setEditPanel] = useState(false);
  const [nameValue, setNameValue] = useState(item.task);
  const [saving, setSaving] = useState(false);
  const [popKey, setPopKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const savingNameRef = useRef(false);

  const dayOptions = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStartDate, i);
      return { value: format(d, "yyyy-MM-dd"), label: format(d, "EEE d") };
    }),
  [weekStartDate]);

  useEffect(() => {
    if (editingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingName]);

  const savePatch = async (body: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await apiRequest("PATCH", `/api/eisenhower/${item.id}`, body);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/eisenhower"] });
    } catch (e: unknown) {
      toast({ title: "Could not update", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveNameEdit = () => {
    if (savingNameRef.current) return;
    savingNameRef.current = true;
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== item.task) {
      savePatch({ task: trimmed });
    }
    setEditingName(false);
    setTimeout(() => { savingNameRef.current = false; }, 0);
  };

  const isBin = item.isBinary || false;
  const lvl = item.completionLevel ?? null;
  const boxLabel = getCompletionLabel(lvl, isBin);
  const boxClass = getFocusBoxClass(lvl, isBin);

  const isUndone = item.status !== "completed" && item.status !== "skipped";
  const quadrant = item.quadrant || "q1";
  const borderClass = QUADRANT_BORDER[quadrant] || "";
  const bgClass = isUndone ? (QUADRANT_BG_UNDONE[quadrant] || "") : "";

  return (
    <div data-testid={`focus-item-${item.id}`} className={`border-l-2 rounded-r pl-2 transition-all duration-200 ${borderClass} ${bgClass} ${item.status === "skipped" ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-2 py-1.5">
        <button
          key={popKey}
          onClick={() => {
            setPopKey(k => k + 1);
            const nextLevel = getNextFocusLevel(lvl, isBin);
            onCycleLevel(item.id, nextLevel, isBin || undefined);
          }}
          className={`h-5 w-12 text-[10px] rounded-md border-2 shrink-0 font-medium cursor-pointer ${popKey > 0 ? "animate-tap-pop" : ""} ${boxClass}`}
          data-testid={`focus-level-${item.id}`}
        >
          {boxLabel}
        </button>
        {item.quadrant === "q1"
          ? <Zap className={`h-3 w-3 ${QUADRANT_ICON_COLOR.q1} shrink-0`} />
          : <Target className={`h-3 w-3 ${QUADRANT_ICON_COLOR.q2} shrink-0`} />
        }
        {item.category && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${CATEGORY_BADGE[item.category] || "bg-muted text-muted-foreground"}`}>
            {CATEGORY_LABELS[item.category] || item.category}
          </span>
        )}
        {editingName ? (
          <input
            ref={inputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={saveNameEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveNameEdit();
              if (e.key === "Escape") { setNameValue(item.task); setEditingName(false); }
            }}
            className="text-xs flex-1 bg-transparent border-b border-primary outline-none py-0"
            data-testid={`focus-name-input-${item.id}`}
          />
        ) : (
          <button
            onClick={() => { setNameValue(item.task); setEditingName(true); }}
            className={`text-xs flex-1 text-left cursor-text ${
              item.status === "completed" ? "line-through text-muted-foreground"
              : item.status === "skipped" ? "text-muted-foreground italic"
              : ""
            }`}
            data-testid={`focus-name-${item.id}`}
          >
            {item.task}
          </button>
        )}
        {item.scheduledStartTime && !editingName && (
          <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
            {fmtTime(item.scheduledStartTime)}{item.scheduledEndTime ? `–${fmtTime(item.scheduledEndTime)}` : ""}
          </span>
        )}
        <button
          onClick={() => setEditPanel(!editPanel)}
          className={`p-0.5 rounded shrink-0 cursor-pointer ${editPanel ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground"}`}
          data-testid={`focus-edit-toggle-${item.id}`}
        >
          {editPanel ? <X className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
        </button>
      </div>

      {/* Inline edit panel — slides in */}
      <AnimatePresence>
        {editPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="ml-14 mb-2 flex flex-wrap gap-2 items-center" data-testid={`focus-edit-panel-${item.id}`}>
              <select
                value={item.scheduledDate || ""}
                onChange={(e) => savePatch({ scheduledDate: e.target.value || null })}
                className="text-[10px] bg-muted rounded px-1.5 py-1 border-0 outline-none"
                disabled={saving}
              >
                <option value="">No day</option>
                {dayOptions.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              <select
                value={item.scheduledStartTime || ""}
                onChange={(e) => savePatch({ scheduledStartTime: e.target.value || null })}
                className="text-[10px] bg-muted rounded px-1.5 py-1 border-0 outline-none"
                disabled={saving}
              >
                <option value="">Start</option>
                {TIME_SLOTS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <select
                value={item.scheduledEndTime || ""}
                onChange={(e) => savePatch({ scheduledEndTime: e.target.value || null })}
                className="text-[10px] bg-muted rounded px-1.5 py-1 border-0 outline-none"
                disabled={saving}
              >
                <option value="">End</option>
                {TIME_SLOTS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <div className="flex gap-0.5">
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => savePatch({ category: key })}
                    className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${
                      item.category === key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                    disabled={saving}
                    title={label}
                  >
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${CATEGORY_COLORS[key]}`} />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
