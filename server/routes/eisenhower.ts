import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import { format } from "date-fns";
import { z } from "zod";
import { createEisenhowerSchema, updateEisenhowerSchema, commitWeekSchema, saveFearSchema, flagReviewSchema } from "../validation";
import { parseId, parseDateParam, parseMondayParam, csvEscape, aiRateLimit, exportRateLimit, writeRateLimit, requireAccess } from "./helpers";
import { openai } from "../lib/openai";

// Must match MAX_Q1/MAX_Q2 in client/src/lib/proof-engine-logic.ts
const MAX_Q1 = 5;
const MAX_Q2 = 2;

const reorderItemSchema = z.object({
  id: z.number().int().positive(),
  sortOrder: z.number().int().min(0),
  timing: z.enum(["morning", "afternoon", "evening"]).optional(),
  timeRange: z.enum(["morning", "afternoon", "evening"]).optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const reorderSchema = z.object({
  items: z.array(reorderItemSchema).min(1).max(100),
});

export function registerEisenhowerRoutes(app: Express) {
  app.get("/api/eisenhower", isAuthenticated, requireAccess, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const entries = await storage.getEisenhowerEntriesByUser(userId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching eisenhower entries:", (error as Error).message);
      res.status(500).json({ error: "Failed to fetch entries" });
    }
  });

  app.get("/api/eisenhower/week/:weekStart", isAuthenticated, requireAccess, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { weekStart } = req.params;
      const entries = await storage.getEisenhowerEntriesForWeek(userId, weekStart);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching weekly entries:", (error as Error).message);
      res.status(500).json({ error: "Failed to fetch entries" });
    }
  });

  app.post("/api/eisenhower", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const parsed = createEisenhowerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const { task, weekStart, quadrant } = parsed.data;
      if (task && weekStart) {
        const existing = await storage.getEisenhowerEntriesForWeek(userId, weekStart);
        const duplicate = existing.find(e => e.task.toLowerCase() === task.trim().toLowerCase());
        if (duplicate) {
          return res.status(409).json({ error: `You already have a task named "${duplicate.task}" this week` });
        }
        if (quadrant === "q1" && existing.filter(e => e.quadrant === "q1").length >= MAX_Q1) {
          return res.status(400).json({ error: `Max ${MAX_Q1} urgent items per week. If everything is urgent, nothing is.` });
        }
        if (quadrant === "q2" && existing.filter(e => e.quadrant === "q2").length >= MAX_Q2) {
          return res.status(400).json({ error: `Max ${MAX_Q2} important-but-not-urgent items per week. Focus on what matters most.` });
        }
      }
      const entry = await storage.createEisenhowerEntry({ userId, ...parsed.data });
      res.json(entry);
    } catch (error) {
      console.error("Error creating entry:", (error as Error).message);
      res.status(500).json({ error: "Failed to create entry" });
    }
  });

  app.patch("/api/eisenhower/:id", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const parsed = updateEisenhowerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid ID" });
      const existing = await storage.getEisenhowerEntriesByUser(userId);
      const record = existing.find(r => r.id === id);
      if (!record) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const body = { ...parsed.data };
      // Enforce quadrant limits when changing quadrant
      if (body.quadrant && body.quadrant !== record.quadrant) {
        const weekEntries = await storage.getEisenhowerEntriesForWeek(userId, record.weekStart);
        if (body.quadrant === "q1" && weekEntries.filter(e => e.quadrant === "q1" && e.id !== id).length >= MAX_Q1) {
          return res.status(400).json({ error: `Max ${MAX_Q1} urgent items per week. If everything is urgent, nothing is.` });
        }
        if (body.quadrant === "q2" && weekEntries.filter(e => e.quadrant === "q2" && e.id !== id).length >= MAX_Q2) {
          return res.status(400).json({ error: `Max ${MAX_Q2} important-but-not-urgent items per week. Focus on what matters most.` });
        }
      }
      if (body.status !== undefined) {
        body.completed = body.status === "completed";
      } else if (body.completed !== undefined) {
        body.status = body.completed ? "completed" : null;
      }
      const entry = await storage.updateEisenhowerEntry(userId, id, body);
      res.json(entry);
    } catch (error) {
      console.error("Error updating entry:", (error as Error).message);
      res.status(500).json({ error: "Failed to update entry" });
    }
  });

  // Get weekly summary (fear data) for a specific week
  app.get("/api/eisenhower/weekly-summary/:weekStart", isAuthenticated, requireAccess, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const weekStart = parseMondayParam(req.params.weekStart);
      if (!weekStart) return res.status(400).json({ error: "Invalid date or not a Monday" });
      const summary = await storage.getWeeklySummary(userId, weekStart);
      res.json(summary || null);
    } catch (error) {
      console.error("Error fetching weekly summary:", (error as Error).message);
      res.status(500).json({ error: "Failed to fetch weekly summary" });
    }
  });

  // Save fear reflection standalone (without wiping the week)
  app.post("/api/eisenhower/weekly-summary", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const parsed = saveFearSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const { weekStart, ...fearData } = parsed.data;
      const d = new Date(weekStart + "T12:00:00Z");
      if (d.getUTCDay() !== 1) {
        return res.status(400).json({ error: "weekStart must be a Monday" });
      }
      const summary = await storage.upsertWeeklySummary({
        userId,
        weekStart,
        fearTarget: fearData.fearTarget,
        fearIfFaced: fearData.fearIfFaced,
        fearIfAvoided: fearData.fearIfAvoided,
        fearBlocker: fearData.fearBlocker,
        fearFirstMove: fearData.fearFirstMove,
        fearPromotedToQ2: fearData.fearPromotedToQ2,
      });
      res.json(summary);
    } catch (error) {
      console.error("Error saving fear reflection:", (error as Error).message);
      res.status(500).json({ error: "Failed to save fear reflection" });
    }
  });

  // Close last week: aggregate completion stats for previous week
  app.get("/api/eisenhower/close-week/:weekStart", isAuthenticated, requireAccess, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const weekStart = parseMondayParam(req.params.weekStart);
      if (!weekStart) return res.status(400).json({ error: "Invalid date or not a Monday" });

      // weekStart IS the week to close (client sends the completed week's Monday)
      const prevEntries = await storage.getEisenhowerEntriesForWeek(userId, weekStart);

      // Deduplicate by groupId for counting unique items
      const groupMap = new Map<string, { completed: boolean; total: boolean; skipReason: string | null }>();
      for (const entry of prevEntries) {
        if (entry.quadrant === "q4") continue; // Skip Not This Week items
        const key = entry.groupId || String(entry.id);
        const existing = groupMap.get(key);
        if (!existing) {
          groupMap.set(key, { completed: entry.completed ?? false, total: true, skipReason: entry.skipReason });
        } else if (entry.completed) {
          existing.completed = true;
        }
      }

      const completedCount = Array.from(groupMap.values()).filter(g => g.completed).length;
      const totalCount = groupMap.size;
      const skipReasons = Array.from(groupMap.values())
        .map(g => g.skipReason)
        .filter((r): r is string => !!r);

      // Get habit completions for the closing week
      const weekDate = new Date(weekStart + "T12:00:00Z");
      const sundayDate = new Date(weekDate);
      sundayDate.setUTCDate(sundayDate.getUTCDate() + 6);
      const sundayStr = sundayDate.toISOString().slice(0, 10);
      const habitCompletions = await storage.getHabitCompletionsForRange(userId, weekStart, sundayStr);

      const habitStats = {
        completed: habitCompletions.filter(c => c.status === "completed").length,
        skipped: habitCompletions.filter(c => c.status === "skipped").length,
        minimum: habitCompletions.filter(c => c.status === "minimum").length,
        total: habitCompletions.length,
        skipReasons: habitCompletions
          .filter(c => c.status === "skipped" && c.skipReason)
          .map(c => c.skipReason as string),
      };

      // Get summary for context
      const prevSummary = await storage.getWeeklySummary(userId, weekStart);

      res.json({
        weekStart,
        completedCount,
        totalCount,
        skipReasons,
        habitStats,
        previousHardAction: prevSummary?.openHardAction || null,
      });
    } catch (error) {
      console.error("Error fetching close-week data:", (error as Error).message);
      res.status(500).json({ error: "Failed to fetch close-week data" });
    }
  });

  // Wipe all entries for a week (Rebuild Week)
  app.delete("/api/eisenhower/week/:weekStart", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const weekStart = parseMondayParam(req.params.weekStart);
      if (!weekStart) return res.status(400).json({ error: "Invalid date or not a Monday" });
      const count = await storage.deleteEisenhowerEntriesForWeek(userId, weekStart);
      res.json({ success: true, deleted: count });
    } catch (error) {
      console.error("Error wiping week:", (error as Error).message);
      res.status(500).json({ error: "Failed to wipe week" });
    }
  });

  // Atomic commit: wipe existing week, save new items + fear summary
  app.post("/api/eisenhower/commit-week", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const parsed = commitWeekSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const { weekStart, items, fearData, openingData } = parsed.data;

      // Validate weekStart is a Monday
      const d = new Date(weekStart + "T12:00:00Z");
      if (d.getUTCDay() !== 1) {
        return res.status(400).json({ error: "weekStart must be a Monday" });
      }

      // Validate caps by distinct groupId
      const q1Groups = new Set(items.filter(i => i.quadrant === "q1").map(i => i.groupId));
      const q2Groups = new Set(items.filter(i => i.quadrant === "q2").map(i => i.groupId));
      if (q1Groups.size > MAX_Q1) {
        return res.status(400).json({ error: `Max ${MAX_Q1} Handle items per week` });
      }
      if (q2Groups.size > MAX_Q2) {
        return res.status(400).json({ error: `Max ${MAX_Q2} Protect items per week` });
      }

      // Check for duplicate task names within the submitted items (only q1/q2 — q4 items may repeat)
      const committedTaskNames = items.filter(i => i.quadrant !== "q4").map(i => i.task.toLowerCase());
      if (new Set(committedTaskNames).size !== committedTaskNames.length) {
        return res.status(400).json({ error: "Duplicate task names are not allowed" });
      }

      // Enforce firstMove on Handle/Protect items
      const missingFirstMove = items.find(i => (i.quadrant === "q1" || i.quadrant === "q2") && (!i.firstMove || !i.firstMove.trim()));
      if (missingFirstMove) {
        return res.status(400).json({ error: `Handle and Protect items require a first proof move: "${missingFirstMove.task}"` });
      }

      // Expand items: one row per scheduled day per item
      const entryItems = items.flatMap(item =>
        item.scheduledDates.map((date, dayIdx) => ({
          task: item.task,
          quadrant: item.quadrant,
          role: "",
          sortOrder: item.sortOrder,
          blocksGoal: item.quadrant === "q2" ? true : false,
          groupId: item.groupId,
          scheduledDate: date,
          scheduledStartTime: item.scheduledStartTime || null,
          scheduledEndTime: item.scheduledEndTime || null,
          firstMove: item.firstMove || null,
          sortImportance: item.sortImportance || null,
          sortConsequence: item.sortConsequence || null,
          sortResistance: item.sortResistance || null,
          sortBlocker: item.sortBlocker || null,
          sortResult: item.sortResult,
          sortPriority: item.sortPriority,
          outcome: item.outcome || null,
          hardTruthRelated: item.hardTruthRelated || false,
          sequenceOrder: item.sequenceOrder ?? null,
          sequenceReason: item.sequenceReason || null,
          ifThenStatement: item.ifThenStatement || null,
          revisitDate: item.revisitDate || null,
          proofBucket: item.proofBucket || null,
        }))
      );

      // Build fear summary payload (legacy support)
      const fearSummary = fearData ? {
        userId,
        weekStart,
        fearTarget: fearData.fearTarget,
        fearIfFaced: fearData.fearIfFaced,
        fearIfAvoided: fearData.fearIfAvoided,
        fearBlocker: fearData.fearBlocker,
        fearFirstMove: fearData.fearFirstMove,
        fearPromotedToQ2: fearData.fearPromotedToQ2,
      } : undefined;

      // Atomic: delete + insert + upsert in one transaction
      const result = await storage.commitWeek(userId, weekStart, entryItems, fearSummary, openingData ?? undefined);
      res.json(result);
    } catch (error) {
      console.error("Error committing week:", (error as Error).message);
      res.status(500).json({ error: "Failed to commit week" });
    }
  });

  // Delete all entries sharing a groupId (must be before :id route)
  app.delete("/api/eisenhower/group/:groupId", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const groupId = req.params.groupId;
      if (!groupId || typeof groupId !== "string" || groupId.length > 50) {
        return res.status(400).json({ error: "Invalid groupId" });
      }
      // Verify at least one entry with this groupId belongs to the user
      const existing = await storage.getEisenhowerEntriesByUser(userId);
      const owned = existing.some(e => e.groupId === groupId);
      if (!owned) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const count = await storage.deleteEisenhowerEntriesByGroupId(userId, groupId);
      res.json({ success: true, deleted: count });
    } catch (error) {
      console.error("Error deleting group entries:", (error as Error).message);
      res.status(500).json({ error: "Failed to delete group" });
    }
  });

  // One-time cleanup: remove all auto-created blocksGoal entries (must be before :id route)
  app.delete("/api/eisenhower/cleanup-goal-entries", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.deleteBlocksGoalEntries(userId);
      res.json({ success: true, deleted: count });
    } catch (error) {
      console.error("Error cleaning up goal entries:", (error as Error).message);
      res.status(500).json({ error: "Failed to clean up" });
    }
  });

  app.delete("/api/eisenhower/:id", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid ID" });
      const existing = await storage.getEisenhowerEntriesByUser(userId);
      const record = existing.find(r => r.id === id);
      if (!record) {
        return res.status(403).json({ error: "Not authorized" });
      }
      await storage.deleteEisenhowerEntry(userId, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting entry:", (error as Error).message);
      res.status(500).json({ error: "Failed to delete entry" });
    }
  });

  app.post("/api/eisenhower/reorder", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = reorderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const items = parsed.data.items;
      const existing = await storage.getEisenhowerEntriesByUser(userId);
      const existingIds = new Set(existing.map(e => e.id));
      for (const item of items) {
        if (typeof item.id !== "number" || typeof item.sortOrder !== "number") continue;
        if (!existingIds.has(item.id)) continue;
        const updates: any = { sortOrder: item.sortOrder };
        if (item.timeRange && ["morning", "afternoon", "evening"].includes(item.timeRange)) {
          updates.timeRange = item.timeRange;
        }
        if (item.scheduledDate && typeof item.scheduledDate === "string") {
          updates.scheduledDate = item.scheduledDate;
        }
        await storage.updateEisenhowerEntry(userId, item.id, updates);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering entries:", (error as Error).message);
      res.status(500).json({ error: "Failed to reorder entries" });
    }
  });

  app.get("/api/eisenhower/export", isAuthenticated, requireAccess, exportRateLimit, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const entries = await storage.getEisenhowerEntriesByUser(userId);
      
      let csv = "Week Start,Role,Task,Quadrant,Deadline,Time Estimate,Decision,Scheduled Time,Completed\n";
      entries.forEach(e => {
        csv += [
          csvEscape(e.weekStart), csvEscape(e.role), csvEscape(e.task),
          csvEscape(e.quadrant), csvEscape(e.deadline), csvEscape(e.timeEstimate),
          csvEscape(e.decision), csvEscape(e.scheduledTime), String(e.completed),
        ].join(",") + "\n";
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=eisenhower-matrix.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error exporting eisenhower:", (error as Error).message);
      res.status(500).json({ error: "Failed to export" });
    }
  });

  // Pattern-map check: AI-powered nudge for Step 6
  app.post("/api/eisenhower/pattern-check", isAuthenticated, requireAccess, aiRateLimit, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { items, hardAction } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.json({ nudgeNeeded: false });
      }

      // Fetch user's pattern profile
      const profile = await storage.getPatternProfile(userId);
      if (!profile) {
        return res.json({ nudgeNeeded: false });
      }

      // Collect avoidance/hurting pattern data
      const patternTexts = [
        profile.repeatingLoopAvoidance,
        profile.repeatingLoopStory,
        profile.repeatingLoopCost,
        profile.hurtingPattern1Behavior, profile.hurtingPattern1Outcome,
        profile.hurtingPattern2Behavior, profile.hurtingPattern2Outcome,
        profile.hurtingPattern3Behavior, profile.hurtingPattern3Outcome,
        profile.blindSpot1Pattern, profile.blindSpot2Pattern, profile.blindSpot3Pattern,
      ].filter(t => t && t.trim());

      if (patternTexts.length === 0) {
        return res.json({ nudgeNeeded: false });
      }

      const prompt = `You are a behavioral coach. A user has chosen these weekly tasks:\n${items.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}\n\nTheir hard action for the week: "${hardAction || "not set"}"\n\nTheir known avoidance patterns and hurting behaviors:\n${patternTexts.join("\n")}\n\nQuestion: Do ANY of the chosen tasks directly address or connect to the user's avoidance patterns or hard action?\n\nRespond with JSON: {"connected": true/false, "nudgeMessage": "..."}\nIf connected is false, write a brief, compassionate nudge (1-2 sentences) pointing out what pattern they might be avoiding. Reference the specific pattern. Do not be preachy.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 200,
      });

      const text = completion.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(text);

      res.json({
        nudgeNeeded: parsed.connected === false,
        nudgeMessage: parsed.connected === false ? parsed.nudgeMessage : null,
      });
    } catch (error) {
      console.error("Error in pattern check:", (error as Error).message);
      // Non-critical — return no nudge on failure
      res.json({ nudgeNeeded: false });
    }
  });

  app.post("/api/eisenhower/parse-tasks", isAuthenticated, requireAccess, aiRateLimit, async (req: any, res: Response) => {
    try {
      const { tasks, weekStart } = req.body;
      if (!Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({ error: "tasks must be a non-empty array" });
      }
      if (tasks.length > 20) {
        return res.status(400).json({ error: "Maximum 20 tasks at a time" });
      }
      if (!tasks.every((t: unknown) => typeof t === "string" && t.length <= 500)) {
        return res.status(400).json({ error: "Each task must be a string of at most 500 characters" });
      }
      if (typeof weekStart !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
        return res.status(400).json({ error: "weekStart must be a valid YYYY-MM-DD date" });
      }

      const weekDate = new Date(weekStart + "T00:00:00");
      const weekDays: Record<string, string> = {};
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekDate);
        d.setDate(d.getDate() + i);
        weekDays[dayNames[d.getDay()]] = format(d, "yyyy-MM-dd");
      }

      const systemPrompt = `You are a task parsing assistant. The user will give you a list of tasks from a weekly brain dump. For each task, extract structured data.

