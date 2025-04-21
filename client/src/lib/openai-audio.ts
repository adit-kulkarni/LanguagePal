/**
 * Client-side service for OpenAI audio functionality
 * Handles text-to-speech and speech-to-text via server API
 * Implements caching and preloading for improved performance
 */

interface AudioCacheItem {
  url: string;
  audioElement?: HTMLAudioElement;
  createdAt: number;
}

class OpenAIAudioService {
  private audioCache: Map<string, AudioCacheItem> = new Map();
  private cacheTTL = 1000 * 60 * 10; // 10 minutes
  private isRecording = false;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  constructor() {
    // Set up cache cleanup interval
    setInterval(() => this.cleanupCache(), 60000); // Check every minute
  }

  /**
   * Convert text to speech using OpenAI TTS API via our backend
   * Returns a cached URL if available or fetches a new one
   */
  async textToSpeech(text: string, voice = 'nova'): Promise<string> {
    // Create a cache key by combining text and voice
    const cacheKey = `${text}-${voice}`;
    
    // Check if we have a cached version
    const cached = this.audioCache.get(cacheKey);
    if (cached) {
      return cached.url;
    }
    
    // Otherwise fetch new audio
    try {
      const response = await fetch('/api/speech/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voice }),
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const audioData = await response.arrayBuffer();
      const blob = new Blob([audioData], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      
      // Cache the result
      this.audioCache.set(cacheKey, {
        url,
        createdAt: Date.now(),
      });
      
      return url;
    } catch (error) {
      console.error('Audio service error:', error);
      throw new Error('Failed to generate speech');
    }
  }

  /**
   * Return a cached audio element if available
   */
  getAudioElement(text: string, voice = 'nova'): HTMLAudioElement | null {
    const cacheKey = `${text}-${voice}`;
    const cached = this.audioCache.get(cacheKey);
    
    if (cached && cached.audioElement) {
      return cached.audioElement;
    }
    
    return null;
  }

  /**
   * Preload audio for a given text for quicker playback later
   */
  async preloadAudio(text: string, voice = 'nova'): Promise<void> {
    try {
      const url = await this.textToSpeech(text, voice);
      const cacheKey = `${text}-${voice}`;
      const cached = this.audioCache.get(cacheKey);
      
      if (cached && !cached.audioElement) {
        const audio = new Audio(url);
        cached.audioElement = audio;
        // Preload without playing
        audio.load();
        console.log("Audio preloaded successfully");
      }
    } catch (error) {
      console.error('Preload error:', error);
    }
  }

  /**
   * Clean up old cache entries to prevent memory leaks
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, item] of this.audioCache.entries()) {
      if (now - item.createdAt > this.cacheTTL) {
        if (item.url) {
          URL.revokeObjectURL(item.url);
        }
        this.audioCache.delete(key);
      }
    }
  }

  /**
   * Create a recorder for speech-to-text functionality
   */
  createRecorder() {
    if (this.isRecording) {
      console.warn('Already recording');
      return;
    }
    
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      console.error('Media recording not supported in this browser');
      return;
    }
    
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        this.audioContext = new AudioContext();
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];
        
        this.mediaRecorder.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        });
        
        this.mediaRecorder.start();
        this.isRecording = true;
      })
      .catch(error => {
        console.error('Error creating recorder:', error);
      });
  }

  /**
   * Transcribe audio using OpenAI Whisper API via our backend
   */
  async transcribeAudio(audioBlob: Blob, language = 'es'): Promise<string> {
    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          resolve(base64data);
        };
      });
      reader.readAsDataURL(audioBlob);
      
      const base64Audio = await base64Promise;
      
      // Send to backend for transcription
      const response = await fetch('/api/speech/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: base64Audio,
          language,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const result = await response.json();
      return result.text;
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }
}

export const openAIAudioService = new OpenAIAudioService();