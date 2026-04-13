import { useQuery } from "@tanstack/react-query";
import type { MonthlyGoal } from "@shared/schema";

export type Sprint = MonthlyGoal;

/** Active sprint or null when none exists. */
export function useActiveSprint(enabled = true) {
  return useQuery<Sprint | null>({
    queryKey: ["/api/goal-sprint"],
    enabled,
  });
}
