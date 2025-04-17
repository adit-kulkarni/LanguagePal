import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import { log } from './vite';
import os from 'os';
import crypto from 'crypto';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to get a temporary file path
function getTempFilePath(prefix: string, extension: string): string {
  const tempDir = os.tmpdir();
  const randomStr = crypto.randomBytes(8).toString('hex');
  return path.join(tempDir, `${prefix}-${randomStr}.${extension}`);
}

/**
 * Generates speech from text using OpenAI's text-to-speech API
 * @param text The text to convert to speech
 * @param voice The voice to use (alloy, echo, fable, onyx, nova, shimmer)
 * @returns Binary audio data
 */
export async function generateSpeech(text: string, voice: string = 'nova'): Promise<Buffer> {
  try {
    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error('No text provided for speech generation');
    }
    
    log(`Generating speech for text (${trimmedText.length} chars): "${trimmedText.substring(0, 30)}..."`);
    
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    const safeVoice = validVoices.includes(voice) ? voice : 'nova';
    
    // Create the audio with OpenAI
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1-hd', // Using the high-definition model for better quality
      voice: safeVoice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: trimmedText,
      speed: 1.0, // Normal speed for better comprehension
    });
    
    // Convert the response to a buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());
    log(`Generated speech audio (${buffer.length} bytes)`);
    
    return buffer;
  } catch (error) {
    console.error('Error generating speech:', error);
    throw new Error(`Speech generation failed: ${error instanceof Error ? error.message : String(error)}`);
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
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('No audio data provided for transcription');
    }
    
    log(`Transcribing speech (${audioBuffer.length} bytes) in language: ${language}`);
    
    // Save buffer to a temporary file with a unique name
    const tempFilePath = getTempFilePath('whisper', 'webm');
    fs.writeFileSync(tempFilePath, audioBuffer);
    
    // Validate the file was written correctly
    if (!fs.existsSync(tempFilePath)) {
      throw new Error('Failed to create temporary audio file');
    }
    
    const fileStream = fs.createReadStream(tempFilePath);
    
    // Process the transcription
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-1',
        language,
        response_format: 'json',
        temperature: 0.0, // Lower temperature for more accurate transcriptions
        prompt: 'This is Spanish language practice.' // Help guide the model
      });
      
      log(`Transcribed text: "${transcription.text.substring(0, 30)}..."`);
      return transcription.text;
    } finally {
      // Always clean up temporary file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
        // Continue with execution even if cleanup fails
      }
    }
  } catch (error) {
    console.error('Error transcribing speech:', error);
    throw new Error(`Speech transcription failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}