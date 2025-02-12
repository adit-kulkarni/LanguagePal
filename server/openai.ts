import OpenAI from "openai";

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

  const isContextStart = transcript.startsWith("START_CONTEXT:");
  const context = isContextStart ? transcript.replace("START_CONTEXT:", "").trim() : "";

  // Extract conversation context from all messages
  const conversationContext = extractConversationContext(previousMessages || []);

  // Get only the most recent messages for context (last 4 turns)
  const recentMessages = (previousMessages || []).slice(-4);

  // Make it clear which message needs correction
  const messageToCorrect = transcript;

  const messages = [
    {
      role: "system" as const,
      content: `You are Profesora Ana, a warm and engaging Colombian Spanish teacher. Respond in JSON format following this structure:
{
  "message": "Your natural conversation response in Spanish",
  "translation": "English translation of your response",
  "corrections": {
    "mistakes": [{
      "original": "incorrect phrase",
      "correction": "correct version",
      "explanation": "Clear explanation in English",
      "explanation_es": "Clear explanation in Spanish",
      "type": "grammar | vocabulary | punctuation"
    }]
  }
}

Follow these STRICT rules:

1. CONVERSATION FLOW:
   - For simple errors (wrong conjugation, word order):
     * Understand the intended meaning
     * Respond naturally to continue the conversation
     * Add corrections separately in the corrections section
   - For unclear/ambiguous messages:
     * Politely ask for clarification
     * Explain what part is unclear
     * Still note any obvious errors in the corrections section

2. ERROR HANDLING - CRITICAL:
   - You must ONLY check for errors in this exact message: "${messageToCorrect}"
   - NEVER include corrections for any other messages
   - NEVER reference or correct previous messages
   - If you don't find any errors in the current message, return an empty mistakes array
   - The main message should focus only on continuing the conversation

3. GRAMMAR PRIORITIES:
   - Check for and correct:
      * Verb conjugation
      * Subject-verb agreement
      * Gender/number agreement
      * Word order
   - Each correction must include:
      * Original text
      * Corrected version
      * Clear explanation in both languages
      * Error type

4. CONVERSATION MEMORY:
   - This is a focused conversation about: ${context || "general Spanish practice"}
   - Topics already discussed: ${conversationContext.topics_discussed.join(", ") || "none yet"}
   ${conversationContext.student_info.hobbies ? 
      `- Student's known hobbies: ${conversationContext.student_info.hobbies.join(", ")}` : 
      ""}

5. TENSE USAGE:
   - ONLY use these tenses: ${settings.grammarTenses.join(", ")}
   - NEVER use other tenses

6. VOCABULARY:
   - Use words from these sets: ${settings.vocabularySets.join(", ")}`
    },
    ...recentMessages.map(msg => ({
      role: msg.type === "user" ? "user" as const : "assistant" as const,
      content: msg.content
    })),
    {
      role: "user" as const,
      content: transcript
    }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response received from OpenAI");
    }

    console.log('OpenAI raw response:', content);

    const parsed = JSON.parse(content) as TeacherResponse;
    console.log('Parsed response:', JSON.stringify(parsed, null, 2));

    // Ensure corrections object exists and has mistakes array
    if (!parsed.corrections) {
      parsed.corrections = { mistakes: [] };
    }
    if (!parsed.corrections.mistakes) {
      parsed.corrections.mistakes = [];
    }

    // Additional validation to ensure corrections only apply to current message
    parsed.corrections.mistakes = parsed.corrections.mistakes.filter(mistake => {
      return transcript.includes(mistake.original);
    });

    return parsed;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}