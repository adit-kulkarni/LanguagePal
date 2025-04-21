import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";

/**
 * A simplified audio player component for testing and debugging
 * This component removes all the complexity and focuses on the core audio functionality
 */
export function SimpleAudioTest() {
  const [text, setText] = useState("¡Hola! ¿Cómo estás hoy?");
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Logging function to help debug
  const addLog = (message: string) => {
    setLog(prev => [message, ...prev.slice(0, 9)]);
    console.log("[SimpleAudioTest]", message);
  };
  
  // Load audio - separated out for clarity
  const loadAudio = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      addLog(`Fetching audio for text: "${text}" (${text.length} chars)`);
      
      // Direct API call to get audio
      const response = await fetch('/api/speech/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voice: 'nova' }),
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      // Get the audio data and create a blob URL
      const audioBuffer = await response.arrayBuffer();
      addLog(`Received audio data: ${audioBuffer.byteLength} bytes`);
      
      if (audioBuffer.byteLength === 0) {
        throw new Error("Received empty audio data");
      }
      
      // Save first bytes for debugging
      const firstBytes = new Uint8Array(audioBuffer.slice(0, Math.min(20, audioBuffer.byteLength)));
      setAudioData(firstBytes);
      addLog(`First bytes: ${Array.from(firstBytes).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
      
      // Create blob URL
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      
      addLog(`Created blob URL: ${url}`);
      setAudioUrl(url);
      
      setIsLoading(false);
    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setIsLoading(false);
    }
  };

  // Function to play audio manually
  const playAudio = () => {
    if (audioRef.current && audioUrl) {
      addLog("Manual play button clicked");
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => {
        addLog(`Play error: ${e.message}`);
        setError(`Play error: ${e.message}`);
      });
    } else {
      addLog("Cannot play: No audio element or URL available");
    }
  };
  
  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Audio Test Component</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Test Text</label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      
      <div className="flex gap-2 mb-4">
        <Button onClick={loadAudio} disabled={isLoading || !text}>
          {isLoading ? 'Loading...' : 'Load Audio'}
        </Button>
        
        <Button onClick={playAudio} disabled={!audioUrl || isLoading}>
          Play Audio
        </Button>
      </div>
      
      {audioUrl && (
        <div className="mb-4">
          <p className="text-sm mb-2">Audio Controls (Direct):</p>
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            className="w-full"
            onPlay={() => addLog("Audio playback started")}
            onEnded={() => addLog("Audio playback ended")}
            onError={(e) => addLog(`Audio error: ${e}`)}
            onLoadedData={() => addLog("Audio data loaded")}
            onCanPlay={() => addLog("Audio can play")}
          />
        </div>
      )}
      
      {error && (
        <div className="text-red-500 mb-4">
          Error: {error}
        </div>
      )}
      
      {audioData && (
        <div className="mb-4">
          <p className="text-sm mb-2">First bytes of audio data:</p>
          <div className="bg-gray-100 p-2 rounded font-mono text-xs">
            {Array.from(audioData).map(b => b.toString(16).padStart(2, '0')).join(' ')}
          </div>
        </div>
      )}
      
      <div className="mt-6">
        <p className="text-sm font-medium mb-1">Debug Log:</p>
        <div className="bg-gray-100 p-2 rounded h-48 overflow-y-auto text-xs">
          {log.map((entry, i) => (
            <div key={i} className="mb-1">{entry}</div>
          ))}
        </div>
      </div>
    </div>
  );
}