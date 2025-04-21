import React, { useCallback, useEffect, useRef, useState } from 'react';

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
        
        const blob = new Blob([audioData], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        
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
    if (!audioRef.current || !audioUrl) return;
    
    const audio = audioRef.current;
    
    const handlePlay = () => {
      console.log("[AudioPlayer] Playback started");
      if (onStart) onStart();
    };
    
    const handleEnded = () => {
      console.log("[AudioPlayer] Playback ended");
      if (onEnd) onEnd();
    };
    
    const handleError = (e: ErrorEvent) => {
      console.error("[AudioPlayer] Playback error:", e);
      setError("Error playing audio");
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
  }, [audioUrl, onStart, onEnd]);
  
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
        />
      )}
      
      {error && (
        <div className="text-red-500 text-sm mt-1">
          {error}
        </div>
      )}
      
      {(text && !autoPlay) && (
        <button
          onClick={playAudio}
          disabled={isLoading || !audioUrl}
          className="mt-2 px-3 py-1 bg-primary text-white rounded hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {isLoading ? 'Loading...' : 'Play Audio'}
        </button>
      )}
    </div>
  );
}