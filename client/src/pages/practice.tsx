import * as React from "react";
import * as ReactDOM from "react-dom";
import { TeacherAvatar } from "@/components/teacher-avatar";
import { SpeechInput } from "@/components/speech-input";
import { VideoCallInterface } from "@/components/video-call-interface";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, Volume2, ChevronLeft, ChevronRight, Menu, X, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ConversationStarters } from "@/components/conversation-starters";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";

interface Message {
  id?: number;  
  type: "user" | "teacher";
  content: string;
  corrections?: {
    mistakes: Array<{
      original: string;
      correction: string;
      explanation: string;
      explanation_es: string;
      type: "punctuation" | "grammar" | "vocabulary";
      ignored?: boolean;
    }>;
  };
  translation?: string;
  userMessageId?: number;  
}

interface TranslationCache {
  [word: string]: {
    translation: string;
    examples?: string[];
    loading?: boolean;
    loadingExamples?: boolean;
  };
}

export default function Practice() {
  const [messages, setMessages] = React.useState<Message[]>([{
    id: 0,
    type: "teacher",
    content: "¡Hola! I'm Profesora Ana. Select a conversation context to begin, or start speaking!"
  }]);
  const [translations, setTranslations] = React.useState<TranslationCache>({});
  const [currentSession, setCurrentSession] = React.useState<{ id: number; context: string } | null>(null);
  const { toast } = useToast();
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [speakingIntensity, setSpeakingIntensity] = React.useState(0);
  const [currentWord, setCurrentWord] = React.useState<string>("");
  const [activeMessage, setActiveMessage] = React.useState<number | null>(null);
  const queryClient = useQueryClient();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [messageIdCounter, setMessageIdCounter] = React.useState(1);
  const [isVideoCallOpen, setIsVideoCallOpen] = React.useState(false);
  const [activeTeacherMessage, setActiveTeacherMessage] = React.useState<string>("");
  const isMobile = useIsMobile();

  // Import at the top of the file
  const { openAIAudioService } = React.useMemo(() => {
    return { openAIAudioService: require("@/lib/openai-audio").openAIAudioService };
  }, []);
  
  // Reference to audio element for playing TTS audio
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  
  // Speak using OpenAI's TTS API
  const speak = React.useCallback((text: string, messageId?: number) => {
    // Reset current word and state
    setCurrentWord("");
    
    // Set the active message ID if provided
    if (messageId) {
      setActiveMessage(messageId);
    } else {
      setActiveMessage(messages.length > 0 ? messages[messages.length - 1].id || null : null);
    }

    // Save the active teacher message text
    setActiveTeacherMessage(text);
    
    // Open the video call interface
    setIsVideoCallOpen(true);

    // Make sure any previous audio is stopped
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    }
    
    // Set speaking to true immediately to show animation
    setIsSpeaking(true);
    
    // Split the text into words for subtitle display
    const words = text.split(/\s+/);
    let wordIndex = 0;
    
    // Estimate how long each word should be displayed based on text length
    // Assuming faster speech rate than browser's speech synthesis
    const averageWordDuration = 200; // milliseconds per word for OpenAI TTS
    const estimatedDuration = words.length * averageWordDuration;
    const wordDuration = estimatedDuration / words.length;
    
    console.log(`Estimated speech duration: ${estimatedDuration}ms, ${words.length} words, ${wordDuration}ms per word`);
    
    // Use Nova voice by default (female Spanish speaker)
    const voice = 'nova';
    
    // Generate speech using OpenAI API
    openAIAudioService.textToSpeech(text, voice)
      .then(audioUrl => {
        // Create audio element if it doesn't exist
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        
        // Set up audio event handlers
        audioRef.current.onplay = () => {
          console.log("OpenAI TTS audio started playing");
          setIsSpeaking(true);
          
          // Start displaying words with timing
          const wordInterval = setInterval(() => {
            if (wordIndex < words.length) {
              const word = words[wordIndex];
              setCurrentWord(word);
              
              // Update avatar animation
              setSpeakingIntensity(1);
              setTimeout(() => setSpeakingIntensity(0.5), 50);
              setTimeout(() => setSpeakingIntensity(0.2), 100);
              setTimeout(() => setSpeakingIntensity(0), 150);
              
              wordIndex++;
            } else {
              clearInterval(wordInterval);
              // Ensure the last word stays visible until the audio ends
            }
          }, wordDuration);
          
          // Clean up interval when audio ends
          audioRef.current!.onended = () => {
            clearInterval(wordInterval);
            console.log("OpenAI TTS audio finished");
            setIsSpeaking(false);
            setSpeakingIntensity(0);
            setCurrentWord("");
            setActiveMessage(null);
            
            // Clean up the audio URL
            if (audioRef.current?.src) {
              URL.revokeObjectURL(audioRef.current.src);
              audioRef.current.src = "";
            }
          };
        };
        
        // Set audio source and play
        audioRef.current.src = audioUrl;
        audioRef.current.play().catch(error => {
          console.error("Error playing TTS audio:", error);
          setIsSpeaking(false);
          setSpeakingIntensity(0);
          setCurrentWord("");
          setActiveMessage(null);
        });
      })
      .catch(error => {
        console.error("Error generating TTS:", error);
        setIsSpeaking(false);
        setSpeakingIntensity(0);
        setCurrentWord("");
        setActiveMessage(null);
        
        // Fallback to browser's speech synthesis if OpenAI TTS fails
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-CO';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
        
        toast({
          title: "Speech synthesis fallback",
          description: "Using browser's built-in speech synthesis as a fallback.",
          variant: "destructive"
        });
      });
    
    // Return a cleanup function
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src) {
          URL.revokeObjectURL(audioRef.current.src);
        }
      }
      setIsSpeaking(false);
      setSpeakingIntensity(0);
      setCurrentWord("");
      setActiveMessage(null);
    };
  }, [messages, toast]);

  React.useEffect(() => {
    async function initializeUser() {
      try {
        await apiRequest("POST", "/api/users", {});
      } catch (error) {
        if (!(error instanceof Error && error.message.includes("400"))) {
          console.error("Failed to initialize user:", error);
        }
      }
    }
    initializeUser();
  }, []);

  // Log for HMR testing only
  React.useEffect(() => {
    console.log("[HMR TEST]", new Date().toISOString(), "- Testing hot module replacement");
    // Initial welcome message will be displayed but not spoken automatically
  }, []);
  
  // WebSocket connection for receiving corrections
  React.useEffect(() => {
    if (!currentSession) {
      return; // Don't establish connection if not in a session
    }
    
    let ws: WebSocket | null = null;
    
    try {
      // Create WebSocket connection with the specific path
      // Use secure WebSocket if the page is loaded over HTTPS
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/api/ws`);
      
      ws.onopen = () => {
        console.log('WebSocket connection established');
        // Subscribe to updates for the current session
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'subscribe',
            sessionId: currentSession.id
          }));
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'correction_update') {
            console.log('Received correction update:', data);
            
            // Update the message with the new corrections
            setMessages(prevMessages => {
              return prevMessages.map(msg => {
                if (msg.id === data.messageId) {
                  return {
                    ...msg,
                    corrections: data.corrections
                  };
                }
                return msg;
              });
            });
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket connection closed', event.code, event.reason);
      };
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
    }
    
    // Clean up on unmount
    return () => {
      if (ws) {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      }
    };
  }, [currentSession]);


  const handleSubmit = async (text: string) => {
    if (!currentSession) {
      try {
        const response = await apiRequest("POST", "/api/conversations", {
          userId: 1,
          transcript: text
        });

        const data = await response.json();
        setCurrentSession({
          id: data.session.id,
          context: data.session.context
        });

        const userMessageId = messageIdCounter;
        const userMessage: Message = { 
          id: userMessageId,
          type: "user", 
          content: text 
        };
        setMessageIdCounter(prev => prev + 1);

        const teacherMessage: Message = {
          id: messageIdCounter,
          type: "teacher",
          content: data.teacherResponse.message,
          translation: data.teacherResponse.translation,
          corrections: data.teacherResponse.corrections,
          userMessageId: userMessageId
        };
        setMessageIdCounter(prev => prev + 1);

        setMessages(prev => [...prev, userMessage, teacherMessage]);
        queryClient.invalidateQueries({ queryKey: ["/api/users/1/sessions"] });
        speak(data.teacherResponse.message, teacherMessage.id); // Pass in teacher message ID
        return;
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to start conversation"
        });
        return;
      }
    }

    const userMessageId = messageIdCounter;
    const userMessage: Message = { 
      id: userMessageId,
      type: "user", 
      content: text 
    };
    setMessageIdCounter(prev => prev + 1);
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await apiRequest(
        "POST",
        `/api/sessions/${currentSession.id}/messages`,
        { content: text }
      );

      const data = await response.json();

      const teacherMessage: Message = {
        id: messageIdCounter,
        type: "teacher",
        content: data.teacherResponse.message,
        translation: data.teacherResponse.translation,
        corrections: data.teacherResponse.corrections,
        userMessageId: userMessageId
      };
      setMessageIdCounter(prev => prev + 1);

      setMessages(prev => [...prev, teacherMessage]);
      speak(data.teacherResponse.message, teacherMessage.id);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get teacher's response"
      });
    }
  };

  const handleContextSelect = async (context: string) => {
    try {
      const response = await apiRequest("POST", "/api/conversations", {
        userId: 1,
        transcript: `START_CONTEXT: ${context}`
      });

      const data = await response.json();

      setCurrentSession({
        id: data.session.id,
        context: data.session.context
      });

      const teacherMessage = data.teacherResponse.message;
      const msgId = messageIdCounter;
      setMessages([{
        id: msgId,
        type: "teacher",
        content: teacherMessage,
        translation: data.teacherResponse.translation
      }]);
      setMessageIdCounter(prev => prev + 1);
      speak(teacherMessage, msgId); // Spanish conversations should still be spoken automatically

      queryClient.invalidateQueries({ queryKey: ["/api/users/1/sessions"] });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start conversation in this context"
      });
    }
  };

  const handleSessionSelect = async (session: { id: number; context: string }) => {
    try {
      const messagesResponse = await apiRequest(
        "GET",
        `/api/sessions/${session.id}/messages`
      );
      const sessionMessages = await messagesResponse.json();

      setCurrentSession(session);
      setMessages(sessionMessages);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load conversation messages"
      });
    }
  };

  const handleNewChat = () => {
    setCurrentSession(null);
    const welcomeMessage = "¡Hola! I'm Profesora Ana. Select a conversation context to begin, or start speaking!";
    const msgId = messageIdCounter;
    setMessages([{
      id: msgId,
      type: "teacher",
      content: welcomeMessage
    }]);
    setMessageIdCounter(prev => prev + 1);
    queryClient.invalidateQueries({ queryKey: ["/api/users/1/sessions"] });
    // Removed automatic speaking when creating a new chat
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col md:flex-row relative">
      {/* Absolutely positioned mobile sidebar overlay */}
      {isMobile && isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-[9999]"
          aria-hidden={!isMobileMenuOpen}
        >
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Sidebar container */}
          <div 
            className="absolute top-0 bottom-0 left-0 w-[85vw] max-w-[280px] bg-background shadow-xl border-r slide-in-sidebar"
          >
            <div className="h-full flex flex-col">
              <div className="p-3 border-b flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 mr-2"
                  onClick={() => {
                    handleNewChat();
                    setIsMobileMenuOpen(false);
                  }}
                >
                  New Chat
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 p-0"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ConversationSidebar
                  userId={1}
                  currentSessionId={currentSession?.id}
                  onSelectSession={(session) => {
                    handleSessionSelect(session);
                    setIsMobileMenuOpen(false);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
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
          <h1 className="font-bold text-lg">Spanish Practice</h1>
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
      
      {/* Desktop sidebar (overlaid when expanded) */}
      {!isMobile && !isSidebarCollapsed && (
        <div 
          className="fixed inset-y-0 left-16 md:left-[5rem] w-72 bg-background z-40 border-r flex flex-col"
        >
          <div className="p-4 border-b flex items-center">
            <Button
              variant="outline"
              className="w-full mr-2"
              onClick={handleNewChat}
            >
              New Chat
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <ConversationSidebar
              userId={1}
              currentSessionId={currentSession?.id}
              onSelectSession={handleSessionSelect}
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden bg-accent/5">
        {!currentSession ? (
          <div className="flex-1 flex flex-col items-center justify-between py-4 md:py-8">
            <div className="flex-none mb-4 md:mb-8">
              <div className="flex flex-col items-center">
                <TeacherAvatar
                  className={cn("md:w-32 md:h-32", isMobile ? "w-24 h-24" : "")}
                  speaking={isSpeaking}
                  intensity={speakingIntensity}
                  hideText={true}
                />
                <p className="text-muted-foreground mt-4 text-center">
                  Native Colombian Spanish teacher
                </p>
              </div>
            </div>

            <div className="flex-none max-w-md text-center mb-4 md:mb-8 px-4 space-y-2">
              <p className="text-lg text-muted-foreground">
                Ready to help you practice Spanish
              </p>
            </div>

            <div className="flex-none w-full max-w-xl px-4 md:px-8 mb-4 md:mb-8">
              <ConversationStarters onSelectContext={handleContextSelect} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full">
            <Card className="mx-4 md:mx-8 mt-2 md:mt-4 bg-accent/10">
              <CardContent className="p-3 md:p-4">
                <p className="text-sm text-center text-muted-foreground">
                  Current context: {currentSession.context}
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
                {messages.map((message, i) => (
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
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex-1 whitespace-pre-wrap break-words text-sm">
                              {message.content}
                            </div>
                            {message.type === "teacher" && (
                              <div className="flex items-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => speak(message.content, message.id)}
                                  className="flex-shrink-0 h-7 w-7 ml-1 p-0"
                                >
                                  <Volume2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setActiveTeacherMessage(message.content);
                                    setIsVideoCallOpen(true);
                                  }}
                                  className="flex-shrink-0 h-7 w-7 p-0"
                                >
                                  <Video className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {message.type === "teacher" && message.translation && (
                            <Collapsible className="mt-1.5">
                              <CollapsibleTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="p-0 h-5 text-xs text-muted-foreground hover:text-foreground"
                                >
                                  <ChevronRight className="h-3 w-3 mr-1" />
                                  Show translation
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="pt-1.5 text-xs text-muted-foreground">
                                {message.translation}
                              </CollapsibleContent>
                            </Collapsible>
                          )}

                          {message.type === "teacher" &&
                           message.corrections?.mistakes &&
                           message.corrections.mistakes.length > 0 &&
                           message.userMessageId !== undefined &&
                           messages.find(m => m.id === message.userMessageId)?.type === "user" && (
                            <div className="mt-1.5 p-2 bg-yellow-50/50 rounded-md border border-yellow-200">
                              <div className="flex items-center gap-1 text-yellow-600 mb-1">
                                <AlertCircle className="h-3 w-3" />
                                <span className="text-xs font-medium">Corrections:</span>
                              </div>
                              <div className="space-y-1.5">
                                {message.corrections.mistakes.map((correction, j) => (
                                  <div key={j} className="text-xs space-y-1">
                                    <div className="flex items-center gap-1">
                                      <span className={cn(
                                        "text-xs px-1.5 py-0.5 rounded-full text-[10px]",
                                        correction.type === "grammar" && "bg-red-100 text-red-700 border border-red-200",
                                        correction.type === "vocabulary" && "bg-blue-100 text-blue-700 border border-blue-200",
                                        correction.type === "punctuation" && "bg-yellow-100 text-yellow-700 border border-yellow-200"
                                      )}>
                                        {correction.type.charAt(0).toUpperCase() + correction.type.slice(1)}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
                                      <span className="bg-red-50 px-1 py-0.5 rounded text-[11px]">
                                        {correction.original}
                                      </span>
                                      <span className="text-gray-500">→</span>
                                      <span className="bg-green-50 text-green-700 px-1 py-0.5 rounded text-[11px]">
                                        {correction.correction}
                                      </span>
                                    </div>
                                    <Collapsible className="mt-0.5">
                                      <CollapsibleTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="p-0 h-5 text-[10px] text-muted-foreground hover:text-foreground"
                                        >
                                          <ChevronRight className="h-2.5 w-2.5 mr-0.5" />
                                          Show explanation
                                        </Button>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent className="pt-1">
                                        <p className="text-blue-600 text-[11px]">{correction.explanation_es}</p>
                                        <p className="text-gray-600 text-[11px]">{correction.explanation}</p>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className={cn(
              "p-4 max-w-3xl mx-auto w-full border-t",
              isMobile ? "fixed bottom-0 left-0 right-0 bg-background z-10 p-3" : ""
            )}>
              <SpeechInput onSubmit={handleSubmit} />
            </div>
            {/* Add bottom padding to avoid content being hidden behind fixed bottom bar on mobile */}
            {isMobile && <div className="h-24" />}
          </div>
        )}
      </div>
    </div>
  );
}