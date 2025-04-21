import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Simple audio format detection based on header bytes
 * This helps ensure we use the correct MIME type for the audio data
 */
function detectAudioFormat(bytes: Uint8Array): string {
  // Check for MP3 header (usually starts with ID3 or 0xFF 0xFB)
  if (
    (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || // "ID3"
    (bytes[0] === 0xFF && (bytes[1] === 0xFB || bytes[1] === 0xF3 || bytes[1] === 0xF2))
  ) {
    return 'mp3';
  }
  
  // Check for WAV header "RIFF" followed by "WAVE"
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45
  ) {
    return 'wav';
  }
  
  // Check for Ogg header "OggS"
  if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    return 'ogg';
  }
  
  // Default to mp3 if unknown
  return 'mp3';
}

interface AudioPlayerProps {
  text: string | null;
  voice?: string;
  onStart?: () => void;
  onEnd?: () => void;
  autoPlay?: boolean;
  listenToEvents?: boolean;
}

/**
 * A simple component that loads and plays audio directly via the API
 * Uses a direct approach rather than the more complex hooks method
 */
export function AudioPlayer({ 
  text, 
  voice = 'nova', 
  onStart, 
  onEnd,
  autoPlay = false,
  listenToEvents = false
}: AudioPlayerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentWord, setCurrentWord] = useState<string>('');

  // Create a global way to track words - not ideal, but a quick fix
  const updateGlobalWord = useCallback((word: string) => {
    setCurrentWord(word);
    // Use a custom event to broadcast the current word to parent components
    const event = new CustomEvent('word-changed', { 
      detail: { word }
    });
    window.dispatchEvent(event);
  }, []);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Reset errors when text changes
  useEffect(() => {
    setError(null);
  }, [text]);
  
  // Load and play audio when text changes
  useEffect(() => {
    if (!text) return;
    
    const loadAudio = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log("[AudioPlayer] Fetching audio for:", text.substring(0, 30) + '...');
        
        // Direct API call to get audio
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
        console.log("[AudioPlayer] Received audio data:", audioData.byteLength, "bytes");
        
        if (audioData.byteLength === 0) {
          throw new Error("Received empty audio data");
        }
        
        // Check if we get audio headers at the beginning of the file
        const firstBytes = new Uint8Array(audioData.slice(0, Math.min(20, audioData.byteLength)));
        console.log("[AudioPlayer] First bytes of audio data:", Array.from(firstBytes).map(b => b.toString(16)).join(' '));
        
        // Try to detect audio format from first bytes
        const detectedFormat = detectAudioFormat(firstBytes);
        console.log("[AudioPlayer] Detected audio format:", detectedFormat);
        
        // Use the correct MIME type based on detection, fallback to audio/mpeg
        const mimeType = detectedFormat === 'mp3' ? 'audio/mpeg' : 
                          detectedFormat === 'wav' ? 'audio/wav' : 
                          detectedFormat === 'ogg' ? 'audio/ogg' : 'audio/mpeg';
        
        console.log("[AudioPlayer] Using MIME type:", mimeType);
        const blob = new Blob([audioData], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        console.log("[AudioPlayer] Created blob URL:", url);
        
        // Set the URL for the audio element
        setAudioUrl(url);
        
        // If autoPlay is true, play the audio immediately
        if (autoPlay && audioRef.current) {
          // Wait a bit for the audio to be loaded
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.play().catch(e => {
                console.error("[AudioPlayer] Auto-play error:", e);
                setError("Browser blocked auto-play. Click play button instead.");
              });
            }
          }, 100);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("[AudioPlayer] Error:", error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        setIsLoading(false);
      }
    };
    
    loadAudio();
    
    // Clean up on unmount or when text changes
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [text, voice, autoPlay]);
  
  // Set up event handlers when audioUrl changes
  useEffect(() => {
    if (!audioRef.current || !audioUrl || !text) return;
    
    const audio = audioRef.current;
    
    const handlePlay = () => {
      console.log("[AudioPlayer] Playback started");
      if (onStart) onStart();
      
      // Set up word-by-word tracking
      // Split text into words
      const words = text.split(/\s+/);
      
      // Get audio duration (when available)
      const audioDuration = audio.duration || 5; // fallback to 5 seconds if duration not available yet
      
      // Calculate interval based on words and duration
      const wordInterval = (audioDuration * 1000) / Math.max(words.length, 1);
      
      console.log(`[AudioPlayer] Word timing: ${wordInterval}ms per word (${words.length} words in ${audioDuration}s)`);
      
      // Set up word update loop
      let wordIndex = -1;
      const wordTimerId = setInterval(() => {
        wordIndex++;
        
        // Clear interval when we're done with words
        if (wordIndex >= words.length) {
          clearInterval(wordTimerId);
          updateGlobalWord(''); // Clear the word
          return;
        }
        
        // Update current word and dispatch event
        const currentWord = words[wordIndex];
        console.log(`[AudioPlayer] Current word (${wordIndex+1}/${words.length}): ${currentWord}`);
        updateGlobalWord(currentWord);
        
      }, wordInterval);
      
      // Clean up on audio ended
      audio.addEventListener('ended', () => {
        clearInterval(wordTimerId);
        updateGlobalWord('');
      }, { once: true });
      
      // Clean up on audio pause
      audio.addEventListener('pause', () => {
        clearInterval(wordTimerId);
      }, { once: true });
    };
    
    const handleEnded = () => {
      console.log("[AudioPlayer] Playback ended");
      if (onEnd) onEnd();
      updateGlobalWord(''); // Make sure to clear the word
    };
    
    const handleError = (e: ErrorEvent) => {
      console.error("[AudioPlayer] Playback error:", e);
      setError("Error playing audio");
      updateGlobalWord(''); // Clear the word on error
    };
    
    // Add event listeners
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError as EventListener);
    
    // Clean up
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError as EventListener);
    };
  }, [audioUrl, onStart, onEnd, text, updateGlobalWord]);
  
  // Function to play audio directly (for user-initiated plays)
  const playAudio = useCallback(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = 0; // Start from beginning
      audioRef.current.play().catch(e => {
        console.error("[AudioPlayer] Play error:", e);
        setError("Error playing audio");
      });
    }
  }, [audioUrl]);
  
  // Listen for custom event to trigger audio play (added for manual audio button)
  useEffect(() => {
    if (!listenToEvents) return;
    
    const handleCustomPlayEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string }>;
      
      console.log("[AudioPlayer] Received play-teacher-audio event", customEvent.detail);
      
      // Only play if this message matches our text
      if (customEvent.detail.message === text) {
        console.log("[AudioPlayer] Playing audio from custom event");
        playAudio();
      }
    };
    
    // Add event listener
    window.addEventListener('play-teacher-audio', handleCustomPlayEvent);
    
    // Clean up
    return () => {
      window.removeEventListener('play-teacher-audio', handleCustomPlayEvent);
    };
  }, [text, listenToEvents, playAudio]);
  
  return (
    <div>
      {audioUrl && (
        <audio 
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          controls={false}
          onLoadedData={() => console.log("[AudioPlayer] Audio loaded successfully")}
          onCanPlay={() => console.log("[AudioPlayer] Audio can play")}
          onPlaying={() => console.log("[AudioPlayer] Audio is playing")}
        />
      )}
      
      {error && (
        <div className="text-red-500 text-sm mt-1">
          {error}
        </div>
      )}
      
      {isLoading && (
        <div className="text-blue-500 text-sm mt-1 animate-pulse">
          Cargando audio...
        </div>
      )}
      
      {(text && !autoPlay) && (
        <button
          onClick={playAudio}
          disabled={isLoading || !audioUrl}
          className="mt-2 px-3 py-1 bg-primary text-white rounded hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 flex items-center gap-1"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Cargando...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Reproducir
            </>
          )}
        </button>
      )}
    </div>
  );
}