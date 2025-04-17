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
    if (!text || isSpeaking || isLoading) return;
    
    try {
      setError(null);
      setIsLoading(true);
      
      // Get the audio URL (from cache if possible)
      const audioUrl = await openAIAudioService.textToSpeech(text, voice);
      audioUrlRef.current = audioUrl;
      
      // Split text into words for highlighting
      wordsRef.current = text.split(/\s+/);
      currentWordIndexRef.current = -1;
      
      // If we have a cached audio element, use it
      const cachedAudio = openAIAudioService.getAudioElement(text, voice);
      
      if (cachedAudio) {
        audioRef.current = cachedAudio;
      } else {
        // Create a new audio element if needed
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        audioRef.current.src = audioUrl;
      }
      
      // Set up audio events
      const audio = audioRef.current;
      
      audio.onplay = () => {
        setIsSpeaking(true);
        setIsLoading(false);
        
        if (onStart) onStart();
        
        // Estimate word timing based on text length and audio duration
        // This approach helps synchronize words with audio playback
        const estimatedDuration = Math.max(audio.duration, 1);
        const wordsCount = wordsRef.current.length;
        const intervalTime = (estimatedDuration * 1000) / wordsCount;
        
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
        cleanUp();
        if (onEnd) onEnd();
      };
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setError('Error playing audio');
        setIsLoading(false);
        setIsSpeaking(false);
        cleanUp();
      };
      
      // Play the audio
      try {
        await audio.play();
      } catch (e) {
        console.error('Play error:', e);
        setError('Error starting playback');
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