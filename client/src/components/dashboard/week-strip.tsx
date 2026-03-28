import { useMemo } from "react";
import { format, addDays } from "date-fns";
import type { EisenhowerEntry } from "@shared/schema";
import { CATEGORY_COLORS } from "@/lib/constants";
import { getWeekFocusItems } from "@/lib/eisenhower-filters";

interface WeekStripProps {
  weekStartDate: Date;
  todayStr: string;
  selectedDateStr: string;
  eisenhowerEntries: EisenhowerEntry[];
  weekStartStr: string;
  onSelectDate: (dateStr: string) => void;
}

export function WeekStrip({
  weekStartDate,
  todayStr,
  selectedDateStr,
  eisenhowerEntries,
  weekStartStr,
  onSelectDate,
}: WeekStripProps) {
  const weekDays = useMemo(() => {
    const focusItems = getWeekFocusItems(eisenhowerEntries, weekStartStr);
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStartDate, i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayLabel = format(date, "EEE");
      const dayNum = format(date, "d");
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedDateStr;
      const isFuture = dateStr > todayStr;

      // Items scheduled for this day (has scheduledDate matching) OR unscheduled items (show on all days? no — only on today)
      const dayItems = focusItems.filter((e) => e.scheduledDate === dateStr);

      // Collect unique category dots for this day
      const categories = Array.from(
        new Set(dayItems.map((e) => e.category || "growth"))
      );

      // Count completed vs total for this day
      const completedCount = dayItems.filter(
        (e) => e.status === "completed"
      ).length;
      const allDone = dayItems.length > 0 && completedCount === dayItems.length;

      return { dateStr, dayLabel, dayNum, isToday, isSelected, isFuture, categories, itemCount: dayItems.length, allDone };
    });
  }, [weekStartDate, todayStr, selectedDateStr, eisenhowerEntries, weekStartStr]);

  return (
    <div data-testid="week-strip">
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <button
            key={day.dateStr}
            onClick={() => onSelectDate(day.dateStr)}
            className={`flex flex-col items-center py-1.5 px-0.5 rounded-lg cursor-pointer transition-colors ${
              day.isSelected
                ? "bg-primary/10 ring-1 ring-primary"
                : day.isToday
                  ? "bg-bark/5"
                  : "hover:bg-muted/50"
            }`}
            data-testid={`week-day-${day.dateStr}`}
          >
            <span className={`text-[10px] font-medium ${
              day.isToday ? "text-primary" : day.isFuture ? "text-muted-foreground/40" : "text-muted-foreground"
            }`}>
              {day.dayLabel}
            </span>
            <span className={`text-xs font-semibold mt-0.5 ${
              day.isSelected ? "text-primary" : day.isToday ? "text-foreground" : day.isFuture ? "text-muted-foreground/40" : "text-foreground"
            }`}>
              {day.dayNum}
            </span>
            {/* Category dots */}
            <div className="flex gap-0.5 mt-1 min-h-[6px]">
              {day.categories.slice(0, 4).map((cat) => (
                <span
                  key={cat}
                  className={`h-1.5 w-1.5 rounded-full ${
                    day.allDone
                      ? "bg-emerald-500/40"
                      : CATEGORY_COLORS[cat] || "bg-blue-500"
                  }`}
                />
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
