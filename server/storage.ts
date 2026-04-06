import { db } from "./db";
import {
  users, journals, eisenhowerEntries, habits, habitCompletions, identityDocuments, patternProfiles, monthlyGoals, toolUsageLogs, avoidanceLogs, containmentLogs, triggerLogs, userSettings, weeklySummaries,
  type Journal, type InsertJournal,
  type EisenhowerEntry, type InsertEisenhowerEntry,
  type Habit, type InsertHabit,
  type HabitCompletion, type InsertHabitCompletion,
  type IdentityDocument, type InsertIdentityDocument,
  type PatternProfile, type InsertPatternProfile,
  type MonthlyGoal, type InsertMonthlyGoal,
  type ToolUsageLog, type InsertToolUsageLog,
  type AvoidanceLog, type InsertAvoidanceLog,
  type ContainmentLog, type InsertContainmentLog,
  type TriggerLog, type InsertTriggerLog,
  type UserSettings,
  type WeeklySummary, type InsertWeeklySummary,
} from "@shared/schema";
import { eq, and, desc, gte, lte, sql, inArray } from "drizzle-orm";
import crypto from "crypto";

export interface IStorage {
  hasAccess(userId: string): Promise<boolean>;

  getJournalsByUser(userId: string): Promise<Journal[]>;
  getJournal(userId: string, date: string, session: string): Promise<Journal | undefined>;
  createOrUpdateJournal(journal: InsertJournal): Promise<Journal>;
  
  // Eisenhower Matrix
  getEisenhowerEntriesByUser(userId: string): Promise<EisenhowerEntry[]>;
  getEisenhowerEntriesForWeek(userId: string, weekStart: string): Promise<EisenhowerEntry[]>;
  createEisenhowerEntry(entry: InsertEisenhowerEntry): Promise<EisenhowerEntry>;
  updateEisenhowerEntry(userId: string, id: number, entry: Partial<InsertEisenhowerEntry>): Promise<EisenhowerEntry>;
  deleteEisenhowerEntry(userId: string, id: number): Promise<void>;
  deleteEisenhowerEntriesByGroupId(userId: string, groupId: string): Promise<number>;
  deleteBlocksGoalEntries(userId: string): Promise<number>;
  deleteEisenhowerEntriesForWeek(userId: string, weekStart: string): Promise<number>;

  // Weekly Summaries
  getWeeklySummary(userId: string, weekStart: string): Promise<WeeklySummary | undefined>;
  upsertWeeklySummary(summary: InsertWeeklySummary): Promise<WeeklySummary>;
  commitWeek(userId: string, weekStart: string, items: Omit<InsertEisenhowerEntry, "userId" | "weekStart">[], fearSummary?: InsertWeeklySummary): Promise<{ entries: EisenhowerEntry[]; summary: WeeklySummary | null }>;

  // Habits
  getHabitsByUser(userId: string): Promise<Habit[]>;
  createHabit(habit: InsertHabit): Promise<Habit>;
  updateHabit(userId: string, id: number, habit: Partial<InsertHabit>): Promise<Habit>;
  deleteHabit(userId: string, id: number): Promise<void>;
  versionHabit(userId: string, oldHabitId: number, newData: Partial<InsertHabit>): Promise<Habit>;

  // Habit Completions
  getHabitCompletionsForDate(userId: string, date: string): Promise<HabitCompletion[]>;
  getHabitCompletionsForRange(userId: string, startDate: string, endDate: string): Promise<HabitCompletion[]>;
  createHabitCompletion(completion: InsertHabitCompletion): Promise<HabitCompletion>;
  updateHabitCompletionStatus(userId: string, habitId: number, date: string, status: string): Promise<void>;
  deleteHabitCompletion(userId: string, habitId: number, date: string): Promise<void>;
  

  // Identity Document
  getIdentityDocument(userId: string): Promise<IdentityDocument | undefined>;
  upsertIdentityDocument(doc: InsertIdentityDocument): Promise<IdentityDocument>;

  // Pattern Profile
  getPatternProfile(userId: string): Promise<PatternProfile | undefined>;
  upsertPatternProfile(profile: InsertPatternProfile): Promise<PatternProfile>;

