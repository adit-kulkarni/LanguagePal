import { useState, useRef } from 'react';
import { SimplePlayer } from './components/simple-player';
import { DirectAudioPlayer } from './components/direct-audio-player';
import { openAIAudioService } from './lib/openai-audio';

function App() {
  const [text, setText] = useState<string>('Hola, ¿cómo estás hoy? Espero que estés disfrutando aprendiendo español.');
  const [voice, setVoice] = useState<string>('nova');
  const [currentWord, setCurrentWord] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioPlayerRef = useRef<{ play: () => void } | null>(null);

  // Preload audio when entering the app
  const handlePreloadAudio = async () => {
    try {
      await openAIAudioService.preloadAudio(text, voice);
      alert('Audio preloaded successfully!');
    } catch (error) {
      console.error('Error preloading audio:', error);
      alert('Failed to preload audio');
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Spanish Language Learning - Audio Test</h1>
      </header>

      <main>
        <div className="card">
          <h2>Audio Testing Interface</h2>
          <p>Test the different audio components and methods for Spanish language learning.</p>
          
          <div className="input-wrapper">
            <label htmlFor="text-input">Spanish Text to Speak:</label>
            <textarea 
              id="text-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
            />
          </div>
          
          <div className="input-wrapper">
            <label htmlFor="voice-select">Voice:</label>
            <select 
              id="voice-select"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
            >
              <option value="nova">Nova (Female)</option>
              <option value="alloy">Alloy (Neutral)</option>
              <option value="echo">Echo (Male)</option>
              <option value="fable">Fable (Male)</option>
              <option value="onyx">Onyx (Male)</option>
              <option value="shimmer">Shimmer (Female)</option>
            </select>
          </div>
          
          <div className="mb-4">
            <button onClick={handlePreloadAudio}>
              Preload Audio
            </button>
          </div>
        </div>
        
        <div className="card">
          <h3>Method 1: Simple Player Component</h3>
          <p>Direct audio button with no external dependencies</p>
          <SimplePlayer 
            text={text}
            voice={voice}
            id="simple-player"
          />
        </div>
        
        <div className="card">
          <h3>Method 2: Direct Audio Player with Word Tracking</h3>
          <p>Advanced audio player with word tracking capability</p>
          
          <DirectAudioPlayer
            ref={audioPlayerRef}
            text={text}
            voice={voice}
            onStart={() => setIsPlaying(true)}
            onEnd={() => {
              setIsPlaying(false);
              setCurrentWord('');
            }}
            onWordChange={setCurrentWord}
            id="direct-player"
          />
          
          <button
            onClick={() => {
              if (audioPlayerRef.current) {
                audioPlayerRef.current.play();
              }
            }}
          >
            Play with Word Tracking
          </button>
          
          {isPlaying && (
            <div className="mt-4 p-2 bg-blue-100 rounded">
              <p>Currently speaking: <strong>{currentWord}</strong></p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;