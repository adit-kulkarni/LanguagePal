import { z } from "zod";

const translationResponseSchema = z.object({
  responseData: z.object({
    translatedText: z.string(),
    match: z.number()
  }),
  responseStatus: z.number(),
  responderId: z.string().optional(),
  matches: z.array(
    z.object({
      id: z.string(),
      segment: z.string(),
      translation: z.string(),
      quality: z.string(),
      reference: z.string().optional(),
      usage_count: z.number(),
      subject: z.string().optional(),
      created_by: z.string().optional(),
      last_updated_by: z.string().optional(),
      create_date: z.string().optional(),
      last_update_date: z.string().optional(),
      match: z.number()
    })
  ).optional()
});

export async function translateWord(word: string): Promise<{ 
  translation: string;
  examples?: string[];
  phonetic?: string;
}> {
  try {
    // Use MyMemory Translation API to translate from Spanish (es) to English (en)
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word.toLowerCase().trim())}&langpair=es|en`
    );

    if (!response.ok) {
      throw new Error('Translation service unavailable');
    }

    const data = await response.json();
    const parsed = translationResponseSchema.parse(data);

    // Get the primary translation
    const translation = parsed.responseData.translatedText;

    // If the translation is the same as the input word, it might not be a valid Spanish word
    if (translation.toLowerCase() === word.toLowerCase()) {
      throw new Error('Word not found in dictionary');
    }

    return {
      translation,
      // Examples will be handled separately by the OpenAI endpoint
    };

  } catch (error) {
    console.error('Dictionary API error:', error);
    throw new Error('Failed to translate word: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}