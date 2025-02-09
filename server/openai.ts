import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface TeacherResponse {
  message: string;
  corrections: {
    mistakes: Array<{
      original: string;
      correction: string;
      explanation: string;
      explanation_es: string;
      type: "punctuation" | "grammar" | "vocabulary";
      ignored?: boolean;
    }>;
  };
}

interface ConversationContext {
  topics_discussed: string[];
  student_info: {
    interests?: string[];
    occupation?: string;
    hobbies?: string[];
  };
}

function extractConversationContext(messages: { content: string; type: string }[]): ConversationContext {
  const context: ConversationContext = {
    topics_discussed: [],
    student_info: {}
  };

  messages.forEach(msg => {
    if (msg.type === "user") {
      // Extract topics from user messages
      const content = msg.content.toLowerCase();

      // Track hobbies and interests
      if (content.includes("like to") || content.includes("enjoy") || content.includes("hobby")) {
        context.topics_discussed.push("interests/hobbies");
        const words = content.split(/\s+/);
        const index = Math.max(
          words.indexOf("like"),
          words.indexOf("enjoy"),
          words.indexOf("hobby")
        );
        if (index !== -1 && index < words.length - 1) {
          if (!context.student_info.hobbies) {
            context.student_info.hobbies = [];
          }
          context.student_info.hobbies.push(words.slice(index + 1).join(" "));
        }
      }

      // Track food preferences
      if (content.includes("food") || content.includes("eat") || content.includes("drink")) {
        context.topics_discussed.push("food/dining");
      }

      // Track occupation
      if (content.includes("work") || content.includes("job") || content.includes("study")) {
        context.topics_discussed.push("occupation");
      }
    }
  });

  return context;
}

export async function getTeacherResponse(
  transcript: string,
  settings: { grammarTenses: string[]; vocabularySets: string[] },
  previousMessages: { type: string; content: string }[] = []
): Promise<TeacherResponse> {
  const isContextStart = transcript.startsWith("START_CONTEXT:");
  const context = isContextStart ? transcript.replace("START_CONTEXT:", "").trim() : "";

  // Extract and analyze conversation context from this session only
  const conversationContext = extractConversationContext(previousMessages);

  const systemPrompt = {
    role: "system" as const,
    content: `You are Profesora Ana, a warm and engaging Colombian Spanish teacher. Your responses must follow these STRICT rules:

1. CONVERSATION MEMORY (HIGHEST PRIORITY):
   - This is a focused conversation about: ${context || "general Spanish practice"}
   - Topics already discussed: ${conversationContext.topics_discussed.join(", ")}
   ${conversationContext.student_info.hobbies ? 
     `- Student's known hobbies: ${conversationContext.student_info.hobbies.join(", ")}` : 
     ""}
   - NEVER ask about topics already covered
   - Keep responses relevant to the current conversation context
   - Show memory of previous details in this conversation

2. TENSE USAGE (HIGHEST PRIORITY):
   - ONLY use these tenses: ${settings.grammarTenses.join(", ")}
   - NEVER use other tenses
   - If needed, rephrase using allowed tenses

3. VOCABULARY:
   - Use words from these sets: ${settings.vocabularySets.join(", ")}
   - Keep language appropriate for the student's level

Response must be a JSON object:
{
  "message": "Your response using ONLY allowed tenses",
  "corrections": {
    "mistakes": [{
      "original": "incorrect phrase",
      "correction": "correct version",
      "explanation": "English explanation",
      "explanation_es": "Spanish explanation",
      "type": "grammar | vocabulary | punctuation",
      "ignored": false
    }]
  }
}`
  };

  const messages = [
    systemPrompt,
    ...previousMessages.map(msg => ({
      role: msg.type === "user" ? "user" as const : "assistant" as const,
      content: msg.content
    })),
    {
      role: "user" as const,
      content: transcript
    }
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    response_format: { type: "json_object" }
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No response received from OpenAI");
  }

  const parsed = JSON.parse(content) as TeacherResponse;

  // Ensure corrections object exists with mistakes array
  if (!parsed.corrections) {
    parsed.corrections = { mistakes: [] };
  }
  if (!parsed.corrections.mistakes) {
    parsed.corrections.mistakes = [];
  }

  return parsed;
}