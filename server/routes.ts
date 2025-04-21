import { Express } from 'express';
import { Server } from 'http';
import http from 'http';
import { generateSpeech, transcribeSpeech } from './openai-audio';

export function registerRoutes(app: Express): void {
  
  // Text-to-speech endpoint
  app.post("/api/speech/tts", async (req, res) => {
    const { text, voice = "nova" } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }
    
    try {
      console.log(`[API] Generating speech (${text.length} chars): "${text.substring(0, 20)}..." with voice ${voice}`);
      console.log(`[express] Generating speech for text (${text.length} chars): "${text.substring(0, 20)}..."`);
      
      const audioBuffer = await generateSpeech(text, voice);
      console.log(`[express] Generated speech audio (${audioBuffer.byteLength} bytes)`);
      console.log(`[API] Sending audio (${audioBuffer.byteLength} bytes) to client`);
      
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(audioBuffer);
    } catch (error) {
      console.error("[API] TTS error:", error);
      res.status(500).json({ error: "Speech generation failed" });
    }
  });
  
  // Speech-to-text endpoint
  app.post("/api/speech/transcribe", async (req, res) => {
    try {
      if (!req.body || !req.body.audio) {
        return res.status(400).json({ error: "Audio data is required" });
      }
      
      const { audio, language = "es" } = req.body;
      
      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audio, 'base64');
      console.log(`[API] Transcribing speech (${audioBuffer.length} bytes) in language: ${language}`);
      console.log(`[express] Transcribing speech (${audioBuffer.length} bytes) in language: ${language}`);
      
      const transcription = await transcribeSpeech(audioBuffer, language);
      console.log(`[express] Transcribed text: "${transcription.substring(0, 30)}..."`);
      console.log(`[API] Transcription complete: "${transcription.substring(0, 50)}..."`);
      
      res.json({ text: transcription });
    } catch (error) {
      console.error("[API] Transcription error:", error);
      res.status(500).json({ error: "Speech transcription failed" });
    }
  });
  
  // Test TTS endpoint with plain text response for browser testing
  app.get('/api/test-tts', async (req, res) => {
    try {
      const testText = "Hola, esto es una prueba de audio en español.";
      
      console.log(`[API] Testing TTS with: "${testText}"`);
      
      // Generate speech but don't send it - just confirm it works
      await generateSpeech(testText, 'nova');
      
      res.send(`
        <html>
          <head>
            <title>Spanish TTS Test</title>
            <style>
              body { font-family: sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
              .card { border: 1px solid #ddd; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
              button { background: #0070f3; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
              h1, h2 { color: #333; }
            </style>
          </head>
          <body>
            <h1>Spanish TTS Test Page</h1>
            <div class="card">
              <h2>Sample Spanish Text</h2>
              <p>${testText}</p>
              <button onclick="playAudio()">Play Audio</button>
              <audio id="audioPlayer" style="margin-top: 1rem; width: 100%"></audio>
            </div>
            <script>
              async function playAudio() {
                try {
                  const response = await fetch('/api/speech/tts', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      text: "${testText}",
                      voice: "nova"
                    }),
                  });
                  
                  if (!response.ok) {
                    throw new Error('Failed to generate speech');
                  }
                  
                  const audioBlob = await response.blob();
                  const audioUrl = URL.createObjectURL(audioBlob);
                  
                  const audioPlayer = document.getElementById('audioPlayer');
                  audioPlayer.src = audioUrl;
                  audioPlayer.controls = true;
                  audioPlayer.play();
                } catch (error) {
                  console.error('Error playing audio:', error);
                  alert('Failed to play audio: ' + error.message);
                }
              }
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("[API] Test TTS error:", error);
      res.status(500).send("Error testing TTS: " + (error instanceof Error ? error.message : String(error)));
    }
  });
  
  // Basic health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });
  
  // Root path will be handled by Vite middleware in server/index.ts
}