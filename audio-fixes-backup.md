# Audio Fixes Backup

## Key Files and Changes

### 1. DirectAudioPlayer Component
This is our main audio playback component with word highlighting and audio control.

```tsx
// client/src/components/direct-audio-player.tsx

import React, { useEffect, useRef, useState } from "react";

interface DirectAudioPlayerProps {
  text: string | null;
  voice?: string;
  onStart?: () => void;
  onEnd?: () => void;
  autoPlay?: boolean;
  onWordChange?: (word: string) => void;
  id?: string; // Add an optional ID for direct DOM access
}

/**
 * A simplified direct audio player based on our working test component
 * This component handles direct audio loading and playback without excess complexity
 */
export const DirectAudioPlayer = React.forwardRef<{play: () => void}, DirectAudioPlayerProps>(
  ({ text, voice = 'nova', onStart, onEnd, autoPlay = false, onWordChange, id }, ref) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    
    // Create event listener for custom play event
    useEffect(() => {
      const handleError = (e: Event) => {
        console.error('[DirectAudioPlayer] Audio error:', e);
        setError('Error playing audio');
        setIsPlaying(false);
        if (onEnd) onEnd();
      };
      
      const handlePlayRequest = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.id === id) {
          console.log('[DirectAudioPlayer] Received play request for ID:', id);
          if (audioRef.current) {
            audioRef.current.play().catch(err => {
              console.error('[DirectAudioPlayer] Play request error:', err);
              setError('Failed to play audio');
              if (onEnd) onEnd();
            });
          }
        }
      };
      
      // Add event listeners
      window.addEventListener('directAudioPlayerPlay', handlePlayRequest);
      
      // Clean up
      return () => {
        window.removeEventListener('directAudioPlayerPlay', handlePlayRequest);
      };
    }, [id, onEnd]);
    
    // Load the audio when the text changes
    useEffect(() => {
      let isMounted = true;
      setError(null);
      
      const loadAudio = async () => {
        if (!text) return;
        
        try {
          const response = await fetch('/api/speech/tts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text,
              voice,
            }),
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.status}`);
          }
          
          const audioData = await response.arrayBuffer();
          console.log('[DirectAudioPlayer] Received audio data:', audioData.byteLength, 'bytes');
          
          // Create a blob URL for the audio data
          const blob = new Blob([audioData], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          console.log('[DirectAudioPlayer] Created blob URL:', url);
          
          if (isMounted) {
            setAudioUrl(url);
          }
        } catch (err) {
          console.error('[DirectAudioPlayer] Error loading audio:', err);
          if (isMounted) {
            setError('Failed to load audio');
          }
        }
      };
      
      loadAudio();
      
      return () => {
        isMounted = false;
        // Cleanup any previous audio URL to prevent memory leaks
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
      };
    }, [text, voice]);
    
    // Set up the audio element once the URL is available
    useEffect(() => {
      if (!audioUrl) return;
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      const handleEnded = () => {
        setIsPlaying(false);
        if (onEnd) onEnd();
      };
      
      const handlePlay = () => {
        setIsPlaying(true);
        if (onStart) onStart();
      };
      
      const handleTimeUpdate = () => {
        // This is where we would implement word tracking
        // For now, just a simple placeholder
        if (onWordChange && text) {
          const progress = audio.currentTime / audio.duration;
          const words = text.split(' ');
          const wordIndex = Math.min(
            Math.floor(progress * words.length),
            words.length - 1
          );
          onWordChange(words[wordIndex]);
        }
      };
      
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('error', (e) => console.error('Audio error:', e));
      audio.addEventListener('timeupdate', handleTimeUpdate);
      
      if (autoPlay) {
        audio.play().catch(err => {
          console.error('[DirectAudioPlayer] Autoplay error:', err);
          setError('Failed to autoplay audio');
        });
      }
      
      return () => {
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.pause();
        audioRef.current = null;
      };
    }, [audioUrl, onEnd, onStart, autoPlay, text, onWordChange]);
    
    // Expose play method via ref
    React.useImperativeHandle(ref, () => ({
      play: () => {
        if (audioRef.current) {
          audioRef.current.play().catch(err => {
            console.error('[DirectAudioPlayer] Play error:', err);
            setError('Failed to play audio');
          });
        }
      }
    }));
    
    // The component doesn't render anything visible
    return null;
  }
);

DirectAudioPlayer.displayName = "DirectAudioPlayer";
```

### 2. Simple Player Component
A simplified audio player for direct testing.

```tsx
// client/src/components/simple-player.tsx

import { useEffect, useRef } from "react";

interface SimplePlayerProps {
  text: string | null;
  voice?: string;
  autoPlay?: boolean;
  id?: string;
}

/**
 * Simplified audio player with no dependencies or complexity
 * Just plays audio via direct API call
 */