  // Monthly Goals
  getMonthlyGoal(userId: string, monthKey: string): Promise<MonthlyGoal | undefined>;
  getMonthlyGoalsByUser(userId: string): Promise<MonthlyGoal[]>;
  upsertMonthlyGoal(goal: InsertMonthlyGoal): Promise<MonthlyGoal>;

  // Tool Usage Logs
  getToolUsageLogsByUser(userId: string): Promise<ToolUsageLog[]>;
  getToolUsageLogsForRange(userId: string, startDate: string, endDate: string): Promise<ToolUsageLog[]>;
  createToolUsageLog(log: InsertToolUsageLog): Promise<ToolUsageLog>;
  updateToolUsageLog(userId: string, id: number, updates: Partial<InsertToolUsageLog>): Promise<ToolUsageLog>;


  // Avoidance Logs
  getAvoidanceLogsByUser(userId: string): Promise<AvoidanceLog[]>;
  createAvoidanceLog(log: InsertAvoidanceLog): Promise<AvoidanceLog>;


  // Containment Logs
  getContainmentLogsByUser(userId: string): Promise<ContainmentLog[]>;
  createContainmentLog(log: InsertContainmentLog): Promise<ContainmentLog>;

  // Trigger Logs
  getTriggerLogsByUser(userId: string): Promise<TriggerLog[]>;
  createTriggerLog(log: InsertTriggerLog): Promise<TriggerLog>;

  // Habit completion level updates
  updateHabitCompletionFull(userId: string, habitId: number, date: string, updates: { status: string; completionLevel?: number | null; skipReason?: string | null }): Promise<void>;

  // User Settings
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  upsertUserSettings(userId: string, updates: { onboardingStep?: number; onboardingComplete?: boolean; hasAccess?: boolean; personalEmail?: string; cohort?: string | null }): Promise<UserSettings>;

  // Admin
  getAllUsersWithStats(): Promise<Array<{
    id: string; email: string | null; firstName: string | null; lastName: string | null;
    profileImageUrl: string | null; createdAt: Date | null;
    hasAccess: boolean; personalEmail: string | null; onboardingComplete: boolean;
    cohort: string | null; journalCount: number; habitCompletionCount: number; lastActive: Date | null;
  }>>;
  getUserActivityDates(userId: string, startDate: string, endDate: string): Promise<string[]>;
  batchUpdateAccess(userIds: string[], hasAccess: boolean): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async hasAccess(userId: string): Promise<boolean> {
    const settings = await this.getUserSettings(userId);
    return settings?.hasAccess === true;
  }

  async getJournalsByUser(userId: string): Promise<Journal[]> {
    return db.select().from(journals).where(eq(journals.userId, userId)).orderBy(desc(journals.date));
  }

  async getJournal(userId: string, date: string, session: string): Promise<Journal | undefined> {
    const [journal] = await db.select().from(journals)
      .where(and(
        eq(journals.userId, userId),
        eq(journals.date, date),
        eq(journals.session, session)
      ));
    return journal;
  }

  async createOrUpdateJournal(journal: InsertJournal): Promise<Journal> {
    const existing = await this.getJournal(journal.userId, journal.date, journal.session);
    
    if (existing) {
      const [updated] = await db.update(journals)
        .set({ 
          ...journal, 
          updatedAt: new Date() 
        })
        .where(eq(journals.id, existing.id))
        .returning();
      return updated;
    }
    
    const [newJournal] = await db.insert(journals).values(journal).returning();
    return newJournal;
  }

  // Eisenhower Matrix
  async getEisenhowerEntriesByUser(userId: string): Promise<EisenhowerEntry[]> {
    return db.select().from(eisenhowerEntries).where(eq(eisenhowerEntries.userId, userId)).orderBy(desc(eisenhowerEntries.createdAt));
  }

  async getEisenhowerEntriesForWeek(userId: string, weekStart: string): Promise<EisenhowerEntry[]> {
    return db.select().from(eisenhowerEntries)
      .where(and(
        eq(eisenhowerEntries.userId, userId),
        eq(eisenhowerEntries.weekStart, weekStart)
      ))
      .orderBy(eisenhowerEntries.quadrant, eisenhowerEntries.role);
  }

  async createEisenhowerEntry(entry: InsertEisenhowerEntry): Promise<EisenhowerEntry> {
    const [newEntry] = await db.insert(eisenhowerEntries).values(entry).returning();
    return newEntry;
  }

