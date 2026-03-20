import { db } from "./db";
import { 
  purchases, journals, eisenhowerEntries, empathyExercises, habits, habitCompletions, meditationInsights, identityDocuments, monthlyGoals, toolUsageLogs, customTools, triggerLogs, avoidanceLogs, userSettings,
  type Purchase, type InsertPurchase,
  type Journal, type InsertJournal,
  type EisenhowerEntry, type InsertEisenhowerEntry,
  type EmpathyExercise, type InsertEmpathyExercise,
  type Habit, type InsertHabit,
  type HabitCompletion, type InsertHabitCompletion,
  type MeditationInsight, type InsertMeditationInsight,
  type IdentityDocument, type InsertIdentityDocument,
  type MonthlyGoal, type InsertMonthlyGoal,
  type ToolUsageLog, type InsertToolUsageLog,
  type CustomTool, type InsertCustomTool,
  type TriggerLog, type InsertTriggerLog,
  type AvoidanceLog, type InsertAvoidanceLog,
  type UserSettings,
} from "@shared/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import crypto from "crypto";

export interface IStorage {
  getPurchasesByUser(userId: string): Promise<Purchase[]>;
  getPurchaseBySessionId(stripeSessionId: string): Promise<Purchase | undefined>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  createPurchaseIfNotExists(purchase: InsertPurchase): Promise<{ purchase: Purchase; created: boolean }>;
  updatePurchaseStatus(purchaseId: number, status: string): Promise<void>;
  hasAccess(userId: string): Promise<boolean>;

  getJournalsByUser(userId: string): Promise<Journal[]>;
  getJournal(userId: string, date: string, session: string): Promise<Journal | undefined>;
  createOrUpdateJournal(journal: InsertJournal): Promise<Journal>;
  
  // Eisenhower Matrix
  getEisenhowerEntriesByUser(userId: string): Promise<EisenhowerEntry[]>;
  getEisenhowerEntriesForWeek(userId: string, weekStart: string): Promise<EisenhowerEntry[]>;
  createEisenhowerEntry(entry: InsertEisenhowerEntry): Promise<EisenhowerEntry>;
  updateEisenhowerEntry(id: number, entry: Partial<InsertEisenhowerEntry>): Promise<EisenhowerEntry>;
  deleteEisenhowerEntry(id: number): Promise<void>;
  
  // Empathy Exercises
  getEmpathyExercisesByUser(userId: string): Promise<EmpathyExercise[]>;
  createEmpathyExercise(exercise: InsertEmpathyExercise): Promise<EmpathyExercise>;
  updateEmpathyExercise(id: number, exercise: Partial<InsertEmpathyExercise>): Promise<EmpathyExercise>;
  deleteEmpathyExercise(id: number): Promise<void>;
  
  // Habits
  getHabitsByUser(userId: string): Promise<Habit[]>;
  createHabit(habit: InsertHabit): Promise<Habit>;
  updateHabit(id: number, habit: Partial<InsertHabit>): Promise<Habit>;
  deleteHabit(id: number): Promise<void>;
  versionHabit(oldHabitId: number, newData: Partial<InsertHabit>): Promise<Habit>;

  // Habit Completions
  getHabitCompletionsForDate(userId: string, date: string): Promise<HabitCompletion[]>;
  getHabitCompletionsForRange(userId: string, startDate: string, endDate: string): Promise<HabitCompletion[]>;
  createHabitCompletion(completion: InsertHabitCompletion): Promise<HabitCompletion>;
  updateHabitCompletionStatus(userId: string, habitId: number, date: string, status: string): Promise<void>;
  deleteHabitCompletion(userId: string, habitId: number, date: string): Promise<void>;
  

  // Meditation Insights
  getMeditationInsightsByUser(userId: string): Promise<MeditationInsight[]>;
  createMeditationInsight(insight: InsertMeditationInsight): Promise<MeditationInsight>;
  deleteMeditationInsight(id: number): Promise<void>;

  // Identity Document
  getIdentityDocument(userId: string): Promise<IdentityDocument | undefined>;
  upsertIdentityDocument(doc: InsertIdentityDocument): Promise<IdentityDocument>;