export function SimplePlayer({ text, voice = 'nova', autoPlay = false, id }: SimplePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    let isMounted = true;
    let audioUrl: string | null = null;
    
    async function loadAndPlayAudio() {
      if (!text) return;
      
      try {
        const response = await fetch('/api/speech/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            voice,
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        const audioData = await response.arrayBuffer();
        const blob = new Blob([audioData], { type: 'audio/mpeg' });
        audioUrl = URL.createObjectURL(blob);
        
        if (!isMounted) return;
        
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.addEventListener('error', (e) => {
          console.error('[SimplePlayer] Audio error:', e);
        });
        
        if (autoPlay) {
          audio.play().catch(err => {
            console.error('[SimplePlayer] Autoplay error:', err);
          });
        }
      } catch (error) {
        console.error('[SimplePlayer] Failed to load audio:', error);
      }
    }
    
    loadAndPlayAudio();
    
    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [text, voice, autoPlay]);
  
  return (
    <div className="flex flex-col space-y-2">
      <button 
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
        onClick={() => {
          if (audioRef.current) {
            audioRef.current.play().catch(err => {
              console.error('[SimplePlayer] Play button error:', err);
            });
          }
        }}
        disabled={!text}
      >
        Play Audio 🔊
      </button>
      
      {id && (
        <button 
          className="px-4 py-2 bg-muted text-muted-foreground rounded-md"
          onClick={() => {
            // Dispatch custom event to play audio
            window.dispatchEvent(new CustomEvent('directAudioPlayerPlay', {
              detail: { id }
            }));
          }}
          disabled={!text}
        >
          Play via Event
        </button>
      )}
    </div>
  );
}

export function setupSimplePlayerEvents() {
  // This function sets up global listeners for playing audio through events
  // Call this in your main application file
  console.log('Setting up simple player events');
}
```

### 3. VideoCallInterface Component
Updates to integrate with the DirectAudioPlayer.

```tsx
// Key changes in client/src/components/video-call-interface.tsx

// Add this inside VideoCallInterface component:
const audioPlayerRef = useRef<{ play: () => void } | null>(null);

// Then use the DirectAudioPlayer component:
<DirectAudioPlayer
  ref={audioPlayerRef}
  text={teacherMessage}
  voice="nova"
  onStart={() => setIsAudioPlaying(true)}
  onEnd={() => setIsAudioPlaying(false)}
  onWordChange={(word) => setCurrentSpokenWord(word)}
  id="video-call-audio"
/>

// To play the audio:
if (audioPlayerRef.current) {
  audioPlayerRef.current.play();
}
```

### 4. Routes Changes
Server-side routes for the audio API.

```typescript
// Key changes in server/routes.ts

// Add these route handlers:

// Text-to-speech endpoint
app.post("/api/speech/tts", async (req, res) => {
  const { text, voice = "nova" } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }
  
  try {
    console.log(`[API] Generating speech (${text.length} chars): "${text.substring(0, 20)}..." with voice ${voice}`);
    console.log(`[express] Generating speech for text (${text.length} chars): "${text.substring(0, 20)}..."`);
    
    const audioBuffer = await generateSpeech(text, voice);
    console.log(`[express] Generated speech audio (${audioBuffer.byteLength} bytes)`);
    console.log(`[API] Sending audio (${audioBuffer.byteLength} bytes) to client`);
    
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(audioBuffer);
  } catch (error) {
    console.error("[API] TTS error:", error);
    res.status(500).json({ error: "Speech generation failed" });
  }
});

// Speech-to-text endpoint
app.post("/api/speech/transcribe", async (req, res) => {
  try {
    if (!req.body || !req.body.audio) {
      return res.status(400).json({ error: "Audio data is required" });
    }
    
    const { audio, language = "es" } = req.body;
    
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audio, 'base64');
    console.log(`[API] Transcribing speech (${audioBuffer.length} bytes) in language: ${language}`);
    console.log(`[express] Transcribing speech (${audioBuffer.length} bytes) in language: ${language}`);
    
    const transcription = await transcribeSpeech(audioBuffer, language);
    console.log(`[express] Transcribed text: "${transcription.substring(0, 30)}..."`);
    console.log(`[API] Transcription complete: "${transcription.substring(0, 50)}..."`);
    
    res.json({ text: transcription });
  } catch (error) {
    console.error("[API] Transcription error:", error);
    res.status(500).json({ error: "Speech transcription failed" });
  }
});
```

### 5. OpenAI Audio Implementation
Server-side OpenAI audio integration.

```typescript
// server/openai-audio.ts

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
```

## Client-Side OpenAI Audio Service

```typescript
// client/src/lib/openai-audio.ts

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
```

## Integration Notes

1. These components work together to provide reliable audio playback:
   - DirectAudioPlayer handles the core playback with word tracking
   - SimplePlayer is a standalone test widget
   - OpenAIAudioService manages caching and audio processing

2. All audio requests are proxied through the server to keep API keys secure

3. Important fixes:
   - Using direct ArrayBuffer processing instead of Content-Type: audio/mpeg
   - Implementing proper Blob handling with URL.createObjectURL
   - Adding clean ref forwarding to expose play methods
   - Better error handling with user feedback