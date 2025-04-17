import React from 'react';
import { Button } from "@/components/ui/button";
import { openAIAudioService } from "@/lib/openai-audio";
import { speechService } from "@/lib/speech";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff } from "lucide-react";

export default function SpeechTest() {
  // Audio state
  const [audioSrc, setAudioSrc] = React.useState<string | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentWord, setCurrentWord] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  
  // Microphone state
  const [isRecording, setIsRecording] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');
  
  // Audio player reference
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  
  // Text samples
  const samples = [
    {
      text: "Hola, ¿cómo estás hoy?",
      translation: "Hello, how are you today?"
    },
    {
      text: "Bienvenido a nuestra clase de español. Me alegra que estés aquí.",
      translation: "Welcome to our Spanish class. I'm glad you're here."
    },
    {
      text: "Me gusta caminar en el parque cuando hace buen tiempo.",
      translation: "I like to walk in the park when the weather is nice."
    }
  ];
  
  // Function to speak text using OpenAI
  const speakText = async (text: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Starting audio generation...');
      const audioUrl = await openAIAudioService.textToSpeech(text, 'nova');
      console.log('Audio generated', audioUrl);
      
      setAudioSrc(audioUrl);
      
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      
      // Setup audio player
      audioRef.current.src = audioUrl;
      audioRef.current.onplay = () => {
        console.log('Audio started playing');
        setIsPlaying(true);
        
        // Show first word
        setCurrentWord(text.split(/\s+/)[0] || '');
        
        // Setup word animation
        const words = text.split(/\s+/);
        const duration = (words.length * 500); // ~0.5 second per word
        const interval = duration / words.length;
        
        let index = 0;
        const intervalId = setInterval(() => {
          index++;
          if (index < words.length) {
            setCurrentWord(words[index]);
          } else {
            clearInterval(intervalId);
          }
        }, interval);
      };
      
      audioRef.current.onended = () => {
        console.log('Audio ended');
        setIsPlaying(false);
        setCurrentWord('');
      };
      
      audioRef.current.onerror = (e) => {
        console.error('Audio error', e);
        setError('Error playing audio');
        setIsPlaying(false);
      };
      
      // Play the audio
      try {
        await audioRef.current.play();
      } catch (e) {
        console.error('Play error', e);
        setError('Error starting playback. Try clicking play again.');
      }
    } catch (e) {
      console.error('Speech error', e);
      setError('Error generating speech audio');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to start recording
  const startRecording = () => {
    setIsRecording(true);
    setTranscript('');
    setError(null);
    
    try {
      // Use OpenAI for speech recognition
      speechService.setMode('openai');
      
      // Start recording with a callback for results
      speechService.start((text, isFinal) => {
        console.log(`Speech recognition: ${text}, final: ${isFinal}`);
        setTranscript(text);
        
        if (isFinal) {
          setIsRecording(false);
        }
      });
    } catch (e) {
      console.error('Recording error', e);
      setError('Error starting microphone');
      setIsRecording(false);
    }
  };
  
  // Function to stop recording
  const stopRecording = () => {
    if (isRecording) {
      speechService.stop();
      setIsRecording(false);
    }
  };
  
  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (isRecording) {
        speechService.stop();
      }
    };
  }, [isRecording]);
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Speech Testing Page</h1>
      
      {/* Text-to-Speech Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Text-to-Speech Testing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Click on any sample to hear it spoken in Spanish.
            </p>
            
            {samples.map((sample, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="p-4 cursor-pointer hover:bg-accent/10" onClick={() => speakText(sample.text)}>
                  <p className="font-medium">{sample.text}</p>
                  <p className="text-sm text-muted-foreground mt-1">{sample.translation}</p>
                </div>
              </Card>
            ))}
            
            {isLoading && (
              <div className="flex items-center justify-center h-16 bg-accent/5 rounded-md">
                <p className="text-sm animate-pulse">Loading audio...</p>
              </div>
            )}
            
            {isPlaying && currentWord && (
              <div className="flex items-center justify-center h-16 bg-primary/10 rounded-md">
                <p className="text-lg font-medium">{currentWord}</p>
              </div>
            )}
            
            {error && (
              <div className="bg-destructive/10 p-3 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            
            {audioSrc && !isPlaying && !isLoading && (
              <Button 
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.play();
                  }
                }}
              >
                Play Audio Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Speech-to-Text Section */}
      <Card>
        <CardHeader>
          <CardTitle>Speech-to-Text Testing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Click the microphone button and speak in Spanish to test voice recognition.
            </p>
            
            <div className="flex justify-center">
              <Button
                size="lg"
                variant={isRecording ? "destructive" : "default"}
                className="rounded-full h-16 w-16"
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
            </div>
            
            {transcript && (
              <div className="border p-4 rounded-md">
                <p className="font-medium">Transcript:</p>
                <p className="mt-2">{transcript}</p>
              </div>
            )}
            
            {isRecording && (
              <div className="flex items-center justify-center h-12 bg-accent/10 rounded-md">
                <p className="text-sm animate-pulse">Listening... (speak in Spanish)</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}