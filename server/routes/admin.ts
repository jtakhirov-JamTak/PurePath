import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import { isAdmin } from "./helpers";
import { updateAccessSchema, updateCohortSchema, batchAccessSchema } from "../validation";

export function registerAdminRoutes(app: Express) {
  // Check if current user is admin (for frontend to show/hide admin UI)
  app.get("/api/admin/check", isAuthenticated, isAdmin, (_req: any, res: Response) => {
    res.json({ isAdmin: true });
  });

  // Get all users with stats
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (_req: any, res: Response) => {
    try {
      const users = await storage.getAllUsersWithStats();
      res.json(users);
    } catch {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get 30-day activity dates for a user (heatmap)
  app.get("/api/admin/users/:userId/activity", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    const { userId } = req.params;
    const endDate = new Date().toISOString().slice(0, 10);
    const start = new Date();
    start.setDate(start.getDate() - 30);
    const startDate = start.toISOString().slice(0, 10);

    try {
      const dates = await storage.getUserActivityDates(userId, startDate, endDate);
      res.json({ userId, activeDates: dates });
    } catch {
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });

  // Batch grant/revoke access (register BEFORE :userId/access)
  app.patch("/api/admin/users/batch-access", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    const parsed = batchAccessSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const adminUserId = req.user?.claims?.sub;
    const filtered = parsed.data.userIds.filter(id => id !== adminUserId);

    try {
      await storage.batchUpdateAccess(filtered, parsed.data.hasAccess);
      res.json({ updated: filtered.length });
    } catch {
      res.status(500).json({ error: "Failed to batch update access" });
    }
  });

  // Toggle single user access
  app.patch("/api/admin/users/:userId/access", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    const parsed = updateAccessSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { userId } = req.params;
    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "Invalid userId" });
    }

    const adminUserId = req.user?.claims?.sub;
    if (userId === adminUserId) {
      return res.status(400).json({ error: "Cannot change your own access" });
    }

    try {
      const settings = await storage.upsertUserSettings(userId, { hasAccess: parsed.data.hasAccess });
      res.json({ userId, hasAccess: settings.hasAccess });
    } catch {
      res.status(500).json({ error: "Failed to update access" });
    }
  });

  // Assign cohort to user
  app.patch("/api/admin/users/:userId/cohort", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    const parsed = updateCohortSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { userId } = req.params;
    try {
      const settings = await storage.upsertUserSettings(userId, { cohort: parsed.data.cohort });
      res.json({ userId, cohort: settings.cohort });
    } catch {
      res.status(500).json({ error: "Failed to update cohort" });
    }
  });
}
