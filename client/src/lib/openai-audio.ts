/**
 * Service for handling OpenAI Text-to-Speech and Speech-to-Text
 */
export class OpenAIAudioService {
  // Cache for audio to prevent repeated API calls for the same text
  private audioCache: Map<string, string> = new Map();
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private preloadQueue: string[] = [];
  private isPreloading = false;
  private isBrowserSupported: boolean;

  constructor() {
    // Check if browser supports required audio and media features
    this.isBrowserSupported = typeof window !== 'undefined' && 
      !!window.AudioContext && 
      !!navigator.mediaDevices?.getUserMedia;
    
    if (!this.isBrowserSupported) {
      console.warn('Browser does not fully support required audio features');
    }
  }

  /**
   * Preloads the audio for a text to reduce lag when it's actually needed
   * @param text The text to convert to speech
   * @param voice The voice to use
   */
  async preloadAudio(text: string, voice: string = 'nova'): Promise<void> {
    // Don't preload if already in cache
    const cacheKey = `${text}:${voice}`;
    if (this.audioCache.has(cacheKey)) {
      return;
    }

    // Add to queue and process if not already preloading
    this.preloadQueue.push(cacheKey);
    
    if (!this.isPreloading) {
      this.processPreloadQueue();
    }
  }

  /**
   * Process the preload queue one by one
   */
  private async processPreloadQueue(): Promise<void> {
    if (this.preloadQueue.length === 0 || this.isPreloading) {
      return;
    }

    this.isPreloading = true;
    
    while (this.preloadQueue.length > 0) {
      const cacheKey = this.preloadQueue.shift()!;
      const [text, voice] = cacheKey.split(':');
      
      try {
        // Fetch the audio but don't create an audio element yet
        const audioUrl = await this._fetchAudio(text, voice);
        this.audioCache.set(cacheKey, audioUrl);
        
        // Create and prepare audio element
        const audio = new Audio();
        audio.src = audioUrl;
        audio.load(); // Start loading the audio data
        this.audioElements.set(cacheKey, audio);
        
        // Wait a bit between preloads to not overwhelm the network
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error('Error preloading audio:', error);
        // Continue with next item even if there's an error
      }
    }
    
    this.isPreloading = false;
  }

  /**
   * Internal method to fetch audio from the server
   */
  private async _fetchAudio(text: string, voice: string): Promise<string> {
    console.log(`Fetching audio for: "${text.substring(0, 30)}..."`);
    
    const response = await fetch('/api/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, voice }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `Failed to generate speech: ${response.status}`);
    }

    // Convert the response to a blob and create a URL
    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  }

  /**
   * Converts text to speech using OpenAI's TTS service
   * @param text The text to convert to speech
   * @param voice The voice to use (alloy, echo, fable, onyx, nova, shimmer)
   * @returns URL to an audio blob and the Audio element for playback control
   */
  async textToSpeech(text: string, voice: string = 'nova'): Promise<string> {
    if (!text || text.trim() === '') {
      throw new Error('No text provided for speech generation');
    }
    
    // Generate a unique cache key
    const cacheKey = `${text}:${voice}`;
    
    // Check if we already have this audio in the cache
    if (this.audioCache.has(cacheKey)) {
      console.log('Using cached audio');
      return this.audioCache.get(cacheKey)!;
    }
    
    // Fetch the audio
    try {
      const audioUrl = await this._fetchAudio(text, voice);
      
      // Store in cache for future use
      this.audioCache.set(cacheKey, audioUrl);
      
      // Create and prepare audio element
      const audio = new Audio();
      audio.src = audioUrl;
      audio.load(); // Start loading the audio data
      this.audioElements.set(cacheKey, audio);
      
      return audioUrl;
    } catch (error) {
      console.error('Error generating speech:', error);
      throw error;
    }
  }

  /**
   * Get the Audio element for a previously generated speech
   * @param text The text that was converted to speech
   * @param voice The voice that was used
   * @returns The Audio element or null if not found
   */
  getAudioElement(text: string, voice: string = 'nova'): HTMLAudioElement | null {
    const cacheKey = `${text}:${voice}`;
    return this.audioElements.get(cacheKey) || null;
  }

  /**
   * Clears a specific audio from the cache
   * @param text The text that was converted to speech
   * @param voice The voice that was used
   */
  clearCache(text: string, voice: string = 'nova'): void {
    const cacheKey = `${text}:${voice}`;
    
    if (this.audioCache.has(cacheKey)) {
      URL.revokeObjectURL(this.audioCache.get(cacheKey)!);
      this.audioCache.delete(cacheKey);
    }
    
    if (this.audioElements.has(cacheKey)) {
      this.audioElements.delete(cacheKey);
    }
  }

  /**
   * Clears all cached audio
   */
  clearAllCache(): void {
    // Revoke all object URLs to prevent memory leaks
    this.audioCache.forEach(url => URL.revokeObjectURL(url));
    
    // Clear collections
    this.audioCache.clear();
    this.audioElements.clear();
    this.preloadQueue = [];
  }

  /**
   * Transcribes speech to text using OpenAI's Whisper API
   * @param audioBlob The audio blob to transcribe
   * @param language The language of the audio (e.g., 'es' for Spanish)
   * @returns The transcribed text
   */
  async speechToText(audioBlob: Blob, language: string = 'es'): Promise<string> {
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error('No audio data provided for transcription');
    }
    
