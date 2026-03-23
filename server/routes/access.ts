import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";

const VALID_ACCESS_CODE = process.env.ACCESS_CODE || "";

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

  app.post("/api/verify-access-code", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { code, email } = req.body;

      if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "Access code is required" });
      }

      if (!email || typeof email !== "string" || !email.includes("@") || !email.includes(".")) {
        return res.status(400).json({ error: "A valid email is required" });
      }

      if (code.trim() !== VALID_ACCESS_CODE) {
        return res.status(403).json({ error: "Invalid access code" });
      }

      await storage.upsertUserSettings(userId, { hasAccess: true, personalEmail: email.trim().toLowerCase() });
      res.json({ success: true });
    } catch (error) {
      console.error("Error verifying access code:", error);
      res.status(500).json({ error: "Failed to verify access code" });
    }
  });
}
