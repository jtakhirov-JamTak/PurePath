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
