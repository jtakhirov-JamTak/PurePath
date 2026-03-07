import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import { format } from "date-fns";
import { createJournalSchema } from "../validation";
import { parseDateParam, exportRateLimit } from "./helpers";

export function registerJournalRoutes(app: Express) {
  app.get("/api/journals", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      
      const hasAccess = await storage.hasCourseAccess(userId, "course2");
      if (!hasAccess) {
        return res.status(403).json({ error: "Course access required" });
      }

      const journals = await storage.getJournalsByUser(userId);
      res.json(journals);
    } catch (error) {
      console.error("Error fetching journals:", error);
      res.status(500).json({ error: "Failed to fetch journals" });
    }
  });

  app.get("/api/journals/:date/:session", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { date, session } = req.params;

      const hasAccess = await storage.hasCourseAccess(userId, "course2");
      if (!hasAccess) {
        return res.status(403).json({ error: "Course access required" });
      }

      const journal = await storage.getJournal(userId, date, session);
      res.json(journal || null);
    } catch (error) {
      console.error("Error fetching journal:", error);
      res.status(500).json({ error: "Failed to fetch journal" });
    }
  });

  app.post("/api/journals", isAuthenticated, async (req: any, res: Response) => {
    try {
      const parsed = createJournalSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;

      const hasAccess = await storage.hasCourseAccess(userId, "course2");
      if (!hasAccess) {
        return res.status(403).json({ error: "Course access required" });
      }

      const journal = await storage.createOrUpdateJournal({
        userId,
        ...parsed.data,
      });

      if (parsed.data.session === "evening" && parsed.data.tomorrowGoals) {
        try {
          const content = parsed.data.content ? JSON.parse(parsed.data.content) : {};
          const tomorrowStep = parsed.data.tomorrowGoals.trim();
          if (tomorrowStep) {
            const journalDate = new Date(parsed.data.date + "T12:00:00");
            const tomorrow = new Date(journalDate);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = format(tomorrow, "yyyy-MM-dd");
            const dayOfWeek = tomorrow.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const weekStartDate = new Date(tomorrow);
            weekStartDate.setDate(weekStartDate.getDate() + mondayOffset);
            const weekStartStr = format(weekStartDate, "yyyy-MM-dd");
            const rawTime = content.tomorrowStepTime || "08:00";
            const [hh, mm] = rawTime.split(":").map(Number);
            const ampm = hh >= 12 ? "PM" : "AM";
            const h12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
            const displayTime = `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
            await storage.createEisenhowerEntry({
              userId,
              task: tomorrowStep,
              weekStart: weekStartStr,
              role: "self-development",
              quadrant: "q1",
              scheduledDate: tomorrowStr,
              scheduledStartTime: rawTime,
              scheduledTime: displayTime,
              isBinary: true,
            });
          }
        } catch (e) {
          console.error("Error auto-creating Q1 from evening journal:", e);
        }
      }

      res.json(journal);
    } catch (error) {
      console.error("Error saving journal:", error);
      res.status(500).json({ error: "Failed to save journal" });
    }
  });

  app.get("/api/journals/export", isAuthenticated, exportRateLimit, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const hasAccess = await storage.hasCourseAccess(userId, "course2");
      if (!hasAccess) {
        return res.status(403).json({ error: "Course access required" });
      }

      let journals = await storage.getJournalsByUser(userId);
      if (startDate) journals = journals.filter(j => j.date >= startDate);
      if (endDate) journals = journals.filter(j => j.date <= endDate);

      const habits = await storage.getHabitsByUser(userId);
      const rangeStart = startDate || "2000-01-01";
      const rangeEnd = endDate || "2099-12-31";
      const completions = await storage.getHabitCompletionsForRange(userId, rangeStart, rangeEnd);

      const eisenhower = await storage.getEisenhowerEntriesByUser(userId);
      let filteredEisenhower = eisenhower.filter(e => e.quadrant === "q2" && e.deadline);
      if (startDate) filteredEisenhower = filteredEisenhower.filter(e => e.deadline! >= startDate);
      if (endDate) filteredEisenhower = filteredEisenhower.filter(e => e.deadline! <= endDate);

      const habitMap = new Map(habits.map(h => [h.id, h.name]));
      
      let content = "# Journal Calendar Export\n\n";
      if (startDate || endDate) {
        content += `Date Range: ${startDate || "beginning"} to ${endDate || "present"}\n\n`;
      }

      content += "---\n\n";
      content += "## Journal Entries\n\n";
      
      journals.forEach((journal) => {
        content += `### ${journal.date} - ${journal.session.charAt(0).toUpperCase() + journal.session.slice(1)}\n\n`;
        
        if (journal.content) {
          try {
            const parsed = JSON.parse(journal.content);
            if (journal.session === "morning") {
              if (parsed.intention) content += `**Intention:** ${parsed.intention}\n`;
              if (parsed.gratitude) content += `**Gratitude:** ${parsed.gratitude}\n`;
              if (parsed.joy) content += `**Joy:** ${parsed.joy}\n`;
              if (parsed.enjoy) content += `**Enjoy:** ${parsed.enjoy}\n`;
              if (parsed.avoidance) content += `**Avoidance:** ${parsed.avoidance}\n`;
              if (parsed.understanding) content += `**Understanding:** ${parsed.understandingEmotion ? `(${parsed.understandingEmotion}) ` : ""}${parsed.understanding}\n`;
              if (parsed.counterEvidence) content += `**Counter-Evidence:** ${parsed.counterEvidence}\n`;
              if (parsed.courageAction) content += `**Courage Action:** ${parsed.courageAction}\n`;
              if (parsed.stress) content += `**Stress:** ${parsed.stress}\n`;
              if (parsed.perspectiveShift) content += `**Perspective Shift:** ${parsed.perspectiveShift}\n`;
            } else {
              if (parsed.review) content += `**Review:** ${parsed.review}\n`;
              if (parsed.feedback) content += `**Feedback:** ${parsed.feedback}\n`;
              if (parsed.insight) content += `**Insight:** ${parsed.insight}\n`;
              if (parsed.lesson) content += `**Lesson:** ${parsed.lesson}\n`;
              if (parsed.trigger) content += `**Trigger:** ${parsed.trigger}\n`;
              if (parsed.triggerStory) content += `**Story:** ${parsed.triggerStory}\n`;
              if (parsed.triggerImpulse) content += `**Impulse:** ${parsed.triggerImpulse}\n`;
              if (parsed.triggerEmotion) content += `**Emotion:** ${parsed.triggerEmotion}${parsed.triggerEmotionLevel ? ` (${parsed.triggerEmotionLevel}/10)` : ""}\n`;
              if (parsed.triggerUrge) content += `**Urge:** ${parsed.triggerUrge}${parsed.triggerUrgeLevel ? ` (${parsed.triggerUrgeLevel}/10)` : ""}\n`;
              if (parsed.triggerBehavior) content += `**Behavior:** ${parsed.triggerBehavior}\n`;
              if (parsed.triggerOutcome) content += `**Outcome:** ${parsed.triggerOutcome}\n`;
              if (parsed.triggerNextTime) content += `**Next Time:** ${parsed.triggerNextTime}\n`;
              if (parsed.satisfied) content += `**Satisfied With:** ${parsed.satisfied}\n`;
              if (parsed.dissatisfied) content += `**Dissatisfied With:** ${parsed.dissatisfied}\n`;
              if (parsed.shutdownEnough) content += `**Today Was Enough Because:** ${parsed.shutdownEnough}\n`;
              if (parsed.shutdownTomorrow) content += `**Tomorrow's First Step:** ${parsed.shutdownTomorrow}\n`;
            }
          } catch {
            if (journal.gratitude) content += `**Gratitude:** ${journal.gratitude}\n`;
            if (journal.intentions) content += `**Intentions:** ${journal.intentions}\n`;
            if (journal.highlights) content += `**Highlights:** ${journal.highlights}\n`;
            if (journal.reflections) content += `**Reflections:** ${journal.reflections}\n`;
            if (journal.challenges) content += `**Challenges:** ${journal.challenges}\n`;
            if (journal.tomorrowGoals) content += `**Tomorrow's Goals:** ${journal.tomorrowGoals}\n`;
          }
        }
        content += "\n";
      });

      if (completions.length > 0) {
        content += "---\n\n## Habit Tracking\n\n";
        const byDate = new Map<string, Array<{ name: string; status: string }>>();
        completions.forEach((c: any) => {
          const name = habitMap.get(c.habitId) || `Habit #${c.habitId}`;
          if (!byDate.has(c.date)) byDate.set(c.date, []);
          byDate.get(c.date)!.push({ name, status: c.status || "completed" });
        });
        const sortedDates = Array.from(byDate.keys()).sort();
        sortedDates.forEach(date => {
          content += `### ${date}\n`;
          byDate.get(date)!.forEach(h => {
            const icon = h.status === "completed" ? "[x]" : "[-]";
            content += `- ${icon} ${h.name} (${h.status})\n`;
          });
          content += "\n";
        });
      }

      if (filteredEisenhower.length > 0) {
        content += "---\n\n## Scheduled Items (Eisenhower Q2)\n\n";
        filteredEisenhower.forEach(e => {
          const status = e.completed ? "[x]" : "[ ]";
          content += `- ${status} ${e.task} (${e.role}, deadline: ${e.deadline})${e.scheduledTime ? ` @ ${e.scheduledTime}` : ""}\n`;
        });
        content += "\n";
      }

      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", `attachment; filename=journal-export${startDate ? `-${startDate}` : ""}${endDate ? `-to-${endDate}` : ""}.txt`);
      res.send(content);
    } catch (error) {
      console.error("Error exporting journals:", error);
      res.status(500).json({ error: "Failed to export journals" });
    }
  });
}
