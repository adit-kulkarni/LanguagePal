import { Express } from "express";
import { createServer, Server } from "http";
import { storage } from "./storage";
import { getTeacherResponse } from "./openai";
import { insertUserSchema } from "@shared/schema";
import { translateWord } from "./dictionary";
import { z } from "zod";

export function registerRoutes(app: Express): Server {
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.patch("/api/users/:id/settings", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const settings = z.object({
        grammarTenses: z.array(z.string()),
        vocabularySets: z.array(z.string())
      }).parse(req.body);

      const user = await storage.updateUserSettings(id, settings);
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid settings data" });
    }
  });

  app.patch("/api/users/:id/progress", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const progress = z.object({
        grammar: z.number(),
        vocabulary: z.number(),
        speaking: z.number(),
        cefr: z.string()
      }).parse(req.body);

      const user = await storage.updateUserProgress(id, progress);
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid progress data" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const user = await storage.getUser(req.body.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.settings) {
        return res.status(400).json({ message: "User settings not configured" });
      }

      const teacherResponse = await getTeacherResponse(
        req.body.transcript,
        user.settings
      );

      const conversation = await storage.createConversation({
        userId: user.id,
        transcript: req.body.transcript,
        corrections: teacherResponse.corrections
      });

      res.json({ conversation, teacherResponse });
    } catch (error) {
      console.error('Conversation error:', error);
      res.status(500).json({ message: "Failed to process conversation" });
    }
  });

  app.get("/api/users/:id/conversations", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/translate", async (req, res) => {
    try {
      const word = z.string().parse(req.body.word);
      const translation = await translateWord(word);
      res.json(translation);
    } catch (error) {
      console.error('Translation error:', error);
      res.status(500).json({ message: "Failed to translate word" });
    }
  });

  app.post("/api/word-examples", async (req, res) => {
    try {
      const word = z.string().parse(req.body.word);

      const response = await getTeacherResponse(
        `Generate 2-3 example sentences using the Spanish word "${word}". Return ONLY a JSON array of strings with the examples, without any other text or explanation. For example: ["El profesor enseña español.", "Me gusta estudiar español."]`,
        { grammarTenses: [], vocabularySets: [] }
      );

      // Extract just the array part if OpenAI includes any extra text
      const jsonMatch = response.message.match(/\[.*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      const examples = JSON.parse(jsonMatch[0]);
      res.json({ examples });
    } catch (error) {
      console.error('Examples error:', error);
      res.status(500).json({ message: "Failed to get word examples" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}