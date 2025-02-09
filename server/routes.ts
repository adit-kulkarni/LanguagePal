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

      // Get the current context from the transcript or use existing context
      const isContextStart = req.body.transcript.startsWith("START_CONTEXT:");
      const context = isContextStart 
        ? req.body.transcript.replace("START_CONTEXT:", "").trim()
        : req.body.context || "";

      // Get recent conversations for context
      const recentConversations = await storage.getRecentConversations(
        user.id,
        context,
        5 // Get last 5 messages for context
      );

      const teacherResponse = await getTeacherResponse(
        req.body.transcript,
        user.settings,
        recentConversations
      );

      const conversation = await storage.createConversation({
        userId: user.id,
        transcript: req.body.transcript,
        context: context,
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
      console.log(`Generating examples for word: ${word}`);

      const response = await getTeacherResponse(
        `Generate EXACTLY 2 simple example sentences in Spanish using the word "${word}".
         The sentences MUST:
         - Include the word "${word}" exactly as written
         - Be between 4-8 words long
         - End with a period
         - Be grammatically correct Spanish
         - Be at beginner level difficulty

         Return ONLY a JSON array with exactly 2 sentences: ["Sentence 1.", "Sentence 2."]
         No other text or explanation - just the JSON array.`,
        { grammarTenses: [], vocabularySets: [] }
      );

      console.log('OpenAI Response:', response.message);

      try {
        // First try to parse the entire response as JSON
        const examples = JSON.parse(response.message);
        if (Array.isArray(examples) && examples.length === 2) {
          console.log('Successfully parsed examples:', examples);
          return res.json({ examples });
        }
      } catch (parseError) {
        console.log('Failed to parse complete response:', parseError);

        // If that fails, try to extract just the array part
        try {
          const jsonMatch = response.message.match(/\[(.*?)\]/s);
          if (jsonMatch) {
            const examples = JSON.parse(jsonMatch[0]);
            if (Array.isArray(examples) && examples.length > 0) {
              console.log('Successfully parsed extracted examples:', examples);
              return res.json({ examples });
            }
          }
        } catch (extractError) {
          console.error('Failed to parse extracted examples:', extractError);
        }
      }

      // If all parsing attempts fail, return empty array with message
      console.log('No valid examples could be generated');
      res.json({ 
        examples: [], 
        message: `Could not generate example sentences for "${word}". Please try another word.` 
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