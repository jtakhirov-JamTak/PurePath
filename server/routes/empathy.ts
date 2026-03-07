import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import { createEmpathySchema, updateEmpathySchema } from "../validation";
import { parseId, csvEscape, exportRateLimit } from "./helpers";

export function registerEmpathyRoutes(app: Express) {
  app.get("/api/empathy", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const exercises = await storage.getEmpathyExercisesByUser(userId);
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching empathy exercises:", error);
      res.status(500).json({ error: "Failed to fetch exercises" });
    }
  });

  app.post("/api/empathy", isAuthenticated, async (req: any, res: Response) => {
    try {
      const parsed = createEmpathySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const exercise = await storage.createEmpathyExercise({ userId, ...parsed.data });
      res.json(exercise);
    } catch (error) {
      console.error("Error creating exercise:", error);
      res.status(500).json({ error: "Failed to create exercise" });
    }
  });

  app.patch("/api/empathy/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid ID" });
      const existing = await storage.getEmpathyExercisesByUser(userId);
      const record = existing.find(r => r.id === id);
      if (!record) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const parsedBody = updateEmpathySchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ error: parsedBody.error.issues[0].message });
      }
      const exercise = await storage.updateEmpathyExercise(id, parsedBody.data);
      res.json(exercise);
    } catch (error) {
      console.error("Error updating exercise:", error);
      res.status(500).json({ error: "Failed to update exercise" });
    }
  });

  app.delete("/api/empathy/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid ID" });
      const existing = await storage.getEmpathyExercisesByUser(userId);
      const record = existing.find(r => r.id === id);
      if (!record) {
        return res.status(403).json({ error: "Not authorized" });
      }
      await storage.deleteEmpathyExercise(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting exercise:", error);
      res.status(500).json({ error: "Failed to delete exercise" });
    }
  });

  app.get("/api/empathy/export", isAuthenticated, exportRateLimit, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const exercises = await storage.getEmpathyExercisesByUser(userId);
      
      let csv = "Type,Date,Who,Context,Their Emotional State,My Emotional State,Facts Observed,How I Came Across,How They Likely Felt,What Matters to Them,What They Need,Next Action,Did Confirm,Intention,Leave Them Feeling,Trigger Risk IF-THEN,Them Hypothesis,Reality Check Question,Reflection Validation\n";
      exercises.forEach(e => {
        csv += [
          csvEscape(e.exerciseType || "debrief"), csvEscape(e.date), csvEscape(e.who),
          csvEscape(e.context), csvEscape(e.theirEmotionalState), csvEscape(e.myEmotionalState),
          csvEscape(e.factsObserved), csvEscape(e.howICameAcross), csvEscape(e.howTheyLikelyFelt),
          csvEscape(e.whatMattersToThem), csvEscape(e.whatTheyNeed), csvEscape(e.nextAction),
          csvEscape(e.didConfirm), csvEscape(e.intention), csvEscape(e.leaveThemFeeling),
          csvEscape(e.triggerRiskIfThen), csvEscape(e.themHypothesis), csvEscape(e.realityCheckQuestion),
          csvEscape(e.reflectionValidation),
        ].join(",") + "\n";
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=empathy-exercises.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error exporting empathy:", error);
      res.status(500).json({ error: "Failed to export" });
    }
  });
}
