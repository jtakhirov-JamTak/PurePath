import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import { exportRateLimit } from "./helpers";
import { format } from "date-fns";

export function registerExportRoutes(app: Express) {
  app.get("/api/export-all", isAuthenticated, exportRateLimit, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userName = req.user.claims.first_name || req.user.claims.email || "User";

      const [
        identityDoc,
        journals,
        habits,
        eisenhowerEntries,
        avoidanceLogs,
        toolUsageLogs,
        containmentLogs,
      ] = await Promise.all([
        storage.getIdentityDocument(userId),
        storage.getJournalsByUser(userId),
        storage.getHabitsByUser(userId),
        storage.getEisenhowerEntriesByUser(userId),
        storage.getAvoidanceLogsByUser(userId),
        storage.getToolUsageLogsByUser(userId),
        storage.getContainmentLogsByUser(userId),
      ]);

      // Collect monthly goals from all months
      const monthKeys = new Set<string>();
      monthKeys.add(format(new Date(), "yyyy-MM"));
      journals.forEach(j => monthKeys.add(j.date.substring(0, 7)));
      const monthlyGoals = [];
      for (const mk of Array.from(monthKeys).sort()) {
        const goal = await storage.getMonthlyGoal(userId, mk);
        if (goal && (goal.goalStatement?.trim() || goal.goalWhat?.trim())) {
          monthlyGoals.push(goal);
        }
      }

      const allCompletions = await storage.getHabitCompletionsForRange(userId, "2000-01-01", "2099-12-31");

      let md = `# The Leaf — Complete Data Export\n`;
      md += `**User:** ${userName}\n`;
      md += `**Exported:** ${format(new Date(), "yyyy-MM-dd HH:mm")}\n\n`;
      md += `---\n\n`;

      // IDENTITY DOCUMENT
      md += `## Identity Document\n\n`;
      if (identityDoc) {
        if (identityDoc.identity) md += `**Identity Statement:** ${identityDoc.identity}\n\n`;
        if (identityDoc.vision) md += `**Vision:** ${identityDoc.vision}\n\n`;
        if (identityDoc.values) md += `**Values:** ${identityDoc.values}\n\n`;
        if (identityDoc.purpose) md += `**Purpose:** ${identityDoc.purpose}\n\n`;
        if (identityDoc.yearVision) md += `**1-Year Vision:** ${identityDoc.yearVision}\n\n`;
        if (identityDoc.othersWillSee) md += `**Others Will See:** ${identityDoc.othersWillSee.replace(/\|\|\|/g, ", ")}\n\n`;
        if (identityDoc.strengths) md += `**Strengths:** ${identityDoc.strengths}\n\n`;
        if (identityDoc.helpingPatterns) md += `**Helping Patterns:** ${identityDoc.helpingPatterns}\n\n`;
        if (identityDoc.hurtingPatterns) md += `**Friction Points:** ${identityDoc.hurtingPatterns}\n\n`;
        if (identityDoc.stressResponses) md += `**Stress Responses:** ${identityDoc.stressResponses}\n\n`;
      } else {
        md += `No identity document set up.\n\n`;
      }

      // MONTHLY GOALS
      md += `---\n\n## Monthly Goals\n\n`;
      if (monthlyGoals.length === 0) {
        md += `No monthly goals recorded.\n\n`;
      } else {
        monthlyGoals.forEach(g => {
          md += `### ${g.monthKey}\n\n`;
          if (g.goalWhat) md += `**Goal:** ${g.goalWhat}\n`;
          if (g.goalStatement) md += `**Statement:** ${g.goalStatement}\n`;
          if (g.successProof) md += `**Success Proof:** ${g.successProof}\n`;
          if (g.proofMetric) md += `**Metric:** ${g.proofMetric}\n`;
          if (g.weeklyBehavior) md += `**Weekly Behavior:** ${g.weeklyBehavior}\n`;
          if (g.innerObstacle) md += `**Inner Obstacle:** ${g.innerObstacle}\n`;
          if (g.obstacleTrigger) md += `**Obstacle Trigger:** ${g.obstacleTrigger}\n`;
          if (g.obstacleThought) md += `**Obstacle Thought:** ${g.obstacleThought}\n`;
          if (g.obstacleEmotion) md += `**Obstacle Emotion:** ${g.obstacleEmotion}\n`;
          if (g.obstacleBehavior) md += `**Obstacle Behavior:** ${g.obstacleBehavior}\n`;
          if (g.ifThenPlan1) md += `**IF-THEN Plan 1:** ${g.ifThenPlan1}\n`;
          if (g.ifThenPlan2) md += `**IF-THEN Plan 2:** ${g.ifThenPlan2}\n`;
          if (g.value) md += `**Value:** ${g.value}\n`;
          if (g.why) md += `**Why:** ${g.why}\n`;
          if (g.prize) md += `**Prize:** ${g.prize}\n`;
          md += `\n`;
        });
      }

      // JOURNAL ENTRIES
      md += `---\n\n## Journal Entries\n\n`;
      if (journals.length === 0) {
        md += `No journal entries.\n\n`;
      } else {
        journals.forEach(j => {
          md += `### ${j.date} — ${j.session.charAt(0).toUpperCase() + j.session.slice(1)}\n\n`;
          if (j.content) {
            try {
              const parsed = JSON.parse(j.content);
              Object.entries(parsed).forEach(([key, val]) => {
                if (val && val !== "" && val !== "[]" && val !== "null" && typeof val !== "boolean" && !key.startsWith("trigger") && !key.startsWith("legacy")) {
                  const label = key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim();
                  if (Array.isArray(val)) {
                    if ((val as unknown[]).length > 0) md += `**${label}:** ${(val as unknown[]).join(", ")}\n`;
                  } else if (typeof val === "object") {
                    md += `**${label}:** ${JSON.stringify(val)}\n`;
                  } else {
                    md += `**${label}:** ${val}\n`;
                  }
                }
              });
              const triggerFields = Object.entries(parsed).filter(([k, v]) => k.startsWith("trigger") && v && v !== "" && v !== "null");
              if (triggerFields.length > 0) {
                md += `\n**Trigger Log (embedded):**\n`;
                triggerFields.forEach(([key, val]) => {
                  const label = key.replace("trigger", "").replace(/([A-Z])/g, " $1").trim() || key;
                  if (Array.isArray(val)) {
                    if ((val as unknown[]).length > 0) md += `- ${label}: ${(val as unknown[]).join(", ")}\n`;
                  } else {
                    md += `- ${label}: ${val}\n`;
                  }
                });
              }
            } catch {
              if (j.gratitude) md += `**Gratitude:** ${j.gratitude}\n`;
              if (j.intentions) md += `**Intentions:** ${j.intentions}\n`;
              if (j.reflections) md += `**Reflections:** ${j.reflections}\n`;
              if (j.highlights) md += `**Highlights:** ${j.highlights}\n`;
              if (j.challenges) md += `**Challenges:** ${j.challenges}\n`;
            }
          }
          md += `\n`;
        });
      }

      // HABITS
      md += `---\n\n## Habits\n\n`;
      if (habits.length === 0) {
        md += `No habits defined.\n\n`;
      } else {
        const activeH = habits.filter(h => h.active);
        const inactiveH = habits.filter(h => !h.active);
        if (activeH.length > 0) {
          md += `**Active Habits:**\n\n`;
          activeH.forEach(h => {
            md += `- **${h.name}** (${h.category || "uncategorized"}, ${h.timing || "afternoon"}, ${h.cadence})`;
            if (h.duration) md += ` — ${h.duration} min`;
            if (h.isBinary) md += ` [binary]`;
            md += `\n`;
          });
          md += `\n`;
        }
        if (inactiveH.length > 0) {
          md += `**Past Habits:**\n\n`;
          inactiveH.forEach(h => {
            md += `- ${h.name} (${h.category || "uncategorized"})`;
            if (h.startDate) md += ` from ${h.startDate}`;
            if (h.endDate) md += ` to ${h.endDate}`;
            md += `\n`;
          });
          md += `\n`;
        }
      }

      // HABIT COMPLETIONS
      md += `### Habit Completion Log\n\n`;
      if (allCompletions.length === 0) {
        md += `No habit completions recorded.\n\n`;
      } else {
        const habitMap = new Map(habits.map(h => [h.id, h.name]));
        const byDate = new Map<string, Array<{ name: string; status: string; level: number | null; skipReason: string | null }>>();
        allCompletions.forEach(c => {
          if (!byDate.has(c.date)) byDate.set(c.date, []);
          byDate.get(c.date)!.push({
            name: habitMap.get(c.habitId) || `Habit #${c.habitId}`,
            status: c.status || "completed",
            level: c.completionLevel,
            skipReason: c.skipReason,
          });
        });
        Array.from(byDate.keys()).sort().forEach(date => {
          md += `**${date}:**\n`;
          byDate.get(date)!.forEach(h => {
            const icon = h.status === "completed" ? "✓" : h.status === "minimum" ? "½" : "✗";
            md += `  ${icon} ${h.name} (${h.status}${h.skipReason ? `, reason: ${h.skipReason}` : ""})\n`;
          });
        });
        md += `\n`;
      }

      // EISENHOWER / WEEKLY PLANNING
      md += `---\n\n## Weekly Planning (Eisenhower Matrix)\n\n`;
      if (eisenhowerEntries.length === 0) {
        md += `No planning entries.\n\n`;
      } else {
        const byWeek = new Map<string, typeof eisenhowerEntries>();
        eisenhowerEntries.forEach(e => {
          const wk = e.weekStart || "unscheduled";
          if (!byWeek.has(wk)) byWeek.set(wk, []);
          byWeek.get(wk)!.push(e);
        });
        Array.from(byWeek.keys()).sort().forEach(week => {
          md += `### Week of ${week}\n\n`;
          const items = byWeek.get(week)!;
          ["q1", "q2", "q3", "q4"].forEach(q => {
            const qItems = items.filter(i => i.quadrant === q);
            if (qItems.length === 0) return;
            const qLabel = q === "q1" ? "Q1 (Urgent+Important)" : q === "q2" ? "Q2 (Important)" : q === "q3" ? "Q3 (Urgent)" : "Q4 (Neither)";
            md += `**${qLabel}:**\n`;
            qItems.forEach(i => {
              const done = i.status === "completed" || i.completed;
              const icon = done ? "✓" : i.status === "skipped" ? "✗" : "○";
              md += `  ${icon} ${i.task}`;
              if (i.role) md += ` [${i.role}]`;
              if (i.scheduledDate) md += ` (${i.scheduledDate}`;
              if (i.scheduledTime) md += ` ${i.scheduledTime}`;
              if (i.scheduledDate) md += `)`;
              if (i.skipReason) md += ` — skipped: ${i.skipReason}`;
              md += `\n`;
            });
          });
          md += `\n`;
        });
      }

      // AVOIDANCE LOGS
      md += `---\n\n## Avoidance Logs\n\n`;
      if (avoidanceLogs.length === 0) {
        md += `No avoidance logs recorded.\n\n`;
      } else {
        avoidanceLogs.forEach(a => {
          md += `### ${a.date}\n\n`;
          md += `**Avoiding:** ${a.avoidingWhat}\n`;
          if (a.avoidanceDelay) md += `**Delay:** ${a.avoidanceDelay}\n`;
          md += `**Discomfort:** ${a.discomfort}/5\n`;
          if (a.smallestExposure) md += `**Smallest Exposure:** ${a.smallestExposure}\n`;
          if (a.startedNow) md += `**Started Now:** Yes\n`;
          md += `\n`;
        });
      }

      // TOOL USAGE LOGS
      md += `---\n\n## Tool Usage Logs\n\n`;
      if (toolUsageLogs.length === 0) {
        md += `No tool usage recorded.\n\n`;
      } else {
        toolUsageLogs.forEach(t => {
          md += `- **${t.date}** — ${t.toolName}: mood ${t.moodBefore}→${t.moodAfter ?? "?"}/5, emotion: ${t.emotionBefore}→${t.emotionAfter || "?"}, ${t.completed ? "completed" : "not completed"}\n`;
        });
        md += `\n`;
      }

      // CONTAINMENT LOGS
      md += `---\n\n## Containment Logs\n\n`;
      const cLogs = containmentLogs as { date: string; branch: string; emotion?: string | null; emotionReason?: string | null; moveAction?: string | null; completed?: boolean | null }[];
      if (cLogs.length === 0) {
        md += `No containment logs recorded.\n\n`;
      } else {
        cLogs.forEach((c) => {
          md += `### ${c.date} — ${c.branch}\n`;
          if (c.emotion) md += `**Emotion:** ${c.emotion}\n`;
          if (c.emotionReason) md += `**Because:** ${c.emotionReason}\n`;
          if (c.moveAction) md += `**Move action:** ${c.moveAction}\n`;
          md += `**Completed:** ${c.completed ? "Yes" : "No"}\n\n`;
        });
      }

      md += `---\n\n`;
      md += `*Exported from The Leaf on ${format(new Date(), "MMMM d, yyyy")}. This document contains all user data and can be used as context for AI analysis.*\n`;

      const filename = `the-leaf-export-${format(new Date(), "yyyy-MM-dd")}.md`;
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(md);
    } catch (error) {
      console.error("Error exporting all data:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });
}
