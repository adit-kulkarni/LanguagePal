import { openAIAudioService } from "./openai-audio";

// Debug logs for speech module
const DEBUG = true;
const logDebug = (...args: any[]) => {
  if (DEBUG) {
    console.log("[SpeechRecognition]", ...args);
  }
};

// Define SpeechRecognition interface
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: any) => void;
  onaudiostart?: () => void;
  onaudioend?: () => void;
  onsoundstart?: () => void;
  onsoundend?: () => void;
  onspeechstart?: () => void;
  onspeechend?: () => void;
  onnomatch?: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

// Define the SpeechRecognition constructor
interface SpeechRecognitionConstructor {
  new(): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: {
    transcript: string;
    confidence?: number;
  };
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: SpeechRecognitionResult;
    length: number;
  };
  resultIndex?: number;
}

/**
 * Enhanced Speech recognition service that can use either:
 * 1. Browser's built-in SpeechRecognition API
 * 2. OpenAI's Whisper API for higher accuracy
 * 
 * This version focuses on reliability, performance, and error handling
 */
export class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private recorder: ReturnType<typeof openAIAudioService.createRecorder> | null = null;
  private isListening = false;
  private mode: 'browser' | 'openai' = 'openai'; // Default to OpenAI for better accuracy
  private fallbackMode = true; // Use browser as fallback if OpenAI fails
  private silenceTimeout: NodeJS.Timeout | null = null;
  private silenceDetectionEnabled = true;
  private silenceThresholdMs = 1500; // Reduced from 2000ms for better responsiveness
  private currentCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private currentTranscript = '';
  private retryCount = 0;
  private maxRetries = 2;

  constructor() {
    this.initBrowserRecognition();
    logDebug('Speech recognition service initialized');
  }

  /**
   * Initialize browser's speech recognition API
   */
  private initBrowserRecognition() {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'es-ES';
        
        // Set up detailed logging for all events
        if (DEBUG) {
          this.recognition.onaudiostart = () => logDebug('Browser - Audio recording started');
          this.recognition.onaudioend = () => logDebug('Browser - Audio recording ended');
          this.recognition.onsoundstart = () => logDebug('Browser - Sound detected');
          this.recognition.onsoundend = () => logDebug('Browser - Sound ended');
          this.recognition.onspeechstart = () => logDebug('Browser - Speech detected');
          this.recognition.onspeechend = () => logDebug('Browser - Speech ended');
          this.recognition.onnomatch = () => logDebug('Browser - No speech matched');
        }
        
        logDebug('Browser speech recognition initialized successfully');
      } else {
        console.warn('Browser SpeechRecognition API not available');
        this.mode = 'openai';
      }
    } catch (error) {
      console.warn("Error initializing browser SpeechRecognition:", error);
      this.mode = 'openai';
    }
  }

  /**
   * Set the recognition mode
   * @param mode 'browser' for native API, 'openai' for Whisper API
   */
  setMode(mode: 'browser' | 'openai') {
    logDebug(`Setting recognition mode to: ${mode}`);
    this.mode = mode;
    this.retryCount = 0;
  }

  /**
   * Configure fallback behavior
   * @param enabled Whether to enable fallback to browser API if OpenAI fails
   */
  setFallbackMode(enabled: boolean) {
    logDebug(`Setting fallback mode: ${enabled}`);
    this.fallbackMode = enabled;
  }

  /**
   * Configure silence detection
   * @param enabled Whether to enable automatic stopping after silence
   * @param thresholdMs Milliseconds of silence before stopping
   */
  configureSilenceDetection(enabled: boolean, thresholdMs: number = 1500) {
    logDebug(`Configuring silence detection: enabled=${enabled}, threshold=${thresholdMs}ms`);
    this.silenceDetectionEnabled = enabled;
    this.silenceThresholdMs = thresholdMs;
  }

  /**
   * Check if speech recognition is currently active
   */
  isRecognizing(): boolean {
    return this.isListening;
  }

  /**
   * Get the current transcript (last recognized text)
   */
  getCurrentTranscript(): string {
    return this.currentTranscript;
  }

  /**
   * Start speech recognition
   * @param onResult Callback for receiving transcription results
   */
  start(onResult: (text: string, isFinal: boolean) => void) {
    if (this.isListening) {
      logDebug('Already listening, stopping first');
      this.stop();
    }

    logDebug(`Starting speech recognition in ${this.mode} mode`);
    this.isListening = true;
    this.currentCallback = onResult;
    
    if (this.mode === 'browser' && this.recognition) {
      this.startBrowserRecognition();
    } else {
      this.startOpenAIRecognition();
    }
  }

  /**
   * Start browser's built-in speech recognition
   */
  private startBrowserRecognition() {
    if (!this.recognition || !this.currentCallback) {
      logDebug('Browser recognition not available or no callback set');
      this.isListening = false;
      return;
    }

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      // Process all results since last event
      const resultIndex = event.resultIndex || 0;
      for (let i = resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        
        if (result.isFinal) {
          finalTranscript += ' ' + transcript;
        } else {
          interimTranscript += ' ' + transcript;
        }
      }
      
      finalTranscript = finalTranscript.trim();
      interimTranscript = interimTranscript.trim();
      
      if (finalTranscript && this.currentCallback) {
        logDebug(`Final transcript: "${finalTranscript}"`);
        this.currentTranscript = finalTranscript;
        this.currentCallback(finalTranscript, true);
      } else if (interimTranscript && this.currentCallback) {
        logDebug(`Interim transcript: "${interimTranscript}"`);
        this.currentCallback(interimTranscript, false);
      }
      
      // Reset silence detection on any result
      if (this.silenceDetectionEnabled && (finalTranscript || interimTranscript)) {
        this._resetSilenceDetection(() => {
          logDebug('Silence threshold reached, stopping recognition');
          this.stop();
          
          // If we have interim results, finalize them
          if (interimTranscript && !finalTranscript && this.currentCallback) {
            this.currentTranscript = interimTranscript;
            this.currentCallback(interimTranscript, true);
          }
        });
      }
    };

    this.recognition.onend = () => {
      logDebug('Browser recognition ended');
      this.isListening = false;
    };

    this.recognition.onerror = (event) => {
      console.error('Browser speech recognition error:', event);
      this.isListening = false;
      
      // Try OpenAI as a fallback if browser fails and fallback is enabled
      if (this.fallbackMode && this.mode === 'browser' && this.retryCount < this.maxRetries) {
        logDebug('Falling back to OpenAI after browser error');
        this.retryCount++;
        this.mode = 'openai';
        if (this.currentCallback) {
          this.start(this.currentCallback);
        }
      }
    };

    try {
      this.recognition.start();
      logDebug('Browser recognition started');
    } catch (error) {
      console.error('Error starting browser recognition:', error);
      this.isListening = false;
      
      // Try OpenAI as a fallback if browser fails to start and fallback is enabled
      if (this.fallbackMode && this.mode === 'browser' && this.retryCount < this.maxRetries) {
        logDebug('Falling back to OpenAI after browser start error');
        this.retryCount++;
        this.mode = 'openai';
        this.start(this.currentCallback!);
      }
    }
  }

  /**
   * Start OpenAI Whisper-based speech recognition
   */
  private startOpenAIRecognition() {
    if (!this.currentCallback) {
      logDebug('No callback set for OpenAI recognition');
      this.isListening = false;
      return;
    }
    
    logDebug('Starting OpenAI Whisper recognition');
    
    this.recorder = openAIAudioService.createRecorder(
      // onStart callback
      () => {
        logDebug('OpenAI recording started');
        // Send an empty result to indicate we're listening
        this.currentCallback!('', false);
      },
      
      // onStop callback
      async (blob) => {
        if (!this.currentCallback) {
          this.isListening = false;
          return;
        }
        
        logDebug(`OpenAI recording stopped, blob size: ${blob.size}`);
        
        // Skip very small audio blobs (likely just background noise)
        if (blob.size < 1000) {
          logDebug('Audio blob too small, ignoring');
          this.isListening = false;
          return;
        }
        
        // Show "processing" message to user
        this.currentCallback('Procesando...', false);
        
        try {
          // Transcribe audio using OpenAI
          logDebug('Sending audio to OpenAI for transcription');
          const transcript = await openAIAudioService.speechToText(blob, 'es');
          
          if (transcript && transcript.trim()) {
            logDebug(`OpenAI transcription result: "${transcript}"`);
            this.currentTranscript = transcript;
            this.currentCallback(transcript, true);
          } else {
            logDebug('OpenAI returned empty transcript');
            
            // Try browser fallback if OpenAI returned empty result
            if (this.fallbackMode && this.recognition && this.retryCount < this.maxRetries) {
              logDebug('Empty OpenAI result, trying browser fallback');
              this.retryCount++;
              this.mode = 'browser';
              this.start(this.currentCallback);
              return;
            }
          }
        } catch (error) {
          console.error('Error transcribing with OpenAI:', error);
          
          // Try browser fallback if OpenAI failed
          if (this.fallbackMode && this.recognition && this.retryCount < this.maxRetries) {
            logDebug('OpenAI error, trying browser fallback');
            this.retryCount++;
            this.mode = 'browser';
            this.start(this.currentCallback);
            return;
          } else {
            // Let the user know there was an error
            this.currentCallback('Error de transcripción', true);
          }
        } finally {
          this.isListening = false;
        }
      },
      
      // Max recording duration - reduced for faster feedback
      15000
    );
    
    const started = this.recorder.start();
    if (!started) {
      logDebug('Failed to start OpenAI recorder');
      this.isListening = false;
      
      // Try browser fallback if OpenAI recorder fails to start
      if (this.fallbackMode && this.recognition && this.retryCount < this.maxRetries) {
        logDebug('OpenAI recorder failed to start, trying browser fallback');
        this.retryCount++;
        this.mode = 'browser';
        this.start(this.currentCallback);
      }
    }
  }

  /**
   * Stop speech recognition
   */
  stop() {
    if (!this.isListening) {
      return;
    }
    
    logDebug('Stopping speech recognition');

    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }

    if (this.mode === 'browser' && this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('Error stopping browser recognition:', error);
      }
    } else if (this.recorder) {
      this.recorder.stop();
    }
    
    this.isListening = false;
  }

  /**
   * Reset silence detection timer
   * @param callback Function to call when silence is detected
   */
  private _resetSilenceDetection(callback: () => void) {
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
    }
    
    this.silenceTimeout = setTimeout(() => {
      callback();
      this.silenceTimeout = null;
    }, this.silenceThresholdMs);
  }
}

export const speechService = new SpeechRecognitionService();