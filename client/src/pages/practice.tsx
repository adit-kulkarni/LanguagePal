import * as React from "react";
import { TeacherAvatar } from "@/components/teacher-avatar";
import { SpeechInput } from "@/components/speech-input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, Volume2, Loader2, ChevronDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConversationStarters } from "@/components/conversation-starters";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Message {
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
    type: "teacher",
    content: "¡Hola! I'm Profesora Ana. Select a conversation context to begin, or start speaking!"
  }]);
  const [translations, setTranslations] = React.useState<TranslationCache>({});
  const [currentSession, setCurrentSession] = React.useState<{ id: number; context: string } | null>(null);
  const { toast } = useToast();
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [speakingIntensity, setSpeakingIntensity] = React.useState(0);
  const queryClient = useQueryClient();
  const [showChat, setShowChat] = React.useState(false);

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

        setMessages(prev => [
          ...prev,
          { type: "user", content: text },
          {
            type: "teacher",
            content: data.teacherResponse.message,
            translation: data.teacherResponse.translation,
            corrections: data.teacherResponse.corrections
          }
        ]);

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

    setMessages(prev => [...prev, { type: "user", content: text }]);

    try {
      const response = await apiRequest(
        "POST",
        `/api/sessions/${currentSession.id}/messages`,
        { content: text }
      );

      const data = await response.json();
      console.log('Received teacher response:', data);

      setMessages(prev => [
        ...prev,
        {
          type: "teacher",
          content: data.teacherResponse.message,
          translation: data.teacherResponse.translation,
          corrections: data.teacherResponse.corrections
        }
      ]);

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
        type: "teacher",
        content: data.teacherResponse.message,
        translation: data.teacherResponse.translation
      }]);

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
      type: "teacher",
      content: "¡Hola! I'm Profesora Ana. Select a conversation context to begin, or start speaking!"
    }]);
    queryClient.invalidateQueries({ queryKey: ["/api/users/1/sessions"] });
  };

  return (
    <div className="h-screen overflow-hidden flex">
      <div className="w-80 border-r h-full overflow-hidden flex flex-col">
        <div className="p-4 border-b">
          <Button
            variant="outline"
            className="w-full"
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

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center relative bg-accent/10 p-8">
          {currentSession && (
            <div className="absolute top-4 left-4 text-sm text-muted-foreground">
              Context: {currentSession.context}
            </div>
          )}

          <div className="flex-1 flex flex-col items-center justify-center max-w-2xl w-full">
            <TeacherAvatar
              className="scale-150 mb-8"
              speaking={isSpeaking}
              intensity={speakingIntensity}
            />

            {messages.length > 0 && (
              <div className="text-center mb-8 space-y-4">
                <p className="text-xl">{messages[messages.length - 1].content}</p>
                {messages[messages.length - 1].type === "teacher" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => speak(messages[messages.length - 1].content)}
                    className="gap-2"
                  >
                    <Volume2 className="h-4 w-4" />
                    Listen Again
                  </Button>
                )}
              </div>
            )}

            <div className="w-full max-w-md">
              <SpeechInput onSubmit={handleSubmit} />
            </div>

            {!currentSession && (
              <div className="mt-8 w-full max-w-2xl">
                <ConversationStarters onSelectContext={handleContextSelect} />
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="absolute bottom-4 right-4"
            onClick={() => setShowChat(!showChat)}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>

        <Collapsible open={showChat} onOpenChange={setShowChat}>
          <CollapsibleContent className="w-96 border-l h-full bg-background">
            <div className="flex flex-col h-full p-4">
              <h2 className="text-lg font-semibold mb-4">Conversation History</h2>
              <ScrollArea className="flex-1">
                <div className="space-y-4 pr-4">
                  {messages.map((message, i) => (
                    <Card key={i} className={message.type === "user" ? "bg-accent" : "bg-background"}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 space-x-1 whitespace-pre-wrap break-words">
                            {message.content}
                          </div>
                        </div>

                        {message.type === "teacher" && message.translation && (
                          <Collapsible className="mt-2">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="p-0 h-6 text-muted-foreground hover:text-foreground">
                                <ChevronDown className="h-4 w-4 mr-1" />
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
                          i > 0 &&
                          messages[i - 1].type === "user" && (
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}