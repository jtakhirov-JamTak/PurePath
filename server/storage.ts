import { db } from "./db";
import { 
  purchases, journals, chatMessages, eisenhowerEntries, empathyExercises, habits, habitCompletions, tasks, meditationInsights, identityDocuments, monthlyGoals, planVersions, toolUsageLogs, customTools, triggerLogs, avoidanceLogs, userSettings,
  type Purchase, type InsertPurchase, 
  type Journal, type InsertJournal, 
  type ChatMessage, type InsertChatMessage,
  type EisenhowerEntry, type InsertEisenhowerEntry,
  type EmpathyExercise, type InsertEmpathyExercise,
  type Habit, type InsertHabit,
  type HabitCompletion, type InsertHabitCompletion,
  type Task, type InsertTask,
  type MeditationInsight, type InsertMeditationInsight,
  type IdentityDocument, type InsertIdentityDocument,
  type MonthlyGoal, type InsertMonthlyGoal,
  type PlanVersion, type InsertPlanVersion,
  type ToolUsageLog, type InsertToolUsageLog,
  type CustomTool, type InsertCustomTool,
  type TriggerLog, type InsertTriggerLog,
  type AvoidanceLog, type InsertAvoidanceLog,
  type UserSettings,
} from "@shared/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  getPurchasesByUser(userId: string): Promise<Purchase[]>;
  getPurchaseBySessionId(stripeSessionId: string): Promise<Purchase | undefined>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  createPurchaseIfNotExists(purchase: InsertPurchase): Promise<{ purchase: Purchase; created: boolean }>;
  updatePurchaseStatus(purchaseId: number, status: string): Promise<void>;
  hasCourseAccess(userId: string, courseType: string): Promise<boolean>;
  
  getJournalsByUser(userId: string): Promise<Journal[]>;
  getJournal(userId: string, date: string, session: string): Promise<Journal | undefined>;
  createOrUpdateJournal(journal: InsertJournal): Promise<Journal>;
  
  getChatMessagesByUser(userId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
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

  // Habit Completions
  getHabitCompletionsForDate(userId: string, date: string): Promise<HabitCompletion[]>;
  getHabitCompletionsForRange(userId: string, startDate: string, endDate: string): Promise<HabitCompletion[]>;
  createHabitCompletion(completion: InsertHabitCompletion): Promise<HabitCompletion>;
  updateHabitCompletionStatus(userId: string, habitId: number, date: string, status: string): Promise<void>;
  deleteHabitCompletion(userId: string, habitId: number, date: string): Promise<void>;
  
  // Tasks
  getTasksByUser(userId: string): Promise<Task[]>;
  getTasksForDate(userId: string, date: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;

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

  // Plan Versions
  getPlanVersionsByUser(userId: string): Promise<PlanVersion[]>;
  createPlanVersion(version: InsertPlanVersion): Promise<PlanVersion>;
  deletePlanVersion(id: number): Promise<void>;

  // Bulk clear for plan versioning
  clearUserPlanData(userId: string, monthKey: string): Promise<void>;

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
  upsertUserSettings(userId: string, updates: { onboardingStep?: number; onboardingComplete?: boolean }): Promise<UserSettings>;
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

  async hasCourseAccess(userId: string, courseType: string): Promise<boolean> {
    const userPurchases = await this.getPurchasesByUser(userId);
    return userPurchases.some(p => {
      if (p.status !== "completed") return false;
      // "allinone" and legacy "bundle" grant access to everything
      if (p.courseType === "allinone" || p.courseType === "bundle") return true;
      // Map new phase types to old course types for backward compatibility
      if (courseType === "course1" || courseType === "phase12") {
        return p.courseType === "phase12" || p.courseType === "course1";
      }
      if (courseType === "course2") {
        return p.courseType === "phase12" || p.courseType === "course2";
      }
      if (courseType === "phase3") {
        return p.courseType === "phase3";
      }
      return p.courseType === courseType;
    });
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

  async getChatMessagesByUser(userId: string): Promise<ChatMessage[]> {
    return db.select().from(chatMessages).where(eq(chatMessages.userId, userId)).orderBy(chatMessages.createdAt);
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    return newMessage;
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
    return db.select().from(habits).where(eq(habits.userId, userId)).orderBy(habits.time);
  }

  async createHabit(habit: InsertHabit): Promise<Habit> {
    const [newHabit] = await db.insert(habits).values(habit).returning();
    return newHabit;
  }

  async updateHabit(id: number, habit: Partial<InsertHabit>): Promise<Habit> {
    const [updated] = await db.update(habits).set(habit).where(eq(habits.id, id)).returning();
    return updated;
  }

  async deleteHabit(id: number): Promise<void> {
    await db.delete(habits).where(eq(habits.id, id));
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

  // Tasks
  async getTasksByUser(userId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.date), tasks.time);
  }

  async getTasksForDate(userId: string, date: string): Promise<Task[]> {
    return db.select().from(tasks)
      .where(and(
        eq(tasks.userId, userId),
        eq(tasks.date, date)
      ))
      .orderBy(tasks.time);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task> {
    const [updated] = await db.update(tasks).set(task).where(eq(tasks.id, id)).returning();
    return updated;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
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
  async getPlanVersionsByUser(userId: string): Promise<PlanVersion[]> {
    return db.select().from(planVersions).where(eq(planVersions.userId, userId)).orderBy(desc(planVersions.createdAt));
  }

  async createPlanVersion(version: InsertPlanVersion): Promise<PlanVersion> {
    const [newVersion] = await db.insert(planVersions).values(version).returning();
    return newVersion;
  }

  async deletePlanVersion(id: number): Promise<void> {
    await db.delete(planVersions).where(eq(planVersions.id, id));
  }

  async clearUserPlanData(userId: string, monthKey: string): Promise<void> {
    await db.update(identityDocuments).set({
      yearVision: "", yearVisualization: "",
      visionBoardMain: "", visionBoardLeft: "", visionBoardRight: "",
      updatedAt: new Date(),
    }).where(eq(identityDocuments.userId, userId));
    await db.delete(monthlyGoals).where(
      and(eq(monthlyGoals.userId, userId), eq(monthlyGoals.monthKey, monthKey))
    );
    await db.update(habits).set({ active: false }).where(eq(habits.userId, userId));
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

  async upsertUserSettings(userId: string, updates: { onboardingStep?: number; onboardingComplete?: boolean }): Promise<UserSettings> {
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