  async updateEisenhowerEntry(userId: string, id: number, entry: Partial<InsertEisenhowerEntry>): Promise<EisenhowerEntry> {
    const [updated] = await db.update(eisenhowerEntries).set(entry).where(and(eq(eisenhowerEntries.id, id), eq(eisenhowerEntries.userId, userId))).returning();
    return updated;
  }

  async deleteEisenhowerEntry(userId: string, id: number): Promise<void> {
    await db.delete(eisenhowerEntries).where(and(eq(eisenhowerEntries.id, id), eq(eisenhowerEntries.userId, userId)));
  }

  async deleteEisenhowerEntriesByGroupId(userId: string, groupId: string): Promise<number> {
    const result = await db.delete(eisenhowerEntries).where(and(
      eq(eisenhowerEntries.userId, userId),
      eq(eisenhowerEntries.groupId, groupId),
    )).returning();
    return result.length;
  }

  async deleteBlocksGoalEntries(userId: string): Promise<number> {
    const result = await db.delete(eisenhowerEntries).where(and(eq(eisenhowerEntries.userId, userId), eq(eisenhowerEntries.blocksGoal, true))).returning();
    return result.length;
  }

  async deleteEisenhowerEntriesForWeek(userId: string, weekStart: string): Promise<number> {
    const result = await db.delete(eisenhowerEntries).where(and(
      eq(eisenhowerEntries.userId, userId),
      eq(eisenhowerEntries.weekStart, weekStart)
    )).returning();
    // Clear dangling fearLinkedEntryId on any existing weekly summary
    await db.update(weeklySummaries)
      .set({ fearLinkedEntryId: null, updatedAt: new Date() })
      .where(and(
        eq(weeklySummaries.userId, userId),
        eq(weeklySummaries.weekStart, weekStart)
      ));
    return result.length;
  }

  // Weekly Summaries
  async getWeeklySummary(userId: string, weekStart: string): Promise<WeeklySummary | undefined> {
    const [summary] = await db.select().from(weeklySummaries).where(and(
      eq(weeklySummaries.userId, userId),
      eq(weeklySummaries.weekStart, weekStart)
    ));
    return summary;
  }

