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
        `Create a JSON array with EXACTLY 2 simple example sentences in Spanish that demonstrate the usage of "${word}". 
         Each sentence must:
         - Use the word "${word}" exactly as provided
         - Be 4-8 words long
         - End with a period
         - Be grammatically correct Spanish

         Return ONLY a JSON array in this exact format: ["Example 1.", "Example 2."]
         Do not include any other text or explanation.`,
        { grammarTenses: [], vocabularySets: [] }
      );

      try {
        // First try to parse the entire response as JSON
        const examples = JSON.parse(response.message);
        if (Array.isArray(examples) && examples.length === 2) {
          return res.json({ examples });
        }
      } catch {
        // If that fails, try to extract just the array part
        try {
          const jsonMatch = response.message.match(/\[(.*?)\]/s);
          if (jsonMatch) {
            const examples = JSON.parse(jsonMatch[0]);
            if (Array.isArray(examples) && examples.length > 0) {
              return res.json({ examples });
            }
          }
        } catch (err) {
          console.error('Failed to parse examples:', err);
        }
      }

      // If all parsing attempts fail, return empty array
      res.json({ 
        examples: [], 
        message: `No example sentences available for "${word}". Please try another word.` 
      });
    } catch (error) {
      console.error('Examples error:', error);
      res.json({ 
        examples: [], 
        message: "Failed to generate example sentences. Please try again." 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}