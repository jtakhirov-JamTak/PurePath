import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import { HABIT_CATEGORIES } from "@shared/schema";
import { createHabitSchema, updateHabitSchema, createHabitCompletionSchema, reorderSchema } from "../validation";
import { parseId, parseDateParam } from "./helpers";

export function registerHabitRoutes(app: Express) {
  app.get("/api/habits", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const habits = await storage.getHabitsByUser(userId);
      res.json(habits);
    } catch (error) {
      console.error("Error fetching habits:", error);
      res.status(500).json({ error: "Failed to fetch habits" });
    }
  });

  app.post("/api/habits", isAuthenticated, async (req: any, res: Response) => {
    try {
      const parsed = createHabitSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      
      const existing = await storage.getHabitsByUser(userId);
      const activeHabits = existing.filter(h => h.active);

      if (activeHabits.length >= 3) {
        return res.status(400).json({ error: "Maximum 3 active habits allowed" });
      }

      const name = parsed.data.name;
      if (!name) {
        return res.status(400).json({ error: "Habit name is required" });
      }
      const duplicate = activeHabits.find(h => h.name.toLowerCase() === name.toLowerCase());
      if (duplicate) {
        return res.status(409).json({ error: `You already have an active habit named "${duplicate.name}"` });
      }

      const { category, ...rest } = parsed.data;
      const validCategory = category && category in HABIT_CATEGORIES ? category : "health";
      const habit = await storage.createHabit({
        userId,
        category: validCategory,
        ...rest,
        name,
        cadence: rest.cadence || "mon,tue,wed,thu,fri,sat,sun",
      });
      res.json(habit);
    } catch (error) {
      console.error("Error creating habit:", error);
      res.status(500).json({ error: "Failed to create habit" });
    }
  });

  app.patch("/api/habits/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid ID" });
      const existing = await storage.getHabitsByUser(userId);
      const record = existing.find(r => r.id === id);
      if (!record) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const parsedBody = updateHabitSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ error: parsedBody.error.issues[0].message });
      }
      const habit = await storage.updateHabit(id, parsedBody.data);
      res.json(habit);
    } catch (error) {
      console.error("Error updating habit:", error);
      res.status(500).json({ error: "Failed to update habit" });
    }
  });

  app.delete("/api/habits/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid ID" });
      const existing = await storage.getHabitsByUser(userId);
      const record = existing.find(r => r.id === id);
      if (!record) {
        return res.status(403).json({ error: "Not authorized" });
      }
      await storage.deleteHabit(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting habit:", error);
      res.status(500).json({ error: "Failed to delete habit" });
    }
  });

  app.post("/api/habits/reorder", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = reorderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const items = parsed.data.items;
      const existing = await storage.getHabitsByUser(userId);
      const existingIds = new Set(existing.map(h => h.id));
      for (const item of items) {
        if (typeof item.id !== "number" || typeof item.sortOrder !== "number") continue;
        if (!existingIds.has(item.id)) continue;
        const updates: any = { sortOrder: item.sortOrder };
        if (item.timing && ["morning", "afternoon", "evening"].includes(item.timing)) {
          updates.timing = item.timing;
        }
        await storage.updateHabit(item.id, updates);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering habits:", error);
      res.status(500).json({ error: "Failed to reorder habits" });
    }
  });

  app.get("/api/habit-completions/range/:startDate/:endDate", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.params;
      const completions = await storage.getHabitCompletionsForRange(userId, startDate, endDate);
      res.json(completions);
    } catch (error) {
      console.error("Error fetching habit completions range:", error);
      res.status(500).json({ error: "Failed to fetch habit completions" });
    }
  });

  app.get("/api/habit-completions/:date", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { date } = req.params;
      const completions = await storage.getHabitCompletionsForDate(userId, date);
      res.json(completions);
    } catch (error) {
      console.error("Error fetching habit completions:", error);
      res.status(500).json({ error: "Failed to fetch habit completions" });
    }
  });

  app.post("/api/habit-completions", isAuthenticated, async (req: any, res: Response) => {
    try {
      const parsed = createHabitCompletionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const { habitId, date, status, completionLevel, skipReason } = parsed.data;
      const validStatus = status === "skipped" ? "skipped" : status === "minimum" ? "minimum" : "completed";
      const userHabits = await storage.getHabitsByUser(userId);
      if (!userHabits.some(h => h.id === habitId)) {
        return res.status(403).json({ error: "Habit not found" });
      }
      const completion = await storage.createHabitCompletion({ userId, habitId, date, status: validStatus, completionLevel: completionLevel ?? null, skipReason: skipReason ?? null });
      res.json(completion);
    } catch (error: any) {
      if (error?.code === "23505") {
        return res.status(409).json({ error: "Already completed" });
      }
      console.error("Error creating habit completion:", error);
      res.status(500).json({ error: "Failed to create habit completion" });
    }
  });

  app.patch("/api/habit-completions/:habitId/:date", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { habitId, date } = req.params;
      const { status, completionLevel, skipReason } = req.body;
      const validStatus = status === "skipped" ? "skipped" : status === "minimum" ? "minimum" : "completed";
      await storage.updateHabitCompletionFull(userId, parseInt(habitId), date, {
        status: validStatus,
        completionLevel: completionLevel ?? null,
        skipReason: skipReason ?? null,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating habit completion:", error);
      res.status(500).json({ error: "Failed to update habit completion" });
    }
  });

  app.delete("/api/habit-completions/:habitId/:date", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { habitId, date } = req.params;
      await storage.deleteHabitCompletion(userId, parseInt(habitId), date);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting habit completion:", error);
      res.status(500).json({ error: "Failed to delete habit completion" });
    }
  });
}
