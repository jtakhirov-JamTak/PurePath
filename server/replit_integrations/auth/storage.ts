import { users, type User, type SafeUser, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq, sql } from "drizzle-orm";

export interface IAuthStorage {
  getUser(id: string): Promise<SafeUser | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<SafeUser | undefined> {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
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
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
    return user;
  }
}

export const authStorage = new AuthStorage();
