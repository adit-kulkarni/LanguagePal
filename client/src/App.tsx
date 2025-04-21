import { useState, useRef } from 'react';
import { SimplePlayer } from './components/simple-player';
import { DirectAudioPlayer } from './components/direct-audio-player';
import { openAIAudioService } from './lib/openai-audio';
import { Route, Switch, Redirect } from 'wouter';
import Practice from './pages/practice';
import StablePractice from './pages/stable-practice';

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
  
  // This highlights the current word being spoken in the original text
  const renderTextWithHighlight = () => {
    if (!text || !currentWord) return text;
    
    const words = text.split(' ');
    return words.map((word, index) => (
      <span 
        key={index} 
        style={{ 
          color: word === currentWord ? '#0051a2' : 'inherit',
          fontWeight: word === currentWord ? 'bold' : 'normal',
          backgroundColor: word === currentWord ? '#e6f0ff' : 'transparent',
          padding: word === currentWord ? '2px 4px' : '0',
          borderRadius: '3px',
          transition: 'all 0.2s ease'
        }}
      >
        {word}{' '}
      </span>
    ));
  };

  return (
    <div className="app-container">
      <Switch>
        {/* Redirect the root to stable-practice */}
        <Route path="/">
          <Redirect to="/stable-practice" />
        </Route>
        
        {/* Stable Practice page as the main page */}
        <Route path="/stable-practice">
          <StablePractice />
        </Route>
        
        {/* Original Practice page for reference */}
        <Route path="/practice">
          <Practice />
        </Route>
        
        {/* Audio test page with the original content */}
        <Route path="/audio-test">
          <div className="container">
            <header className="header">
              <h1>Spanish Language Learning - Updated Test</h1>
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
                
                <div className="mt-4 p-3 bg-blue-100 rounded">
                  {isPlaying ? (
                    <>
                      <p className="mb-2">Status: <strong className="text-green-600">Speaking</strong></p>
                      <p>Current word: <strong className="text-blue-600">{currentWord || "..."}</strong></p>
                    </>
                  ) : (
                    <p>Status: <strong className="text-gray-600">Idle</strong> (Click "Play with Word Tracking" to start)</p>
                  )}
                </div>
                
                <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                  <h4 className="mb-2 font-bold">Text with word highlighting:</h4>
                  <p>{renderTextWithHighlight()}</p>
                </div>
              </div>
            </main>
          </div>
        </Route>
      </Switch>
    </div>
  );
}

export default App;