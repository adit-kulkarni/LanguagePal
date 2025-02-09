import { useState, useEffect, useCallback } from "react";
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

interface Message {
  type: "user" | "teacher";
  content: string;
  corrections?: Array<{
    original: string;
    correction: string;
    explanation: string;
  }>;
}

interface TranslationCache {
  [word: string]: {
    translation: string;
    loading?: boolean;
  };
}

export default function Practice() {
  const [messages, setMessages] = useState<Message[]>([{
    type: "teacher",
    content: "¡Hola! I'm Profesora Ana. Let's practice Spanish together! How are you today?"
  }]);
  const [translations, setTranslations] = useState<TranslationCache>({});
  const { toast } = useToast();

  // Speech synthesis setup
  const speak = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CO'; // Colombian Spanish
    utterance.rate = 0.9; // Slightly slower for clarity
    window.speechSynthesis.speak(utterance);
  }, []);

  // Handle word click for translation
  const handleWordClick = async (word: string) => {
    // If we already have the translation, show it
    if (translations[word] && !translations[word].loading) {
      toast({
        title: word,
        description: translations[word].translation,
      });
      return;
    }

    // If it's already loading, do nothing
    if (translations[word]?.loading) return;

    // Set loading state
    setTranslations(prev => ({
      ...prev,
      [word]: { translation: '', loading: true }
    }));

    try {
      const response = await apiRequest("POST", "/api/translate", { word });
      const data = await response.json();

      // Store the translation
      setTranslations(prev => ({
        ...prev,
        [word]: { translation: data.translation, loading: false }
      }));

      toast({
        title: word,
        description: data.translation,
      });
    } catch (error) {
      console.error("Translation error:", error);
      setTranslations(prev => ({
        ...prev,
        [word]: { translation: 'Translation failed', loading: false }
      }));
    }
  };

  // Ensure user exists when component mounts
  useEffect(() => {
    async function initializeUser() {
      try {
        await apiRequest("POST", "/api/users", {});
      } catch (error) {
        // Ignore error if user already exists
        if (!(error instanceof Error && error.message.includes("400"))) {
          console.error("Failed to initialize user:", error);
        }
      }
    }
    initializeUser();
  }, []);

  const handleSubmit = async (text: string) => {
    setMessages(prev => [...prev, { type: "user", content: text }]);

    try {
      const response = await apiRequest("POST", "/api/conversations", {
        userId: 1,
        transcript: text
      });

      const data = await response.json();
      const teacherMessage = {
        type: "teacher" as const,
        content: data.teacherResponse.message,
        corrections: data.teacherResponse.corrections?.mistakes
      };

      setMessages(prev => [...prev, teacherMessage]);
      speak(data.teacherResponse.message);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get teacher's response"
      });
      console.error("Conversation error:", error);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Teacher Section */}
      <div className="w-1/2 flex items-center justify-center bg-accent/10">
        <TeacherAvatar className="scale-150" />
      </div>

      {/* Chat Section */}
      <div className="w-1/2 flex flex-col p-4">
        <h1 className="text-2xl font-bold mb-4">Practice Spanish</h1>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message, i) => (
              <Card key={i} className={message.type === "user" ? "bg-accent" : "bg-background"}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div
                      className="space-x-1"
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
                              className="hover:text-primary hover:underline cursor-pointer relative"
                            >
                              {word}
                              {translations[word]?.loading && (
                                <Loader2 className="w-3 h-3 animate-spin absolute -top-3 -right-3" />
                              )}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {translations[word]?.loading
                              ? "Translating..."
                              : translations[word]?.translation
                                ? translations[word].translation
                                : "Click to translate"}
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

                  {message.corrections?.mistakes && message.corrections.mistakes.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Corrections:</span>
                      </div>
                      {message.corrections.mistakes.map((correction, j) => (
                        <div key={j} className="text-sm text-muted-foreground">
                          <p><strong>{correction.original}</strong> → {correction.correction}</p>
                          <p>{correction.explanation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="mt-4">
          <SpeechInput onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  );
}