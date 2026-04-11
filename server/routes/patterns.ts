import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import { patternProfileSchema } from "../validation";
import { requireAccess, writeRateLimit } from "./helpers";

export function registerPatternRoutes(app: Express) {
  app.get("/api/pattern-profile", isAuthenticated, requireAccess, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getPatternProfile(userId);
      res.json(profile || {
        id: 0, userId, updatedAt: null,
        helpingPattern1Condition: "", helpingPattern1Behavior: "", helpingPattern1Impact: "", helpingPattern1Outcome: "",
        helpingPattern2Condition: "", helpingPattern2Behavior: "", helpingPattern2Impact: "", helpingPattern2Outcome: "",
        helpingPattern3Condition: "", helpingPattern3Behavior: "", helpingPattern3Impact: "", helpingPattern3Outcome: "",
        hurtingPattern1Condition: "", hurtingPattern1Behavior: "", hurtingPattern1Impact: "", hurtingPattern1Outcome: "",
        hurtingPattern2Condition: "", hurtingPattern2Behavior: "", hurtingPattern2Impact: "", hurtingPattern2Outcome: "",
        hurtingPattern3Condition: "", hurtingPattern3Behavior: "", hurtingPattern3Impact: "", hurtingPattern3Outcome: "",
        repeatingLoopStory: "", repeatingLoopAvoidance: "", repeatingLoopCost: "",
        repeatingLoopCommitment: "", repeatingLoopBehavior: "",
        triggerPatternTrigger: "", triggerPatternInterpretation: "", triggerPatternEmotion: "",
        triggerPatternUrge: "", triggerPatternBehavior: "", triggerPatternOutcome: "",
        blindSpot1Pattern: "", blindSpot1Outcome: "",
        blindSpot2Pattern: "", blindSpot2Outcome: "",
        blindSpot3Pattern: "", blindSpot3Outcome: "",
        hurtingPattern1Emotions: "", hurtingPattern1Environment: "",
        hurtingPattern2Emotions: "", hurtingPattern2Environment: "",
        hurtingPattern3Emotions: "", hurtingPattern3Environment: "",
        bestStateEmotions: "", bestStateEnvironments: "", bestStateExamplesJson: "",
      });
    } catch (error) {
      console.error("Error fetching pattern profile:", (error as Error).message);
      res.status(500).json({ error: "Failed to fetch pattern profile" });
    }
  });

  app.put("/api/pattern-profile", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const parsed = patternProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const d = parsed.data;
      const profile = await storage.upsertPatternProfile({
        userId,
        helpingPattern1Condition: d.helpingPattern1Condition ?? "",
        helpingPattern1Behavior: d.helpingPattern1Behavior ?? "",
        helpingPattern1Impact: d.helpingPattern1Impact ?? "",
        helpingPattern1Outcome: d.helpingPattern1Outcome ?? "",
        helpingPattern2Condition: d.helpingPattern2Condition ?? "",
        helpingPattern2Behavior: d.helpingPattern2Behavior ?? "",
        helpingPattern2Impact: d.helpingPattern2Impact ?? "",
        helpingPattern2Outcome: d.helpingPattern2Outcome ?? "",
        helpingPattern3Condition: d.helpingPattern3Condition ?? "",
        helpingPattern3Behavior: d.helpingPattern3Behavior ?? "",
        helpingPattern3Impact: d.helpingPattern3Impact ?? "",
        helpingPattern3Outcome: d.helpingPattern3Outcome ?? "",
        hurtingPattern1Condition: d.hurtingPattern1Condition ?? "",
        hurtingPattern1Behavior: d.hurtingPattern1Behavior ?? "",
        hurtingPattern1Impact: d.hurtingPattern1Impact ?? "",
        hurtingPattern1Outcome: d.hurtingPattern1Outcome ?? "",
        hurtingPattern2Condition: d.hurtingPattern2Condition ?? "",
        hurtingPattern2Behavior: d.hurtingPattern2Behavior ?? "",
        hurtingPattern2Impact: d.hurtingPattern2Impact ?? "",
        hurtingPattern2Outcome: d.hurtingPattern2Outcome ?? "",
        hurtingPattern3Condition: d.hurtingPattern3Condition ?? "",
        hurtingPattern3Behavior: d.hurtingPattern3Behavior ?? "",
        hurtingPattern3Impact: d.hurtingPattern3Impact ?? "",
        hurtingPattern3Outcome: d.hurtingPattern3Outcome ?? "",
        repeatingLoopStory: d.repeatingLoopStory ?? "",
        repeatingLoopAvoidance: d.repeatingLoopAvoidance ?? "",
        repeatingLoopCost: d.repeatingLoopCost ?? "",
        repeatingLoopCommitment: d.repeatingLoopCommitment ?? "",
        repeatingLoopBehavior: d.repeatingLoopBehavior ?? "",
        triggerPatternTrigger: d.triggerPatternTrigger ?? "",
        triggerPatternInterpretation: d.triggerPatternInterpretation ?? "",
        triggerPatternEmotion: d.triggerPatternEmotion ?? "",
        triggerPatternUrge: d.triggerPatternUrge ?? "",
        triggerPatternBehavior: d.triggerPatternBehavior ?? "",
        triggerPatternOutcome: d.triggerPatternOutcome ?? "",
        blindSpot1Pattern: d.blindSpot1Pattern ?? "",
        blindSpot1Outcome: d.blindSpot1Outcome ?? "",
        blindSpot2Pattern: d.blindSpot2Pattern ?? "",
        blindSpot2Outcome: d.blindSpot2Outcome ?? "",
        blindSpot3Pattern: d.blindSpot3Pattern ?? "",
        blindSpot3Outcome: d.blindSpot3Outcome ?? "",
        hurtingPattern1Emotions: d.hurtingPattern1Emotions ?? "",
        hurtingPattern1Environment: d.hurtingPattern1Environment ?? "",
        hurtingPattern2Emotions: d.hurtingPattern2Emotions ?? "",
        hurtingPattern2Environment: d.hurtingPattern2Environment ?? "",
        hurtingPattern3Emotions: d.hurtingPattern3Emotions ?? "",
        hurtingPattern3Environment: d.hurtingPattern3Environment ?? "",
        bestStateEmotions: d.bestStateEmotions ?? "",
        bestStateEnvironments: d.bestStateEnvironments ?? "",
        bestStateExamplesJson: d.bestStateExamplesJson ?? "",
      });
      res.json(profile);
    } catch (error) {
      console.error("Error saving pattern profile:", (error as Error).message);
      res.status(500).json({ error: "Failed to save pattern profile" });
    }
  });

  // PATCH /api/pattern-profile — partial update (merge with existing, only update provided fields)
  app.patch("/api/pattern-profile", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const parsed = patternProfileSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const existing = await storage.getPatternProfile(userId);
      // Default all fields to empty string so a first PATCH doesn't write NULLs
      const defaults: Record<string, string> = {};
      for (const key of Object.keys(patternProfileSchema.shape)) {
        defaults[key] = "";
      }
      const merged = { ...defaults, ...(existing || {}), ...parsed.data, userId };
      // Remove id and updatedAt — storage handles these
      delete (merged as any).id;
      delete (merged as any).updatedAt;
      const profile = await storage.upsertPatternProfile(merged);
      res.json(profile);
    } catch (error) {
      console.error("Error patching pattern profile:", (error as Error).message);
      res.status(500).json({ error: "Failed to update pattern profile" });
    }
  });
}