    console.log(`Transcribing speech (${audioBlob.size} bytes)`);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('language', language);

      // Log before sending request
      console.log('Sending speech-to-text request...');
      
      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });

      // Log after receiving response
      console.log('Received speech-to-text response:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        let errorObj;
        try {
          errorObj = JSON.parse(errorText);
        } catch (e) {
          errorObj = { message: errorText || 'Failed to transcribe speech' };
        }
        throw new Error(errorObj.message || `Server returned ${response.status}`);
      }

      const data = await response.json();
      console.log('Transcription result:', data.transcription);
      return data.transcription;
    } catch (error) {
      console.error('Error transcribing speech:', error);
      throw error;
    }
  }

  /**
   * Records audio from the microphone
   * @param onStart Callback when recording starts
   * @param onStop Callback when recording stops with the audio blob
   * @param maxDurationMs Maximum recording duration in milliseconds (default 30 seconds)
   * @returns A controller object with start() and stop() methods
   */
  createRecorder(
    onStart: () => void,
    onStop: (blob: Blob) => void,
    maxDurationMs: number = 30000
  ) {
    let mediaRecorder: MediaRecorder | null = null;
    let recordedChunks: BlobPart[] = [];
    let recordingTimeout: NodeJS.Timeout | null = null;
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let silenceDetectionInterval: NodeJS.Timeout | null = null;
    let silenceStart: number | null = null;
    
    // Configuration
    const silenceThreshold = -65; // dB, adjust based on testing
    const silenceDuration = 1500; // ms of silence before auto-stopping
    
    const cleanup = () => {
      if (silenceDetectionInterval) {
        clearInterval(silenceDetectionInterval);
        silenceDetectionInterval = null;
      }
      
      if (recordingTimeout) {
        clearTimeout(recordingTimeout);
        recordingTimeout = null;
      }
      
      if (audioContext) {
        audioContext.close().catch(console.error);
        audioContext = null;
        analyser = null;
      }
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }
      
      mediaRecorder = null;
      recordedChunks = [];
      silenceStart = null;
    };
    
    // Calculate decibel level from audio data
    const getDecibelLevel = (dataArray: Uint8Array): number => {
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      // Convert to decibels (rough approximation)
      return 20 * Math.log10(average / 255);
    };
    
    const controller = {
      start: async () => {
        recordedChunks = [];
        try {
          console.log('Requesting microphone access...');
          
          // Request microphone access with specific constraints for better quality
          stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 44100,
            } 
          });
          
          console.log('Microphone access granted');
          
          // Set up audio analysis for silence detection
          audioContext = new AudioContext();
          const source = audioContext.createMediaStreamSource(stream);
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          source.connect(analyser);
          
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          
          // Set up silence detection
          silenceDetectionInterval = setInterval(() => {
            if (!analyser) return;
            
            analyser.getByteFrequencyData(dataArray);
            const decibels = getDecibelLevel(dataArray);
            
            // Log every 10 intervals for debugging (approximately once per second)
            if (Math.random() < 0.1) {
              console.log(`Audio level: ${decibels.toFixed(2)} dB`);
            }
            
            if (decibels < silenceThreshold) {
              // If silence just started, record the time
              if (silenceStart === null) {
                silenceStart = Date.now();
              } 
              // If silence has continued for the threshold duration, stop recording
              else if (Date.now() - silenceStart > silenceDuration && mediaRecorder?.state === 'recording') {
                console.log('Silence detected, stopping recording');
                controller.stop();
              }
            } else {
              // Reset silence timer if sound is detected
              silenceStart = null;
            }
          }, 100);
          
          // Set up media recorder
          mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 128000
          });
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              recordedChunks.push(event.data);
            }
          };
          
          mediaRecorder.onstop = () => {
            // Stop all monitoring
            cleanup();
            
            // Combine recorded chunks into a single blob if we have data
            if (recordedChunks.length > 0) {
              const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
              console.log(`Recording complete: ${audioBlob.size} bytes`);
              onStop(audioBlob);
            } else {
              console.error('No audio data recorded');
              onStop(new Blob([], { type: 'audio/webm' }));
            }
          };
          
          mediaRecorder.onerror = (event) => {
            console.error('Media recorder error:', event);
            cleanup();
          };
          
          // Start recording and request data every 1 second for more responsive silence detection
          mediaRecorder.start(1000);
          console.log('Recording started');
          onStart();
          
          // Set a timeout to automatically stop recording after maxDurationMs
          recordingTimeout = setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              console.log('Max duration reached, stopping recording');
              controller.stop();
            }
          }, maxDurationMs);
          
          return true;
        } catch (error) {
          console.error('Error starting audio recording:', error);
          cleanup();
          return false;
        }
      },
      
      stop: () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          console.log('Manually stopping recording');
          mediaRecorder.stop();
          return true;
        }
        return false;
      },
      
      isRecording: () => {
        return mediaRecorder !== null && mediaRecorder.state === 'recording';
      }
    };
    
    return controller;
  }
}

export const openAIAudioService = new OpenAIAudioService();