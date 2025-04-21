import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { v4 as uuidv4 } from "uuid";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getTempFilePath(prefix: string, extension: string): string {
  const tempDir = os.tmpdir();
  const fileName = `${prefix}-${uuidv4()}.${extension}`;
  return path.join(tempDir, fileName);
}

/**
 * Generates speech from text using OpenAI's text-to-speech API
 * @param text The text to convert to speech
 * @param voice The voice to use (alloy, echo, fable, onyx, nova, shimmer)
 * @returns Binary audio data
 */
export async function generateSpeech(text: string, voice: string = 'nova'): Promise<Buffer> {
  try {
    console.log(`Generating speech for text: "${text.substring(0, 30)}..." with voice ${voice}`);
    
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    const safeVoice = validVoices.includes(voice) ? voice : 'nova';

    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: safeVoice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
      input: text,
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw new Error(`Failed to generate speech: ${error.message}`);
  }
}

/**
 * Transcribes speech from an audio file using OpenAI's speech-to-text API
 * @param audioBuffer The audio buffer to transcribe
 * @param language The language of the audio (e.g., 'es' for Spanish)
 * @returns The transcribed text
 */
export async function transcribeSpeech(audioBuffer: Buffer, language: string = 'es'): Promise<string> {
  try {
    console.log(`Transcribing audio in language: ${language}`);
    
    // Save the buffer to a temporary file
    const tempFilePath = getTempFilePath("transcribe", "mp3");
    fs.writeFileSync(tempFilePath, audioBuffer);
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
      language: language,
    });
    
    // Clean up temp file
    fs.unlinkSync(tempFilePath);
    
    return transcription.text;
  } catch (error) {
    console.error("Error transcribing speech:", error);
    throw new Error(`Failed to transcribe speech: ${error.message}`);
  }
}