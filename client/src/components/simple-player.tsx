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