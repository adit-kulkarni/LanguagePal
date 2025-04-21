import React, { useState, useEffect, useRef, useCallback } from 'react';

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
export function DirectAudioPlayer({
  text,
  voice = 'nova',
  onStart,
  onEnd,
  autoPlay = false,
  onWordChange
}: DirectAudioPlayerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wordTimerRef = useRef<number | null>(null);
  
  // Clean up function for word timers
  const cleanupWordTimer = useCallback(() => {
    if (wordTimerRef.current) {
      clearInterval(wordTimerRef.current);
      wordTimerRef.current = null;
    }
    
    // Clear any highlighted word
    if (onWordChange) {
      onWordChange('');
    }
  }, [onWordChange]);
  
  // Load audio when text changes
  useEffect(() => {
    if (!text) {
      console.log("[DirectAudioPlayer] No text provided");
      return;
    }
    
    const loadAudio = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log("[DirectAudioPlayer] Fetching audio for:", text);
        
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
        
        // Get the audio data
        const audioData = await response.arrayBuffer();
        console.log("[DirectAudioPlayer] Received audio data:", audioData.byteLength, "bytes");
        
        if (audioData.byteLength === 0) {
          throw new Error("Received empty audio data");
        }
        
        // Create blob with explicit MIME type for MP3
        const blob = new Blob([audioData], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        
        console.log("[DirectAudioPlayer] Created blob URL:", url);
        setAudioUrl(url);
        
        setIsLoading(false);
      } catch (error) {
        console.error("[DirectAudioPlayer] Error:", error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        setIsLoading(false);
      }
    };
    
    loadAudio();
    
    // Clean up
    return () => {
      cleanupWordTimer();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [text, voice, cleanupWordTimer]);
  
  // Set up audio events when URL changes
  useEffect(() => {
    if (!audioRef.current || !audioUrl || !text) return;
    
    const audio = audioRef.current;
    
    const handlePlay = () => {
      console.log("[DirectAudioPlayer] Audio playback started");
      if (onStart) onStart();
      
      // Set up word-by-word tracking if needed
      if (onWordChange) {
        // Split text into words
        const words = text.split(/\s+/);
        
        // Get duration or use estimated duration
        const duration = audio.duration || (text.length * 0.08); // Rough estimate
        
        // Calculate interval for word display
        const wordInterval = duration * 1000 / words.length;
        
        console.log(`[DirectAudioPlayer] Word timing: ${wordInterval}ms per word (${words.length} words in ${duration}s)`);
        
        cleanupWordTimer(); // Clear any existing timer
        
        // Start word update at regular intervals
        let wordIndex = 0;
        wordTimerRef.current = window.setInterval(() => {
          if (wordIndex < words.length) {
            const word = words[wordIndex];
            console.log(`[DirectAudioPlayer] Current word: ${word} (${wordIndex+1}/${words.length})`);
            if (onWordChange) onWordChange(word);
            wordIndex++;
          } else {
            cleanupWordTimer();
          }
        }, wordInterval);
      }
    };
    
    const handleEnded = () => {
      console.log("[DirectAudioPlayer] Audio playback ended");
      cleanupWordTimer();
      if (onEnd) onEnd();
    };
    
    const handleError = (e: Event) => {
      console.error("[DirectAudioPlayer] Audio error:", e);
      setError("Audio playback error");
      cleanupWordTimer();
    };
    
    // Set up event listeners
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    
    // Auto-play if needed
    if (autoPlay) {
      // Need a small delay to make sure the audio is loaded
      setTimeout(() => {
        console.log("[DirectAudioPlayer] Attempting auto-play");
        audio.play().catch(e => {
          console.error("[DirectAudioPlayer] Auto-play error:", e);
          setError("Browser blocked auto-play. Please click play button.");
        });
      }, 100);
    }
    
    // Clean up
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, text, onStart, onEnd, onWordChange, autoPlay, cleanupWordTimer]);
  
  // Play function for manual play button
  const playAudio = useCallback(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => {
        console.error("[DirectAudioPlayer] Play error:", e);
        setError("Error playing audio");
      });
    }
  }, [audioUrl]);
  
  return (
    <div>
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          controls={false}
          onLoadedData={() => console.log("[DirectAudioPlayer] Audio loaded successfully")}
          onCanPlay={() => console.log("[DirectAudioPlayer] Audio can play")}
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
      
      {!autoPlay && audioUrl && (
        <button
          onClick={playAudio}
          disabled={isLoading}
          className="mt-2 px-3 py-1 bg-primary text-white rounded hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 flex items-center gap-1"
        >
          {isLoading ? (
            <span>Cargando...</span>
          ) : (
            <span>Reproducir</span>
          )}
        </button>
      )}
    </div>
  );
}