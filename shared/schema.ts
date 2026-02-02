import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, serial, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Purchases table - tracks course purchases
export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  courseType: varchar("course_type", { length: 50 }).notNull(), // 'course1', 'course2', 'bundle'
  stripePaymentId: varchar("stripe_payment_id"),
  amount: integer("amount").notNull(), // in cents
  status: varchar("status", { length: 20 }).notNull().default("completed"), // 'pending', 'completed', 'refunded'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
});

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
export const COURSES = {
  course1: {
    id: "course1",
    name: "Self-Discovery GPT",
    description: "AI-powered self-discovery companion for deep personal insights",
    price: 4900, // $49
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
    features: [
      "Everything in Self-Discovery GPT",
      "Everything in Transformation Journal",
      "Save $19 with the bundle",
      "Exclusive bonus content",
    ],
  },
} as const;

export type CourseType = keyof typeof COURSES;
