import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import { isAdmin } from "./helpers";
import { updateAccessSchema } from "../validation";

export function registerAdminRoutes(app: Express) {
  // Check if current user is admin (for frontend to show/hide admin UI)
  app.get("/api/admin/check", isAuthenticated, isAdmin, (_req: any, res: Response) => {
    res.json({ isAdmin: true });
  });

  // Get all users with access settings
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (_req: any, res: Response) => {
    try {
      const users = await storage.getAllUsersWithSettings();
      res.json(users);
    } catch {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Toggle user access
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
}
