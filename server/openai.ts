import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface TeacherResponse {
  message: string;
  translation: string;
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
      const content = msg.content.toLowerCase();

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

      if (content.includes("food") || content.includes("eat") || content.includes("drink")) {
        context.topics_discussed.push("food/dining");
      }

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
  console.log('Transcript received:', transcript);
  console.log('Previous messages:', previousMessages);

  const isContextStart = transcript.startsWith("START_CONTEXT:");
  const context = isContextStart ? transcript.replace("START_CONTEXT:", "").trim() : "";

  const conversationContext = extractConversationContext(previousMessages);

  const systemPrompt = {
    role: "system" as const,
    content: `You are Profesora Ana, a warm and engaging Colombian Spanish teacher. Your responses must follow these STRICT rules:

1. ERROR HANDLING STRATEGY:
   - You MUST include corrections for ANY grammatical errors, even minor ones
   - If the user says "yo esta bien", you MUST include a correction like this:
     {
       "original": "yo esta bien",
       "correction": "yo estoy bien",
       "explanation": "With 'yo' (I), we must use 'estoy' (the correct conjugation of 'estar' in present tense), not 'esta'",
       "explanation_es": "Con 'yo', debemos usar 'estoy' (la conjugación correcta de 'estar' en presente), no 'esta'",
       "type": "grammar"
     }
   - NEVER skip any grammatical errors
   - Respond naturally while still including ALL corrections

2. GRAMMAR CORRECTION PRIORITIES:
   - Always check for:
      * Verb conjugation (e.g., "yo esta" should be "yo estoy")
      * Subject-verb agreement
      * Personal pronoun agreement
      * Tense consistency

3. CONVERSATION MEMORY:
   - This is a focused conversation about: ${context || "general Spanish practice"}
   - Topics already discussed: ${conversationContext.topics_discussed.join(", ")}
   ${conversationContext.student_info.hobbies ? 
      `- Student's known hobbies: ${conversationContext.student_info.hobbies.join(", ")}` : 
      ""}

4. TENSE USAGE:
   - ONLY use these tenses: ${settings.grammarTenses.join(", ")}
   - NEVER use other tenses

5. VOCABULARY:
   - Use words from these sets: ${settings.vocabularySets.join(", ")}

CRITICAL: Your response MUST be a JSON object with these fields:
{
  "message": "Your response in Spanish",
  "translation": "English translation of your response",
  "corrections": {
    "mistakes": [{
      "original": "incorrect phrase/word",
      "correction": "correct version",
      "explanation": "Clear explanation in English",
      "explanation_es": "Clear explanation in Spanish",
      "type": "grammar | vocabulary | punctuation"
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

  console.log('Sending to OpenAI:', JSON.stringify(messages, null, 2));

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response received from OpenAI");
    }

    console.log('OpenAI raw response:', content);

    const parsed = JSON.parse(content) as TeacherResponse;
    console.log('Parsed response:', JSON.stringify(parsed, null, 2));

    if (!parsed.corrections) {
      parsed.corrections = { mistakes: [] };
    }
    if (!parsed.corrections.mistakes) {
      parsed.corrections.mistakes = [];
    }

    return parsed;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}