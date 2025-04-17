import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import { log } from './vite';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generates speech from text using OpenAI's text-to-speech API
 * @param text The text to convert to speech
 * @param voice The voice to use (alloy, echo, fable, onyx, nova, shimmer)
 * @returns Binary audio data
 */
export async function generateSpeech(text: string, voice: string = 'nova'): Promise<Buffer> {
  try {
    log(`Generating speech for text: "${text.substring(0, 30)}..."`);
    
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: text,
    });
    
    // Convert the response to a buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());
    log(`Generated speech audio (${buffer.length} bytes)`);
    
    return buffer;
  } catch (error) {
    console.error('Error generating speech:', error);
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
    log(`Transcribing speech (${audioBuffer.length} bytes)`);
    
    // Save buffer to a temporary file
    const tempFilePath = path.join(__dirname, 'temp_audio.webm');
    fs.writeFileSync(tempFilePath, audioBuffer);
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-1',
      language,
      response_format: 'json'
    });
    
    // Clean up temporary file
    fs.unlinkSync(tempFilePath);
    
    log(`Transcribed text: "${transcription.text.substring(0, 30)}..."`);
    return transcription.text;
  } catch (error) {
    console.error('Error transcribing speech:', error);
    throw error;
  }
}