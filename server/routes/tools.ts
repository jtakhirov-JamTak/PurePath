import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import {
  createToolUsageSchema, updateToolUsageSchema,
  createAvoidanceLogSchema, createContainmentLogSchema, createTriggerLogSchema,
} from "../validation";
import { parseId, parseDateParam, csvEscape, exportRateLimit, writeRateLimit, requireAccess } from "./helpers";

export function registerToolRoutes(app: Express) {
  app.get("/api/tool-usage", isAuthenticated, requireAccess, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const startDate = req.query.startDate ? parseDateParam(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? parseDateParam(req.query.endDate as string) : undefined;
      if ((req.query.startDate && !startDate) || (req.query.endDate && !endDate)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
      }
      let logs;
      if (startDate && endDate) {
        logs = await storage.getToolUsageLogsForRange(userId, startDate, endDate);
      } else {
        logs = await storage.getToolUsageLogsByUser(userId);
      }
      res.json(logs);
    } catch (error) {
      console.error("Error fetching tool usage logs:", (error as Error).message);
      res.status(500).json({ error: "Failed to fetch tool usage logs" });
    }
  });

  app.post("/api/tool-usage", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const parsed = createToolUsageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const log = await storage.createToolUsageLog({ ...parsed.data, userId });
      res.json(log);
    } catch (error) {
      console.error("Error creating tool usage log:", (error as Error).message);
      res.status(500).json({ error: "Failed to create tool usage log" });
    }
  });

  app.patch("/api/tool-usage/:id", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
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
      console.error("Error updating tool usage log:", (error as Error).message);
      res.status(500).json({ error: "Failed to update tool usage log" });
    }
  });

  app.get("/api/tool-usage/export", isAuthenticated, requireAccess, exportRateLimit, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const startDate = req.query.startDate ? parseDateParam(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? parseDateParam(req.query.endDate as string) : undefined;
      if ((req.query.startDate && !startDate) || (req.query.endDate && !endDate)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
      }
      let logs;
      if (startDate && endDate) {
        logs = await storage.getToolUsageLogsForRange(userId, startDate, endDate);
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
      console.error("Error exporting tool usage logs:", (error as Error).message);
      res.status(500).json({ error: "Failed to export tool usage logs" });
    }
  });

  app.get("/api/avoidance-logs", isAuthenticated, requireAccess, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const logs = await storage.getAvoidanceLogsByUser(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching avoidance logs:", (error as Error).message);
      res.status(500).json({ error: "Failed to fetch avoidance logs" });
    }
  });

  app.post("/api/avoidance-logs", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const parsed = createAvoidanceLogSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const log = await storage.createAvoidanceLog({ userId, ...parsed.data });
      res.json(log);
    } catch (error) {
      console.error("Error creating avoidance log:", (error as Error).message);
      res.status(500).json({ error: "Failed to create avoidance log" });
    }
  });

  // Containment Logs
  app.get("/api/containment-logs", isAuthenticated, requireAccess, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const logs = await storage.getContainmentLogsByUser(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching containment logs:", (error as Error).message);
      res.status(500).json({ error: "Failed to fetch containment logs" });
    }
  });

  app.post("/api/containment-logs", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const parsed = createContainmentLogSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const log = await storage.createContainmentLog({ userId, ...parsed.data });
      res.json(log);
    } catch (error) {
      console.error("Error creating containment log:", (error as Error).message);
      res.status(500).json({ error: "Failed to create containment log" });
    }
  });

  // Trigger Logs
  app.get("/api/trigger-logs", isAuthenticated, requireAccess, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const logs = await storage.getTriggerLogsByUser(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching trigger logs:", (error as Error).message);
      res.status(500).json({ error: "Failed to fetch trigger logs" });
    }
  });

  app.post("/api/trigger-logs", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const parsed = createTriggerLogSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const log = await storage.createTriggerLog({ userId, ...parsed.data });
      res.json(log);
    } catch (error) {
      console.error("Error creating trigger log:", (error as Error).message);
      res.status(500).json({ error: "Failed to create trigger log" });
    }
  });
}
