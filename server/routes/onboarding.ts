import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import { updateOnboardingSchema } from "../validation";
import { requireAccess } from "./helpers";

export function registerOnboardingRoutes(app: Express) {
  app.get("/api/onboarding", isAuthenticated, requireAccess, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getUserSettings(userId);
      if (!settings) {
        return res.json({ onboardingStep: 0, onboardingComplete: false });
      }
      return res.json({
        onboardingStep: settings.onboardingStep,
        onboardingComplete: settings.onboardingComplete,
      });
    } catch (error: any) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/onboarding", isAuthenticated, requireAccess, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = updateOnboardingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const { step } = parsed.data;
      const updates: { onboardingStep: number; onboardingComplete?: boolean } = {
        onboardingStep: step,
      };
      if (step >= 5) {
        updates.onboardingComplete = true;
      }
      const settings = await storage.upsertUserSettings(userId, updates);
      return res.json({
        onboardingStep: settings.onboardingStep,
        onboardingComplete: settings.onboardingComplete,
      });
    } catch (error: any) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });
}
