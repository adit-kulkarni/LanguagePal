import { z } from "zod";

const wiktionaryResponseSchema = z.object({
  title: z.string(),
  extract: z.string(),
  pageid: z.number(),
  description: z.string().optional(),
});

export async function translateWord(word: string): Promise<{ 
  translation: string;
  examples?: string[];
  phonetic?: string;
}> {
  try {
    // Use English Wiktionary API with proper language specification
    const encodedWord = encodeURIComponent(word.toLowerCase().trim());
    const response = await fetch(
      `https://en.wiktionary.org/api/rest_v1/page/summary/${encodedWord}#Spanish`
    );

    if (!response.ok) {
      // Try alternate endpoint if first one fails
      const altResponse = await fetch(
        `https://es.wiktionary.org/api/rest_v1/page/summary/${encodedWord}`
      );

      if (!altResponse.ok) {
        throw new Error('Word not found in dictionary');
      }

      const altData = await altResponse.json();
      const altParsed = wiktionaryResponseSchema.parse(altData);

      // Extract translation from Spanish Wiktionary
      const translationMatch = altParsed.extract.match(/(?:translations?|traducciones?)[:\s]+([^.;]+)/i);
      return {
        translation: translationMatch ? translationMatch[1].trim() : altParsed.extract.split('.')[0],
      };
    }

    const data = await response.json();
    const parsed = wiktionaryResponseSchema.parse(data);

    // Look for Spanish translation patterns in the extract
    const spanishSection = parsed.extract.toLowerCase().indexOf('spanish');
    if (spanishSection !== -1) {
      const relevantText = parsed.extract.slice(spanishSection);
      // Look for translation patterns
      const translationMatch = relevantText.match(/(?:meaning|translation)[:\s]+([^.;]+)/i);

      return {
        translation: translationMatch ? translationMatch[1].trim() : relevantText.split('.')[0],
      };
    }

    // Fallback to description if available
    if (parsed.description) {
      return {
        translation: parsed.description.split('.')[0],
      };
    }

    return {
      translation: parsed.extract.split('.')[0],
    };

  } catch (error) {
    console.error('Dictionary API error:', error);
    // Throw a more specific error for better error handling
    throw new Error('Failed to translate word: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}