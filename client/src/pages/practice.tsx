import * as React from "react";
import { TeacherAvatar } from "@/components/teacher-avatar";
import { SpeechInput } from "@/components/speech-input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConversationStarters } from "@/components/conversation-starters";
import { useState } from "react";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { cn } from "@/lib/utils";

interface Message {
  type: "user" | "teacher";
  content: string;
  corrections?: Array<{
    original: string;
    correction: string;
    explanation: string;
    explanation_es: string;
    type: "punctuation" | "grammar" | "vocabulary";
    ignored?: boolean;
  }>;
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingIntensity, setSpeakingIntensity] = useState(0);

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

  const showExamples = async (word: string) => {
    console.log('Example sentence feature temporarily disabled');
  };

  const handleWordClick = async (word: string) => {
    if (translations[word] && !translations[word].loading) {
      toast({
        title: `Translation for "${word}"`,
        description: (
          <div className="font-medium text-lg">{translations[word].translation}</div>
        ),
        duration: 5000,
      });
      return;
    }

    if (translations[word]?.loading) return;

    setTranslations(prev => ({
      ...prev,
      [word]: { translation: '', loading: true }
    }));

    try {
      const response = await apiRequest("POST", "/api/translate", { word });
      const data = await response.json();

      setTranslations(prev => ({
        ...prev,
        [word]: {
          translation: data.translation,
          loading: false
        }
      }));

      toast({
        title: `Translation for "${word}"`,
        description: (
          <div className="font-medium text-lg">{data.translation}</div>
        ),
        duration: 5000,
      });
    } catch (error) {
      console.error("Translation error:", error);
      setTranslations(prev => ({
        ...prev,
        [word]: { translation: 'Translation failed', loading: false }
      }));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get translation"
      });
    }
  };

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
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a conversation context first"
      });
      return;
    }

    setMessages(prev => [...prev, { type: "user", content: text }]);

    try {
      const response = await apiRequest(
        "POST",
        `/api/sessions/${currentSession.id}/messages`,
        { content: text }
      );

      const data = await response.json();

      setMessages(prev => [
        ...prev,
        {
          type: "teacher",
          content: data.teacherResponse.message
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
        content: data.teacherResponse.message
      }]);
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

  return (
    <div className="h-screen overflow-hidden flex">
      <div className="w-80 border-r h-full overflow-hidden flex flex-col">
        <div className="p-4 border-b">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setMessages([{
              type: "teacher",
              content: "¡Hola! I'm Profesora Ana. Select a conversation context to begin, or start speaking!"
            }])}
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

      <div className="flex-1 grid grid-cols-2 overflow-hidden">
        <div className="flex flex-col items-center bg-accent/10 py-8 overflow-y-auto">
          <div className="mb-8 flex flex-col items-center">
            <TeacherAvatar
              className="scale-125 mb-2"
              speaking={isSpeaking}
              intensity={speakingIntensity}
            />
          </div>
          <div className="w-full px-4">
            <ConversationStarters onSelectContext={handleContextSelect} />
          </div>
        </div>

        <div className="flex flex-col p-4 overflow-y-auto">
          <h1 className="text-2xl font-bold mb-4 flex-none">
            Practice Spanish
            {currentSession && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                Context: {currentSession.context}
              </span>
            )}
          </h1>

          <ScrollArea className="flex-1">
            <div className="space-y-4 pr-4">
              {messages.map((message, i) => (
                <Card key={i} className={message.type === "user" ? "bg-accent" : "bg-background"}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div
                        className="space-x-1 whitespace-pre-wrap break-words"
                        onClick={(e) => {
                          const target = e.target as HTMLSpanElement;
                          if (target.dataset.word) {
                            handleWordClick(target.dataset.word);
                          }
                        }}
                      >
                        {message.content && message.content.split(' ').map((word, j) => (
                          <Tooltip key={j}>
                            <TooltipTrigger asChild>
                              <span
                                data-word={word}
                                className="hover:text-primary hover:underline cursor-pointer inline-block"
                              >
                                {word}
                                {translations[word]?.loading && (
                                  <Loader2 className="w-3 h-3 animate-spin absolute -top-3 -right-3" />
                                )}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              Click to translate
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                      {message.type === "teacher" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => speak(message.content)}
                          className="ml-2"
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {message.type === "user" && message.corrections && message.corrections.length > 0 && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2 text-yellow-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Corrections:</span>
                        </div>
                        {message.corrections.map((correction, j) => (
                          <div key={j} className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-2">
                              {correction.type === "punctuation" && (
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full",
                                  correction.ignored
                                    ? "bg-gray-100 text-gray-500 border border-gray-200"
                                    : "bg-yellow-100 text-yellow-700 border border-yellow-200 animate-pulse"
                                )}>
                                  {correction.ignored ? "Ignored Punctuation" : "Punctuation Fix"}
                                </span>
                              )}
                              {correction.type === "grammar" && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                                  Grammar
                                </span>
                              )}
                              {correction.type === "vocabulary" && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                                  Vocabulary
                                </span>
                              )}
                            </div>
                            <p>
                              <span className={cn(
                                "font-mono px-1 rounded",
                                correction.type === "punctuation" && correction.ignored
                                  ? "bg-gray-50 line-through text-gray-400"
                                  : "bg-red-50"
                              )}>
                                {correction.original}
                              </span>
                              {" → "}
                              <span className="font-mono px-1 rounded bg-green-50 text-green-700">
                                {correction.correction}
                              </span>
                            </p>
                            <p className="text-blue-600">{correction.explanation_es}</p>
                            <p className="text-gray-600">{correction.explanation}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          <div className="mt-4 flex-none">
            <SpeechInput onSubmit={handleSubmit} />
          </div>
        </div>
      </div>
    </div>
  );
}