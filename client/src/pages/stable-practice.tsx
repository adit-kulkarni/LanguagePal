import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TeacherAvatar } from "@/components/teacher-avatar";
import { VideoCallInterface } from "@/components/video-call-interface";
import { FEATURE_FLAGS, MOCK_DATA, logFeatureState } from "@/lib/feature-flags";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu, X, ChevronLeft, ChevronRight, MicOff, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { openAIAudioService } from "@/lib/openai-audio";
import { speechService } from "@/lib/speech";

export default function StablePractice() {
  // UI state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isVideoCallOpen, setIsVideoCallOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  // Message state
  const [messageIdCounter, setMessageIdCounter] = React.useState(1);
  const [messages, setMessages] = React.useState<any[]>([
    {
      id: 0,
      type: "teacher",
      content: MOCK_DATA.teacherResponse.message,
      translation: MOCK_DATA.teacherResponse.translation
    }
  ]);
  
  // Session state (simplified)
  const [currentSession, setCurrentSession] = React.useState<{id: number, context: string} | null>(null);
  
  // Speech state
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [speakingIntensity, setSpeakingIntensity] = React.useState(0);
  const [currentWord, setCurrentWord] = React.useState("");
  const [activeMessage, setActiveMessage] = React.useState<number | null>(null);
  const [activeTeacherMessage, setActiveTeacherMessage] = React.useState("");
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  
  // Microphone state
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordedText, setRecordedText] = React.useState("");
  
  // Log feature flags on mount
  React.useEffect(() => {
    logFeatureState();
  }, []);
  
  // Speech function using OpenAI or browser speech synthesis based on feature flag
  const speak = React.useCallback(async (text: string, messageId: number) => {
    // Don't speak if already speaking
    if (isSpeaking) {
      console.log("Already speaking, not starting new speech");
      return;
    }
    
    console.log(`Speaking message ID ${messageId}: ${text}`);
    setActiveMessage(messageId);
    setActiveTeacherMessage(text);
    setIsVideoCallOpen(true);
    
    // Split text into words for animation
    const words = text.split(/\s+/);
    let wordIndex = 0;
    
    // Set speaking state
    setIsSpeaking(true);
    setSpeakingIntensity(1);
    setCurrentWord(words[0] || "");
    
    // Estimate duration for word-by-word display
    const averageWordDuration = 200; // milliseconds per word
    const estimatedDuration = words.length * averageWordDuration;
    const wordDuration = estimatedDuration / words.length;
    
    // Animation interval for avatar (runs immediately)
    setSpeakingIntensity(0.8);
    const animationInterval = setInterval(() => {
      setSpeakingIntensity(prev => {
        // Random fluctuation in intensity for more natural appearance
        const randomFactor = Math.random() * 0.3;
        return Math.max(0, 0.5 + randomFactor);
      });
    }, 150);
    
    // Set initial word immediately
    setCurrentWord(words[0] || "");
    let startTime = Date.now();
    
    // Word display interval - more accurately timed to audio
    const wordInterval = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const expectedWordIndex = Math.floor(elapsedTime / wordDuration);
      
      if (expectedWordIndex < words.length && expectedWordIndex !== wordIndex) {
        wordIndex = expectedWordIndex;
        setCurrentWord(words[wordIndex]);
      } else if (expectedWordIndex >= words.length) {
        clearInterval(wordInterval);
      }
    }, 50); // Update more frequently for smoother word transitions
    
    // Handle speech cleanup
    const cleanupSpeech = () => {
      clearInterval(animationInterval);
      clearInterval(wordInterval);
      setIsSpeaking(false);
      setSpeakingIntensity(0);
      setCurrentWord("");
      setActiveMessage(null);
      
      // Stop any playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };

    // Decide which speech method to use based on feature flag
    if (FEATURE_FLAGS.ENABLE_OPENAI_AUDIO) {
      try {
        // Use OpenAI TTS API (higher quality voice)
        console.log("Using OpenAI TTS API");
        
        // Create audio element if it doesn't exist
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        
        // Start a timeout for loading indication
        const loadingTimeout = setTimeout(() => {
          toast({
            title: "Loading teacher's voice",
            description: "This might take a moment...",
          });
        }, 800); // Show loading message if it takes more than 800ms
        
        // Get audio URL from OpenAI service
        const audioUrl = await openAIAudioService.textToSpeech(text, 'nova');
        
        // Clear loading timeout
        clearTimeout(loadingTimeout);
        
        // Set source and prepare audio
        audioRef.current.src = audioUrl;
        audioRef.current.oncanplaythrough = () => {
          // Reset timer for word display to sync with actual audio start
          startTime = Date.now();
          wordIndex = 0;
          setCurrentWord(words[0] || "");
        };
        
        // Set up event handlers
        audioRef.current.onended = () => {
          console.log("OpenAI TTS speech ended");
          cleanupSpeech();
        };
        
        audioRef.current.onerror = (err) => {
          console.error("OpenAI TTS error:", err);
          cleanupSpeech();
          
          // Try fallback to browser speech
          toast({
            title: "Speech error",
            description: "Falling back to browser speech synthesis",
            variant: "destructive",
          });
          
          // Use browser's speech synthesis as fallback
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'es-ES';
          utterance.rate = 0.9;
          window.speechSynthesis.speak(utterance);
        };
        
        // Start playback
        try {
          await audioRef.current.play();
        } catch (playError) {
          console.error("Error playing audio:", playError);
          cleanupSpeech();
          
          // Fallback to browser speech
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'es-ES';
          utterance.rate = 0.9;
          window.speechSynthesis.speak(utterance);
        }
      } catch (error) {
        console.error("Error with OpenAI TTS:", error);
        cleanupSpeech();
        
        // Use browser's speech synthesis as fallback
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.9;
        utterance.onend = () => console.log("Browser speech ended (fallback)");
        window.speechSynthesis.speak(utterance);
      }
    } else {
      // Use browser's built-in speech synthesis
      console.log("Using browser speech synthesis");
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES'; // Spanish
      utterance.rate = 0.9;     // Slightly slower
      
      // Handle speech end
      utterance.onend = () => {
        console.log("Browser speech ended");
        cleanupSpeech();
      };
      
      // Error handling
      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        cleanupSpeech();
      };
      
      // Start speaking
      window.speechSynthesis.speak(utterance);
    }
    
    // Fallback timeout
    const maxSpeakingTime = 30000; // 30 seconds max
    setTimeout(() => {
      if (isSpeaking) {
        console.log("Speech timeout - forced end");
        cleanupSpeech();
      }
    }, maxSpeakingTime);
    
    // Return cleanup function
    return () => {
      cleanupSpeech();
    };
  }, [isSpeaking, toast]);

  // Microphone recording functions
  const startRecording = () => {
    if (isRecording) return;
    console.log("Starting microphone recording");
    setIsRecording(true);
    setRecordedText("");
    
    try {
      // Configure speech service
      // Force OpenAI mode when available for better accuracy
      const useOpenAI = FEATURE_FLAGS.ENABLE_OPENAI_AUDIO;
      const mode = useOpenAI ? 'openai' : 'browser';
      speechService.setMode(mode);
      
      // More generous silence detection with OpenAI (it processes after stopping)
      const silenceDuration = useOpenAI ? 2500 : 2000;
      speechService.configureSilenceDetection(true, silenceDuration);
      
      // Start recording
      speechService.start((transcript, isFinal) => {
        console.log(`[${mode}] Transcript: ${transcript}, isFinal: ${isFinal}`);
        
        // Show intermediate results
        if (transcript && transcript !== recordedText) {
          setRecordedText(transcript);
        }
        
        // Only submit when we have a final result that's meaningful
        if (isFinal && transcript.trim()) {
          console.log('Final transcript received, submitting:', transcript);
          
          // Briefly highlight the detected text
          setRecordedText(transcript);
          
          // Slight delay before submission to show the final text
          setTimeout(() => {
            handleSubmit(transcript);
            stopRecording();
          }, 300);
        }
      });
      
      // Show toast for speech mode
      toast({
        title: useOpenAI ? "Using OpenAI speech recognition" : "Using browser speech recognition",
        description: "Speak clearly in Spanish",
      });
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      toast({
        title: "Speech recognition error",
        description: "Could not start the microphone. Check permissions.",
        variant: "destructive",
      });
      setIsRecording(false);
    }
  };
  
  const stopRecording = () => {
    if (isRecording) {
      console.log("Stopping microphone recording");
      speechService.stop();
      setIsRecording(false);
    }
  };
  
  // Toggle microphone
  const toggleMicrophone = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  // Mock handle submit with no API calls
  const handleSubmit = (text: string) => {
    // Add user message
    const userMessageId = messageIdCounter;
    const userMessage = {
      id: userMessageId,
      type: "user",
      content: text
    };
    setMessageIdCounter(prev => prev + 1);
    setMessages(prev => [...prev, userMessage]);
    
    // Generate teacher response
    let response = MOCK_DATA.responses.default;
    
    // Very simple response selection based on keywords
    if (text.toLowerCase().includes("hola") || text.toLowerCase().includes("buenos")) {
      response = MOCK_DATA.responses.greeting;
    } else if (text.toLowerCase().includes("tiempo") || text.toLowerCase().includes("clima")) {
      response = MOCK_DATA.responses.weather;
    } else if (text.toLowerCase().includes("comida") || text.toLowerCase().includes("comer")) {
      response = MOCK_DATA.responses.food;
    }
    
    // Add teacher response after a short delay to simulate API call
    setTimeout(() => {
      const teacherMessage = {
        id: messageIdCounter + 1,
        type: "teacher",
        content: response.message,
        translation: response.translation,
        userMessageId: userMessageId
      };
      setMessageIdCounter(prev => prev + 2);
      setMessages(prev => [...prev, teacherMessage]);
      
      // Speak the teacher's response
      speak(response.message, teacherMessage.id);
    }, 500);
  };
  
  // Start a new conversation
  const handleNewChat = () => {
    setCurrentSession(null);
    const welcomeMessage = MOCK_DATA.teacherResponse.message;
    const msgId = messageIdCounter;
    setMessages([{
      id: msgId,
      type: "teacher",
      content: welcomeMessage,
      translation: MOCK_DATA.teacherResponse.translation
    }]);
    setMessageIdCounter(prev => prev + 1);
    
    // Speak welcome message
    speak(welcomeMessage, msgId);
  };
  
  return (
    <div className="h-screen overflow-hidden flex flex-col md:flex-row relative">
      {/* Mobile header with menu button */}
      {isMobile && (
        <div className="h-14 border-b px-4 flex items-center justify-between sticky top-0 bg-background z-20">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 p-0"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-lg">Spanish Practice (Stable)</h1>
          {currentSession && (
            <Button 
              variant="ghost" 
              size="icon"
              className="h-9 w-9 p-0"
              onClick={handleNewChat}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      )}

      {/* Desktop sidebar toggle button */}
      {!isMobile && (
        <div className="fixed top-4 md:left-[5.5rem] left-[4.5rem] z-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={cn(
              "transition-all duration-300 bg-background shadow-md border",
              !isSidebarCollapsed && "ml-[264px]" // 264px = 72-4-4 (width - padding)
            )}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden bg-accent/5">
        <div className="flex-1 flex flex-col h-full">
          {/* Greeting message */}
          <Card className="mx-4 md:mx-8 mt-2 md:mt-4 bg-accent/10">
            <CardContent className="p-3 md:p-4">
              <p className="text-sm text-center text-muted-foreground">
                Stable Practice Mode - Using {FEATURE_FLAGS.ENABLE_OPENAI_AUDIO ? 'OpenAI speech' : 'browser speech synthesis'}
              </p>
            </CardContent>
          </Card>

          {/* Video Call Interface */}
          <VideoCallInterface 
            open={isVideoCallOpen}
            onOpenChange={setIsVideoCallOpen}
            teacherMessage={activeTeacherMessage}
            onUserResponse={handleSubmit}
            isSpeaking={isSpeaking}
            currentWord={currentWord}
            speakingIntensity={speakingIntensity}
          />
          
          <ScrollArea className="flex-1 px-2 md:px-6 py-1 md:py-2">
            <div className="space-y-2 max-w-3xl mx-auto">
              {messages.map((message) => (
                <Card 
                  key={message.id} 
                  className={cn(
                    "shadow-sm",
                    message.type === "user" ? "bg-accent/10" : "bg-background",
                    isMobile && "border-l-4",
                    isMobile && message.type === "user" ? "border-l-primary/70" : "",
                    isMobile && message.type === "teacher" ? "border-l-secondary/70" : "",
                    isSpeaking && activeMessage === message.id && "ring-1 ring-primary"
                  )}
                >
                  <CardContent className={cn("space-y-2", isMobile ? "p-2.5" : "p-3")}>
                    <div className="flex items-start gap-2">
                      {message.type === "teacher" && (
                        <div className="flex-shrink-0 pt-0.5">
                          <TeacherAvatar
                            className={isMobile ? "w-6 h-6" : "w-7 h-7"}
                            speaking={isSpeaking && message.id === activeMessage}
                            intensity={speakingIntensity}
                            hideText={true}
                          />
                        </div>
                      )}
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center">
                          {message.type === "teacher" ? (
                            <span className="font-semibold text-sm">Profesora Ana</span>
                          ) : (
                            <span className="font-semibold text-sm">You</span>
                          )}
                        </div>
                        
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        
                        {/* Show translation for teacher messages */}
                        {message.type === "teacher" && message.translation && (
                          <div className="pt-1 text-xs text-muted-foreground border-t mt-1">
                            <span className="italic">Translation:</span> {message.translation}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Teacher-only action buttons */}
                    {message.type === "teacher" && (
                      <div className="flex justify-end gap-2 mt-1">
                        <Button
                          variant="ghost"
                          size={isMobile ? "sm" : "default"}
                          className={cn(
                            "h-8 text-xs",
                            isMobile && "px-2"
                          )}
                          onClick={() => speak(message.content, message.id)}
                        >
                          {isSpeaking && message.id === activeMessage ? "Speaking..." : "Speak"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
          
          {/* Message input at bottom */}
          <div className="p-2 md:p-4 border-t">
            <div className="max-w-3xl mx-auto">
              {/* Speech recognition status */}
              {recordedText && (
                <div className="mb-2 p-2 bg-accent/20 rounded-md text-sm">
                  <p className="text-muted-foreground">Detected: <span className="font-medium text-foreground">{recordedText}</span></p>
                </div>
              )}
              
              <div className="flex">
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  size="icon"
                  className="rounded-r-none border-r-0"
                  onClick={toggleMicrophone}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <input
                  type="text"
                  placeholder="Type your message in Spanish..."
                  className="flex-1 p-2 border rounded-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                      handleSubmit((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
                <Button 
                  className="rounded-l-none"
                  onClick={() => {
                    const input = document.querySelector('input') as HTMLInputElement;
                    if (input && input.value.trim()) {
                      handleSubmit(input.value);
                      input.value = '';
                    }
                  }}
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}