The current week starts on ${weekStart}. The days of this week are:
${Object.entries(weekDays).map(([day, date]) => `${day}: ${date}`).join("\n")}

For each task, return a JSON object with these fields:
- "task": the cleaned-up task name (concise, action-oriented)
- "quadrant": one of "q1" (urgent & important - do now), "q2" (important, not urgent - schedule), "q3" (urgent, not important - delegate), "q4" (not urgent, not important - avoid). Default to "q2" if unclear.
- "role": one of "health", "wealth", "relationships", "self-development", "happiness". Pick the best fit. "self-development" covers mindfulness, learning, career growth, and personal skills. "happiness" covers career satisfaction, leisure, hobbies, and fun.
- "scheduledDate": the date in YYYY-MM-DD format if mentioned (e.g., "Tuesday" → the Tuesday of this week). Leave empty string if not mentioned.
- "startTime": suggested start time in HH:MM 24h format if time context is given (e.g., "night" → "18:00", "morning" → "09:00"). Leave empty string if not clear.
- "endTime": suggested end time in HH:MM 24h format. Estimate a reasonable duration. Leave empty string if not clear.

Time context hints: "morning" = 09:00-10:00, "afternoon" = 14:00-15:00, "evening" = 17:00-18:00, "night" = 19:00-20:00, "lunch" = 12:00-13:00.

Return a JSON object with a single key "items" containing an array of parsed task objects, one per input task, in the same order.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: tasks.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n") },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_completion_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "No response from AI" });
      }

      const parsed = JSON.parse(content);
      res.json(parsed);
    } catch (error) {
      console.error("Error parsing tasks with AI:", (error as Error).message);
      res.status(500).json({ error: "Failed to parse tasks" });
    }
  });

  // PATCH /api/monthly-goal/flag-review — flag for sprint review
  app.patch("/api/monthly-goal/flag-review", isAuthenticated, requireAccess, writeRateLimit, async (req: any, res: Response) => {
    try {
      const parsed = flagReviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const goal = await storage.flagMonthlyGoalForReview(userId, parsed.data.monthKey, parsed.data.reason);
      if (!goal) {
        return res.status(404).json({ error: "Monthly goal not found" });
      }
      res.json(goal);
    } catch (error) {
      console.error("Error flagging goal for review:", (error as Error).message);
      res.status(500).json({ error: "Failed to flag goal for review" });
    }
  });
}
