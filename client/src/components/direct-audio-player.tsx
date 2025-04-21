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
      
      // Create new audio element with robust error handling
      const audio = new Audio(audioUrl);
      audio.preload = 'auto'; // Force preloading for better playback
      
      // Add debugging logs
      console.log('[DirectAudioPlayer] Setting up new audio element for:', audioUrl);
      
      // Save reference for external controls
      audioRef.current = audio;
      
      // Event handlers with improved error logging
      const handleEnded = () => {
        console.log('[DirectAudioPlayer] Audio playback ended naturally');
        setIsPlaying(false);
        if (onEnd) onEnd();
      };
      
      const handlePlay = () => {
        console.log('[DirectAudioPlayer] Audio playback started');
        setIsPlaying(true);
        if (onStart) onStart();
      };
      
      const handlePause = () => {
        console.log('[DirectAudioPlayer] Audio playback paused');
        // Only set as not playing if we're at the end of the track
        if (audio.currentTime >= audio.duration - 0.1) {
          setIsPlaying(false);
        }
      };
      
      const handleCanPlay = () => {
        console.log('[DirectAudioPlayer] Audio can play, duration:', audio.duration);
      };
      
      const handleLoadedMetadata = () => {
        console.log('[DirectAudioPlayer] Audio metadata loaded, duration:', audio.duration);
      };
      
      const handleError = (e: Event) => {
        console.error('[DirectAudioPlayer] Audio element error event:', e);
        setError('Audio playback error');
        setIsPlaying(false);
        if (onEnd) onEnd();
      };
      
      const handleTimeUpdate = () => {
        // Improved word tracking with more frequent updates
        if (!text) return;
        
        // Debug time progression
        if (audio.currentTime % 1 < 0.1) { // Log every ~1 second
          console.log(`[DirectAudioPlayer] Time update: ${audio.currentTime.toFixed(1)}/${audio.duration.toFixed(1)}`);
        }
        
        if (onWordChange) {
          const progress = audio.currentTime / (audio.duration || 1); // Prevent division by zero
          const words = text.split(' ');
          
          // Calculate word index based on progress with safety check
          const wordIndex = Math.min(
            Math.floor(progress * words.length),
            words.length - 1
          );
          
          // Ensure we're not at an invalid index
          if (wordIndex >= 0 && wordIndex < words.length) {
            const currentWord = words[wordIndex];
            
            // Store the last word in a data attribute on the audio element
            const lastWord = audio.dataset.lastWord || '';
            
            if (currentWord !== lastWord) {
              audio.dataset.lastWord = currentWord;
              console.log('[DirectAudioPlayer] Word changed:', currentWord, `(${wordIndex+1}/${words.length})`);
              onWordChange(currentWord);
            }
          }
        }
      };
      
      // Add comprehensive event listeners
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('error', handleError);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      
      // Try autoplay if needed
      if (autoPlay) {
        // Use a slight delay to ensure audio is ready
        setTimeout(() => {
          audio.play().catch(err => {
            console.error('[DirectAudioPlayer] Autoplay error:', err);
            setError('Failed to autoplay audio');
          });
        }, 100);
      }
      
      // Clean up function
      return () => {
        console.log('[DirectAudioPlayer] Cleaning up audio element');
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        
        // Reset the audio element
        audio.pause();
        audio.src = '';
        audioRef.current = null;
      };
    }, [audioUrl, onEnd, onStart, autoPlay, text, onWordChange]);
    
    // Expose play method via ref with improved reliability
    React.useImperativeHandle(ref, () => ({
      play: () => {
        if (!audioRef.current) {
          console.error('[DirectAudioPlayer] Cannot play - audio element not available');
          return;
        }
        
        // Reset to beginning if needed
        if (audioRef.current.currentTime > 0) {
          console.log('[DirectAudioPlayer] Resetting audio to beginning before playing');
          audioRef.current.currentTime = 0;
          // Clear the last word data to ensure we start fresh
          delete audioRef.current.dataset.lastWord;
        }
        
        // First ensure audio is loaded
        audioRef.current.load();
        
        console.log('[DirectAudioPlayer] Attempting to play audio...');
        
        // Small delay to ensure audio is ready after loading
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play().catch(err => {
              console.error('[DirectAudioPlayer] Play error:', err);
              setError('Failed to play audio');
              if (onEnd) onEnd();
            });
          }
        }, 50);
      }
    }));
    
    // The component doesn't render anything visible
    return null;
  }
);

DirectAudioPlayer.displayName = "DirectAudioPlayer";