  // Monthly Goals
  getMonthlyGoal(userId: string, monthKey: string): Promise<MonthlyGoal | undefined>;
  upsertMonthlyGoal(goal: InsertMonthlyGoal): Promise<MonthlyGoal>;

  // Tool Usage Logs
  getToolUsageLogsByUser(userId: string): Promise<ToolUsageLog[]>;
  getToolUsageLogsForRange(userId: string, startDate: string, endDate: string): Promise<ToolUsageLog[]>;
  createToolUsageLog(log: InsertToolUsageLog): Promise<ToolUsageLog>;
  updateToolUsageLog(id: number, updates: Partial<InsertToolUsageLog>): Promise<ToolUsageLog>;

  // Custom Tools
  getCustomToolsByUser(userId: string): Promise<CustomTool[]>;
  createCustomTool(tool: InsertCustomTool): Promise<CustomTool>;
  updateCustomTool(id: number, updates: Partial<InsertCustomTool>): Promise<CustomTool>;
  deleteCustomTool(id: number): Promise<void>;

  // Trigger Logs
  getTriggerLogsByUser(userId: string): Promise<TriggerLog[]>;
  createTriggerLog(log: InsertTriggerLog): Promise<TriggerLog>;

  // Avoidance Logs
  getAvoidanceLogsByUser(userId: string): Promise<AvoidanceLog[]>;
  createAvoidanceLog(log: InsertAvoidanceLog): Promise<AvoidanceLog>;

  // Habit completion level updates
  updateHabitCompletionFull(userId: string, habitId: number, date: string, updates: { status: string; completionLevel?: number | null; skipReason?: string | null }): Promise<void>;

  // User Settings
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  upsertUserSettings(userId: string, updates: { onboardingStep?: number; onboardingComplete?: boolean; hasAccess?: boolean }): Promise<UserSettings>;
}

export class DatabaseStorage implements IStorage {
  async getPurchasesByUser(userId: string): Promise<Purchase[]> {
    return db.select().from(purchases).where(eq(purchases.userId, userId)).orderBy(desc(purchases.createdAt));
  }