  async upsertWeeklySummary(summary: InsertWeeklySummary): Promise<WeeklySummary> {
    const [result] = await db
      .insert(weeklySummaries)
      .values({ ...summary, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [weeklySummaries.userId, weeklySummaries.weekStart],
        set: {
          fearTarget: summary.fearTarget,
          fearIfFaced: summary.fearIfFaced,
          fearIfAvoided: summary.fearIfAvoided,
          fearBlocker: summary.fearBlocker,
          fearFirstMove: summary.fearFirstMove,
          fearPromotedToQ2: summary.fearPromotedToQ2,
          fearLinkedEntryId: summary.fearLinkedEntryId,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async commitWeek(
    userId: string,
    weekStart: string,
    items: Omit<InsertEisenhowerEntry, "userId" | "weekStart">[],
    fearSummary?: InsertWeeklySummary,
  ): Promise<{ entries: EisenhowerEntry[]; summary: WeeklySummary | null }> {
    return db.transaction(async (tx) => {
      // 1. Wipe existing entries for this week
      await tx.delete(eisenhowerEntries).where(and(
        eq(eisenhowerEntries.userId, userId),
        eq(eisenhowerEntries.weekStart, weekStart)
      ));

      // 2. Insert all new entries
      const entries: EisenhowerEntry[] = [];
      for (const item of items) {
        const [entry] = await tx.insert(eisenhowerEntries).values({
          ...item,
          userId,
          weekStart,
        }).returning();
        entries.push(entry);
      }

      // 3. Upsert fear summary if provided
      let summary: WeeklySummary | null = null;
      if (fearSummary) {
        // Link fear to the matching committed entry
        const linkedId = fearSummary.fearPromotedToQ2
          ? entries.find(e => e.task === fearSummary.fearTarget && e.quadrant === "q2")?.id ?? null
          : null;

        const [result] = await tx
          .insert(weeklySummaries)
          .values({ ...fearSummary, fearLinkedEntryId: linkedId, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: [weeklySummaries.userId, weeklySummaries.weekStart],
            set: {
              fearTarget: fearSummary.fearTarget,
              fearIfFaced: fearSummary.fearIfFaced,
              fearIfAvoided: fearSummary.fearIfAvoided,
              fearBlocker: fearSummary.fearBlocker,
              fearFirstMove: fearSummary.fearFirstMove,
              fearPromotedToQ2: fearSummary.fearPromotedToQ2,
              fearLinkedEntryId: linkedId,
              updatedAt: new Date(),
            },
          })
          .returning();
        summary = result;
      }

      return { entries, summary };
    });
  }

  // Habits
  async getHabitsByUser(userId: string): Promise<Habit[]> {
    return db.select().from(habits).where(eq(habits.userId, userId)).orderBy(habits.sortOrder);
  }

  async createHabit(habit: InsertHabit): Promise<Habit> {
    const values = {
      ...habit,
      lineageId: habit.lineageId || crypto.randomUUID(),
      versionNumber: habit.versionNumber ?? 1,
    };
    const [newHabit] = await db.insert(habits).values(values).returning();
    return newHabit;
  }

  async updateHabit(userId: string, id: number, habit: Partial<InsertHabit>): Promise<Habit> {
    const [updated] = await db.update(habits).set(habit).where(and(eq(habits.id, id), eq(habits.userId, userId))).returning();
    return updated;
  }

  async deleteHabit(userId: string, id: number): Promise<void> {
    await db.delete(habits).where(and(eq(habits.id, id), eq(habits.userId, userId)));
  }

  async versionHabit(userId: string, oldHabitId: number, newData: Partial<InsertHabit>): Promise<Habit> {
    return db.transaction(async (tx) => {
      const [oldHabit] = await tx.select().from(habits).where(and(eq(habits.id, oldHabitId), eq(habits.userId, userId)));
      if (!oldHabit) throw new Error("Habit not found");

      const todayStr = new Date().toISOString().slice(0, 10);

      // Archive the old habit
      await tx.update(habits).set({ endDate: todayStr, active: false }).where(and(eq(habits.id, oldHabitId), eq(habits.userId, userId)));

      // Create new version
      const { id: _id, createdAt: _ca, ...oldFields } = oldHabit;
      const [newHabit] = await tx.insert(habits).values({
        ...oldFields,
        ...newData,
        lineageId: oldHabit.lineageId || crypto.randomUUID(),
        versionNumber: (oldHabit.versionNumber ?? 1) + 1,
        startDate: todayStr,
        endDate: null,
        active: true,
      }).returning();

      return newHabit;
    });
  }

  // Habit Completions
  async getHabitCompletionsForDate(userId: string, date: string): Promise<HabitCompletion[]> {
    return db.select().from(habitCompletions)
      .where(and(
        eq(habitCompletions.userId, userId),
        eq(habitCompletions.date, date)
      ));
  }

  async getHabitCompletionsForRange(userId: string, startDate: string, endDate: string): Promise<HabitCompletion[]> {
    return db.select().from(habitCompletions)
      .where(and(
        eq(habitCompletions.userId, userId),
        sql`${habitCompletions.date} >= ${startDate}`,
        sql`${habitCompletions.date} <= ${endDate}`
      ));
  }

  async createHabitCompletion(completion: InsertHabitCompletion): Promise<HabitCompletion> {
    const [newCompletion] = await db.insert(habitCompletions).values(completion).returning();
    return newCompletion;
  }

  async updateHabitCompletionStatus(userId: string, habitId: number, date: string, status: string): Promise<void> {
    await db.update(habitCompletions)
      .set({ status })
      .where(
        and(
          eq(habitCompletions.userId, userId),
          eq(habitCompletions.habitId, habitId),
          eq(habitCompletions.date, date)
        )
      );
  }

  async deleteHabitCompletion(userId: string, habitId: number, date: string): Promise<void> {
    await db.delete(habitCompletions).where(
      and(
        eq(habitCompletions.userId, userId),
        eq(habitCompletions.habitId, habitId),
        eq(habitCompletions.date, date)
      )
    );
  }


  async getIdentityDocument(userId: string): Promise<IdentityDocument | undefined> {
    const [doc] = await db.select().from(identityDocuments).where(eq(identityDocuments.userId, userId));
    return doc;
  }

  async upsertIdentityDocument(doc: InsertIdentityDocument): Promise<IdentityDocument> {
    const [result] = await db
      .insert(identityDocuments)
      .values({ ...doc, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: identityDocuments.userId,
        set: {
          identity: doc.identity,
          vision: doc.vision,
          values: doc.values,
          yearVision: doc.yearVision,
          yearVisualization: doc.yearVisualization,
          visionBoardMain: doc.visionBoardMain,
          visionBoardLeft: doc.visionBoardLeft,
          visionBoardRight: doc.visionBoardRight,
          purpose: doc.purpose,
          todayValue: doc.todayValue,
          todayIntention: doc.todayIntention,
          todayReflection: doc.todayReflection,
          othersWillSee: doc.othersWillSee,
          // DEPRECATED fields (beYourself, strengths, helpingPatterns, hurtingPatterns, stressResponses) no longer written
          visionDomain: doc.visionDomain,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getPatternProfile(userId: string): Promise<PatternProfile | undefined> {
    const [profile] = await db.select().from(patternProfiles).where(eq(patternProfiles.userId, userId));
    return profile;
  }

  async upsertPatternProfile(profile: InsertPatternProfile): Promise<PatternProfile> {
    const [result] = await db
      .insert(patternProfiles)
      .values({ ...profile, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: patternProfiles.userId,
        set: {
          helpingPattern1Condition: profile.helpingPattern1Condition,
          helpingPattern1Behavior: profile.helpingPattern1Behavior,
          helpingPattern1Impact: profile.helpingPattern1Impact,
          helpingPattern1Outcome: profile.helpingPattern1Outcome,
          helpingPattern2Condition: profile.helpingPattern2Condition,
          helpingPattern2Behavior: profile.helpingPattern2Behavior,
          helpingPattern2Impact: profile.helpingPattern2Impact,
          helpingPattern2Outcome: profile.helpingPattern2Outcome,
          helpingPattern3Condition: profile.helpingPattern3Condition,
          helpingPattern3Behavior: profile.helpingPattern3Behavior,
          helpingPattern3Impact: profile.helpingPattern3Impact,
          helpingPattern3Outcome: profile.helpingPattern3Outcome,
          hurtingPattern1Condition: profile.hurtingPattern1Condition,
          hurtingPattern1Behavior: profile.hurtingPattern1Behavior,
          hurtingPattern1Impact: profile.hurtingPattern1Impact,
          hurtingPattern1Outcome: profile.hurtingPattern1Outcome,
          hurtingPattern2Condition: profile.hurtingPattern2Condition,
          hurtingPattern2Behavior: profile.hurtingPattern2Behavior,
          hurtingPattern2Impact: profile.hurtingPattern2Impact,
          hurtingPattern2Outcome: profile.hurtingPattern2Outcome,
          hurtingPattern3Condition: profile.hurtingPattern3Condition,
          hurtingPattern3Behavior: profile.hurtingPattern3Behavior,
          hurtingPattern3Impact: profile.hurtingPattern3Impact,
          hurtingPattern3Outcome: profile.hurtingPattern3Outcome,
          repeatingLoopStory: profile.repeatingLoopStory,
          repeatingLoopAvoidance: profile.repeatingLoopAvoidance,
          repeatingLoopCost: profile.repeatingLoopCost,
          triggerPatternTrigger: profile.triggerPatternTrigger,
          triggerPatternInterpretation: profile.triggerPatternInterpretation,
          triggerPatternEmotion: profile.triggerPatternEmotion,
          triggerPatternUrge: profile.triggerPatternUrge,
          triggerPatternBehavior: profile.triggerPatternBehavior,
          triggerPatternOutcome: profile.triggerPatternOutcome,
          blindSpot1Pattern: profile.blindSpot1Pattern,
          blindSpot1Outcome: profile.blindSpot1Outcome,
          blindSpot2Pattern: profile.blindSpot2Pattern,
          blindSpot2Outcome: profile.blindSpot2Outcome,
          blindSpot3Pattern: profile.blindSpot3Pattern,
          blindSpot3Outcome: profile.blindSpot3Outcome,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getMonthlyGoal(userId: string, monthKey: string): Promise<MonthlyGoal | undefined> {
    const [goal] = await db.select().from(monthlyGoals).where(
      and(eq(monthlyGoals.userId, userId), eq(monthlyGoals.monthKey, monthKey))
    );
    return goal;
  }

  async getMonthlyGoalsByUser(userId: string): Promise<MonthlyGoal[]> {
    return db.select().from(monthlyGoals).where(eq(monthlyGoals.userId, userId)).orderBy(desc(monthlyGoals.monthKey));
  }

  async upsertMonthlyGoal(goal: InsertMonthlyGoal): Promise<MonthlyGoal> {
    const [result] = await db
      .insert(monthlyGoals)
      .values({ ...goal, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [monthlyGoals.userId, monthlyGoals.monthKey],
        set: {
          value: goal.value,
          strengths: goal.strengths,
          advantage: goal.advantage,
          goalWhat: goal.goalWhat,
          goalWhen: goal.goalWhen,
          goalWhere: goal.goalWhere,
          goalHow: goal.goalHow,
          blockingHabit: goal.blockingHabit,
          habitAddress: goal.habitAddress,
          prize: goal.prize,
          fun: goal.fun,
          deadline: goal.deadline,
          goalStatement: goal.goalStatement,
          successMarker: goal.successMarker,
          why: goal.why,
          nextConcreteStep: goal.nextConcreteStep,
          successProof: goal.successProof,
          proofMetric: goal.proofMetric,
          weeklyBehavior: goal.weeklyBehavior,
          bestResult: goal.bestResult,
          innerObstacle: goal.innerObstacle,
          obstacleTrigger: goal.obstacleTrigger,
          obstacleThought: goal.obstacleThought,
          obstacleEmotion: goal.obstacleEmotion,
          obstacleBehavior: goal.obstacleBehavior,
          ifThenPlan1: goal.ifThenPlan1,
          ifThenPlan2: goal.ifThenPlan2,
          personStatement: goal.personStatement,
          confidenceCheck: goal.confidenceCheck,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }
  async getToolUsageLogsByUser(userId: string): Promise<ToolUsageLog[]> {
    return db.select().from(toolUsageLogs).where(eq(toolUsageLogs.userId, userId)).orderBy(desc(toolUsageLogs.createdAt));
  }

  async getToolUsageLogsForRange(userId: string, startDate: string, endDate: string): Promise<ToolUsageLog[]> {
    return db.select().from(toolUsageLogs).where(
      and(eq(toolUsageLogs.userId, userId), gte(toolUsageLogs.date, startDate), lte(toolUsageLogs.date, endDate))
    ).orderBy(desc(toolUsageLogs.createdAt));
  }

  async createToolUsageLog(log: InsertToolUsageLog): Promise<ToolUsageLog> {
    const [created] = await db.insert(toolUsageLogs).values(log).returning();
    return created;
  }

  async updateToolUsageLog(userId: string, id: number, updates: Partial<InsertToolUsageLog>): Promise<ToolUsageLog> {
    const [updated] = await db.update(toolUsageLogs).set(updates).where(and(eq(toolUsageLogs.id, id), eq(toolUsageLogs.userId, userId))).returning();
    return updated;
  }

  async getAvoidanceLogsByUser(userId: string): Promise<AvoidanceLog[]> {
    return db.select().from(avoidanceLogs).where(eq(avoidanceLogs.userId, userId)).orderBy(desc(avoidanceLogs.createdAt));
  }

  async createAvoidanceLog(log: InsertAvoidanceLog): Promise<AvoidanceLog> {
    const [created] = await db.insert(avoidanceLogs).values(log).returning();
    return created;
  }

  async getContainmentLogsByUser(userId: string): Promise<ContainmentLog[]> {
    return db.select().from(containmentLogs).where(eq(containmentLogs.userId, userId)).orderBy(desc(containmentLogs.createdAt));
  }

  async createContainmentLog(log: InsertContainmentLog): Promise<ContainmentLog> {
    const [created] = await db.insert(containmentLogs).values(log).returning();
    return created;
  }

  async getTriggerLogsByUser(userId: string): Promise<TriggerLog[]> {
    return db.select().from(triggerLogs).where(eq(triggerLogs.userId, userId)).orderBy(desc(triggerLogs.createdAt));
  }

  async createTriggerLog(log: InsertTriggerLog): Promise<TriggerLog> {
    const [created] = await db.insert(triggerLogs).values(log).returning();
    return created;
  }

  async updateHabitCompletionFull(userId: string, habitId: number, date: string, updates: { status: string; completionLevel?: number | null; skipReason?: string | null }): Promise<void> {
    await db.update(habitCompletions).set(updates).where(
      and(eq(habitCompletions.userId, userId), eq(habitCompletions.habitId, habitId), eq(habitCompletions.date, date))
    );
  }

  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings;
  }

  async upsertUserSettings(userId: string, updates: { onboardingStep?: number; onboardingComplete?: boolean; hasAccess?: boolean; personalEmail?: string; cohort?: string | null }): Promise<UserSettings> {
    const [result] = await db
      .insert(userSettings)
      .values({ userId, ...updates, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          ...updates,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getAllUsersWithStats() {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
        hasAccess: userSettings.hasAccess,
        personalEmail: userSettings.personalEmail,
        onboardingComplete: userSettings.onboardingComplete,
        cohort: userSettings.cohort,
        journalCount: sql<number>`(SELECT COUNT(*)::int FROM journals WHERE user_id = ${users.id})`,
        habitCompletionCount: sql<number>`(SELECT COUNT(*)::int FROM habit_completions WHERE user_id = ${users.id})`,
        lastActive: sql<Date>`(SELECT GREATEST(
          (SELECT MAX(created_at) FROM journals WHERE user_id = ${users.id}),
          (SELECT MAX(created_at) FROM habit_completions WHERE user_id = ${users.id}),
          (SELECT MAX(created_at) FROM eisenhower_entries WHERE user_id = ${users.id}),
          (SELECT MAX(created_at) FROM containment_logs WHERE user_id = ${users.id}),
          (SELECT MAX(created_at) FROM avoidance_logs WHERE user_id = ${users.id}),
          (SELECT MAX(created_at) FROM tool_usage_logs WHERE user_id = ${users.id})
        ))`,
      })
      .from(users)
      .leftJoin(userSettings, eq(users.id, userSettings.userId))
      .orderBy(desc(users.createdAt));

    return rows.map(r => ({
      ...r,
      hasAccess: r.hasAccess === true,
      onboardingComplete: r.onboardingComplete === true,
      cohort: r.cohort ?? null,
      journalCount: r.journalCount ?? 0,
      habitCompletionCount: r.habitCompletionCount ?? 0,
      lastActive: r.lastActive ?? null,
    }));
  }

  async getUserActivityDates(userId: string, startDate: string, endDate: string): Promise<string[]> {
    const result = await db.execute(sql`
      SELECT DISTINCT d::text AS active_date FROM (
        SELECT date AS d FROM journals WHERE user_id = ${userId} AND date >= ${startDate}::date AND date <= ${endDate}::date
        UNION
        SELECT date AS d FROM habit_completions WHERE user_id = ${userId} AND date >= ${startDate}::date AND date <= ${endDate}::date
        UNION
        SELECT created_at::date AS d FROM eisenhower_entries WHERE user_id = ${userId} AND created_at::date >= ${startDate}::date AND created_at::date <= ${endDate}::date
        UNION
        SELECT date AS d FROM containment_logs WHERE user_id = ${userId} AND date >= ${startDate}::date AND date <= ${endDate}::date
        UNION
        SELECT date AS d FROM avoidance_logs WHERE user_id = ${userId} AND date >= ${startDate}::date AND date <= ${endDate}::date
        UNION
        SELECT date AS d FROM tool_usage_logs WHERE user_id = ${userId} AND date >= ${startDate}::date AND date <= ${endDate}::date
      ) sub ORDER BY active_date
    `);
    return (result.rows as any[]).map(r => r.active_date);
  }

  async batchUpdateAccess(userIds: string[], hasAccess: boolean): Promise<void> {
    if (userIds.length === 0) return;
    // Ensure all users have a settings row, then bulk update
    await db.transaction(async (tx) => {
      for (const userId of userIds) {
        await tx.insert(userSettings)
          .values({ userId, hasAccess, updatedAt: new Date() })
          .onConflictDoUpdate({ target: userSettings.userId, set: { hasAccess, updatedAt: new Date() } });
      }
    });
  }
}

export const storage = new DatabaseStorage();
