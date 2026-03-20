import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, serial, date, uniqueIndex, check, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Purchases table - tracks course purchases
export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  courseType: varchar("course_type", { length: 50 }).notNull(), // 'phase12', 'phase3', 'allinone' (legacy: 'course1', 'course2', 'bundle')
  stripeSessionId: varchar("stripe_session_id").unique(),
  stripePaymentId: varchar("stripe_payment_id"),
  amount: integer("amount").notNull(), // in cents
  status: varchar("status", { length: 20 }).notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  check("course_type_check", sql`${table.courseType} IN ('phase12', 'phase3', 'allinone', 'course1', 'course2', 'bundle')`),
]);

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  createdAt: true,
});

export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;

// Journals table - for Course 2 journaling
export const journals = pgTable("journals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: date("date").notNull(),
  session: varchar("session", { length: 20 }).notNull(),
  gratitude: text("gratitude"),
  intentions: text("intentions"),
  reflections: text("reflections"),
  highlights: text("highlights"),
  challenges: text("challenges"),
  tomorrowGoals: text("tomorrow_goals"),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("journals_user_date_session_idx").on(table.userId, table.date, table.session),
  check("journal_session_check", sql`${table.session} IN ('morning', 'evening')`),
]);

export const insertJournalSchema = createInsertSchema(journals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Journal = typeof journals.$inferSelect;
export type InsertJournal = z.infer<typeof insertJournalSchema>;

// Eisenhower Matrix entries - weekly planning
export const eisenhowerEntries = pgTable("eisenhower_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  weekStart: date("week_start").notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  task: text("task").notNull(),
  quadrant: varchar("quadrant", { length: 10 }).notNull(),
  deadline: date("deadline"),
  timeEstimate: varchar("time_estimate", { length: 20 }),
  decision: varchar("decision", { length: 50 }),
  scheduledTime: varchar("scheduled_time", { length: 50 }),
  scheduledDate: date("scheduled_date"),
  scheduledStartTime: varchar("scheduled_start_time", { length: 10 }),
  durationMinutes: integer("duration_minutes"),
  goalAlignment: text("goal_alignment"),
  blocksGoal: boolean("blocks_goal").default(false),
  completed: boolean("completed").default(false),
  status: varchar("status", { length: 20 }),
  completionLevel: integer("completion_level"),
  skipReason: varchar("skip_reason", { length: 100 }),
  actualStartTime: varchar("actual_start_time", { length: 10 }),
  actualDuration: integer("actual_duration"),
  startedOnTime: boolean("started_on_time"),
  delayMinutes: integer("delay_minutes"),
  delayReason: varchar("delay_reason", { length: 100 }),
  completedRequiredTime: boolean("completed_required_time"),
  timeShortMinutes: integer("time_short_minutes"),
  timeRange: varchar("time_range", { length: 20 }),
  isBinary: boolean("is_binary").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("eisenhower_user_id_idx").on(table.userId),
  check("eisenhower_quadrant_check", sql`${table.quadrant} IN ('q1', 'q2', 'q3', 'q4', 'unsorted')`),
]);

export const insertEisenhowerEntrySchema = createInsertSchema(eisenhowerEntries).omit({
  id: true,
  createdAt: true,
});

export type EisenhowerEntry = typeof eisenhowerEntries.$inferSelect;
export type InsertEisenhowerEntry = z.infer<typeof insertEisenhowerEntrySchema>;

// Empathy exercises - reflection after interactions
export const empathyExercises = pgTable("empathy_exercises", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  exerciseType: varchar("exercise_type", { length: 20 }).default("debrief").notNull(),
  date: date("date").notNull(),
  who: varchar("who", { length: 100 }).notNull(),
  context: text("context"),
  theirEmotionalState: text("their_emotional_state"),
  myEmotionalState: text("my_emotional_state"),
  factsObserved: text("facts_observed"),
  howICameAcross: text("how_i_came_across"),
  howTheyLikelyFelt: text("how_they_likely_felt"),
  whatMattersToThem: text("what_matters_to_them"),
  whatTheyNeed: text("what_they_need"),
  nextAction: text("next_action"),
  didConfirm: text("did_confirm"),
  intention: text("intention"),
  leaveThemFeeling: text("leave_them_feeling"),
  triggerRiskIfThen: text("trigger_risk_if_then"),
  themHypothesis: text("them_hypothesis"),
  realityCheckQuestion: text("reality_check_question"),
  reflectionValidation: text("reflection_validation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmpathyExerciseSchema = createInsertSchema(empathyExercises).omit({
  id: true,
  createdAt: true,
});

export type EmpathyExercise = typeof empathyExercises.$inferSelect;
export type InsertEmpathyExercise = z.infer<typeof insertEmpathyExerciseSchema>;

// Habit categories with colors
export const HABIT_CATEGORIES = {
  health: { label: "Health", color: "emerald" },
  wealth: { label: "Wealth", color: "yellow" },
  relationships: { label: "Relationships", color: "rose" },
  "self-development": { label: "Self-Development", color: "blue" },
  happiness: { label: "Happiness", color: "slate" },
} as const;

