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

  // POST /api/workshop-seed/generate — server assembles seed from existing user data
  app.post("/api/workshop-seed/generate", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;

      const existing = await storage.getWorkshopSeed(userId);
      if (existing) {
        return res.status(409).json({ error: "Workshop seed already exists" });
      }

      const [identityDoc, patternProfile] = await Promise.all([
        storage.getIdentityDocument(userId),
        storage.getPatternProfile(userId),
      ]);

      const seedData: Record<string, string | null> = {
        source: "onboarding",
        identityStatement: identityDoc?.identity || null,
        valuesJson: identityDoc?.values || null,
        vision: identityDoc?.vision || null,
        purpose: identityDoc?.purpose || null,
        acceptanceTruth: identityDoc?.acceptanceTruth || null,
      };

      if (patternProfile) {
        const packPatterns = (prefix: string, count: number) =>
          Array.from({ length: count }, (_, i) => {
            const n = i + 1;
            const p = patternProfile as Record<string, any>;
            return {
              condition: p[`${prefix}${n}Condition`] || "",
              behavior: p[`${prefix}${n}Behavior`] || "",
              impact: p[`${prefix}${n}Impact`] || "",
              outcome: p[`${prefix}${n}Outcome`] || "",
            };
          }).filter(p => p.condition || p.behavior);

        const success = packPatterns("helpingPattern", 3);
        if (success.length) seedData.successPatternsJson = JSON.stringify(success);

        const shadow = Array.from({ length: 3 }, (_, i) => {
          const n = i + 1;
          const p = patternProfile as Record<string, any>;
          return {
            condition: p[`hurtingPattern${n}Condition`] || "",
            behavior: p[`hurtingPattern${n}Behavior`] || "",
            impact: p[`hurtingPattern${n}Impact`] || "",
            outcome: p[`hurtingPattern${n}Outcome`] || "",
            emotions: p[`hurtingPattern${n}Emotions`] || "",
            environment: p[`hurtingPattern${n}Environment`] || "",
          };
        }).filter(p => p.condition || p.behavior || p.emotions);
        if (shadow.length) seedData.shadowPatternsJson = JSON.stringify(shadow);

        if (patternProfile.triggerPatternTrigger || patternProfile.triggerPatternBehavior) {
          seedData.triggerPatternJson = JSON.stringify({
            trigger: patternProfile.triggerPatternTrigger || "",
            interpretation: patternProfile.triggerPatternInterpretation || "",
            emotion: patternProfile.triggerPatternEmotion || "",
            urge: patternProfile.triggerPatternUrge || "",
            behavior: patternProfile.triggerPatternBehavior || "",
            outcome: patternProfile.triggerPatternOutcome || "",
          });
        }

        if (patternProfile.repeatingLoopStory || patternProfile.repeatingLoopAvoidance) {
          seedData.avoidanceLoopJson = JSON.stringify({
            story: patternProfile.repeatingLoopStory || "",
            avoidance: patternProfile.repeatingLoopAvoidance || "",
            cost: patternProfile.repeatingLoopCost || "",
            commitment: patternProfile.repeatingLoopCommitment || "",
            behavior: patternProfile.repeatingLoopBehavior || "",
          });
        }

        const blindSpots = Array.from({ length: 3 }, (_, i) => {
          const n = i + 1;
          const p = patternProfile as Record<string, any>;
          return { pattern: p[`blindSpot${n}Pattern`] || "", outcome: p[`blindSpot${n}Outcome`] || "" };
        }).filter(b => b.pattern);
        if (blindSpots.length) seedData.blindSpotsJson = JSON.stringify(blindSpots);

        if (patternProfile.bestStateExamplesJson || patternProfile.bestStateEmotions) {
          seedData.bestStateCalibrationJson = JSON.stringify({
            emotions: patternProfile.bestStateEmotions || "",
            environments: patternProfile.bestStateEnvironments || "",
            examples: patternProfile.bestStateExamplesJson || "",
          });
        }
      }

      const seed = await storage.createWorkshopSeed({ userId, ...seedData });
      res.json(seed);
    } catch (error) {
      console.error("Error generating workshop seed:", (error as Error).message);
      res.status(500).json({ error: "Failed to generate workshop seed" });
    }
  });
}
