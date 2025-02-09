import { z } from "zod";

const translationResponseSchema = z.object({
  responseData: z.object({
    translatedText: z.string(),
    match: z.number()
  }),
  responseStatus: z.number(),
  responderId: z.string().nullable().optional(),
  matches: z.array(
    z.object({
      id: z.union([z.string(), z.number()]).transform(val => String(val)),
      segment: z.string(),
      translation: z.string(),
      quality: z.union([z.string(), z.number()]),
      reference: z.string().nullable().optional(),
      usage_count: z.number().optional(),
      subject: z.union([z.string(), z.boolean()]).nullable().optional(),
      created_by: z.string().nullable().optional(),
      last_updated_by: z.string().nullable().optional(),
      create_date: z.string().nullable().optional(),
      last_update_date: z.string().nullable().optional(),
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