import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    } catch (error: any) {
      if (error?.code === '23505' && error?.constraint?.includes('email')) {
        const existing = await this.getUser(userData.id);
        if (existing) return existing;
        const [user] = await db
          .insert(users)
          .values({ ...userData, email: `${userData.id}@replit.user` })
          .onConflictDoUpdate({
            target: users.id,
            set: { ...userData, email: `${userData.id}@replit.user`, updatedAt: new Date() },
          })
          .returning();
        return user;
      }
      throw error;
    }
  }
}

export const authStorage = new AuthStorage();
