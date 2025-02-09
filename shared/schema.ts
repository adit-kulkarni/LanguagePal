import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
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

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  transcript: text("transcript").notNull(),
  context: text("context").default(""),
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
export const insertConversationSchema = createInsertSchema(conversations);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;