  async getPurchaseBySessionId(stripeSessionId: string): Promise<Purchase | undefined> {
    const [purchase] = await db.select().from(purchases).where(eq(purchases.stripeSessionId, stripeSessionId));
    return purchase;
  }

  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    const [newPurchase] = await db.insert(purchases).values(purchase).returning();
    return newPurchase;
  }

  async createPurchaseIfNotExists(purchase: InsertPurchase): Promise<{ purchase: Purchase; created: boolean }> {
    if (purchase.stripeSessionId) {
      const existing = await this.getPurchaseBySessionId(purchase.stripeSessionId);
      if (existing) {
        return { purchase: existing, created: false };
      }
    }
    const newPurchase = await this.createPurchase(purchase);
    return { purchase: newPurchase, created: true };
  }

  async updatePurchaseStatus(purchaseId: number, status: string): Promise<void> {
    await db.update(purchases).set({ status }).where(eq(purchases.id, purchaseId));
  }

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

  async updateEisenhowerEntry(id: number, entry: Partial<InsertEisenhowerEntry>): Promise<EisenhowerEntry> {
    const [updated] = await db.update(eisenhowerEntries).set(entry).where(eq(eisenhowerEntries.id, id)).returning();
    return updated;
  }

  async deleteEisenhowerEntry(id: number): Promise<void> {
    await db.delete(eisenhowerEntries).where(eq(eisenhowerEntries.id, id));
  }

  // Empathy Exercises
  async getEmpathyExercisesByUser(userId: string): Promise<EmpathyExercise[]> {
    return db.select().from(empathyExercises).where(eq(empathyExercises.userId, userId)).orderBy(desc(empathyExercises.createdAt));
  }

  async createEmpathyExercise(exercise: InsertEmpathyExercise): Promise<EmpathyExercise> {
    const [newExercise] = await db.insert(empathyExercises).values(exercise).returning();
    return newExercise;
  }

  async updateEmpathyExercise(id: number, exercise: Partial<InsertEmpathyExercise>): Promise<EmpathyExercise> {
    const [updated] = await db.update(empathyExercises).set(exercise).where(eq(empathyExercises.id, id)).returning();
    return updated;
  }

  async deleteEmpathyExercise(id: number): Promise<void> {
    await db.delete(empathyExercises).where(eq(empathyExercises.id, id));
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

  async updateHabit(id: number, habit: Partial<InsertHabit>): Promise<Habit> {
    const [updated] = await db.update(habits).set(habit).where(eq(habits.id, id)).returning();
    return updated;
  }

  async deleteHabit(id: number): Promise<void> {
    await db.delete(habits).where(eq(habits.id, id));
  }

  async versionHabit(oldHabitId: number, newData: Partial<InsertHabit>): Promise<Habit> {
    return db.transaction(async (tx) => {
      const [oldHabit] = await tx.select().from(habits).where(eq(habits.id, oldHabitId));
      if (!oldHabit) throw new Error("Habit not found");

      const todayStr = new Date().toISOString().slice(0, 10);

      // Archive the old habit
      await tx.update(habits).set({ endDate: todayStr, active: false }).where(eq(habits.id, oldHabitId));

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


  // Meditation Insights
  async getMeditationInsightsByUser(userId: string): Promise<MeditationInsight[]> {
    return db.select().from(meditationInsights).where(eq(meditationInsights.userId, userId)).orderBy(desc(meditationInsights.date));
  }

  async createMeditationInsight(insight: InsertMeditationInsight): Promise<MeditationInsight> {
    const [newInsight] = await db.insert(meditationInsights).values(insight).returning();
    return newInsight;
  }

  async deleteMeditationInsight(id: number): Promise<void> {
    await db.delete(meditationInsights).where(eq(meditationInsights.id, id));
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
          beYourself: doc.beYourself,
          strengths: doc.strengths,
          helpingPatterns: doc.helpingPatterns,
          hurtingPatterns: doc.hurtingPatterns,
          stressResponses: doc.stressResponses,
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

  async updateToolUsageLog(id: number, updates: Partial<InsertToolUsageLog>): Promise<ToolUsageLog> {
    const [updated] = await db.update(toolUsageLogs).set(updates).where(eq(toolUsageLogs.id, id)).returning();
    return updated;
  }

  async getCustomToolsByUser(userId: string): Promise<CustomTool[]> {
    return db.select().from(customTools).where(eq(customTools.userId, userId)).orderBy(desc(customTools.createdAt));
  }

  async createCustomTool(tool: InsertCustomTool): Promise<CustomTool> {
    const [created] = await db.insert(customTools).values(tool).returning();
    return created;
  }

  async updateCustomTool(id: number, updates: Partial<InsertCustomTool>): Promise<CustomTool> {
    const [updated] = await db.update(customTools).set(updates).where(eq(customTools.id, id)).returning();
    return updated;
  }

  async deleteCustomTool(id: number): Promise<void> {
    await db.delete(customTools).where(eq(customTools.id, id));
  }

  async getTriggerLogsByUser(userId: string): Promise<TriggerLog[]> {
    return db.select().from(triggerLogs).where(eq(triggerLogs.userId, userId)).orderBy(desc(triggerLogs.createdAt));
  }

  async createTriggerLog(log: InsertTriggerLog): Promise<TriggerLog> {
    const [created] = await db.insert(triggerLogs).values(log).returning();
    return created;
  }

  async getAvoidanceLogsByUser(userId: string): Promise<AvoidanceLog[]> {
    return db.select().from(avoidanceLogs).where(eq(avoidanceLogs.userId, userId)).orderBy(desc(avoidanceLogs.createdAt));
  }

  async createAvoidanceLog(log: InsertAvoidanceLog): Promise<AvoidanceLog> {
    const [created] = await db.insert(avoidanceLogs).values(log).returning();
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

  async upsertUserSettings(userId: string, updates: { onboardingStep?: number; onboardingComplete?: boolean; hasAccess?: boolean }): Promise<UserSettings> {
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
}

export const storage = new DatabaseStorage();
