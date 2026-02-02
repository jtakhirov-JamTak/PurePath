import { db } from "./db";
import { purchases, journals, chatMessages, type Purchase, type InsertPurchase, type Journal, type InsertJournal, type ChatMessage, type InsertChatMessage } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getPurchasesByUser(userId: string): Promise<Purchase[]>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  hasCourseAccess(userId: string, courseType: string): Promise<boolean>;
  
  getJournalsByUser(userId: string): Promise<Journal[]>;
  getJournal(userId: string, date: string, session: string): Promise<Journal | undefined>;
  createOrUpdateJournal(journal: InsertJournal): Promise<Journal>;
  
  getChatMessagesByUser(userId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
}

export class DatabaseStorage implements IStorage {
  async getPurchasesByUser(userId: string): Promise<Purchase[]> {
    return db.select().from(purchases).where(eq(purchases.userId, userId)).orderBy(desc(purchases.createdAt));
  }

  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    const [newPurchase] = await db.insert(purchases).values(purchase).returning();
    return newPurchase;
  }

  async hasCourseAccess(userId: string, courseType: string): Promise<boolean> {
    const userPurchases = await this.getPurchasesByUser(userId);
    return userPurchases.some(p => 
      p.status === "completed" && 
      (p.courseType === courseType || p.courseType === "bundle")
    );
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
}

export const storage = new DatabaseStorage();
