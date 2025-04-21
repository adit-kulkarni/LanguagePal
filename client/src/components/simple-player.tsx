import { useEffect, useRef, useState } from "react";

interface SimplePlayerProps {
  text: string | null;
  voice?: string;
  autoPlay?: boolean;
  id?: string;
  onWordChange?: (word: string) => void;
}

/**
 * Simplified audio player with no dependencies or complexity
 * Just plays audio via direct API call
 * Updated with improvements to prevent early cutoff
 */
export function SimplePlayer({ text, voice = 'nova', autoPlay = false, id, onWordChange }: SimplePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track all blob URLs created for cleanup on unmount
  const blobUrlsRef = useRef<string[]>([]);
  
  // Track if we're currently playing to prevent audio element recreation
  const isPlayingRef = useRef(false);
  
  useEffect(() => {
    let isMounted = true;
    let isLoading = false;
    
    async function loadAndPlayAudio() {
      if (!text || isLoading) return;
      
      isLoading = true;
      setError(null);
      
      try {
        console.log(`[SimplePlayer] Loading audio for text: ${text.substring(0, 20)}...`);
        
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
        console.log('[SimplePlayer] Received audio data:', audioData.byteLength, 'bytes');
        
        const blob = new Blob([audioData], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        console.log('[SimplePlayer] Created blob URL:', url);
        
        // Store this URL in our ref for later cleanup
        blobUrlsRef.current.push(url);
        
        if (!isMounted) return;
        
        // Skip creating new audio element if already playing
        if (isPlayingRef.current && audioRef.current) {
          console.log('[SimplePlayer] Skipping audio element recreation during playback');
          return;
        }
        
        // Create new audio element
        const audio = new Audio(url);
        audio.preload = 'auto'; // Force preloading for better playback
        
        // Set crossOrigin to allow CORS audio to be manipulated by audio APIs if needed
        audio.crossOrigin = 'anonymous';
        
        console.log('[SimplePlayer] Setting up new audio element');
        audioRef.current = audio;
        
        // Event listeners
        const handleEnded = () => {
          console.log('[SimplePlayer] Audio playback ended naturally');
          isPlayingRef.current = false;
          setIsPlaying(false);
        };
        
        const handlePlay = () => {
          console.log('[SimplePlayer] Audio playback started');
          isPlayingRef.current = true;
          setIsPlaying(true);
        };
        
        const handlePause = () => {
          console.log('[SimplePlayer] Audio playback paused');
          // Only mark as not playing if we're at the end of the track
          if (audio.currentTime >= audio.duration - 0.1) {
            isPlayingRef.current = false;
            setIsPlaying(false);
          }
        };
        
        const handleError = (e: Event) => {
          console.error('[SimplePlayer] Audio element error event:', e);
          isPlayingRef.current = false;
          setError('Audio playback error');
          setIsPlaying(false);
        };
        
        const handleTimeUpdate = () => {
          // Word tracking - only if onWordChange provided and text exists
          if (onWordChange && text) {
            // Log progress occasionally 
            if (audio.currentTime % 1 < 0.1) { // Log approximately every second
              console.log(`[SimplePlayer] Time update: ${audio.currentTime.toFixed(1)}/${audio.duration.toFixed(1)}`);
            }
            
            const progress = audio.currentTime / (audio.duration || 1); // Prevent division by zero
            const words = text.split(' ');
            
            // Calculate word index based on progress
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
                console.log('[SimplePlayer] Word changed:', currentWord, `(${wordIndex+1}/${words.length})`);
                onWordChange(currentWord);
              }
            }
          }
        };
        
        // Add comprehensive event listeners
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('error', handleError);
        
        // Only add timeupdate listener if we need word tracking
        if (onWordChange) {
          audio.addEventListener('timeupdate', handleTimeUpdate);
        }
        
        if (autoPlay) {
          // Use a slight delay to ensure audio is ready
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.play().catch(err => {
                console.error('[SimplePlayer] Autoplay error:', err);
                setError('Failed to autoplay audio');
              });
            }
          }, 100);
        }
        
        isLoading = false;
      } catch (error) {
        console.error('[SimplePlayer] Failed to load audio:', error);
        setError('Failed to load audio');
        isLoading = false;
      }
    }
    
    loadAndPlayAudio();
    
    return () => {
      isMounted = false;
      
      // Skip cleanup if still playing
      if (!isPlayingRef.current) {
        console.log('[SimplePlayer] Safe cleanup of audio element (not playing)');
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
          audioRef.current = null;
        }
      }
    };
  }, [text, voice, autoPlay, onWordChange]);
  
  // Cleanup effect that runs only when component unmounts completely
  useEffect(() => {
    return () => {
      console.log('[SimplePlayer] Component unmounting, cleaning up ALL resources');
      
      // Clean up any existing audio element
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      
      // Clean up all blob URLs we've created
      blobUrlsRef.current.forEach(url => {
        console.log('[SimplePlayer] Revoking blob URL on unmount:', url);
        URL.revokeObjectURL(url);
      });
      blobUrlsRef.current = [];
    };
  }, []); // Empty dependency array means this only runs on mount/unmount
  
  // Handle play request function for the buttons
  const handlePlay = () => {
    if (!audioRef.current) {
      console.error('[SimplePlayer] Cannot play - audio element not available');
      return;
    }
    
    // Set our playback flag to prevent cleanup during playback
    isPlayingRef.current = true;
    
    // Reset to beginning if needed
    if (audioRef.current.currentTime > 0) {
      console.log('[SimplePlayer] Resetting audio to beginning before playing');
      audioRef.current.currentTime = 0;
      // Clear the last word data to ensure we start fresh
      delete audioRef.current.dataset.lastWord;
    }
    
    // First ensure audio is loaded
    audioRef.current.load();
    
    console.log('[SimplePlayer] Attempting to play audio...');
    
    // Small delay to ensure audio is ready after loading
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().catch(err => {
          console.error('[SimplePlayer] Play error:', err);
          setError('Failed to play audio');
          isPlayingRef.current = false;
        });
      }
    }, 50);
  };
  
  return (
    <div className="flex flex-col space-y-2">
      {error && <div className="text-red-500 text-sm">{error}</div>}
      
      <button 
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md flex items-center justify-center gap-2"
        onClick={handlePlay}
        disabled={!text || isPlaying}
      >
        {isPlaying ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Playing...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Play Audio
          </>
        )}
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
          disabled={!text || isPlaying}
        >
          Play via Event
        </button>
      )}
    </div>
  );
}

