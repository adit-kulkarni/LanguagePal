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
    examples?: string[];
    loading?: boolean;
    loadingExamples?: boolean;
  };
}

export default function Practice() {
  const [messages, setMessages] = React.useState<Message[]>([{
    type: "teacher",
    content: "¡Hola! I'm Profesora Ana. Let's practice Spanish together! How are you today?"
  }]);
  const [translations, setTranslations] = React.useState<TranslationCache>({});
  const { toast } = useToast();

  // Speech synthesis setup
  const speak = React.useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CO'; // Colombian Spanish
    utterance.rate = 0.9; // Slightly slower for clarity
    window.speechSynthesis.speak(utterance);
  }, []);

  const showExamples = async (word: string) => {
    // If already loading examples, don't do anything
    if (translations[word]?.loadingExamples) return;

    // Set loading state for examples
    setTranslations(prev => ({
      ...prev,
      [word]: { 
        ...prev[word],
        loadingExamples: true 
      }
    }));

    try {
      const response = await apiRequest("POST", "/api/word-examples", { word });
      const data = await response.json();

      // Update translations with examples
      setTranslations(prev => ({
        ...prev,
        [word]: {
          ...prev[word],
          examples: data.examples,
          loadingExamples: false
        }
      }));

      // Show toast with examples
      if (data.examples && data.examples.length > 0) {
        toast({
          title: `Examples for "${word}"`,
          description: (
            <div className="space-y-2">
              <ul className="list-disc pl-4 text-sm space-y-2">
                {data.examples.map((example: string, i: number) => (
                  <li key={i} className="leading-relaxed">{example}</li>
                ))}
              </ul>
            </div>
          ),
          duration: 6000,
        });
      } else {
        toast({
          title: "No examples found",
          description: `Could not find example sentences for "${word}"`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Examples error:", error);
      setTranslations(prev => ({
        ...prev,
        [word]: {
          ...prev[word],
          loadingExamples: false
        }
      }));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get example sentences"
      });
    }
  };

  // Handle word click for translation
  const handleWordClick = async (word: string) => {
    // If we already have the translation, show it
    if (translations[word] && !translations[word].loading) {
      toast({
        title: `Translation for "${word}"`,
        description: (
          <div className="space-y-4">
            <div className="font-medium text-lg">{translations[word].translation}</div>
            <Button 
              onClick={() => showExamples(word)}
              disabled={translations[word]?.loadingExamples}
              size="sm"
              className="w-full"
            >
              {translations[word]?.loadingExamples ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading Examples...
                </>
              ) : (
                'Show Example Sentences'
              )}
            </Button>
          </div>
        ),
        duration: 5000,
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
        [word]: { 
          translation: data.translation,
          loading: false 
        }
      }));

      // Show toast with translation
      toast({
        title: `Translation for "${word}"`,
        description: (
          <div className="space-y-4">
            <div className="font-medium text-lg">{data.translation}</div>
            <Button 
              onClick={() => showExamples(word)}
              size="sm"
              className="w-full"
            >
              Show Example Sentences
            </Button>
          </div>
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

  // Ensure user exists when component mounts
  React.useEffect(() => {
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

                  {message.corrections && message.corrections.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Corrections:</span>
                      </div>
                      {message.corrections.map((correction, j) => (
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