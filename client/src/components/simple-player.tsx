import React, { useState, useEffect, useRef } from 'react';

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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Load audio on mount or when text changes
  useEffect(() => {
    if (!text) return;
    
    const loadAudio = async () => {
      try {
        setIsLoading(true);
        console.log("[SimplePlayer] Loading audio for:", text);
        
        const response = await fetch('/api/speech/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice }),
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const audioData = await response.arrayBuffer();
        console.log("[SimplePlayer] Received audio:", audioData.byteLength, "bytes");
        
        // Create a blob with the correct MIME type
        const blob = new Blob([audioData], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setIsLoading(false);
        
        // Try to auto-play if requested (after a short delay)
        if (autoPlay) {
          setTimeout(() => {
            if (audioRef.current) {
              console.log("[SimplePlayer] Attempting auto-play");
              audioRef.current.play().catch(e => {
                console.warn("[SimplePlayer] Auto-play blocked:", e);
              });
            }
          }, 500);
        }
      } catch (err) {
        console.error("[SimplePlayer] Error:", err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    };
    
    loadAudio();
    
    // Clean up on unmount
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [text, voice, autoPlay]);
  
  const playAudio = () => {
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => {
        console.error("[SimplePlayer] Play error:", e);
      });
    }
  };

  return (
    <div className="simple-player">
      {audioUrl && (
        <audio 
          ref={audioRef}
          src={audioUrl}
          id={id}
          preload="auto"
          controls={false}
        />
      )}
      
      {isLoading ? (
        <div className="text-sm text-blue-500 animate-pulse">Loading audio...</div>
      ) : error ? (
        <div className="text-sm text-red-500">{error}</div>
      ) : (
        <button
          onClick={playAudio}
          disabled={isLoading || !audioUrl}
          className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          Play
        </button>
      )}
    </div>
  );
}

// Add a global event to trigger audio playback from anywhere
export function setupSimplePlayerEvents() {
  // Add a manual play button at the top of the screen
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.top = '0';
  div.style.left = '0';
  div.style.width = '100%';
  div.style.backgroundColor = 'blue';
  div.style.color = 'white';
  div.style.padding = '8px';
  div.style.textAlign = 'center';
  div.style.zIndex = '9999';
  
  const button = document.createElement('button');
  button.innerText = 'Play Teacher Audio';
  button.style.padding = '4px 8px';
  button.style.backgroundColor = 'white';
  button.style.color = 'blue';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  
  button.addEventListener('click', () => {
    // Find all audio elements and try to play them
    const audioElements = document.querySelectorAll('audio');
    console.log("[SimplePlayer] Found", audioElements.length, "audio elements");
    
    audioElements.forEach((audio, index) => {
      setTimeout(() => {
        console.log("[SimplePlayer] Trying to play audio", index);
        audio.play().catch(e => {
          console.warn("[SimplePlayer] Couldn't play:", e);
        });
      }, index * 500); // Stagger playback attempts
    });
  });
  
  div.appendChild(button);
  document.body.appendChild(div);
  
  return () => {
    // Clean up
    document.body.removeChild(div);
  };
}