export function setupSimplePlayerEvents() {
  // This function sets up global listeners for playing audio through events
  console.log('Setting up simple player events');
  
  // Listen for global play-teacher-audio events
  const handlePlayTeacherAudio = (event: Event) => {
    const customEvent = event as CustomEvent<{ message: string, preferredPlayer?: string }>;
    console.log("[SimplePlayerEvents] Received play-teacher-audio event");
    
    if (customEvent.detail?.message) {
      console.log("[SimplePlayerEvents] Dispatching to directAudioPlayerPlay handlers");
      
      // Determine which player to use based on preference or use both for redundancy
      const preferredPlayer = customEvent.detail.preferredPlayer || 'all';
      
      if (preferredPlayer === 'simple' || preferredPlayer === 'all') {
        // Use the SimplePlayer
        window.dispatchEvent(new CustomEvent('directAudioPlayerPlay', {
          detail: { id: 'simple-audio-player' }
        }));
      }
      
      if (preferredPlayer === 'direct' || preferredPlayer === 'all') {
        // Try both visible and hidden DirectAudioPlayer components
        window.dispatchEvent(new CustomEvent('directAudioPlayerPlay', {
          detail: { id: 'visible-audio-player' }
        }));
        
        // Small delay before trying the hidden player to prevent audio overlap
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('directAudioPlayerPlay', {
            detail: { id: 'hidden-audio-player' }
          }));
        }, 100);
      }
    }
  };
  
  window.addEventListener('play-teacher-audio', handlePlayTeacherAudio);
  
  return () => {
    window.removeEventListener('play-teacher-audio', handlePlayTeacherAudio);
  };
}