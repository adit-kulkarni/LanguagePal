import { openAIAudioService } from "./openai-audio";

// Define SpeechRecognition interface
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: any) => void;
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
  };
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: SpeechRecognitionResult;
    length: number;
  };
}

/**
 * Speech recognition service that can use either:
 * 1. Browser's built-in SpeechRecognition API
 * 2. OpenAI's Whisper API for higher accuracy
 */
export class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private recorder: ReturnType<typeof openAIAudioService.createRecorder> | null = null;
  private isListening = false;
  private mode: 'browser' | 'openai' = 'openai'; // Default to OpenAI for better accuracy
  private silenceTimeout: NodeJS.Timeout | null = null;
  private silenceDetectionEnabled = true;
  private silenceThresholdMs = 2000; // Stop after 2 seconds of silence

  constructor() {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'es-ES';
      }
    } catch (error) {
      console.warn("Browser SpeechRecognition not available, using OpenAI only");
      this.mode = 'openai';
    }
  }

  /**
   * Set the recognition mode
   * @param mode 'browser' for native API, 'openai' for Whisper API
   */
  setMode(mode: 'browser' | 'openai') {
    this.mode = mode;
  }

  /**
   * Configure silence detection
   * @param enabled Whether to enable automatic stopping after silence
   * @param thresholdMs Milliseconds of silence before stopping (default 2000ms)
   */
  configureSilenceDetection(enabled: boolean, thresholdMs: number = 2000) {
    this.silenceDetectionEnabled = enabled;
    this.silenceThresholdMs = thresholdMs;
  }

  /**
   * Start speech recognition
   * @param onResult Callback for receiving transcription results
   */
  start(onResult: (text: string, isFinal: boolean) => void) {
    if (this.isListening) return;

    if (this.mode === 'browser' && this.recognition) {
      // Browser's built-in speech recognition
      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        onResult(transcript, result.isFinal);
        
        // Reset silence detection timer on each result
        if (this.silenceDetectionEnabled) {
          this._resetSilenceDetection(() => {
            this.stop();
            onResult(transcript, true); // Mark as final when stopping due to silence
          });
        }
      };

      this.recognition.start();
      this.isListening = true;
    } else {
      // OpenAI Whisper-based speech recognition
      let transcription = '';
      
      this.recorder = openAIAudioService.createRecorder(
        // onStart
        () => {
          this.isListening = true;
          onResult('', false); // Initial empty result
        },
        
        // onStop
        async (blob) => {
          try {
            // Indicate processing state
            onResult(transcription + ' (processing...)', false);
            
            // Get transcription from OpenAI
            const result = await openAIAudioService.speechToText(blob);
            transcription = result;
            
            // Send final result
            onResult(transcription, true);
          } catch (error) {
            console.error('Transcription error:', error);
            // Still mark as final even if there's an error
            onResult(transcription || 'Error transcribing audio', true);
          } finally {
            this.isListening = false;
          }
        },
        
        // Maximum recording time (30 seconds)
        30000
      );
      
      // Start recording
      this.recorder.start();
    }
  }

  /**
   * Stop speech recognition
   */
  stop() {
    if (!this.isListening) return;

    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }

    if (this.mode === 'browser' && this.recognition) {
      this.recognition.stop();
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