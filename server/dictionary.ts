import { z } from "zod";

const dictionaryResponseSchema = z.array(z.object({
  word: z.string(),
  meanings: z.array(z.object({
    partOfSpeech: z.string(),
    definitions: z.array(z.object({
      definition: z.string(),
      example: z.string().optional(),
    })),
  })),
  phonetic: z.string().optional(),
})).min(1);

type DictionaryResponse = z.infer<typeof dictionaryResponseSchema>;

export async function translateWord(word: string): Promise<{ 
  translation: string;
  examples?: string[];
  phonetic?: string;
}> {
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
    );
    
    if (!response.ok) {
      throw new Error('Word not found');
    }

    const data = await response.json();
    const parsed = dictionaryResponseSchema.parse(data);
    const entry = parsed[0];

    // Get the primary definition
    const primaryMeaning = entry.meanings[0];
    const translation = primaryMeaning.definitions[0].definition;
    
    // Collect examples if available
    const examples = entry.meanings
      .flatMap(m => m.definitions)
      .filter(d => d.example)
      .map(d => d.example!)
      .slice(0, 3);

    return {
      translation,
      examples: examples.length > 0 ? examples : undefined,
      phonetic: entry.phonetic
    };
  } catch (error) {
    console.error('Dictionary API error:', error);
    throw new Error('Failed to translate word');
  }
}
