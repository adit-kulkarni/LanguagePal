import { z } from "zod";

const dictionaryResponseSchema = z.array(z.object({
  word: z.string(),
  meanings: z.array(z.object({
    partOfSpeech: z.string(),
    definitions: z.array(z.object({
      definition: z.string(),
      example: z.string().optional(),
    })),
    synonyms: z.array(z.string()).optional(),
    translations: z.array(z.object({
      text: z.string()
    })).optional(),
  })),
  phonetics: z.array(z.object({
    text: z.string().optional()
  })).optional(),
})).min(1);

export async function translateWord(word: string): Promise<{ 
  translation: string;
  examples?: string[];
  phonetic?: string;
}> {
  try {
    // Use the Free Dictionary API with Spanish language code
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/es/${encodeURIComponent(word.toLowerCase().trim())}`
    );

    if (!response.ok) {
      throw new Error('Word not found in dictionary');
    }

    const data = await response.json();
    const parsed = dictionaryResponseSchema.parse(data);
    const entry = parsed[0];

    // Get the primary translation
    const translation = entry.meanings[0]?.definitions[0]?.definition || word;

    // Get phonetic if available
    const phonetic = entry.phonetics?.[0]?.text;

    // Get examples if available (we'll keep examples separate via OpenAI)
    return {
      translation,
      phonetic,
    };

  } catch (error) {
    console.error('Dictionary API error:', error);
    throw new Error('Failed to translate word: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}