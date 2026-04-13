import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import { createSprintSchema, closeSprintSchema, monthKeyParamSchema, flagActiveSprintReviewSchema } from "../validation";
import { requireAccess, writeRateLimit } from "./helpers";

export function registerSprintRoutes(app: Express) {
  // GET /api/goal-sprint — return active sprint
  app.get("/api/goal-sprint", isAuthenticated, requireAccess, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const sprint = await storage.getActiveSprint(userId);
      res.json(sprint || null);
    } catch (error) {
      console.error("Error fetching active sprint:", (error as Error).message);
      res.status(500).json({ error: "Failed to fetch sprint" });
    }
  });

  // GET /api/goal-sprints — return all sprints for user
  app.get("/api/goal-sprints", isAuthenticated, requireAccess, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const sprints = await storage.getMonthlyGoalsByUser(userId);
      res.json(sprints);
    } catch (error) {
      console.error("Error fetching sprints:", (error as Error).message);
      res.status(500).json({ error: "Failed to fetch sprints" });
    }
  });

  // POST /api/goal-sprint — create new sprint
  app.post("/api/goal-sprint", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const parsed = createSprintSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const d = parsed.data;

      // Use full startDate as monthKey to avoid collisions between sprints in the same month
      const monthKey = d.startDate; // YYYY-MM-DD

      // Only one active sprint per user. Block creation if any active sprint exists,
      // even if its monthKey matches today (an overwrite would silently destroy state).
      const existing = await storage.getActiveSprint(userId);
      if (existing) {
        return res.status(409).json({ error: "An active sprint already exists. Close it before creating a new one." });
      }

      const sprint = await storage.upsertMonthlyGoal({
        userId,
        monthKey,
        goalStatement: d.goalStatement,
        nextConcreteStep: "",
        sprintName: d.sprintName,
        startDate: d.startDate,
        endDate: d.endDate,
        confidenceCheck: d.confidenceCheck ?? null,
        ifThenPlan1: d.ifThenPlan1 ?? "",
        ifThenPlan2: d.ifThenPlan2 ?? "",
        sprintStatus: "active",
        closedAs: null,
        carryForwardCount: 0,
        milestone1Text: d.milestone1Text ?? null,
        milestone1TargetWeek: d.milestone1TargetWeek ?? null,
        milestone1Note: d.milestone1Note ?? null,
        milestone2Text: d.milestone2Text ?? null,
        milestone2TargetWeek: d.milestone2TargetWeek ?? null,
        milestone2Note: d.milestone2Note ?? null,
      });
      res.status(201).json(sprint);
    } catch (error) {
      console.error("Error creating sprint:", (error as Error).message);
      res.status(500).json({ error: "Failed to create sprint" });
    }
  });

  // POST /api/goal-sprint/:monthKey/close — close sprint (transactional)
  app.post("/api/goal-sprint/:monthKey/close", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      // Validate monthKey param
      const mkParsed = monthKeyParamSchema.safeParse(req.params.monthKey);
      if (!mkParsed.success) {
        return res.status(400).json({ error: "Invalid monthKey format" });
      }
      const parsed = closeSprintSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const monthKey = mkParsed.data;
      const { closedAs } = parsed.data;

      // Validate carry forward limit
      if (closedAs === "carry_forward") {
        const existing = await storage.getMonthlyGoal(userId, monthKey);
        if (existing && (existing.carryForwardCount ?? 0) >= 1) {
          return res.status(400).json({ error: "Sprint has already been carried forward once. Must End or Promote." });
        }
      }

      // closeSprint is transactional: updates sprint status + archives/promotes habit
      const sprint = await storage.closeSprint(userId, monthKey, closedAs);
      if (!sprint) {
        return res.status(404).json({ error: "Active sprint not found" });
      }

      res.json(sprint);
    } catch (error) {
      console.error("Error closing sprint:", (error as Error).message);
      res.status(500).json({ error: "Failed to close sprint" });
    }
  });

  // PATCH /api/goal-sprint/flag-review — flag the active sprint for review
  app.patch("/api/goal-sprint/flag-review", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const parsed = flagActiveSprintReviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const sprint = await storage.getActiveSprint(userId);
      if (!sprint) {
        return res.status(404).json({ error: "No active sprint to flag" });
      }
      const flagged = await storage.flagMonthlyGoalForReview(userId, sprint.monthKey, parsed.data.reason);
      if (!flagged) {
        return res.status(404).json({ error: "Active sprint not found" });
      }
      res.json(flagged);
    } catch (error) {
      console.error("Error flagging sprint for review:", (error as Error).message);
      res.status(500).json({ error: "Failed to flag sprint for review" });
    }
  });

  // GET /api/sprint/compact-summary — compact analytics for sprint close
  app.get("/api/sprint/compact-summary", isAuthenticated, requireAccess, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const from = req.query.from as string;
      const to = req.query.to as string;

      if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return res.status(400).json({ error: "from and to must be valid YYYY-MM-DD dates" });
      }

      // Find sprint and annual habit IDs
      const annual = await storage.getActiveAnnualCommitment(userId);
      const allHabits = await storage.getHabitsByUser(userId);
      const sprintHabit = allHabits.find(h => h.source === "sprint" && h.active);
      const annualHabitId = annual?.weeklyProofBehaviorHabitId ?? null;

      const summary = await storage.getCompactSprintSummary(
        userId, from, to,
        sprintHabit?.id ?? null,
        annualHabitId
      );

      res.json(summary);
    } catch (error) {
      console.error("Error fetching sprint summary:", (error as Error).message);
      res.status(500).json({ error: "Failed to fetch sprint summary" });
    }
  });
}
