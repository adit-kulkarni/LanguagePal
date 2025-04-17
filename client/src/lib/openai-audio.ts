/**
 * Service for handling OpenAI Text-to-Speech and Speech-to-Text
 */
export class OpenAIAudioService {
  /**
   * Converts text to speech using OpenAI's TTS service
   * @param text The text to convert to speech
   * @param voice The voice to use (alloy, echo, fable, onyx, nova, shimmer)
   * @returns URL to an audio blob
   */
  async textToSpeech(text: string, voice: string = 'nova'): Promise<string> {
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voice }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate speech');
      }

      // Convert the response to a blob and create a URL
      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);
    } catch (error) {
      console.error('Error generating speech:', error);
      throw error;
    }
  }

  /**
   * Transcribes speech to text using OpenAI's Whisper API
   * @param audioBlob The audio blob to transcribe
   * @param language The language of the audio (e.g., 'es' for Spanish)
   * @returns The transcribed text
   */
  async speechToText(audioBlob: Blob, language: string = 'es'): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('language', language);

      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to transcribe speech');
      }

      const data = await response.json();
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

    const controller = {
      start: async () => {
        recordedChunks = [];
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(stream);
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordedChunks.push(event.data);
            }
          };
          
          mediaRecorder.onstop = () => {
            if (recordingTimeout) {
              clearTimeout(recordingTimeout);
              recordingTimeout = null;
            }
            
            // Combine recorded chunks into a single blob
            const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
            
            // Stop all tracks in the stream
            stream.getTracks().forEach(track => track.stop());
            
            onStop(audioBlob);
          };
          
          mediaRecorder.start();
          onStart();
          
          // Set a timeout to automatically stop recording after maxDurationMs
          recordingTimeout = setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
          }, maxDurationMs);
          
          return true;
        } catch (error) {
          console.error('Error starting audio recording:', error);
          return false;
        }
      },
      
      stop: () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
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