import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import {
  createToolUsageSchema, updateToolUsageSchema,
  createTriggerLogSchema, createAvoidanceLogSchema, createDecisionSchema,
} from "../validation";
import { parseId, parseMondayParam, csvEscape, exportRateLimit, writeRateLimit } from "./helpers";

export function registerToolRoutes(app: Express) {
  app.get("/api/tool-usage", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      let logs;
      if (startDate && endDate) {
        logs = await storage.getToolUsageLogsForRange(userId, startDate as string, endDate as string);
      } else {
        logs = await storage.getToolUsageLogsByUser(userId);
      }
      res.json(logs);
    } catch (error) {
      console.error("Error fetching tool usage logs:", error);
      res.status(500).json({ error: "Failed to fetch tool usage logs" });
    }
  });

  app.post("/api/tool-usage", isAuthenticated, async (req: any, res: Response) => {
    try {
      const parsed = createToolUsageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const log = await storage.createToolUsageLog({ ...parsed.data, userId });
      res.json(log);
    } catch (error) {
      console.error("Error creating tool usage log:", error);
      res.status(500).json({ error: "Failed to create tool usage log" });
    }
  });

  app.patch("/api/tool-usage/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid ID" });
      const logs = await storage.getToolUsageLogsByUser(userId);
      const log = logs.find(l => l.id === id);
      if (!log) {
        return res.status(404).json({ error: "Tool usage log not found" });
      }
      const parsedBody = updateToolUsageSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ error: parsedBody.error.issues[0].message });
      }
      const updated = await storage.updateToolUsageLog(userId, id, parsedBody.data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating tool usage log:", error);
      res.status(500).json({ error: "Failed to update tool usage log" });
    }
  });

  app.get("/api/tool-usage/export", isAuthenticated, exportRateLimit, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      let logs;
      if (startDate && endDate) {
        logs = await storage.getToolUsageLogsForRange(userId, startDate as string, endDate as string);
      } else {
        logs = await storage.getToolUsageLogsByUser(userId);
      }
      const csvHeader = "Date,Tool,Mood Before,Emotion Before,Mood After,Emotion After,Completed\n";
      const csvRows = logs.map(l =>
        [
          csvEscape(l.date), csvEscape(l.toolName), String(l.moodBefore),
          csvEscape(l.emotionBefore), String(l.moodAfter ?? ""),
          csvEscape(l.emotionAfter), String(l.completed),
        ].join(",")
      ).join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=tool-usage.csv");
      res.send(csvHeader + csvRows);
    } catch (error) {
      console.error("Error exporting tool usage logs:", error);
      res.status(500).json({ error: "Failed to export tool usage logs" });
    }
  });

  app.get("/api/trigger-logs", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const logs = await storage.getTriggerLogsByUser(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching trigger logs:", error);
      res.status(500).json({ error: "Failed to fetch trigger logs" });
    }
  });

  app.post("/api/trigger-logs", isAuthenticated, async (req: any, res: Response) => {
    try {
      const parsed = createTriggerLogSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const log = await storage.createTriggerLog({ userId, ...parsed.data });
      res.json(log);
    } catch (error) {
      console.error("Error creating trigger log:", error);
      res.status(500).json({ error: "Failed to create trigger log" });
    }
  });

  app.get("/api/avoidance-logs", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const logs = await storage.getAvoidanceLogsByUser(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching avoidance logs:", error);
      res.status(500).json({ error: "Failed to fetch avoidance logs" });
    }
  });

  app.post("/api/avoidance-logs", isAuthenticated, async (req: any, res: Response) => {
    try {
      const parsed = createAvoidanceLogSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const log = await storage.createAvoidanceLog({ userId, ...parsed.data });
      res.json(log);
    } catch (error) {
      console.error("Error creating avoidance log:", error);
      res.status(500).json({ error: "Failed to create avoidance log" });
    }
  });

  // Decisions
  app.get("/api/decisions", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const weekStart = req.query.weekStart as string | undefined;
      if (weekStart) {
        const parsed = parseMondayParam(weekStart);
        if (!parsed) return res.status(400).json({ error: "Invalid weekStart" });
        const items = await storage.getDecisionsForWeek(userId, parsed);
        return res.json(items);
      }
      const items = await storage.getDecisionsByUser(userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching decisions:", error);
      res.status(500).json({ error: "Failed to fetch decisions" });
    }
  });

  app.post("/api/decisions", isAuthenticated, writeRateLimit, async (req: any, res: Response) => {
    try {
      const parsed = createDecisionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const d = new Date(parsed.data.weekStart + "T12:00:00Z");
      if (d.getUTCDay() !== 1) {
        return res.status(400).json({ error: "weekStart must be a Monday" });
      }
      const decision = await storage.createDecision({ userId, ...parsed.data });
      res.json(decision);
    } catch (error) {
      console.error("Error creating decision:", error);
      res.status(500).json({ error: "Failed to create decision" });
    }
  });
}
