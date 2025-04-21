import fs from "fs";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
      input: text,
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
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
    const tempFilePath = getTempFilePath('speech', 'webm');
    
    // Write buffer to temp file
    fs.writeFileSync(tempFilePath, audioBuffer);
    
    // Create a read stream for the file
    const file = fs.createReadStream(tempFilePath);
    
    // Transcribe audio
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language,
    });
    
    // Clean up temp file
    fs.unlinkSync(tempFilePath);
    
    return transcription.text;
  } catch (error) {
    console.error("Error transcribing speech:", error);
    throw error;
  }
}