import { users, conversations, type User, type InsertUser, type Conversation, type InsertConversation } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserSettings(id: number, settings: User["settings"]): Promise<User>;
  updateUserProgress(id: number, progress: User["progress"]): Promise<User>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getUserConversations(userId: number): Promise<Conversation[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private conversations: Map<number, Conversation>;
  private currentUserId: number;
  private currentConversationId: number;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.currentUserId = 1;
    this.currentConversationId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const defaultSettings = {
      grammarTenses: ["simple present"],
      vocabularySets: ["100 most common nouns"]
    };
    const defaultProgress = {
      grammar: 0,
      vocabulary: 0,
      speaking: 0,
      cefr: "A1"
    };

    const newUser: User = {
      id,
      settings: user.settings || defaultSettings,
      progress: user.progress || defaultProgress
    };

    this.users.set(id, newUser);
    return newUser;
  }

  async updateUserSettings(id: number, settings: User["settings"]): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");

    const updatedUser = { ...user, settings };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserProgress(id: number, progress: User["progress"]): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");

    const updatedUser = { ...user, progress };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const id = this.currentConversationId++;
    const defaultCorrections = {
      mistakes: []
    };

    const newConversation: Conversation = {
      id,
      userId: conversation.userId,
      transcript: conversation.transcript,
      corrections: conversation.corrections || defaultCorrections
    };

    this.conversations.set(id, newConversation);
    return newConversation;
  }

  async getUserConversations(userId: number): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter(conv => conv.userId === userId);
  }
}

export const storage = new MemStorage();