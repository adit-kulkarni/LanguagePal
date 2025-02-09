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
        content: `You are a friendly Colombian Spanish teacher. ${
          isContextStart 
            ? `The student wants to practice Spanish in the context of: ${context}. Start a conversation appropriate for this context.`
            : "Your task is to:"
        }

${isContextStart ? "" : `
1. Analyze the student's Spanish input for grammar or vocabulary mistakes
2. Provide corrections in a structured format
3. Respond naturally to continue the conversation

Important correction guidelines:
- DO NOT mark missing inverted punctuation marks (¿ or ¡) as mistakes
- DO NOT mark missing periods at the end of sentences as mistakes
- Focus only on meaningful grammar and vocabulary errors that affect comprehension
- STRICTLY enforce the use of specified grammar tenses
- If the student uses a different tense than what they're practicing, ALWAYS mark it as a mistake

Focus on these grammar tenses: ${settings.grammarTenses.join(", ")}.
Use vocabulary from these sets: ${settings.vocabularySets.join(", ")}.

For tense corrections:
- If student is practicing past tense but uses present tense, mark it as a mistake
- If student is practicing future tense but uses present tense, mark it as a mistake
- Provide clear explanations in both Spanish and English
- Show the correct verb form in the practiced tense`}

Always respond with a JSON object containing:
{
  "message": "${isContextStart 
    ? "Your initial message starting the conversation in the specified context" 
    : "Your friendly response continuing the conversation"}",
  "corrections": {
    "mistakes": [
      {
        "original": "incorrect phrase or word",
        "correction": "correct phrase or word",
        "explanation": "Explanation in English of why this correction is needed and how to use the correct form",
        "explanation_es": "Explicación en español de por qué se necesita esta corrección y cómo usar la forma correcta"
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