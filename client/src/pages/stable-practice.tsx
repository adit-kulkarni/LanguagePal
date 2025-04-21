import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TeacherAvatar } from "@/components/teacher-avatar";
import { VideoCallInterface } from "@/components/video-call-interface";
import { FEATURE_FLAGS, MOCK_DATA, logFeatureState } from "@/lib/feature-flags";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";
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
  
  // Microphone state
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordedText, setRecordedText] = React.useState("");
  
  // Active message state
  const [activeMessage, setActiveMessage] = React.useState<number | null>(null);
  const [activeTeacherMessage, setActiveTeacherMessage] = React.useState("");
  
  // Word tracking state
  const [currentWord, setCurrentWord] = React.useState("");
  const [speakingIntensity, setSpeakingIntensity] = React.useState(0);
  
  // Speech synthesis hook for improved audio
  const speech = useSpeechSynthesis({
    voice: 'nova',
    preload: true,
    onStart: () => {
      console.log("Speech started");
      setIsVideoCallOpen(true);
    },
    onEnd: () => {
      console.log("Speech ended");
    },
    onWord: (word) => {
      setCurrentWord(word);
    },
    onSpeakingIntensity: (intensity) => {
      setSpeakingIntensity(intensity);
    }
  });
  
  // Speech state references from the hook
  const isSpeaking = speech.isSpeaking;
  const isLoadingAudio = speech.isLoading;
  
  // Listen for word update events from AudioPlayer components via VideoCallInterface
  React.useEffect(() => {
    const handleWordUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ word: string }>;
      console.log("Word update received in parent:", customEvent.detail.word);
      setCurrentWord(customEvent.detail.word);
    };
    
    window.addEventListener('update-current-word', handleWordUpdate);
    
    return () => {
      window.removeEventListener('update-current-word', handleWordUpdate);
    };
  }, []);
  
  // Speech function
  const speak = React.useCallback((text: string, messageId: number) => {
    // Don't speak if already speaking
    if (isSpeaking || isLoadingAudio) {
      console.log("Already speaking or loading audio, not starting new speech");
      return;
    }
    
    console.log(`Speaking message ID ${messageId}: "${text}" (${text.length} chars)`);
    
    // Reset current state to ensure clean start
    speech.stop();
    setCurrentWord("");
    
    // Update state
    setActiveMessage(messageId);
    setActiveTeacherMessage(text); // Set this first
    
    // Make sure video call is open and visible before attempting to speak
    if (!isVideoCallOpen) {
      setIsVideoCallOpen(true);
      
      // Wait for the dialog to be fully visible before speaking
      setTimeout(() => {
        console.log("Video call interface opened, now speaking");
        // Set the text in the speech hook and trigger speaking
        speech.setText(text);
        
        // Dispatch event to ensure all components know about the new message
        const event = new CustomEvent('play-teacher-audio', {
          detail: { message: text }
        });
        window.dispatchEvent(event);
        
        // Then try to speak using the hook
        speech.speak();
      }, 800);
    } else {
      // Interface is already open, speak directly
      speech.setText(text);
      
      // Dispatch event to ensure all components know about the new message
      const event = new CustomEvent('play-teacher-audio', {
        detail: { message: text }
      });
      window.dispatchEvent(event);
      
      // Then try to speak using the hook
      speech.speak();
    }
  }, [isSpeaking, isLoadingAudio, speech, setActiveMessage, setActiveTeacherMessage, isVideoCallOpen, setIsVideoCallOpen]);
  
  // Microphone recording functions
  const startRecording = () => {
    if (isRecording) return;
    console.log("Starting microphone recording");
    setIsRecording(true);
    setRecordedText("");
    
    // Make sure video call interface is open to show live transcription
    setIsVideoCallOpen(true);
    
    try {
      // Configure speech service
      // Force OpenAI mode when available for better accuracy
      const useOpenAI = FEATURE_FLAGS.ENABLE_OPENAI_AUDIO;
      const mode = useOpenAI ? 'openai' : 'browser';
      speechService.setMode(mode);
      
      // More sensitive silence detection to stop earlier (1.5 seconds of silence)
      const silenceDuration = useOpenAI ? 1500 : 1500;
      speechService.configureSilenceDetection(true, silenceDuration);
      
      // Start recording
      speechService.start((transcript, isFinal) => {
        console.log(`[${mode}] Transcript: ${transcript}, isFinal: ${isFinal}`);
        
        // Always show intermediate results immediately for better feedback
        if (transcript) {
          setRecordedText(transcript);
          
          // If using browser mode (which provides word-by-word updates),
          // also update the current word visualization
          if (mode === 'browser') {
            // Extract the last word from the transcript
            const words = transcript.split(/\s+/);
            const lastWord = words[words.length - 1];
            if (lastWord && lastWord.length > 0) {
              setCurrentWord(lastWord);
            }
          }
        }
        
        // Only submit when we have a final result that's meaningful
        if (isFinal && transcript.trim()) {
          console.log('Final transcript received, submitting:', transcript);
          
          // Slight delay before submission to show the final text
          setTimeout(() => {
            handleSubmit(transcript);
            stopRecording();
            // Clear current word display
            setCurrentWord("");
          }, 300);
        }
      });
      
      // Show toast for speech mode with improved description
      toast({
        title: useOpenAI ? "Using OpenAI speech recognition" : "Using browser speech recognition",
        description: `Speak clearly in Spanish. ${useOpenAI ? 'Processing will happen after you pause.' : 'Words appear as you speak.'}`,
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
  
  // Listen for when teacher stops speaking to auto-activate mic
  React.useEffect(() => {
    // Only execute when teacher was speaking but has now stopped
    if (!isSpeaking && !isLoadingAudio && activeTeacherMessage && !isRecording) {
      console.log("Teacher has finished speaking, preparing for student response");
      
      // Reset active message states
      setActiveMessage(null);
      setActiveTeacherMessage("");
      
      // Auto-activate the microphone after a short delay if enabled
      if (FEATURE_FLAGS.ENABLE_AUTO_SPEECH) {
        console.log("Auto-activating microphone in 500ms");
        const timer = setTimeout(() => {
          if (!isRecording) { // Double-check we're still not recording
            console.log("Auto-activating microphone now");
            startRecording();
          }
        }, 500); // Short delay to give user time to process
        
        return () => clearTimeout(timer);
      }
    }
  }, [isSpeaking, isLoadingAudio, activeTeacherMessage, isRecording]);
  
  // Ref to ensure welcome message only plays once
  const hasPlayedWelcomeRef = React.useRef(false);
  
  // Welcome message audio component - a simple player just for welcome message
  const WelcomeAudio = React.useCallback(() => {
    const welcomeMessage = messages.length > 0 && messages[0].type === "teacher" ? messages[0].content : null;
    const [isPlayed, setIsPlayed] = React.useState(false);
    const [isReady, setIsReady] = React.useState(false);
    
    // Handle direct play - this is a user-initiated play to work around autoplay restrictions
    const handleManualPlay = React.useCallback(() => {
      if (welcomeMessage && !isPlayed && messages[0]) {
        console.log("Playing welcome message via manual trigger");
        setIsPlayed(true);
        speak(welcomeMessage, messages[0].id);
      }
    }, [welcomeMessage, isPlayed]);
    
    // Set up initial state
    React.useEffect(() => {
      if (welcomeMessage && !hasPlayedWelcomeRef.current) {
        setIsReady(true);
        console.log("Welcome message ready for playback:", welcomeMessage);
        
        // Open dialog
        setIsVideoCallOpen(true);
        
        // Mark as attempted playback
        hasPlayedWelcomeRef.current = true;
        
        // Try auto-play after a delay
        setTimeout(() => {
          console.log("Attempting welcome message autoplay");
          handleManualPlay();
        }, 1500);
      }
    }, [welcomeMessage, handleManualPlay]);
    
    if (!isReady || isPlayed) return null;
    
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-primary text-white p-4 rounded-lg shadow-lg animate-pulse">
        <p className="mb-2">¡Haga clic para comenzar la conversación!</p>
        <button 
          onClick={handleManualPlay}
          className="w-full py-2 px-4 bg-white text-primary font-semibold rounded hover:bg-gray-100 flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          Reproducir audio
        </button>
      </div>
    );
  }, [messages, speak, setIsVideoCallOpen]);
  
  // Auto-play welcome message on mount - only once when component first loads
  React.useEffect(() => {
    logFeatureState();
    
    // Just open dialog on initial load
    if (!hasPlayedWelcomeRef.current && messages.length > 0 && messages[0].type === "teacher") {
      console.log("Opening dialog for welcome message");
      setIsVideoCallOpen(true);
    }
  }, [messages, setIsVideoCallOpen]);
  
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
      <WelcomeAudio />
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
                Stable Practice Mode - Using {FEATURE_FLAGS.ENABLE_OPENAI_AUDIO ? 'OpenAI speech' : 'browser speech synthesis'} (Improved Audio)
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
            userRecordedText={recordedText}
            isRecording={isRecording}
          />
          
          <ScrollArea className="flex-1 px-2 md:px-6 py-1 md:py-2">
            <div className="space-y-2 max-w-3xl mx-auto">
              {messages.map((message) => (
                <Card 
                  key={message.id} 
                  className={cn(
                    "shadow-sm",
                    message.type === "user" ? "bg-primary/5" : "bg-background",
                    activeMessage === message.id && isSpeaking && "border-primary"
                  )}
                >
                  <CardContent className="p-3 md:p-4">
                    <div className={cn(
                      "flex items-start gap-3",
                      message.type === "user" ? "flex-row-reverse" : "flex-row"
                    )}>
                      {/* Avatar */}
                      <div className={cn(
                        "flex-shrink-0",
                        message.type === "user" ? "mt-1" : "-mt-1"
                      )}>
                        {message.type === "teacher" ? (
                          <TeacherAvatar 
                            className="w-10 h-10"
                            speaking={activeMessage === message.id && isSpeaking}
                            intensity={activeMessage === message.id ? speakingIntensity : 0}
                            hideText
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                            👤
                          </div>
                        )}
                      </div>
                      
                      {/* Message content */}
                      <div className={cn(
                        "flex-1",
                        message.type === "user" ? "text-right" : "text-left"
                      )}>
                        <div 
                          className={cn(
                            "inline-block rounded-lg text-left",
                            message.type === "teacher" && "text-primary-foreground"
                          )}
                        >
                          <p>{message.content}</p>
                          
                          {/* Translation */}
                          {message.translation && !isSpeaking && (
                            <p className="mt-2 text-sm text-muted-foreground">
                              {message.translation}
                            </p>
                          )}
                          
                          {/* Current word highlight (only show during speaking) */}
                          {activeMessage === message.id && isSpeaking && currentWord && (
                            <div className="mt-2 inline-block bg-primary/10 px-2 py-1 rounded text-primary animate-pulse">
                              {currentWord}
                            </div>
                          )}
                          
                          {/* Playback controls */}
                          {message.type === "teacher" && !isSpeaking && (
                            <div className="mt-2 flex items-center justify-start gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => speak(message.content, message.id)}
                              >
                                Play Audio
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
          
          {/* Input controls */}
          <div className="border-t bg-background p-2 md:p-4">
            <div className="max-w-3xl mx-auto flex gap-2 items-center">
              <Button
                variant={isRecording ? "destructive" : "default"}
                size="icon"
                className="rounded-full h-10 w-10"
                onClick={toggleMicrophone}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              
              <div className="flex-1 h-10 bg-accent/10 rounded-full flex items-center px-4 text-sm text-muted-foreground">
                {isRecording ? (
                  <span className="animate-pulse">Listening... {recordedText}</span>
                ) : (
                  <span>Click the microphone to speak Spanish</span>
                )}
              </div>
              
              <Button
                variant="ghost"
                className="text-xs flex items-center gap-1"
                onClick={handleNewChat}
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Chat</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}