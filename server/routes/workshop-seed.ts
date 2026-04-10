import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import { createWorkshopSeedSchema } from "../validation";
import { requireAccess, writeRateLimit } from "./helpers";

export function registerWorkshopSeedRoutes(app: Express) {
  // GET /api/workshop-seed — return seed for authenticated user
  app.get("/api/workshop-seed", isAuthenticated, requireAccess, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const seed = await storage.getWorkshopSeed(userId);
      res.json(seed || null);
    } catch (error) {
      console.error("Error fetching workshop seed:", (error as Error).message);
      res.status(500).json({ error: "Failed to fetch workshop seed" });
    }
  });

  // POST /api/workshop-seed — create (one-time, reject if exists)
  app.post("/api/workshop-seed", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const parsed = createWorkshopSeedSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const existing = await storage.getWorkshopSeed(userId);
      if (existing) {
        return res.status(409).json({ error: "Workshop seed already exists" });
      }
      const seed = await storage.createWorkshopSeed({ userId, ...parsed.data });
      res.json(seed);
    } catch (error) {
      console.error("Error creating workshop seed:", (error as Error).message);
      res.status(500).json({ error: "Failed to create workshop seed" });
    }
  });
}
