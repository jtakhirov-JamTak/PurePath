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
  courseType: varchar("course_type", { length: 50 }).notNull(), // 'course1', 'course2', 'bundle'
  stripeSessionId: varchar("stripe_session_id").unique(), // Unique constraint for idempotency
  stripePaymentId: varchar("stripe_payment_id"),
  amount: integer("amount").notNull(), // in cents
  status: varchar("status", { length: 20 }).notNull().default("completed"), // 'pending', 'completed', 'refunded'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // Constraint: course_type must be one of the valid values
  check("course_type_check", sql`${table.courseType} IN ('course1', 'course2', 'bundle')`),
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
// For production: Set STRIPE_PRICE_COURSE1, STRIPE_PRICE_COURSE2, STRIPE_PRICE_BUNDLE env vars
// with stable Stripe Price IDs from your dashboard. If not set, inline price_data will be used.
export const COURSES = {
  course1: {
    id: "course1",
    name: "Self-Discovery GPT",
    description: "AI-powered self-discovery companion for deep personal insights",
    price: 4900, // $49
    stripePriceEnvVar: "STRIPE_PRICE_COURSE1",
    features: [
      "Unlimited conversations with your personal AI guide",
      "Tailored self-discovery prompts",
      "Progress tracking and insights",
      "24/7 access to transformative guidance",
    ],
  },
  course2: {
    id: "course2",
    name: "Transformation Journal",
    description: "Structured journaling for lasting personal growth",
    price: 3900, // $39
    stripePriceEnvVar: "STRIPE_PRICE_COURSE2",
    features: [
      "Morning & evening journaling sessions",
      "Interactive calendar tracking",
      "Guided templates for self-reflection",
      "Export and download your journals",
    ],
  },
  bundle: {
    id: "bundle",
    name: "Complete Transformation Bundle",
    description: "The ultimate self-transformation experience",
    price: 6900, // $69 (save $19)
    stripePriceEnvVar: "STRIPE_PRICE_BUNDLE",
    features: [
      "Everything in Self-Discovery GPT",
      "Everything in Transformation Journal",
      "Save $19 with the bundle",
      "Exclusive bonus content",
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
  completed: boolean("completed").default(false),
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

// Daily habits - weekly recurring habits
export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  cadence: varchar("cadence", { length: 50 }).notNull(), // 'daily', 'weekdays', 'weekends', 'mon,wed,fri', etc.
  time: varchar("time", { length: 20 }).notNull(), // '09:00', '14:30', etc.
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

// Daily tasks - specific tasks for specific dates
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  date: date("date").notNull(),
  time: varchar("time", { length: 20 }).notNull(), // '09:00', '14:30', etc.
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
