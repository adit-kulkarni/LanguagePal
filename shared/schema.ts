import { pgTable, serial, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  googleId: varchar("google_id", { length: 255 }),
  settings: jsonb("settings").default({}).notNull(),
  progress: jsonb("progress").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversationSessions = pgTable("conversation_sessions", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").notNull().references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  context: text("context").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  sessionId: serial("session_id").notNull().references(() => conversationSessions.id),
  type: varchar("type", { length: 50 }).notNull(), // "user" or "assistant"
  content: text("content").notNull(),
  translation: text("translation"),
  corrections: jsonb("corrections").default({}),
  audioUrl: varchar("audio_url", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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