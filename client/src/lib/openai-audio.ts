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
    // Setup a garbage collector for the audio cache
    setInterval(() => this.cleanupCache(), this.cacheTTL / 2);
  }
  
  /**
   * Convert text to speech using OpenAI TTS API via our backend
   * Returns a cached URL if available or fetches a new one
   */
  async textToSpeech(text: string, voice = 'nova'): Promise<string> {
    const cacheKey = `${text}:${voice}`;
    
    // Check if we have the audio in cache
    if (this.audioCache.has(cacheKey)) {
      console.log('Using cached audio for:', text.substring(0, 30) + '...');
      const cachedItem = this.audioCache.get(cacheKey)!;
      // Update the timestamp to keep this entry "fresh"
      cachedItem.createdAt = Date.now();
      return cachedItem.url;
    }
    
    // Otherwise fetch the audio from the server
    try {
      console.log('Fetching audio for:', text.substring(0, 30) + '...');
      const response = await fetch('/api/speech/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voice }),
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      // Get the audio data and create a blob URL
      const audioData = await response.arrayBuffer();
      const blob = new Blob([audioData], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      
      console.log('🔈 Created audio blob URL:', url, 'size:', audioData.byteLength, 'bytes');
      
      // Create a new audio element to cache with explicit handling
      const audio = new Audio();
      audio.preload = 'auto';
      
      // Make sure we can actually play the format
      if (audio.canPlayType('audio/mpeg') === '') {
        console.warn('🔈 Browser cannot play audio/mpeg format!');
      } else {
        console.log('🔈 Browser can play audio/mpeg:', audio.canPlayType('audio/mpeg'));
      }
      
      // Set source after configuration
      audio.src = url;
      
      // Add to cache with current timestamp
      this.audioCache.set(cacheKey, {
        url,
        audioElement: audio,
        createdAt: Date.now()
      });
      
      return url;
    } catch (error) {
      console.error('Error fetching audio:', error);
      throw error;
    }
  }
  
  /**
   * Return a cached audio element if available
   */
  getAudioElement(text: string, voice = 'nova'): HTMLAudioElement | null {
    const cacheKey = `${text}:${voice}`;
    const cachedItem = this.audioCache.get(cacheKey);
    return cachedItem?.audioElement || null;
  }
  
  /**
   * Preload audio for a given text for quicker playback later
   */
  async preloadAudio(text: string, voice = 'nova'): Promise<void> {
    const cacheKey = `${text}:${voice}`;
    
    // Skip if already cached
    if (this.audioCache.has(cacheKey)) {
      return;
    }
    
    try {
      // Fetch the audio but don't block on it
      await this.textToSpeech(text, voice);
      console.log('Preloaded audio for:', text.substring(0, 30) + '...');
    } catch (error) {
      console.error('Error preloading audio:', error);
    }
  }
  
  /**
   * Clean up old cache entries to prevent memory leaks
   */
  private cleanupCache(): void {
    const now = Date.now();
    
    // Find expired entries
    for (const [key, item] of this.audioCache.entries()) {
      if (now - item.createdAt > this.cacheTTL) {
        // Revoke the blob URL to free memory
        URL.revokeObjectURL(item.url);
        this.audioCache.delete(key);
      }
    }
  }

  /**
   * Create a recorder for speech-to-text functionality
   */
  createRecorder() {
    const startRecording = async () => {
      if (this.isRecording) return;
      
      this.isRecording = true;
      this.audioChunks = [];
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Initialize audio context if needed
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        // Setup media recorder
        this.mediaRecorder = new MediaRecorder(stream);
        
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };
        
        this.mediaRecorder.start();
        console.log('Recording started');
        
        return true;
      } catch (error) {
        console.error('Error starting recording:', error);
        this.isRecording = false;
        return false;
      }
    };
    
    const stopRecording = (): Promise<Blob | null> => {
      return new Promise((resolve) => {
        if (!this.isRecording || !this.mediaRecorder) {
          resolve(null);
          return;
        }
        
        this.mediaRecorder.onstop = () => {
          console.log('Recording stopped, chunks:', this.audioChunks.length);
          
          if (this.audioChunks.length === 0) {
            resolve(null);
            return;
          }
          
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          this.audioChunks = [];
          this.isRecording = false;
          
          // Stop all tracks in the stream
          if (this.mediaRecorder && this.mediaRecorder.stream) {
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
          }
          
          resolve(audioBlob);
        };
        
        this.mediaRecorder.stop();
      });
    };
    
    const cancelRecording = () => {
      if (this.mediaRecorder && this.isRecording) {
        this.mediaRecorder.stop();
        
        // Stop all tracks in the stream
        if (this.mediaRecorder.stream) {
          this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        
        this.audioChunks = [];
        this.isRecording = false;
      }
    };
    
    return {
      startRecording,
      stopRecording,
      cancelRecording,
      isRecording: () => this.isRecording
    };
  }
  
  /**
   * Transcribe audio using OpenAI Whisper API via our backend
   */
  async transcribeAudio(audioBlob: Blob, language = 'es'): Promise<string> {
    try {
      // Convert blob to file with appropriate name
      const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
      
      // Create form data
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('language', language);
      
      // Send to server
      const response = await fetch('/api/speech/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.text || '';
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }
}

export const openAIAudioService = new OpenAIAudioService();