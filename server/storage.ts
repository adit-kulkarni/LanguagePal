import { users, conversations, type User, type InsertUser, type Conversation, type InsertConversation } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserSettings(id: number, settings: User["settings"]): Promise<User>;
  updateUserProgress(id: number, progress: User["progress"]): Promise<User>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getUserConversations(userId: number): Promise<Conversation[]>;
  getRecentConversations(userId: number, context: string, limit?: number): Promise<Conversation[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUserSettings(id: number, settings: User["settings"]): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ settings })
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) throw new Error("User not found");
    return updatedUser;
  }

  async updateUserProgress(id: number, progress: User["progress"]): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ progress })
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) throw new Error("User not found");
    return updatedUser;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async getUserConversations(userId: number): Promise<Conversation[]> {
    return db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt));
  }

  async getRecentConversations(userId: number, context: string, limit: number = 5): Promise<Conversation[]> {
    return db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.userId, userId),
          eq(conversations.context, context)
        )
      )
      .orderBy(desc(conversations.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();