declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
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

export class SpeechRecognitionService {
  private recognition: SpeechRecognition;
  private isListening = false;

  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'es-ES';
  }

  start(onResult: (text: string, isFinal: boolean) => void) {
    if (this.isListening) return;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      onResult(transcript, result.isFinal);
    };

    this.recognition.start();
    this.isListening = true;
  }

  stop() {
    if (!this.isListening) return;

    this.recognition.stop();
    this.isListening = false;
  }
}

export const speechService = new SpeechRecognitionService();