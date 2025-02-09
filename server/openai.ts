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

export async function getTeacherResponse(
  transcript: string,
  settings: { grammarTenses: string[]; vocabularySets: string[] }
): Promise<TeacherResponse> {
  const isContextStart = transcript.startsWith("START_CONTEXT:");
  const context = isContextStart ? transcript.replace("START_CONTEXT:", "").trim() : "";

  const systemPrompt = transcript.startsWith("Generate EXACTLY 2") 
    ? {
        role: "system" as const,
        content: "You are a Spanish language expert. Return ONLY a JSON array containing exactly 2 Spanish example sentences. No other text."
      }
    : {
        role: "system" as const,
        content: `You are a friendly Colombian Spanish teacher who is EXTREMELY STRICT about grammar tense usage.${
          isContextStart 
            ? `The student wants to practice Spanish in the context of: ${context}. Start a conversation appropriate for this context, ONLY using the permitted tenses.`
            : "Your task is to:"
        }

${isContextStart ? "" : `
1. STRICTLY analyze the student's Spanish input focusing on:
   - Grammar mistakes, especially incorrect tense usage
   - Vocabulary mistakes
   - Punctuation issues (excluding missing periods at end of sentences)

2. BE EXTREMELY STRICT about tense usage:
   - If the student uses ANY tense not in their selected list, mark it as a mistake
   - Always suggest the equivalent expression using one of their selected tenses
   - Explain why the tense they used is not allowed and how to express the same idea with allowed tenses

3. Provide corrections with clear explanations about tense usage
4. Respond using ONLY the allowed tenses

CRITICAL TENSE ENFORCEMENT:
- You are ONLY allowed to use these tenses: ${settings.grammarTenses.join(", ")}
- If you need to express something that would normally use a different tense, you MUST rephrase it using one of the allowed tenses
- NEVER use present perfect or any other tense not explicitly listed above

Focus on vocabulary from these sets: ${settings.vocabularySets.join(", ")}.

For tense corrections:
- Always mark ANY use of non-selected tenses as a mistake
- Provide alternative ways to express the same meaning using allowed tenses
- Give clear explanations in both Spanish and English about why the tense is not allowed and how to rephrase`}

Always respond with a JSON object containing:
{
  "message": "${isContextStart 
    ? "Your initial message using ONLY the allowed tenses" 
    : "Your response using ONLY the allowed tenses"}",
  "corrections": {
    "mistakes": [
      {
        "original": "incorrect phrase or word",
        "correction": "correct phrase using allowed tense",
        "explanation": "Explanation in English of why this tense is not allowed and how to express it using allowed tenses",
        "explanation_es": "Explicación en español de por qué este tiempo verbal no está permitido y cómo expresarlo usando los tiempos permitidos",
        "type": "grammar | vocabulary | punctuation",
        "ignored": false
      }
    ]
  }
}

Even if there are no mistakes, always include the corrections object with an empty mistakes array.
${!isContextStart ? "If the input is in English or another language, respond naturally but indicate they should try in Spanish." : ""}`
      };

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      systemPrompt,
      {
        role: "user",
        content: transcript
      }
    ],
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