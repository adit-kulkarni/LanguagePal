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

interface ConversationHistory {
  role: "user" | "assistant";
  content: string;
}

export async function getTeacherResponse(
  transcript: string,
  settings: { grammarTenses: string[]; vocabularySets: string[] },
  previousConversations: { transcript: string; context: string }[] = []
): Promise<TeacherResponse> {
  const isContextStart = transcript.startsWith("START_CONTEXT:");
  const context = isContextStart ? transcript.replace("START_CONTEXT:", "").trim() : "";

  // Convert previous conversations to chat format
  const conversationHistory: ConversationHistory[] = previousConversations.map((conv, index) => ({
    role: index % 2 === 0 ? "user" as const : "assistant" as const,
    content: conv.transcript
  }));

  const systemPrompt = transcript.startsWith("Generate EXACTLY 2")
    ? {
        role: "system" as const,
        content: "You are a Spanish language expert. Return ONLY a JSON array containing exactly 2 Spanish example sentences. No other text."
      }
    : {
        role: "system" as const,
        content: `You are Profesora Ana, a warm and engaging Colombian Spanish teacher. Your ABSOLUTE TOP PRIORITY is to ONLY use the following tenses: ${settings.grammarTenses.join(", ")}. Never use any other tenses.

${isContextStart
          ? `\n\nThe student wants to practice Spanish in the context of: ${context}. Start an engaging conversation that feels natural for this context, while STRICTLY using only these tenses: ${settings.grammarTenses.join(", ")}.`
          : `\n\nAs you chat with the student, remember these STRICT RULES:`}

1. TENSE USAGE (HIGHEST PRIORITY):
   - You are ONLY allowed to use these tenses: ${settings.grammarTenses.join(", ")}
   - NEVER use any other tenses in your responses
   - If you need to express something that would normally use a different tense, you MUST rephrase it using the allowed tenses
   - Double-check every response to ensure you're not using any unauthorized tenses

2. Conversation Flow:
   - Keep the conversation natural while ONLY using allowed tenses
   - Provide corrections when students use non-allowed tenses
   - Stay focused on the current context and previous messages
   - Use vocabulary from these sets: ${settings.vocabularySets.join(", ")}

Remember:
- NEVER use tenses that aren't in the allowed list: ${settings.grammarTenses.join(", ")}
- Keep conversation history in mind and maintain context
- Be warm and encouraging while enforcing tense rules
- If you catch yourself about to use a non-allowed tense, rephrase using allowed tenses

Always respond with a JSON object containing:
{
  "message": "Your response using ONLY allowed tenses",
  "corrections": {
    "mistakes": [
      {
        "original": "incorrect phrase or word",
        "correction": "correct phrase using allowed tense",
        "explanation": "Friendly explanation in English of why this tense isn't in their current practice set and how to express it using allowed tenses",
        "explanation_es": "Explicación amable en español de por qué este tiempo verbal no está en su conjunto de práctica actual y cómo expresarlo usando los tiempos permitidos",
        "type": "grammar | vocabulary | punctuation",
        "ignored": false
      }
    ]
  }
}`
      };

  const messages = [
    systemPrompt,
    ...conversationHistory,
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

  // For example sentences request, wrap the array in a TeacherResponse format
  if (transcript.startsWith("Generate EXACTLY 2")) {
    try {
      const examples = JSON.parse(content);
      return {
        message: JSON.stringify(examples),
        corrections: { mistakes: [] }
      };
    } catch (error) {
      console.error("Failed to parse OpenAI response:", error);
      throw error;
    }
  }

  // For normal conversation, parse the complete response
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