export type HabitCategory = keyof typeof HABIT_CATEGORIES;

// Daily habits - weekly recurring habits
export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 30 }).default("health"),
  timing: varchar("timing", { length: 20 }).default("afternoon"),
  cadence: varchar("cadence", { length: 50 }).notNull(),
  duration: integer("duration"),
  startDate: varchar("start_date", { length: 10 }),
  endDate: varchar("end_date", { length: 10 }),
  sortOrder: integer("sort_order").default(0),
  isBinary: boolean("is_binary").default(false),
  active: boolean("active").default(true),
  lineageId: varchar("lineage_id", { length: 36 }),
  versionNumber: integer("version_number").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("habits_user_id_idx").on(table.userId),
  index("habits_user_lineage_idx").on(table.userId, table.lineageId),
  check("habit_category_check", sql`${table.category} IN ('health', 'wealth', 'relationships', 'self-development', 'happiness')`),
  check("habit_timing_check", sql`${table.timing} IN ('morning', 'afternoon', 'evening')`),
]);

export const insertHabitSchema = createInsertSchema(habits).omit({
  id: true,
  createdAt: true,
});

export type Habit = typeof habits.$inferSelect;
export type InsertHabit = z.infer<typeof insertHabitSchema>;

// Habit completions - daily check-offs
export const habitCompletions = pgTable("habit_completions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  habitId: integer("habit_id").notNull(),
  date: date("date").notNull(),
  status: varchar("status", { length: 20 }).default("completed").notNull(),
  completionLevel: integer("completion_level"),
  skipReason: varchar("skip_reason", { length: 100 }),
  skipReasonSource: varchar("skip_reason_source", { length: 20 }),
  skipReasonTimestamp: timestamp("skip_reason_timestamp"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("habit_completions_user_habit_date_idx").on(table.userId, table.habitId, table.date),
  check("habit_completion_status_check", sql`${table.status} IN ('completed', 'skipped', 'minimum')`),
]);

export const insertHabitCompletionSchema = createInsertSchema(habitCompletions).omit({
  id: true,
  createdAt: true,
});

export type HabitCompletion = typeof habitCompletions.$inferSelect;
export type InsertHabitCompletion = z.infer<typeof insertHabitCompletionSchema>;


export const meditationInsights = pgTable("meditation_insights", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: date("date").notNull(),
  insight: text("insight").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMeditationInsightSchema = createInsertSchema(meditationInsights).omit({
  id: true,
  createdAt: true,
});

export type MeditationInsight = typeof meditationInsights.$inferSelect;
export type InsertMeditationInsight = z.infer<typeof insertMeditationInsightSchema>;

// Monthly Goals - one per user per month
export const monthlyGoals = pgTable("monthly_goals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  monthKey: varchar("month_key", { length: 7 }).notNull(), // YYYY-MM
  value: text("value").default(""),
  strengths: text("strengths").default(""),
  advantage: text("advantage").default(""),
  goalWhat: text("goal_what").default(""),
  goalWhen: text("goal_when").default(""),
  goalWhere: text("goal_where").default(""),
  goalHow: text("goal_how").default(""),
  blockingHabit: text("blocking_habit").default(""),
  habitAddress: text("habit_address").default(""),
  prize: text("prize").default(""),
  fun: text("fun").default(""),
  deadline: text("deadline").default(""),
  goalStatement: text("goal_statement").notNull().default(""),
  successMarker: text("success_marker").default(""),
  why: text("why").default(""),
  nextConcreteStep: text("next_concrete_step").notNull().default(""),
  successProof: text("success_proof").default(""),
  proofMetric: text("proof_metric").default(""),
  weeklyBehavior: text("weekly_behavior").default(""),
  bestResult: text("best_result").default(""),
  innerObstacle: text("inner_obstacle").default(""),
  obstacleTrigger: text("obstacle_trigger").default(""),
  obstacleThought: text("obstacle_thought").default(""),
  obstacleEmotion: text("obstacle_emotion").default(""),
  obstacleBehavior: text("obstacle_behavior").default(""),
  ifThenPlan1: text("if_then_plan_1").default(""),
  ifThenPlan2: text("if_then_plan_2").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("monthly_goals_user_month_idx").on(table.userId, table.monthKey),
]);

