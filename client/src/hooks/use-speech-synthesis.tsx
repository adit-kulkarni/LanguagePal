import { useState, useEffect, useRef, useCallback } from 'react';
import { openAIAudioService } from '@/lib/openai-audio';

interface SpeechSynthesisOptions {
  voice?: string;
  rate?: number;
  preload?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onWord?: (word: string) => void;
  onSpeakingIntensity?: (intensity: number) => void;
}

/**
 * A React hook for text-to-speech synthesis with OpenAI
 * with automatic word highlighting and speaking animations
 */
export function useSpeechSynthesis({
  voice = 'nova',
  rate = 1,
  preload = true,
  onStart,
  onEnd,
  onWord,
  onSpeakingIntensity
}: SpeechSynthesisOptions = {}) {
  const [text, setText] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const wordsRef = useRef<string[]>([]);
  const currentWordIndexRef = useRef<number>(-1);
  const speakTimerRef = useRef<NodeJS.Timeout | null>(null);
  const intensityTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Clean up function to reset state and clear timers
  const cleanUp = useCallback(() => {
    if (speakTimerRef.current) {
      clearTimeout(speakTimerRef.current);
      speakTimerRef.current = null;
    }
    
    if (intensityTimerRef.current) {
      clearInterval(intensityTimerRef.current);
      intensityTimerRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    setIsSpeaking(false);
    currentWordIndexRef.current = -1;
    wordsRef.current = [];
    
    if (onWord) onWord('');
    if (onSpeakingIntensity) onSpeakingIntensity(0);
  }, [onWord, onSpeakingIntensity]);
  
  // Preload the audio if preload option is true
  useEffect(() => {
    if (preload && text && !isSpeaking && !isLoading) {
      setIsLoading(true);
      
      openAIAudioService.preloadAudio(text, voice)
        .then(() => {
          console.log('Audio preloaded successfully');
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Error preloading audio:', err);
          setIsLoading(false);
        });
    }
  }, [text, preload, voice, isSpeaking, isLoading]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanUp();
      
      // Release audio URLs from memory
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, [cleanUp]);
  
  // Function to speak the current text
  const speak = useCallback(async () => {
    // Prevent multiple calls if already speaking or loading
    if (!text || isSpeaking || isLoading) {
      console.log("Speech blocked: already speaking or loading, or no text");
      return;
    }
    
    // Immediately set speaking flag to prevent concurrent calls
    setIsSpeaking(true);
    setIsLoading(true);
    
    try {
      setError(null);
      
      console.log("Starting speech synthesis for:", text.substring(0, 30) + "...");
      
      // Get the audio URL (from cache if possible)
      const audioUrl = await openAIAudioService.textToSpeech(text, voice);
      audioUrlRef.current = audioUrl;
      
      // Split text into words for highlighting
      wordsRef.current = text.split(/\s+/);
      currentWordIndexRef.current = -1;
      
      // Clean up any existing audio element to prevent conflicts
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
      
      // Create a fresh audio element each time to avoid stale state issues
      audioRef.current = new Audio(audioUrl);
      const audio = audioRef.current;
      
      console.log("Created new Audio element with src:", audioUrl);

      // CRITICAL: Force audio to load before events are attached
      audio.load();
      
      // Set up audio events
      audio.onloadedmetadata = () => {
        console.log(`Audio loaded, duration: ${audio.duration}s`);
      };
      
      audio.oncanplaythrough = () => {
        console.log("Audio can play through without buffering");
      };
      
      audio.onplay = () => {
        console.log("Audio playback started");
        setIsLoading(false);
        
        if (onStart) onStart();
        
        // More accurate word timing based on actual audio duration
        const estimatedDuration = Math.max(audio.duration, 1);
        const wordsCount = Math.max(wordsRef.current.length, 1);
        const intervalTime = (estimatedDuration * 1000) / wordsCount;
        
        console.log(`Word timing: ${intervalTime}ms per word (${wordsCount} words in ${estimatedDuration}s)`);
        
        // Function to update current word
        const updateCurrentWord = () => {
          currentWordIndexRef.current++;
          
          if (currentWordIndexRef.current < wordsCount) {
            const word = wordsRef.current[currentWordIndexRef.current];
            if (onWord) onWord(word);
            
            // Progress through the text
            const progress = (currentWordIndexRef.current + 1) / wordsCount;
            setProgress(progress);
            
            // Schedule next word
            speakTimerRef.current = setTimeout(updateCurrentWord, intervalTime);
          } else {
            if (onWord) onWord('');
          }
        };
        
        // Setup speaking intensity animation
        if (onSpeakingIntensity) {
          let direction = 1; // 1 for increasing, -1 for decreasing
          let intensity = 0;
          
          // Clear any existing interval first
          if (intensityTimerRef.current) {
            clearInterval(intensityTimerRef.current);
          }
          
          intensityTimerRef.current = setInterval(() => {
            // Change direction at boundaries
            if (intensity >= 100) direction = -1;
            if (intensity <= 0) direction = 1;
            
            // Update intensity based on direction
            intensity += direction * 5;
            
            // Ensure within bounds
            intensity = Math.max(0, Math.min(100, intensity));
            
            onSpeakingIntensity(intensity);
          }, 50);
        }
        
        // Start word processing
        updateCurrentWord();
      };
      
      audio.onended = () => {
        console.log("Audio playback ended");
        cleanUp();
        if (onEnd) onEnd();
      };
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setError('Error playing audio');
        setIsLoading(false);
        cleanUp();
      };
      
      // Play the audio with better error handling
      try {
        console.log("🔈 Attempting to play audio from URL:", audioUrl);
        
        // Force the audio to load before playing
        audio.load();
        
        // Define play attempt function we can reuse
        const attemptPlayback = () => {
          console.log("🔈 Attempting audio playback");
          try {
            const playPromise = audio.play();
            
            // Modern browsers return a promise from play()
            if (playPromise !== undefined) {
              playPromise.then(() => {
                console.log("🔈 Audio playback started successfully");
              }).catch(e => {
                // Auto-play may be blocked or other issues
                console.error('🔈 Play promise rejected:', e);
                
                // Show browser's policy reason if available
                if (e.name === 'NotAllowedError') {
                  console.error('🔈 Browser blocked autoplay - requires user gesture');
                  
                  // Try other methods to trigger audio playback
                  console.log('🔈 Trying alternative playback method...');
                  
                  // Create and dispatch a custom event for AudioPlayer components to listen to
                  const customEvent = new CustomEvent('play-teacher-audio', {
                    detail: { message: text }
                  });
                  window.dispatchEvent(customEvent);
                  
                  // Try one more direct play after a short delay
                  setTimeout(() => {
                    console.log('🔈 Trying final direct play attempt');
                    audio.play().catch(e2 => {
                      console.error('🔈 Final play attempt failed:', e2);
                      setError('Please click Play manually');
                      setIsLoading(false);
                      
                      // Don't fully clean up here, keep the current word tracking active
                      if (speakTimerRef.current) {
                        clearTimeout(speakTimerRef.current);
                        speakTimerRef.current = null;
                      }
                    });
                  }, 200);
                } else {
                  console.error('🔈 Play error reason:', e.message);
                  setError('Audio playback error');
                  setIsLoading(false);
                  cleanUp();
                }
              });
            }
          } catch (e) {
            console.error('🔈 Play execution error:', e);
            setError('Error executing playback');
            setIsLoading(false);
            cleanUp();
          }
        };
        
        // Add an explicit canplaythrough event to ensure the audio has loaded
        // IMPORTANT: Don't overwrite the original oncanplaythrough handler
        const originalCanPlayHandler = audio.oncanplaythrough;
        audio.oncanplaythrough = (e) => {
          // Call the original handler if it exists
          if (originalCanPlayHandler) {
            originalCanPlayHandler.call(audio, e);
          }
          // Then attempt playback
          attemptPlayback();
        };
        
        // Also add timeout in case canplaythrough never fires
        setTimeout(() => {
          if (isSpeaking && isLoading) {
            console.log('🔈 Audio loading timeout - trying to play anyway');
            attemptPlayback();
          }
        }, 1500);
        
      } catch (e) {
        console.error('🔈 Audio setup error:', e);
        setError('Error setting up audio playback');
        setIsLoading(false);
        cleanUp();
      }
      
    } catch (e) {
      console.error('Speech error:', e);
      setError('Error generating speech');
      setIsLoading(false);
      cleanUp();
    }
  }, [text, voice, isSpeaking, isLoading, onStart, onEnd, onWord, onSpeakingIntensity, cleanUp]);
  
  // Function to stop speaking
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    cleanUp();
  }, [cleanUp]);
  
  return {
    text,
    setText,
    speak,
    stop,
    isSpeaking,
    isLoading,
    error,
    progress
  };
}