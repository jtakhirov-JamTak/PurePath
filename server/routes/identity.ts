import type { Express, Response } from "express";
import crypto from "crypto";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import { format } from "date-fns";
import { visionBoardSchema, createMeditationInsightSchema } from "../validation";
import { parseId } from "./helpers";

export function registerIdentityRoutes(app: Express) {
  app.get("/api/identity-document", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const doc = await storage.getIdentityDocument(userId);
      res.json(doc || { userId, identity: "", vision: "", values: "", yearVision: "", yearVisualization: "", purpose: "", todayValue: "", todayIntention: "", todayReflection: "" });
    } catch (error) {
      console.error("Error fetching identity document:", error);
      res.status(500).json({ error: "Failed to fetch identity document" });
    }
  });

  app.put("/api/identity-document", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { identity, vision, values, yearVision, yearVisualization, purpose, todayValue, todayIntention, todayReflection, visionBoardMain, visionBoardLeft, visionBoardRight, othersWillSee, beYourself, strengths, helpingPatterns, hurtingPatterns, stressResponses } = req.body;
      const doc = await storage.upsertIdentityDocument({
        userId,
        identity: identity || "",
        vision: vision || "",
        values: values || "",
        yearVision: yearVision ?? "",
        yearVisualization: yearVisualization ?? "",
        purpose: purpose ?? "",
        todayValue: todayValue || "",
        todayIntention: todayIntention ?? "",
        todayReflection: todayReflection ?? "",
        visionBoardMain: visionBoardMain ?? "",
        visionBoardLeft: visionBoardLeft ?? "",
        visionBoardRight: visionBoardRight ?? "",
        othersWillSee: othersWillSee ?? "",
        beYourself: beYourself ?? "",
        strengths: strengths ?? "",
        helpingPatterns: helpingPatterns ?? "",
        hurtingPatterns: hurtingPatterns ?? "",
        stressResponses: stressResponses ?? "",
      });
      res.json(doc);
    } catch (error) {
      console.error("Error saving identity document:", error);
      res.status(500).json({ error: "Failed to save identity document" });
    }
  });

  app.put("/api/vision-board", isAuthenticated, async (req: any, res: Response) => {
    try {
      const parsed = visionBoardSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const { slot, imageData } = parsed.data;
      const existing = await storage.getIdentityDocument(userId);
      const updates: any = {
        userId,
        identity: existing?.identity || "",
        vision: existing?.vision || "",
        values: existing?.values || "",
        yearVision: existing?.yearVision ?? "",
        yearVisualization: existing?.yearVisualization ?? "",
        purpose: existing?.purpose ?? "",
        todayValue: existing?.todayValue || "",
        todayIntention: existing?.todayIntention ?? "",
        todayReflection: existing?.todayReflection ?? "",
        visionBoardMain: existing?.visionBoardMain ?? "",
        visionBoardLeft: existing?.visionBoardLeft ?? "",
        visionBoardRight: existing?.visionBoardRight ?? "",
        othersWillSee: existing?.othersWillSee ?? "",
        beYourself: existing?.beYourself ?? "",
      };
      if (slot === "main") updates.visionBoardMain = imageData || "";
      if (slot === "left") updates.visionBoardLeft = imageData || "";
      if (slot === "right") updates.visionBoardRight = imageData || "";
      const doc = await storage.upsertIdentityDocument(updates);
      res.json({ success: true, slot });
    } catch (error) {
      console.error("Error saving vision board:", error);
      res.status(500).json({ error: "Failed to save vision board image" });
    }
  });

  app.get("/api/monthly-goal", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const monthKey = (req.query.month as string) || format(new Date(), "yyyy-MM");
      const goal = await storage.getMonthlyGoal(userId, monthKey);
      res.json(goal || { userId, monthKey, goalStatement: "", successMarker: "", value: "", why: "", nextConcreteStep: "", prize: "", strengths: "", advantage: "", goalWhat: "", goalWhen: "", goalWhere: "", goalHow: "", blockingHabit: "", habitAddress: "", fun: "", deadline: "", successProof: "", proofMetric: "", weeklyBehavior: "", bestResult: "", innerObstacle: "", obstacleTrigger: "", obstacleThought: "", obstacleEmotion: "", obstacleBehavior: "", ifThenPlan1: "", ifThenPlan2: "" });
    } catch (error) {
      console.error("Error fetching monthly goal:", error);
      res.status(500).json({ error: "Failed to fetch monthly goal" });
    }
  });

  app.put("/api/monthly-goal", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { monthKey, goalStatement, successMarker, value, why, nextConcreteStep, prize,
        strengths, advantage, goalWhat, goalWhen, goalWhere, goalHow, blockingHabit, habitAddress, fun, deadline,
        successProof, proofMetric, weeklyBehavior, bestResult, innerObstacle, obstacleTrigger, obstacleThought, obstacleEmotion, obstacleBehavior, ifThenPlan1, ifThenPlan2 } = req.body;
      const goal = await storage.upsertMonthlyGoal({
        userId,
        monthKey: monthKey || format(new Date(), "yyyy-MM"),
        goalStatement: goalStatement || "",
        successMarker: successMarker ?? "",
        value: value ?? "",
        why: why ?? "",
        nextConcreteStep: nextConcreteStep || "",
        prize: prize ?? "",
        strengths: strengths ?? "",
        advantage: advantage ?? "",
        goalWhat: goalWhat ?? "",
        goalWhen: goalWhen ?? "",
        goalWhere: goalWhere ?? "",
        goalHow: goalHow ?? "",
        blockingHabit: blockingHabit ?? "",
        habitAddress: habitAddress ?? "",
        fun: fun ?? "",
        deadline: deadline ?? "",
        successProof: successProof ?? "",
        proofMetric: proofMetric ?? "",
        weeklyBehavior: weeklyBehavior ?? "",
        bestResult: bestResult ?? "",
        innerObstacle: innerObstacle ?? "",
        obstacleTrigger: obstacleTrigger ?? "",
        obstacleThought: obstacleThought ?? "",
        obstacleEmotion: obstacleEmotion ?? "",
        obstacleBehavior: obstacleBehavior ?? "",
        ifThenPlan1: ifThenPlan1 ?? "",
        ifThenPlan2: ifThenPlan2 ?? "",
      });
      res.json(goal);
    } catch (error) {
      console.error("Error saving monthly goal:", error);
      res.status(500).json({ error: "Failed to save monthly goal" });
    }
  });

  app.get("/api/meditation-insights", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const insights = await storage.getMeditationInsightsByUser(userId);
      res.json(insights);
    } catch (error) {
      console.error("Error fetching meditation insights:", error);
      res.status(500).json({ error: "Failed to fetch insights" });
    }
  });

  app.post("/api/meditation-insights", isAuthenticated, async (req: any, res: Response) => {
    try {
      const parsed = createMeditationInsightSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const { date, insight } = parsed.data;
      const newInsight = await storage.createMeditationInsight({ userId, date, insight });
      res.json(newInsight);
    } catch (error) {
      console.error("Error creating meditation insight:", error);
      res.status(500).json({ error: "Failed to save insight" });
    }
  });

  app.delete("/api/meditation-insights/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid ID" });
      const existing = await storage.getMeditationInsightsByUser(userId);
      const record = existing.find(r => r.id === id);
      if (!record) {
        return res.status(403).json({ error: "Not authorized" });
      }
      await storage.deleteMeditationInsight(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting meditation insight:", error);
      res.status(500).json({ error: "Failed to delete insight" });
    }
  });
}
