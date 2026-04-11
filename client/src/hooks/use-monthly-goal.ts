import { useQuery } from "@tanstack/react-query";
import type { MonthlyGoal } from "@shared/schema";

/** Fetch monthly goal by month key (YYYY-MM).
 *  Deduplicates the raw-fetch pattern used across 4+ pages. */
export function useMonthlyGoal(monthKey: string, enabled = true) {
  return useQuery<MonthlyGoal>({
    queryKey: ["/api/monthly-goal", monthKey],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-goal?month=${monthKey}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!monthKey && enabled,
  });
}
