import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";

export function registerAccessRoutes(app: Express) {
  app.get("/api/access-status", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getUserSettings(userId);
      res.json({ hasAccess: settings?.hasAccess === true });
    } catch (error) {
      console.error("Error checking access:", error);
      res.status(500).json({ error: "Failed to check access" });
    }
  });
}
