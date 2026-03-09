import type { Express, Response } from "express";
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

  app.get("/api/plan-versions", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const versions = await storage.getPlanVersionsByUser(userId);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching plan versions:", error);
      res.status(500).json({ error: "Failed to fetch plan versions" });
    }
  });

  app.post("/api/plan-versions/save", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { mode, versionName } = req.body;
      const currentMonth = format(new Date(), "yyyy-MM");

      const identityDoc = await storage.getIdentityDocument(userId);
      const monthlyGoal = await storage.getMonthlyGoal(userId, currentMonth);
      const allHabits = await storage.getHabitsByUser(userId);
      const activeHabits = allHabits.filter(h => h.active);

      const snapshot = {
        identityDoc: identityDoc || null,
        monthlyGoal: monthlyGoal || null,
        habits: activeHabits,
        savedAt: new Date().toISOString(),
      };

      const name = versionName || `Plan Version ${format(new Date(), "yyyy-MM-dd")}`;
      const version = await storage.createPlanVersion({
        userId,
        versionName: name,
        effectiveDate: format(new Date(), "yyyy-MM-dd"),
        data: snapshot,
      });

      if (mode === "save_and_clear" || mode === "save_and_copy") {
        if (mode === "save_and_clear") {
          await storage.clearUserPlanData(userId, currentMonth);
        }
      }

      res.json(version);
    } catch (error) {
      console.error("Error saving plan version:", error);
      res.status(500).json({ error: "Failed to save plan version" });
    }
  });

  app.post("/api/plan-versions/:id/restore", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid ID" });
      const versions = await storage.getPlanVersionsByUser(userId);
      const version = versions.find(v => v.id === id);
      if (!version) {
        return res.status(404).json({ error: "Version not found" });
      }

      const snapshot = version.data as any;

      if (snapshot.identityDoc) {
        await storage.upsertIdentityDocument({
          userId,
          identity: snapshot.identityDoc.identity || "",
          vision: snapshot.identityDoc.vision || "",
          values: snapshot.identityDoc.values || "",
          yearVision: snapshot.identityDoc.yearVision || "",
          yearVisualization: snapshot.identityDoc.yearVisualization || "",
          visionBoardMain: snapshot.identityDoc.visionBoardMain || "",
          visionBoardLeft: snapshot.identityDoc.visionBoardLeft || "",
          visionBoardRight: snapshot.identityDoc.visionBoardRight || "",
          purpose: snapshot.identityDoc.purpose || "",
          todayValue: snapshot.identityDoc.todayValue || "",
          todayIntention: snapshot.identityDoc.todayIntention || "",
          todayReflection: snapshot.identityDoc.todayReflection || "",
          othersWillSee: snapshot.identityDoc.othersWillSee || "",
          beYourself: snapshot.identityDoc.beYourself || "",
        });
      }

      if (snapshot.monthlyGoal) {
        const mg = snapshot.monthlyGoal;
        await storage.upsertMonthlyGoal({
          userId, monthKey: mg.monthKey,
          goalStatement: mg.goalStatement || "", successMarker: mg.successMarker ?? "", value: mg.value ?? "",
          why: mg.why ?? "", nextConcreteStep: mg.nextConcreteStep || "", prize: mg.prize ?? "",
          strengths: mg.strengths ?? "", advantage: mg.advantage ?? "", goalWhat: mg.goalWhat ?? "",
          goalWhen: mg.goalWhen ?? "", goalWhere: mg.goalWhere ?? "", goalHow: mg.goalHow ?? "",
          blockingHabit: mg.blockingHabit ?? "", habitAddress: mg.habitAddress ?? "", fun: mg.fun ?? "",
          deadline: mg.deadline ?? "", successProof: mg.successProof ?? "", proofMetric: mg.proofMetric ?? "",
          weeklyBehavior: mg.weeklyBehavior ?? "", bestResult: mg.bestResult ?? "",
          innerObstacle: mg.innerObstacle ?? "", obstacleTrigger: mg.obstacleTrigger ?? "",
          obstacleThought: mg.obstacleThought ?? "", obstacleEmotion: mg.obstacleEmotion ?? "",
          obstacleBehavior: mg.obstacleBehavior ?? "", ifThenPlan1: mg.ifThenPlan1 ?? "", ifThenPlan2: mg.ifThenPlan2 ?? "",
        });
      }

      if (snapshot.habits && Array.isArray(snapshot.habits)) {
        const currentHabits = await storage.getHabitsByUser(userId);
        const activeNames = new Set(currentHabits.filter(h => h.active).map(h => h.name.toLowerCase()));

        for (const h of snapshot.habits) {
          const name = (h.name || "").trim();
          if (!name || activeNames.has(name.toLowerCase())) continue;

          await storage.createHabit({
            userId, name, category: h.category || "health",
            habitType: h.habitType || "maintenance", timing: h.timing || "afternoon",
            cadence: h.cadence, recurring: h.recurring || "indefinite",
            duration: h.duration, startTime: h.startTime, endTime: h.endTime,
            time: h.time, motivatingReason: h.motivatingReason,
            intervalWeeks: h.intervalWeeks || 1, startDate: h.startDate, endDate: h.endDate,
            active: true,
          });
          activeNames.add(name.toLowerCase());
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error restoring plan version:", error);
      res.status(500).json({ error: "Failed to restore plan version" });
    }
  });

  app.post("/api/plan-versions/clear", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const currentMonth = format(new Date(), "yyyy-MM");
      await storage.clearUserPlanData(userId, currentMonth);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing plan data:", error);
      res.status(500).json({ error: "Failed to clear plan data" });
    }
  });

  app.delete("/api/plan-versions/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: "Invalid ID" });
      const existing = await storage.getPlanVersionsByUser(userId);
      const record = existing.find(r => r.id === id);
      if (!record) {
        return res.status(403).json({ error: "Not authorized" });
      }
      await storage.deletePlanVersion(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting plan version:", error);
      res.status(500).json({ error: "Failed to delete plan version" });
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