export const insertMonthlyGoalSchema = createInsertSchema(monthlyGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MonthlyGoal = typeof monthlyGoals.$inferSelect;
export type InsertMonthlyGoal = z.infer<typeof insertMonthlyGoalSchema>;

export const identityDocuments = pgTable("identity_documents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  identity: text("identity").notNull().default(""),
  vision: text("vision").notNull().default(""),
  values: text("values").notNull().default(""),
  yearVision: text("year_vision").default(""),
  yearVisualization: text("year_visualization").default(""),
  visionBoardMain: text("vision_board_main").default(""),
  visionBoardLeft: text("vision_board_left").default(""),
  visionBoardRight: text("vision_board_right").default(""),
  purpose: text("purpose").default(""),
  todayValue: varchar("today_value", { length: 200 }).default(""),
  todayIntention: text("today_intention").default(""),
  todayReflection: text("today_reflection").default(""),
  othersWillSee: text("others_will_see").default(""),
  beYourself: text("be_yourself").default(""),
  strengths: text("strengths").default(""),
  helpingPatterns: text("helping_patterns").default(""),
  hurtingPatterns: text("hurting_patterns").default(""),
  stressResponses: text("stress_responses").default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIdentityDocumentSchema = createInsertSchema(identityDocuments).omit({
  id: true,
  updatedAt: true,
});

export type IdentityDocument = typeof identityDocuments.$inferSelect;
export type InsertIdentityDocument = z.infer<typeof insertIdentityDocumentSchema>;

// Quarterly Goals - one per user per quarter
export const quarterlyGoals = pgTable("quarterly_goals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  quarterKey: varchar("quarter_key", { length: 10 }).notNull(),
  quarterlyFocus: text("quarterly_focus").default(""),
  outcomeStatement: text("outcome_statement").default(""),
  measurementPlan: text("measurement_plan").default(""),
  baseline: text("baseline").default(""),
  target: text("target").default(""),
  prize: text("prize").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("quarterly_goals_user_quarter_idx").on(table.userId, table.quarterKey),
]);

export const insertQuarterlyGoalSchema = createInsertSchema(quarterlyGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type QuarterlyGoal = typeof quarterlyGoals.$inferSelect;
export type InsertQuarterlyGoal = z.infer<typeof insertQuarterlyGoalSchema>;


export const toolUsageLogs = pgTable("tool_usage_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  toolName: varchar("tool_name", { length: 100 }).notNull(),
  moodBefore: integer("mood_before").notNull(),
  emotionBefore: varchar("emotion_before", { length: 100 }).notNull(),
  moodAfter: integer("mood_after"),
  emotionAfter: varchar("emotion_after", { length: 100 }),
  completed: boolean("completed").default(false),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("tool_usage_user_id_idx").on(table.userId),
  check("mood_before_range", sql`${table.moodBefore} BETWEEN 1 AND 5`),
  check("mood_after_range", sql`${table.moodAfter} IS NULL OR ${table.moodAfter} BETWEEN 1 AND 5`),
]);

export const insertToolUsageLogSchema = createInsertSchema(toolUsageLogs).omit({
  id: true,
  createdAt: true,
});

export type ToolUsageLog = typeof toolUsageLogs.$inferSelect;
export type InsertToolUsageLog = z.infer<typeof insertToolUsageLogSchema>;

export const triggerLogs = pgTable("trigger_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: date("date").notNull(),
  timeOfDay: varchar("time_of_day", { length: 20 }),
  context: varchar("context", { length: 50 }),
  triggerText: text("trigger_text").notNull(),
  emotion: varchar("emotion", { length: 50 }).notNull(),
  emotionIntensity: integer("emotion_intensity").notNull(),
  urge: varchar("urge", { length: 50 }).notNull(),
  urgeIntensity: integer("urge_intensity").notNull(),
  whatIDid: text("what_i_did"),
  outcome: text("outcome"),
  recoveryMinutes: integer("recovery_minutes"),
  appraisal: text("appraisal"),
  actionTaken: varchar("action_taken", { length: 100 }),
  bodyState: text("body_state"),
  recoveryTime: varchar("recovery_time", { length: 50 }),
  reflection: text("reflection"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("trigger_logs_user_id_idx").on(table.userId),
]);

export const insertTriggerLogSchema = createInsertSchema(triggerLogs).omit({
  id: true,
  createdAt: true,
});

export type TriggerLog = typeof triggerLogs.$inferSelect;
export type InsertTriggerLog = z.infer<typeof insertTriggerLogSchema>;

export const avoidanceLogs = pgTable("avoidance_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: date("date").notNull(),
  avoidingWhat: text("avoiding_what").notNull(),
  avoidanceDelay: varchar("avoidance_delay", { length: 50 }),
  discomfort: integer("discomfort").notNull(),
  smallestExposure: text("smallest_exposure"),
  startedNow: boolean("started_now").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("avoidance_logs_user_id_idx").on(table.userId),
]);

export const insertAvoidanceLogSchema = createInsertSchema(avoidanceLogs).omit({
  id: true,
  createdAt: true,
});

export type AvoidanceLog = typeof avoidanceLogs.$inferSelect;
export type InsertAvoidanceLog = z.infer<typeof insertAvoidanceLogSchema>;

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  onboardingStep: integer("onboarding_step").default(0).notNull(),
  onboardingComplete: boolean("onboarding_complete").default(false).notNull(),
  hasAccess: boolean("has_access").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("user_settings_user_id_idx").on(table.userId),
]);

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

export const customTools = pgTable("custom_tools", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  instructions: text("instructions"),
  icon: varchar("icon", { length: 50 }).default("Sparkles"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCustomToolSchema = createInsertSchema(customTools).omit({
  id: true,
  createdAt: true,
});

export type CustomTool = typeof customTools.$inferSelect;
export type InsertCustomTool = z.infer<typeof insertCustomToolSchema>;
