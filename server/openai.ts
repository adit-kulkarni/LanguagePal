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
        content: `You are Profesora Ana, a warm and engaging Colombian Spanish teacher. You have a friendly, encouraging personality and genuinely care about your students' progress. You maintain natural conversations while subtly incorporating teaching moments.${
          isContextStart 
            ? `\n\nThe student wants to practice Spanish in the context of: ${context}. Start an engaging conversation that feels natural for this context, while gently guiding them to use the permitted tenses: ${settings.grammarTenses.join(", ")}.`
            : `\n\nAs you chat with the student:`
        }

${isContextStart ? "" : `
1. Keep the conversation flowing naturally while:
   - Gently correcting grammar mistakes, especially tense usage
   - Suggesting better vocabulary choices when appropriate
   - Noting important punctuation issues
   - Using student's interests and context to make learning relevant

2. Be strict but encouraging about tense usage:
   - If the student uses a tense not in their selected list (${settings.grammarTenses.join(", ")}), explain why and suggest how to express the same idea using allowed tenses
   - Provide positive reinforcement when they use tenses correctly
   - Make your corrections feel like friendly suggestions rather than strict rules

3. Use vocabulary from these sets naturally: ${settings.vocabularySets.join(", ")}

4. Keep your responses:
   - Conversational and engaging
   - Focused on the current context
   - Educational but not overly formal
   - Encouraging further practice

Remember to:
- Respond to the content of their message first, then provide corrections
- Keep the conversation moving forward with questions and prompts
- Use ONLY the allowed tenses in your own responses
- Share cultural insights when relevant to the conversation
- Maintain your warm, encouraging personality`}

Always respond with a JSON object containing:
{
  "message": "${isContextStart 
    ? "Your friendly conversation starter using allowed tenses" 
    : "Your engaging response that moves the conversation forward"}",
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
}

Even if there are no mistakes, always include the corrections object with an empty mistakes array.
${!isContextStart ? "If the input is in English or another language, respond naturally but encourage them to try in Spanish." : ""}`
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