import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, serial, date, uniqueIndex, check } from "drizzle-orm/pg-core";
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
  session: varchar("session", { length: 20 }).notNull(), // 'morning', 'evening'
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
  // One entry per user per date per session (enables upsert pattern)
  uniqueIndex("journals_user_date_session_idx").on(table.userId, table.date, table.session),
]);

export const insertJournalSchema = createInsertSchema(journals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Journal = typeof journals.$inferSelect;
export type InsertJournal = z.infer<typeof insertJournalSchema>;

// Chat messages for Course 1 GPT
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  role: varchar("role", { length: 20 }).notNull(), // 'user', 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Course definitions (static, not in DB)
// Phase 1+2 = Self-Reflection + Structure, Phase 3 = Transformation, All-in-one = Everything
export const COURSES = {
  phase12: {
    id: "phase12",
    name: "Self-Reflection & Structure",
    description: "Phase 1 & 2: Discover who you are, who you want to be, and build the structure to get there",
    price: 39900, // $399
    stripePriceEnvVar: "STRIPE_PRICE_PHASE12",
    features: [
      "Phase 1: Video lessons + AI-guided self-discovery",
      "Lesson 1: Who Am I? - Deep self-reflection",
      "Lesson 2: Who Do I Want To Be? - Vision building",
      "Phase 2: Structure & daily tools",
      "Lesson 3: How To Get There - Implementation guide",
      "Journaling, Meditation, Eisenhower Matrix & more",
      "Weekly habits & daily task management",
    ],
  },
  phase3: {
    id: "phase3",
    name: "Transformation",
    description: "Phase 3: Understand your patterns and transform them with AI-powered analysis",
    price: 29900, // $299
    stripePriceEnvVar: "STRIPE_PRICE_PHASE3",
    features: [
      "Lesson: You Are Your Patterns - Video lesson",
      "AI-powered pattern analysis agent",
      "Upload your self-discovery documents",
      "Receive personalized transformation insights",
      "Downloadable transformation report",
    ],
  },
  allinone: {
    id: "allinone",
    name: "Complete Inner Journey",
    description: "All 3 phases: the complete self-discovery and transformation experience",
    price: 49900, // $499 (save $199)
    stripePriceEnvVar: "STRIPE_PRICE_ALLINONE",
    features: [
      "Everything in Phase 1 & 2",
      "Everything in Phase 3",
      "Save $199 with the complete package",
      "Full lifetime access to all content",
      "All future updates included",
    ],
  },
} as const;

export type CourseType = keyof typeof COURSES;

// Eisenhower Matrix entries - weekly planning
export const eisenhowerEntries = pgTable("eisenhower_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  weekStart: date("week_start").notNull(), // Monday of the week
  role: varchar("role", { length: 50 }).notNull(), // 'health', 'wealth', 'relationships'
  task: text("task").notNull(),
  quadrant: varchar("quadrant", { length: 10 }).notNull(), // 'q1', 'q2', 'q3', 'q4'
  deadline: date("deadline"),
  timeEstimate: varchar("time_estimate", { length: 20 }), // e.g., "60m", "2h"
  decision: varchar("decision", { length: 50 }), // 'do_today', 'schedule', 'delegate', 'delete'
  scheduledTime: varchar("scheduled_time", { length: 50 }),
  goalAlignment: text("goal_alignment"),
  blocksGoal: boolean("blocks_goal").default(false),
  completed: boolean("completed").default(false),
  status: varchar("status", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  wealth: { label: "Wealth", color: "amber" },
  relationships: { label: "Relationships", color: "rose" },
  career: { label: "Career", color: "blue" },
  mindfulness: { label: "Mindfulness", color: "violet" },
  learning: { label: "Learning", color: "cyan" },
} as const;

export type HabitCategory = keyof typeof HABIT_CATEGORIES;

// Daily habits - weekly recurring habits
export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 30 }).default("health"),
  habitType: varchar("habit_type", { length: 30 }).default("maintenance"), // 'goal', 'learning', 'maintenance'
  timing: varchar("timing", { length: 20 }).default("daily"), // 'morning', 'daily', 'evening'
  cadence: varchar("cadence", { length: 50 }).notNull(),
  recurring: varchar("recurring", { length: 20 }).default("indefinite"),
  duration: integer("duration"),
  startTime: varchar("start_time", { length: 10 }),
  endTime: varchar("end_time", { length: 10 }),
  time: varchar("time", { length: 20 }).notNull(),
  startDate: varchar("start_date", { length: 10 }),
  endDate: varchar("end_date", { length: 10 }),
  active: boolean("active").default(true),
  googleCalendarEventId: varchar("google_calendar_event_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("habit_completions_user_habit_date_idx").on(table.userId, table.habitId, table.date),
]);

export const insertHabitCompletionSchema = createInsertSchema(habitCompletions).omit({
  id: true,
  createdAt: true,
});

export type HabitCompletion = typeof habitCompletions.$inferSelect;
export type InsertHabitCompletion = z.infer<typeof insertHabitCompletionSchema>;

// Daily tasks - specific tasks for specific dates
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  date: date("date").notNull(),
  time: varchar("time", { length: 20 }).notNull(), // '09:00', '14:30', etc.
  quadrant: varchar("quadrant", { length: 10 }), // 'q1', 'q2', 'q3', 'q4' - Eisenhower quadrant
  scheduledTime: varchar("scheduled_time", { length: 50 }), // required when quadrant is 'q2'
  completed: boolean("completed").default(false),
  googleCalendarEventId: varchar("google_calendar_event_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

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
  goalStatement: text("goal_statement").notNull().default(""),
  successMarker: text("success_marker").default(""),
  why: text("why").default(""),
  nextConcreteStep: text("next_concrete_step").notNull().default(""),
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
  purpose: text("purpose").default(""),
  todayValue: varchar("today_value", { length: 200 }).default(""),
  todayIntention: text("today_intention").default(""),
  todayReflection: text("today_reflection").default(""),
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
