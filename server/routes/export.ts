import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import { exportRateLimit, requireAccess } from "./helpers";
import { format } from "date-fns";

export function registerExportRoutes(app: Express) {
  app.get("/api/export-all", isAuthenticated, requireAccess, exportRateLimit, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userName = req.user.claims.first_name || req.user.claims.email || "User";

      const [
        identityDoc,
        patternProfile,
        journals,
        habits,
        eisenhowerEntries,
        avoidanceLogs,
        toolUsageLogs,
        containmentLogs,
        triggerLogs,
        fearLogs,
        workshopSeed,
        annualCommitment,
      ] = await Promise.all([
        storage.getIdentityDocument(userId),
        storage.getPatternProfile(userId),
        storage.getJournalsByUser(userId),
        storage.getHabitsByUser(userId),
        storage.getEisenhowerEntriesByUser(userId),
        storage.getAvoidanceLogsByUser(userId),
        storage.getToolUsageLogsByUser(userId),
        storage.getContainmentLogsByUser(userId),
        storage.getTriggerLogsByUser(userId),
        storage.getFearLogsByUser(userId),
        storage.getWorkshopSeed(userId),
        storage.getActiveAnnualCommitment(userId),
      ]);

      // Collect monthly goals in a single query (avoids N+1)
      const allMonthlyGoals = await storage.getMonthlyGoalsByUser(userId);
      const monthlyGoals = allMonthlyGoals.filter(g => g.goalStatement?.trim() || g.goalWhat?.trim());

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
        if (identityDoc.values) {
          try {
            const parsed = JSON.parse(identityDoc.values);
            if (Array.isArray(parsed)) {
              md += `**Values:**\n${parsed.map((v: { value: string; why: string }) => `- ${v.value}${v.why ? ` — ${v.why}` : ""}`).join("\n")}\n\n`;
            } else {
              md += `**Values:** ${identityDoc.values}\n\n`;
            }
          } catch {
            md += `**Values:** ${identityDoc.values}\n\n`;
          }
        }
        if (identityDoc.purpose) md += `**Purpose:** ${identityDoc.purpose}\n\n`;
        if (identityDoc.acceptanceTruth) md += `**Acceptance Truth:** ${identityDoc.acceptanceTruth}\n\n`;
        if (identityDoc.yearVision) md += `**1-Year Commitment (legacy):** ${identityDoc.yearVision}\n\n`;
        if (identityDoc.othersWillSee) md += `**Others Will See:** ${identityDoc.othersWillSee.replace(/\|\|\|/g, ", ")}\n\n`;
        // Legacy fields (deprecated, may contain historical data)
        if (identityDoc.strengths) md += `**Strengths (legacy):** ${identityDoc.strengths}\n\n`;
        if (identityDoc.helpingPatterns) md += `**Helping Patterns (legacy):** ${identityDoc.helpingPatterns}\n\n`;
        if (identityDoc.hurtingPatterns) md += `**Friction Points (legacy):** ${identityDoc.hurtingPatterns}\n\n`;
        if (identityDoc.stressResponses) md += `**Stress Responses (legacy):** ${identityDoc.stressResponses}\n\n`;
      } else {
        md += `No identity document set up.\n\n`;
      }

      // ANNUAL COMMITMENT
      md += `## Annual Commitment\n\n`;
      if (annualCommitment) {
        if (annualCommitment.domain) md += `**Domain:** ${annualCommitment.domain}\n`;
        if (annualCommitment.personStatement) md += `**Person Statement:** ${annualCommitment.personStatement}\n`;
        if (annualCommitment.proofPoint) md += `**Proof Point:** ${annualCommitment.proofPoint}\n`;
        if (annualCommitment.proofMetric) md += `**Proof Metric:** ${annualCommitment.proofMetric}\n`;
        if (annualCommitment.visualization) md += `**Visualization:** ${annualCommitment.visualization}\n`;
        if (annualCommitment.ifThenPlan1) md += `**IF-THEN Plan 1:** ${annualCommitment.ifThenPlan1}\n`;
        if (annualCommitment.ifThenPlan2) md += `**IF-THEN Plan 2:** ${annualCommitment.ifThenPlan2}\n`;
        if (annualCommitment.confidenceCheck != null) md += `**Confidence:** ${annualCommitment.confidenceCheck}/10\n`;
        md += `\n`;
      } else {
        md += `No annual commitment set up.\n\n`;
      }

      // WORKSHOP SEED
      md += `## Workshop Seed\n\n`;
      if (workshopSeed) {
        if (workshopSeed.identityStatement) md += `**Identity Statement:** ${workshopSeed.identityStatement}\n`;
        if (workshopSeed.vision) md += `**Vision:** ${workshopSeed.vision}\n`;
        if (workshopSeed.purpose) md += `**Purpose:** ${workshopSeed.purpose}\n`;
        if (workshopSeed.acceptanceTruth) md += `**Acceptance Truth:** ${workshopSeed.acceptanceTruth}\n`;
        if (workshopSeed.source) md += `**Source:** ${workshopSeed.source}\n`;
        md += `\n`;
      } else {
        md += `No workshop seed recorded.\n\n`;
      }

      // PATTERN PROFILE
      md += `## Pattern Profile\n\n`;
      if (patternProfile) {
        const hp = (n: number) => {
          const c = (patternProfile as any)[`helpingPattern${n}Condition`] || "";
          const b = (patternProfile as any)[`helpingPattern${n}Behavior`] || "";
          const i = (patternProfile as any)[`helpingPattern${n}Impact`] || "";
          const o = (patternProfile as any)[`helpingPattern${n}Outcome`] || "";
          return (c || b || i || o) ? `- **Pattern ${n}:** When ${c || "..."} → I ${b || "..."} → People feel ${i || "..."} → It leads to ${o || "..."}\n` : "";
        };
        const hpSection = hp(1) + hp(2) + hp(3);
        if (hpSection) md += `**Helping Patterns:**\n${hpSection}\n`;

        const up = (n: number) => {
          const c = (patternProfile as any)[`hurtingPattern${n}Condition`] || "";
          const b = (patternProfile as any)[`hurtingPattern${n}Behavior`] || "";
          const i = (patternProfile as any)[`hurtingPattern${n}Impact`] || "";
          const o = (patternProfile as any)[`hurtingPattern${n}Outcome`] || "";
          return (c || b || i || o) ? `- **Pattern ${n}:** When ${c || "..."} → I ${b || "..."} → People feel ${i || "..."} → It leads to ${o || "..."}\n` : "";
        };
        const upSection = up(1) + up(2) + up(3);
        if (upSection) md += `**Shadow Patterns:**\n${upSection}\n`;

        // Shadow pattern emotions + environments
        for (let n = 1; n <= 3; n++) {
          const emotions = (patternProfile as any)[`hurtingPattern${n}Emotions`];
          const environment = (patternProfile as any)[`hurtingPattern${n}Environment`];
          if (emotions || environment) {
            md += `  - Shadow ${n} emotions: ${emotions || "—"}, environment: ${environment || "—"}\n`;
          }
        }

        // Best-state calibration
        if (patternProfile.bestStateEmotions || patternProfile.bestStateEnvironments) {
          md += `\n**Best-State Calibration:**\n`;
          if (patternProfile.bestStateEmotions) md += `- Emotions: ${patternProfile.bestStateEmotions}\n`;
          if (patternProfile.bestStateEnvironments) md += `- Environments: ${patternProfile.bestStateEnvironments}\n`;
          if (patternProfile.bestStateExamplesJson) md += `- Examples: ${patternProfile.bestStateExamplesJson}\n`;
          md += `\n`;
        }

        if (patternProfile.repeatingLoopStory || patternProfile.repeatingLoopAvoidance || patternProfile.repeatingLoopCost) {
          md += `**Repeating Loop:**\n`;
          if (patternProfile.repeatingLoopStory) md += `- Story: ${patternProfile.repeatingLoopStory}\n`;
          if (patternProfile.repeatingLoopAvoidance) md += `- Avoids: ${patternProfile.repeatingLoopAvoidance}\n`;
          if (patternProfile.repeatingLoopCost) md += `- Cost: ${patternProfile.repeatingLoopCost}\n`;
          md += `\n`;
        }

        if (patternProfile.triggerPatternTrigger) {
          md += `**Trigger Pattern:**\n`;
          md += `- Trigger: ${patternProfile.triggerPatternTrigger}\n`;
          if (patternProfile.triggerPatternInterpretation) md += `- Interpretation: ${patternProfile.triggerPatternInterpretation}\n`;
          if (patternProfile.triggerPatternEmotion) md += `- Emotion: ${patternProfile.triggerPatternEmotion}\n`;
          if (patternProfile.triggerPatternUrge) md += `- Urge: ${patternProfile.triggerPatternUrge}\n`;
          if (patternProfile.triggerPatternBehavior) md += `- Behavior: ${patternProfile.triggerPatternBehavior}\n`;
          if (patternProfile.triggerPatternOutcome) md += `- Outcome: ${patternProfile.triggerPatternOutcome}\n`;
          md += `\n`;
        }

        const bs = (n: number) => {
          const p = (patternProfile as any)[`blindSpot${n}Pattern`] || "";
          const o = (patternProfile as any)[`blindSpot${n}Outcome`] || "";
          return (p || o) ? `- **Blind Spot ${n}:** ${p || "..."} → ${o || "..."}\n` : "";
        };
        const bsSection = bs(1) + bs(2) + bs(3);
        if (bsSection) md += `**Blind Spots:**\n${bsSection}\n`;
      } else {
        md += `No pattern profile set up.\n\n`;
      }
      md += `\n`;

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
          if (g.personStatement) md += `**Person Statement:** ${g.personStatement}\n`;
          if (g.confidenceCheck != null) md += `**Confidence Check:** ${g.confidenceCheck}/10\n`;
          if (g.value) md += `**Value:** ${g.value}\n`;
          if (g.why) md += `**Why:** ${g.why}\n`;
          if (g.prize) md += `**Prize:** ${g.prize}\n`;
          if (g.sprintName) md += `**Sprint Name:** ${g.sprintName}\n`;
          if (g.startDate) md += `**Start Date:** ${g.startDate}\n`;
          if (g.endDate) md += `**End Date:** ${g.endDate}\n`;
          if (g.sprintStatus && g.sprintStatus !== "active") md += `**Sprint Status:** ${g.sprintStatus}\n`;
          if (g.closedAs) md += `**Closed As:** ${g.closedAs}\n`;
          if (g.carryForwardCount) md += `**Carry Forward Count:** ${g.carryForwardCount}\n`;
          if (g.needsSprintReview) md += `**Flagged for Sprint Review:** ${g.needsSprintReviewReason || "Yes"}\n`;
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
          // Proof Arc v1 structured fields
          if (j.selectedValueLabel) md += `**Value:** ${j.selectedValueLabel}${j.selectedValueWhySnapshot ? ` — ${j.selectedValueWhySnapshot}` : ""}\n`;
          if (j.proofMove) md += `**Proof Move:** ${j.proofMove}${j.proofMoveCompleted ? " ✓" : j.proofMoveCompleted === false ? " ✗" : ""}\n`;
          if (j.helpingPatternKey) md += `**Success Pattern:** ${j.helpingPatternKey}\n`;
          if (j.hurtingPatternKey) md += `**Shadow Pattern:** ${j.hurtingPatternKey}\n`;
          if (j.triggerOccurred) md += `**Trigger Occurred:** Yes\n`;
          if (j.stuckToolUsed) md += `**Stuck Tool Used:** ${j.stuckToolUsed}\n`;
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
            if (h.source && h.source !== "support") md += ` [${h.source}]`;
            if (h.isPinned) md += ` [pinned]`;
            md += `\n`;
            if (h.proofPatternWhen) md += `  Success: When ${h.proofPatternWhen} → I ${h.proofPatternBehavior || "..."} → ${h.proofPatternOutcome || "..."}\n`;
            if (h.shadowEmotions) md += `  Shadow: ${h.shadowEmotions} → ${h.shadowEnvironment || "..."} → ${h.shadowBehavior || "..."} → ${h.shadowOutcome || "..."}\n`;
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
      md += `---\n\n## Weekly Proof Engine\n\n`;
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
          ["q1", "q2", "q4"].forEach(q => {
            const qItems = items.filter(i => i.quadrant === q);
            if (qItems.length === 0) return;
            const qLabel = q === "q1" ? "Handle" : q === "q2" ? "Protect" : "Not This Week";
            md += `**${qLabel}:**\n`;
            qItems.forEach(i => {
              const done = i.status === "completed" || i.completed;
              const icon = done ? "✓" : i.status === "skipped" ? "✗" : "○";
              md += `  ${icon} ${i.outcome || i.task}`;
              if (i.hardTruthRelated) md += ` [hard truth]`;
              if (i.scheduledDate) md += ` (${i.scheduledDate})`;
              if (i.firstMove) md += ` — first move: ${i.firstMove}`;
              if (i.ifThenStatement) md += ` — if-then: ${i.ifThenStatement}`;
              if (i.revisitDate) md += ` — revisit: ${i.revisitDate}`;
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

      // TRIGGER LOGS
      md += `---\n\n## Trigger Logs\n\n`;
      const tLogs = triggerLogs as { date: string; triggerText: string; appraisal?: string | null; emotion?: string | null; urge?: string | null; whatIDid?: string | null; fromTemplate?: boolean | null }[];
      if (tLogs.length === 0) {
        md += `No trigger logs recorded.\n\n`;
      } else {
        tLogs.forEach((t) => {
          md += `### ${t.date}\n`;
          md += `**What happened:** ${t.triggerText}\n`;
          if (t.appraisal) md += `**Story I told myself:** ${t.appraisal}\n`;
          if (t.emotion) md += `**What I felt:** ${t.emotion}\n`;
          if (t.urge) md += `**What I wanted to do:** ${t.urge}\n`;
          if (t.whatIDid) md += `**What I did:** ${t.whatIDid}\n`;
          if (t.fromTemplate) md += `*(from pattern profile template)*\n`;
          md += `\n`;
        });
      }

      // FEAR LOGS
      md += `---\n\n## Fear Logs\n\n`;
      if (fearLogs.length === 0) {
        md += `No fear logs recorded.\n\n`;
      } else {
        fearLogs.forEach((f: any) => {
          md += `### ${f.date}\n`;
          md += `**Resisting:** ${f.fearTarget}\n`;
          if (f.fearIfFaced) md += `**If I face it:** ${f.fearIfFaced}\n`;
          if (f.fearIfAvoided) md += `**If I avoid it:** ${f.fearIfAvoided}\n`;
          if (f.fearBlocker) md += `**Underneath:** ${f.fearBlocker}\n`;
          if (f.fearFirstMove) md += `**Smallest proof move:** ${f.fearFirstMove}\n`;
          md += `\n`;
        });
      }

      md += `---\n\n`;
      md += `*Exported from The Leaf on ${format(new Date(), "MMMM d, yyyy")}. This document contains all user data and can be used as context for AI analysis.*\n`;

      const filename = `the-leaf-export-${format(new Date(), "yyyy-MM-dd")}.md`;
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(md);
    } catch (error) {
      console.error("Error exporting all data:", (error as Error).message);
      res.status(500).json({ error: "Failed to export data" });
    }
  });
}
