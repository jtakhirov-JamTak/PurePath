import { useQuery } from "@tanstack/react-query";
import type { MonthlyGoal } from "@shared/schema";

export type Sprint = MonthlyGoal;

/** Active sprint or null when none exists. */
export function useActiveSprint(enabled = true) {
  return useQuery<Sprint | null>({
    queryKey: ["/api/goal-sprint"],
    queryFn: async () => {
      const res = await fetch("/api/goal-sprint", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch active sprint");
      return res.json();
    },
    enabled,
  });
}

/** All sprints for the user, newest first. */
export function useAllSprints(enabled = true) {
  return useQuery<Sprint[]>({
    queryKey: ["/api/goal-sprints"],
    queryFn: async () => {
      const res = await fetch("/api/goal-sprints", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sprints");
      return res.json();
    },
    enabled,
  });
}
