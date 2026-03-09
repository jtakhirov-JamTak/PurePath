import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EisenhowerEntry } from "@shared/schema";

function parseTimeEstimateMinutes(est: string | null | undefined): number | null {
  if (!est) return null;
  const lower = est.toLowerCase().trim();
  const hMatch = lower.match(/(\d+)\s*h/);
  const mMatch = lower.match(/(\d+)\s*m/);
  let total = 0;
  if (hMatch) total += parseInt(hMatch[1]) * 60;
  if (mMatch) total += parseInt(mMatch[1]);
  return total > 0 ? total : null;
}

export function formatTime24to12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const DELAY_REASONS = [
  "Low Capacity (sleep / fatigue / depleted)",
  "Distraction / Poor Environment",
  "Unexpected Interruption",
  "Overcommitted / Too Many Tasks",
  "Avoidance (emotion-driven)",
  "Forgot / No Cue",
  "Unclear Next Step",
  "Low Motivation / Value Disconnect",
  "Intentional Deprioritization",
  "Other",
];

const MINUTE_INCREMENTS = [15, 30, 45, 60, 75, 90, 105, 120];

export function Q2TimeTracker({ item, onSave }: {
  item: EisenhowerEntry;
  onSave: (fields: Record<string, unknown>) => void;
}) {
  const [onTime, setOnTime] = useState<boolean | null>(item.startedOnTime ?? null);
  const [delayMin, setDelayMin] = useState<number | null>(item.delayMinutes ?? null);
  const [delayRsn, setDelayRsn] = useState(item.delayReason || "");
  const [completedTime, setCompletedTime] = useState<boolean | null>(item.completedRequiredTime ?? null);
  const [shortMin, setShortMin] = useState<number | null>(item.timeShortMinutes ?? null);
  const [dirty, setDirty] = useState(false);

  const derivedMinutes = item.durationMinutes || parseTimeEstimateMinutes(item.timeEstimate);

  return (
    <div className="ml-14 space-y-2 py-1" data-testid={`q2-time-${item.id}`}>
      {item.scheduledStartTime && (
        <p className="text-[10px] text-muted-foreground">Scheduled: {item.scheduledStartTime}</p>
      )}
      {(derivedMinutes || item.timeEstimate) && (
        <p className="text-[10px] text-muted-foreground">Required: {derivedMinutes ? `${derivedMinutes} min` : item.timeEstimate}</p>
      )}
      <div>
        <label className="text-[10px] text-muted-foreground block mb-1">Did you start on time?</label>
        <div className="flex gap-1">
          <Button size="sm" variant={onTime === true ? "default" : "outline"} className="h-6 text-xs px-3"
            onClick={() => { setOnTime(true); setDelayMin(null); setDelayRsn(""); setDirty(true); }}
            data-testid={`q2-ontime-yes-${item.id}`}
          >Yes</Button>
          <Button size="sm" variant={onTime === false ? "destructive" : "outline"} className="h-6 text-xs px-3"
            onClick={() => { setOnTime(false); setDirty(true); }}
            data-testid={`q2-ontime-no-${item.id}`}
          >No</Button>
        </div>
      </div>
      {onTime === false && (
        <>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">How many minutes delay?</label>
            <Select value={delayMin != null ? String(delayMin) : ""} onValueChange={(v) => { setDelayMin(Number(v)); setDirty(true); }}>
              <SelectTrigger className="h-7 text-xs w-32" data-testid={`q2-delay-min-${item.id}`}>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {MINUTE_INCREMENTS.map(m => (
                  <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">Reason for delay?</label>
            <Select value={delayRsn} onValueChange={(v) => { setDelayRsn(v); setDirty(true); }}>
              <SelectTrigger className="h-7 text-xs" data-testid={`q2-delay-reason-${item.id}`}>
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {DELAY_REASONS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      <div>
        <label className="text-[10px] text-muted-foreground block mb-1">Did you complete required time?</label>
        <div className="flex gap-1">
          <Button size="sm" variant={completedTime === true ? "default" : "outline"} className="h-6 text-xs px-3"
            onClick={() => { setCompletedTime(true); setShortMin(null); setDirty(true); }}
            data-testid={`q2-completed-yes-${item.id}`}
          >Yes</Button>
          <Button size="sm" variant={completedTime === false ? "destructive" : "outline"} className="h-6 text-xs px-3"
            onClick={() => { setCompletedTime(false); setDirty(true); }}
            data-testid={`q2-completed-no-${item.id}`}
          >No</Button>
        </div>
      </div>
      {completedTime === false && (
        <div>
          <label className="text-[10px] text-muted-foreground block mb-1">How many minutes less?</label>
          <Select value={shortMin != null ? String(shortMin) : ""} onValueChange={(v) => { setShortMin(Number(v)); setDirty(true); }}>
            <SelectTrigger className="h-7 text-xs w-32" data-testid={`q2-short-min-${item.id}`}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {MINUTE_INCREMENTS.map(m => (
                <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {dirty && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => {
            onSave({
              startedOnTime: onTime,
              delayMinutes: onTime === false ? delayMin : null,
              delayReason: onTime === false ? (delayRsn || null) : null,
              completedRequiredTime: completedTime,
              timeShortMinutes: completedTime === false ? shortMin : null,
            });
            setDirty(false);
          }} data-testid={`q2-time-save-${item.id}`}>
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
