import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import { createAnnualCommitmentSchema, updateAnnualCommitmentSchema } from "../validation";
import { parseId, requireAccess, writeRateLimit } from "./helpers";

export function registerAnnualCommitmentRoutes(app: Express) {
  // GET /api/annual-commitment — return active commitment for user
  app.get("/api/annual-commitment", isAuthenticated, requireAccess, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const commitment = await storage.getActiveAnnualCommitment(userId);
      res.json(commitment || null);
    } catch (error) {
      console.error("Error fetching annual commitment:", (error as Error).message);
      res.status(500).json({ error: "Failed to fetch annual commitment" });
    }
  });

  // POST /api/annual-commitment — deactivate previous, create new
  app.post("/api/annual-commitment", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const parsed = createAnnualCommitmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      // createAnnualCommitment is transactional: deactivates previous + creates new atomically
      const commitment = await storage.createAnnualCommitment({ userId, ...parsed.data, isActive: true });
      // Rule 2: Auto-flag sprint review if confidence < 7
      if (commitment.confidenceCheck != null && commitment.confidenceCheck < 7) {
        const sprint = await storage.getActiveSprint(userId);
        if (sprint) {
          await storage.flagMonthlyGoalForReview(userId, sprint.monthKey,
            `Confidence check is ${commitment.confidenceCheck}/10`);
        }
      }
      res.json(commitment);
    } catch (error) {
      console.error("Error creating annual commitment:", (error as Error).message);
      res.status(500).json({ error: "Failed to create annual commitment" });
    }
  });

  // PUT /api/annual-commitment/:id — update
  app.put("/api/annual-commitment/:id", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const parsed = updateAnnualCommitmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const id = parseId(req.params.id);
      if (!id) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      const commitment = await storage.updateAnnualCommitment(userId, id, parsed.data);
      if (!commitment) {
        return res.status(404).json({ error: "Annual commitment not found" });
      }
      // Rule 2: Auto-flag sprint review if confidence < 7
      if (commitment.confidenceCheck != null && commitment.confidenceCheck < 7) {
        const sprint = await storage.getActiveSprint(userId);
        if (sprint) {
          await storage.flagMonthlyGoalForReview(userId, sprint.monthKey,
            `Confidence check dropped to ${commitment.confidenceCheck}/10`);
        }
      }
      res.json(commitment);
    } catch (error) {
      console.error("Error updating annual commitment:", (error as Error).message);
      res.status(500).json({ error: "Failed to update annual commitment" });
    }
  });
}
