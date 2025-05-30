import { users, messages, conversationSessions, type User, type InsertUser, type Message, type InsertMessage, type ConversationSession, type InsertConversationSession } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserSettings(id: number, settings: User["settings"]): Promise<User>;
  updateUserProgress(id: number, progress: User["progress"]): Promise<User>;

  // Session management
  createSession(session: InsertConversationSession): Promise<ConversationSession>;
  getSession(id: number): Promise<ConversationSession | undefined>;
  getUserSessions(userId: number): Promise<ConversationSession[]>;
  deleteSession(id: number): Promise<void>;

  // Message management
  createMessage(message: InsertMessage): Promise<Message>;
  getSessionMessages(sessionId: number): Promise<Message[]>;
  getRecentMessages(sessionId: number, limit?: number): Promise<Message[]>;
  updateMessageCorrections(messageId: number, corrections: Message["corrections"]): Promise<Message>;

  // Express session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
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

  async createSession(session: InsertConversationSession): Promise<ConversationSession> {
    const [newSession] = await db
      .insert(conversationSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async getSession(id: number): Promise<ConversationSession | undefined> {
    const [session] = await db
      .select()
      .from(conversationSessions)
      .where(eq(conversationSessions.id, id));
    return session;
  }

  async getUserSessions(userId: number): Promise<ConversationSession[]> {
    return db
      .select()
      .from(conversationSessions)
      .where(eq(conversationSessions.userId, userId))
      .orderBy(desc(conversationSessions.lastMessageAt));
  }

  async deleteSession(id: number): Promise<void> {
    // Delete all messages first due to foreign key constraint
    await db.delete(messages).where(eq(messages.sessionId, id));
    // Then delete the session
    await db.delete(conversationSessions).where(eq(conversationSessions.id, id));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();

    // Update the session's lastMessageAt timestamp
    await db
      .update(conversationSessions)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversationSessions.id, message.sessionId));

    return newMessage;
  }

  async getSessionMessages(sessionId: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(desc(messages.createdAt));
  }

  async getRecentMessages(sessionId: number, limit: number = 5): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }
  
  async updateMessageCorrections(messageId: number, corrections: Message["corrections"]): Promise<Message> {
    const [updatedMessage] = await db
      .update(messages)
      .set({ corrections })
      .where(eq(messages.id, messageId))
      .returning();
      
    if (!updatedMessage) throw new Error("Message not found");
    return updatedMessage;
  }
}

export const storage = new DatabaseStorage();