import { Express } from "express";
import { createServer, Server } from "http";
import { storage } from "./storage";
import { getTeacherResponse } from "./openai";
import { insertUserSchema, insertSessionSchema, insertMessageSchema } from "@shared/schema";
import { translateWord } from "./dictionary";
import { z } from "zod";

// Add these helper functions at the top of the file
function extractContextFromMessage(message: string): string {
    const lowercaseMsg = message.toLowerCase();

    // Common conversation topics
    if (lowercaseMsg.includes("food") || lowercaseMsg.includes("eat") || lowercaseMsg.includes("restaurant")) {
        return "ordering food";
    }
    if (lowercaseMsg.includes("direction") || lowercaseMsg.includes("where") || lowercaseMsg.includes("go to")) {
        return "asking for directions";
    }
    if (lowercaseMsg.includes("name") || lowercaseMsg.includes("hello") || lowercaseMsg.includes("hi ")) {
        return "introductions";
    }
    if (lowercaseMsg.includes("work") || lowercaseMsg.includes("job") || lowercaseMsg.includes("study")) {
        return "work and education";
    }

    // Default context for general conversation
    return "casual conversation";
}

export function registerRoutes(app: Express): Server {
    app.post("/api/users", async (req, res) => {
        try {
            // Create a user with default settings
            const userData = {
                username: `user_${Date.now()}`, // Generate a temporary username
                password: "temp_password",      // This will be replaced by auth system
                email: "temp@example.com",      // This will be replaced by auth system
                settings: {
                    grammarTenses: ["presente (present indicative)"],
                    vocabularySets: ["100 most common nouns"]
                },
                progress: {
                    grammar: 0,
                    vocabulary: 0,
                    speaking: 0,
                    cefr: "A1"
                }
            };

            const user = await storage.createUser(userData);
            res.json(user);
        } catch (error) {
            console.error('User creation error:', error);
            res.status(400).json({ message: "Invalid user data", error: String(error) });
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

    // Session management endpoints
    app.post("/api/sessions", async (req, res) => {
        try {
            const sessionData = insertSessionSchema.parse({
                ...req.body,
                lastMessageAt: new Date()
            });
            const session = await storage.createSession(sessionData);
            res.json(session);
        } catch (error) {
            res.status(400).json({ message: "Invalid session data" });
        }
    });

    app.get("/api/users/:userId/sessions", async (req, res) => {
        try {
            const userId = parseInt(req.params.userId);
            const sessions = await storage.getUserSessions(userId);
            res.json(sessions);
        } catch (error) {
            res.status(500).json({ message: "Failed to fetch sessions" });
        }
    });

    app.get("/api/sessions/:sessionId/messages", async (req, res) => {
        try {
            const sessionId = parseInt(req.params.sessionId);
            const messages = await storage.getSessionMessages(sessionId);
            res.json(messages);
        } catch (error) {
            res.status(500).json({ message: "Failed to fetch messages" });
        }
    });

    // Conversations endpoint
    app.post("/api/conversations", async (req, res) => {
        try {
            const userId = parseInt(req.body.userId);
            const transcript = req.body.transcript;

            const user = await storage.getUser(userId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            if (!user.settings) {
                return res.status(400).json({ message: "User settings not configured" });
            }

            let context: string;
            let finalTranscript: string;

            // Handle explicit context start vs regular message
            if (transcript.startsWith("START_CONTEXT:")) {
                context = transcript.replace("START_CONTEXT:", "").trim();
                finalTranscript = transcript;
            } else {
                // Extract context from the message
                context = extractContextFromMessage(transcript);
                finalTranscript = transcript;
            }

            // Create a new session
            const session = await storage.createSession({
                userId,
                title: `Spanish Practice: ${context}`,
                context,
                lastMessageAt: new Date()
            });

            // Get teacher's response
            const teacherResponse = await getTeacherResponse(
                finalTranscript,
                user.settings,
                [] // No previous messages for a new conversation
            );

            // Save initial messages
            if (!transcript.startsWith("START_CONTEXT:")) {
                // Save user's message first
                await storage.createMessage({
                    sessionId: session.id,
                    type: "user",
                    content: transcript
                });
            }

            // Save teacher's message
            const message = await storage.createMessage({
                sessionId: session.id,
                type: "teacher",
                content: teacherResponse.message,
                translation: teacherResponse.translation
            });

            return res.json({
                session,
                teacherResponse
            });
        } catch (error) {
            console.error('Conversation error:', error);
            res.status(500).json({ message: "Failed to start conversation" });
        }
    });

    // Message handling
    app.post("/api/sessions/:sessionId/messages", async (req, res) => {
        try {
            const sessionId = parseInt(req.params.sessionId);
            const session = await storage.getSession(sessionId);

            if (!session) {
                return res.status(404).json({ message: "Session not found" });
            }

            const user = await storage.getUser(session.userId);
            if (!user || !user.settings) {
                return res.status(400).json({ message: "User settings not configured" });
            }

            // Get recent messages for context
            const recentMessages = await storage.getRecentMessages(sessionId, 5);

            console.log('User message:', req.body.content);
            const teacherResponse = await getTeacherResponse(
                req.body.content,
                user.settings,
                recentMessages
            );
            console.log('OpenAI Response:', teacherResponse);

            // Save user's message
            const userMessage = await storage.createMessage({
                sessionId,
                type: "user",
                content: req.body.content,
                corrections: teacherResponse.corrections.mistakes
            });

            // Save teacher's response
            const teacherMessage = await storage.createMessage({
                sessionId,
                type: "teacher",
                content: teacherResponse.message,
                translation: teacherResponse.translation
            });

            res.json({ 
                userMessage, 
                teacherMessage, 
                teacherResponse 
            });
        } catch (error) {
            console.error('Message error:', error);
            res.status(500).json({ message: "Failed to process message" });
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

    app.delete("/api/sessions/:sessionId", async (req, res) => {
        try {
            const sessionId = parseInt(req.params.sessionId);
            await storage.deleteSession(sessionId);
            res.status(200).json({ message: "Session deleted successfully" });
        } catch (error) {
            console.error('Delete session error:', error);
            res.status(500).json({ message: "Failed to delete session" });
        }
    });

    const httpServer = createServer(app);
    return httpServer;
}