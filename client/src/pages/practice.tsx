import * as React from "react";
import { TeacherAvatar } from "@/components/teacher-avatar";
import { SpeechInput } from "@/components/speech-input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, Volume2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ConversationStarters } from "@/components/conversation-starters";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [messageIdCounter, setMessageIdCounter] = React.useState(1);

  const speak = React.useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CO';
    utterance.rate = 0.9;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingIntensity(0);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingIntensity(0);
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word' || event.name === 'sentence') {
        setSpeakingIntensity(1);
        setTimeout(() => setSpeakingIntensity(0.5), 50);
        setTimeout(() => setSpeakingIntensity(0.2), 100);
        setTimeout(() => setSpeakingIntensity(0), 150);
      }
    };

    window.speechSynthesis.speak(utterance);
  }, []);

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
      speak(data.teacherResponse.message);
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

      setMessages([{
        id: messageIdCounter,
        type: "teacher",
        content: data.teacherResponse.message,
        translation: data.teacherResponse.translation
      }]);
      setMessageIdCounter(prev => prev + 1);

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
    setMessages([{
      id: messageIdCounter,
      type: "teacher",
      content: "¡Hola! I'm Profesora Ana. Select a conversation context to begin, or start speaking!"
    }]);
    setMessageIdCounter(prev => prev + 1);
    queryClient.invalidateQueries({ queryKey: ["/api/users/1/sessions"] });
  };

  return (
    <div className="h-screen overflow-hidden flex">
      <div 
        className={cn(
          "border-r h-full overflow-hidden flex flex-col transition-all duration-300",
          isSidebarCollapsed ? "w-12" : "w-72"
        )}
      >
        <div className={cn(
          "flex items-center transition-all duration-300",
          isSidebarCollapsed ? "justify-center p-2" : "p-4 border-b"
        )}>
          {!isSidebarCollapsed && (
            <Button
              variant="outline"
              className="w-full mr-2"
              onClick={handleNewChat}
            >
              New Chat
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="flex-shrink-0"
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className={cn(
          "flex-1 overflow-y-auto",
          isSidebarCollapsed && "hidden"
        )}>
          <ConversationSidebar
            userId={1}
            currentSessionId={currentSession?.id}
            onSelectSession={handleSessionSelect}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-accent/5">
        {!currentSession ? (
          <div className="flex-1 flex flex-col items-center justify-start py-12">
            <div className="mb-16">
              <TeacherAvatar
                className="w-32 h-32"
                speaking={isSpeaking}
                intensity={speakingIntensity}
                hideText={true}
              />
            </div>

            <div className="max-w-md text-center mb-12 space-y-2">
              <p className="font-medium">Native Colombian Spanish teacher</p>
              <p className="text-lg text-muted-foreground">
                Ready to help you practice Spanish
              </p>
            </div>

            <div className="w-full max-w-xl px-8 mb-8">
              <ConversationStarters onSelectContext={handleContextSelect} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full">
            <Card className="mx-8 mt-4 bg-accent/10">
              <CardContent className="p-4">
                <p className="text-sm text-center text-muted-foreground">
                  Current context: {currentSession.context}
                </p>
              </CardContent>
            </Card>

            <ScrollArea className="flex-1 px-8 py-4">
              <div className="space-y-4 max-w-3xl mx-auto">
                {messages.map((message, i) => (
                  <Card key={message.id} className={message.type === "user" ? "bg-accent/10" : "bg-background"}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-4">
                        {message.type === "teacher" && (
                          <div className="flex-shrink-0">
                            <TeacherAvatar
                              className="w-8 h-8"
                              speaking={isSpeaking && i === messages.length - 1}
                              intensity={speakingIntensity}
                              hideText={true}
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 space-x-1 whitespace-pre-wrap break-words">
                              {message.content}
                            </div>
                            {message.type === "teacher" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => speak(message.content)}
                                className="flex-shrink-0 ml-2"
                              >
                                <Volume2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          {message.type === "teacher" && message.translation && (
                            <Collapsible className="mt-2">
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-0 h-6 text-muted-foreground hover:text-foreground">
                                  <ChevronRight className="h-4 w-4 mr-1" />
                                  Show translation
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="pt-2 text-sm text-muted-foreground">
                                {message.translation}
                              </CollapsibleContent>
                            </Collapsible>
                          )}

                          {message.type === "teacher" &&
                           message.corrections?.mistakes &&
                           message.corrections.mistakes.length > 0 &&
                           message.userMessageId !== undefined &&
                           messages.find(m => m.id === message.userMessageId)?.type === "user" && (
                            <div className="mt-2 p-3 bg-yellow-50/50 rounded-md border border-yellow-200">
                              <div className="flex items-center gap-2 text-yellow-600 mb-2">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-sm font-medium">Corrections:</span>
                              </div>
                              <div className="space-y-3">
                                {message.corrections.mistakes.map((correction, j) => (
                                  <div key={j} className="text-sm space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className={cn(
                                        "text-xs px-2 py-0.5 rounded-full",
                                        correction.type === "grammar" && "bg-red-100 text-red-700 border border-red-200",
                                        correction.type === "vocabulary" && "bg-blue-100 text-blue-700 border border-blue-200",
                                        correction.type === "punctuation" && "bg-yellow-100 text-yellow-700 border border-yellow-200"
                                      )}>
                                        {correction.type.charAt(0).toUpperCase() + correction.type.slice(1)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 font-mono">
                                      <span className="bg-red-50 px-1.5 py-0.5 rounded">
                                        {correction.original}
                                      </span>
                                      <span className="text-gray-500">→</span>
                                      <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                                        {correction.correction}
                                      </span>
                                    </div>
                                    <p className="text-blue-600">{correction.explanation_es}</p>
                                    <p className="text-gray-600">{correction.explanation}</p>
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

            <div className="p-4 max-w-3xl mx-auto w-full">
              <SpeechInput onSubmit={handleSubmit} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}