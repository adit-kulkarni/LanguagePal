import { eq } from "drizzle-orm";
import { db } from "./db";
import * as session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { 
  users, conversationSessions, messages,
  type User, type InsertUser,
  type ConversationSession, type InsertConversationSession,
  type Message, type InsertMessage
} from "../shared/schema";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId?(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserSettings?(id: number, settings: User["settings"]): Promise<User>;
  updateUserProgress?(id: number, progress: User["progress"]): Promise<User>;

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
    const PgStore = connectPgSimple(session);
    this.sessionStore = new PgStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUserSettings(id: number, settings: User["settings"]): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set({ settings })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserProgress(id: number, progress: User["progress"]): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set({ progress })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async createSession(session: InsertConversationSession): Promise<ConversationSession> {
    const [newSession] = await db.insert(conversationSessions).values(session).returning();
    return newSession;
  }

  async getSession(id: number): Promise<ConversationSession | undefined> {
    const [session] = await db.select().from(conversationSessions).where(eq(conversationSessions.id, id));
    return session || undefined;
  }

  async getUserSessions(userId: number): Promise<ConversationSession[]> {
    return await db.select()
      .from(conversationSessions)
      .where(eq(conversationSessions.userId, userId))
      .orderBy(conversationSessions.lastMessageAt);
  }

  async deleteSession(id: number): Promise<void> {
    // First delete all messages in the session
    await db.delete(messages).where(eq(messages.sessionId, id));
    // Then delete the session
    await db.delete(conversationSessions).where(eq(conversationSessions.id, id));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    
    // Update the lastMessageAt timestamp on the session
    if (newMessage.sessionId) {
      await db.update(conversationSessions)
        .set({ lastMessageAt: new Date() })
        .where(eq(conversationSessions.id, newMessage.sessionId));
    }
    
    return newMessage;
  }

  async getSessionMessages(sessionId: number): Promise<Message[]> {
    return await db.select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.createdAt);
  }

  async getRecentMessages(sessionId: number, limit: number = 5): Promise<Message[]> {
    // Get the most recent messages for a session
    return await db.select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.createdAt)
      .limit(limit);
  }

  async updateMessageCorrections(messageId: number, corrections: Message["corrections"]): Promise<Message> {
    const [updatedMessage] = await db.update(messages)
      .set({ corrections })
      .where(eq(messages.id, messageId))
      .returning();
    return updatedMessage;
  }
}

export const storage = new DatabaseStorage();