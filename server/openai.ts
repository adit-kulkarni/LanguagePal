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
    }>;
  };
}

export async function getTeacherResponse(
  transcript: string,
  settings: { grammarTenses: string[]; vocabularySets: string[] }
): Promise<TeacherResponse> {
  const systemPrompt = transcript.startsWith("Generate EXACTLY 2") 
    ? {
        role: "system" as const,
        content: "You are a Spanish language expert. Return ONLY a JSON array containing exactly 2 Spanish example sentences. No other text."
      }
    : {
        role: "system" as const,
        content: `You are a friendly Colombian Spanish teacher. Your task is to:

1. Analyze the student's Spanish input for any grammar or vocabulary mistakes
2. Provide corrections in a structured format
3. Respond naturally to continue the conversation

Focus on these grammar tenses: ${settings.grammarTenses.join(", ")}.
Use vocabulary from these sets: ${settings.vocabularySets.join(", ")}.

Always respond with a JSON object containing:
{
  "message": "Your friendly response continuing the conversation",
  "corrections": {
    "mistakes": [
      {
        "original": "incorrect phrase or word",
        "correction": "correct phrase or word",
        "explanation": "why this correction is needed"
      }
    ]
  }
}

Even if there are no mistakes, always include the corrections object with an empty mistakes array.
If the input is in English or another language, respond naturally but indicate they should try in Spanish.`
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