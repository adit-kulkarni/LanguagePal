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
        // Improved word tracking with more frequent updates
        if (onWordChange && text) {
          const progress = audio.currentTime / audio.duration;
          const words = text.split(' ');
          
          // Calculate word index based on progress
          const wordIndex = Math.min(
            Math.floor(progress * words.length),
            words.length - 1
          );
          
          // Only update if the word has changed or it's the first update
          const currentWord = words[wordIndex];
          
          // Store the last word in a data attribute on the audio element
          const lastWord = audio.dataset.lastWord || '';
          
          if (currentWord !== lastWord) {
            audio.dataset.lastWord = currentWord;
            console.log('[DirectAudioPlayer] Word changed:', currentWord);
            onWordChange(currentWord);
          }
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