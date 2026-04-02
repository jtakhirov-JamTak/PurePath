import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import { format } from "date-fns";
import { visionBoardSchema, identityDocumentSchema, monthlyGoalSchema } from "../validation";

export function registerIdentityRoutes(app: Express) {
  app.get("/api/identity-document", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const doc = await storage.getIdentityDocument(userId);
      res.json(doc || { userId, identity: "", vision: "", values: "", yearVision: "", yearVisualization: "", purpose: "", todayValue: "", todayIntention: "", todayReflection: "", visionDomain: "" });
    } catch (error) {
      console.error("Error fetching identity document:", error);
      res.status(500).json({ error: "Failed to fetch identity document" });
    }
  });

  app.put("/api/identity-document", isAuthenticated, async (req: any, res: Response) => {
    try {
      const parsed = identityDocumentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const d = parsed.data;
      const doc = await storage.upsertIdentityDocument({
        userId,
        identity: d.identity || "",
        vision: d.vision || "",
        values: d.values || "",
        yearVision: d.yearVision ?? "",
        yearVisualization: d.yearVisualization ?? "",
        purpose: d.purpose ?? "",
        todayValue: d.todayValue || "",
        todayIntention: d.todayIntention ?? "",
        todayReflection: d.todayReflection ?? "",
        visionBoardMain: d.visionBoardMain ?? "",
        visionBoardLeft: d.visionBoardLeft ?? "",
        visionBoardRight: d.visionBoardRight ?? "",
        othersWillSee: d.othersWillSee ?? "",
        beYourself: d.beYourself ?? "",
        strengths: d.strengths ?? "",
        helpingPatterns: d.helpingPatterns ?? "",
        hurtingPatterns: d.hurtingPatterns ?? "",
        stressResponses: d.stressResponses ?? "",
        visionDomain: d.visionDomain ?? "",
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
      const parsed = monthlyGoalSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const g = parsed.data;
      const goal = await storage.upsertMonthlyGoal({
        userId,
        monthKey: g.monthKey || format(new Date(), "yyyy-MM"),
        goalStatement: g.goalStatement || "",
        successMarker: g.successMarker ?? "",
        value: g.value ?? "",
        why: g.why ?? "",
        nextConcreteStep: g.nextConcreteStep || "",
        prize: g.prize ?? "",
        strengths: g.strengths ?? "",
        advantage: g.advantage ?? "",
        goalWhat: g.goalWhat ?? "",
        goalWhen: g.goalWhen ?? "",
        goalWhere: g.goalWhere ?? "",
        goalHow: g.goalHow ?? "",
        blockingHabit: g.blockingHabit ?? "",
        habitAddress: g.habitAddress ?? "",
        fun: g.fun ?? "",
        deadline: g.deadline ?? "",
        successProof: g.successProof ?? "",
        proofMetric: g.proofMetric ?? "",
        weeklyBehavior: g.weeklyBehavior ?? "",
        bestResult: g.bestResult ?? "",
        innerObstacle: g.innerObstacle ?? "",
        obstacleTrigger: g.obstacleTrigger ?? "",
        obstacleThought: g.obstacleThought ?? "",
        obstacleEmotion: g.obstacleEmotion ?? "",
        obstacleBehavior: g.obstacleBehavior ?? "",
        ifThenPlan1: g.ifThenPlan1 ?? "",
        ifThenPlan2: g.ifThenPlan2 ?? "",
      });
      res.json(goal);
    } catch (error) {
      console.error("Error saving monthly goal:", error);
      res.status(500).json({ error: "Failed to save monthly goal" });
    }
  });

}
