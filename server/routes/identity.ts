import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import { visionBoardSchema, identityDocumentSchema } from "../validation";
import { requireAccess, writeRateLimit } from "./helpers";

export function registerIdentityRoutes(app: Express) {
  app.get("/api/identity-document", isAuthenticated, requireAccess, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const doc = await storage.getIdentityDocument(userId);
      res.json(doc || { userId, identity: "", vision: "", values: "", yearVision: "", yearVisualization: "", purpose: "", todayValue: "", todayIntention: "", todayReflection: "", visionDomain: "" });
    } catch (error) {
      console.error("Error fetching identity document:", (error as Error).message);
      res.status(500).json({ error: "Failed to fetch identity document" });
    }
  });

  app.put("/api/identity-document", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const parsed = identityDocumentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const d = parsed.data;
      const doc = await storage.upsertIdentityDocument({
        userId,
        identity: d.identity || "",
        vision: d.vision || "",
        values: d.values || "",
        yearVision: d.yearVision ?? "",
        yearVisualization: d.yearVisualization ?? "",
        purpose: d.purpose ?? "",
        todayValue: d.todayValue || "",
        todayIntention: d.todayIntention ?? "",
        todayReflection: d.todayReflection ?? "",
        visionBoardMain: d.visionBoardMain ?? "",
        visionBoardLeft: d.visionBoardLeft ?? "",
        visionBoardRight: d.visionBoardRight ?? "",
        othersWillSee: d.othersWillSee ?? "",
        // DEPRECATED fields (beYourself, strengths, helpingPatterns, hurtingPatterns, stressResponses) no longer written
        visionDomain: d.visionDomain ?? "",
      });
      res.json(doc);
    } catch (error) {
      console.error("Error saving identity document:", (error as Error).message);
      res.status(500).json({ error: "Failed to save identity document" });
    }
  });

  app.put("/api/vision-board", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const parsed = visionBoardSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const { slot, imageData } = parsed.data;
      const existing = await storage.getIdentityDocument(userId);
      const updates: any = {
        userId,
        identity: existing?.identity || "",
        vision: existing?.vision || "",
        values: existing?.values || "",
        yearVision: existing?.yearVision ?? "",
        yearVisualization: existing?.yearVisualization ?? "",
        purpose: existing?.purpose ?? "",
        todayValue: existing?.todayValue || "",
        todayIntention: existing?.todayIntention ?? "",
        todayReflection: existing?.todayReflection ?? "",
        visionBoardMain: existing?.visionBoardMain ?? "",
        visionBoardLeft: existing?.visionBoardLeft ?? "",
        visionBoardRight: existing?.visionBoardRight ?? "",
        othersWillSee: existing?.othersWillSee ?? "",
        // DEPRECATED fields (beYourself, strengths, etc.) no longer written
      };
      if (slot === "main") updates.visionBoardMain = imageData || "";
      if (slot === "left") updates.visionBoardLeft = imageData || "";
      if (slot === "right") updates.visionBoardRight = imageData || "";
      const doc = await storage.upsertIdentityDocument(updates);
      res.json({ success: true, slot });
    } catch (error) {
      console.error("Error saving vision board:", (error as Error).message);
      res.status(500).json({ error: "Failed to save vision board image" });
    }
  });

}
