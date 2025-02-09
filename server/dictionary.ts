import { z } from "zod";

const wiktionaryResponseSchema = z.object({
  title: z.string(),
  extract: z.string(),
  pageid: z.number(),
});

export async function translateWord(word: string): Promise<{ 
  translation: string;
  examples?: string[];
  phonetic?: string;
}> {
  try {
    // Use the Spanish Wiktionary API
    const response = await fetch(
      `https://es.wiktionary.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`
    );

    if (!response.ok) {
      throw new Error('Word not found');
    }

    const data = await response.json();
    const parsed = wiktionaryResponseSchema.parse(data);

    // Extract translation from the Wiktionary response
    // The extract typically contains the English translation in parentheses
    const extractMatches = parsed.extract.match(/\((.*?)\)/);
    const translation = extractMatches ? extractMatches[1].split(',')[0].trim() : parsed.extract;

    // For examples, we'll rely on the OpenAI API through the word-examples endpoint
    // as Wiktionary's example extraction would be more complex

    return {
      translation,
      examples: undefined, // Examples will be loaded separately via the word-examples endpoint
    };
  } catch (error) {
    console.error('Dictionary API error:', error);
    throw new Error('Failed to translate word');
  }
}