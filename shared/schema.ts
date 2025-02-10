import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  googleId: text("google_id").unique(),
  settings: jsonb("settings").$type<{
    grammarTenses: string[];
    vocabularySets: string[];
  }>().default({
    grammarTenses: ["presente (present indicative)"],
    vocabularySets: ["100 most common nouns"]
  }),
  progress: jsonb("progress").$type<{
    grammar: number;
    vocabulary: number;
    speaking: number;
    cefr: string;
  }>().default({
    grammar: 0,
    vocabulary: 0,
    speaking: 0,
    cefr: "A1"
  })
});

export const conversationSessions = pgTable("conversation_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  context: text("context").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  lastMessageAt: timestamp("last_message_at").defaultNow()
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  type: text("type").notNull(), // "user" or "teacher"
  content: text("content").notNull(),
  translation: text("translation"),
  createdAt: timestamp("created_at").defaultNow(),
  corrections: jsonb("corrections").$type<{
    mistakes: Array<{
      original: string;
      correction: string;
      explanation: string;
      explanation_es: string;
      type: "punctuation" | "grammar" | "vocabulary";
      ignored?: boolean;
    }>;
  }>().default({ mistakes: [] })
});

export const insertUserSchema = createInsertSchema(users);
export const insertSessionSchema = createInsertSchema(conversationSessions);
export const insertMessageSchema = createInsertSchema(messages);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ConversationSession = typeof conversationSessions.$inferSelect;
export type InsertConversationSession = typeof conversationSessions.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;