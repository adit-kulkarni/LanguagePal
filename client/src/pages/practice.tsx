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
  const { toast } = useToast();
  const [currentContext, setCurrentContext] = React.useState<string>("");

  // Speech synthesis setup
  const speak = React.useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CO'; // Colombian Spanish
    utterance.rate = 0.9; // Slightly slower for clarity
    window.speechSynthesis.speak(utterance);
  }, []);

  // Keep the function but don't expose it in the UI for now
  const showExamples = async (word: string) => {
    // Implementation remains but is currently unused
    console.log('Example sentence feature temporarily disabled');
  };

  // Handle word click for translation
  const handleWordClick = async (word: string) => {
    // If we already have the translation, show it
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

  const handleContextSelect = async (context: string) => {
    setCurrentContext(context);
    try {
      const response = await apiRequest("POST", "/api/conversations", {
        userId: 1,
        transcript: `START_CONTEXT: ${context}`
      });

      const data = await response.json();
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

  return (
    <div className="flex h-screen">
      {/* Teacher Section with Context Starters */}
      <div className="w-1/2 flex flex-col items-center justify-center bg-accent/10 p-8">
        <div className="mb-12">
          <TeacherAvatar className="scale-150" />
        </div>
        <ConversationStarters onSelectContext={handleContextSelect} />
      </div>

      {/* Chat Section - remains mostly unchanged */}
      <div className="w-1/2 flex flex-col p-4">
        <h1 className="text-2xl font-bold mb-4">
          Practice Spanish
          {currentContext && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              Context: {currentContext}
            </span>
          )}
        </h1>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
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

                  {message.corrections && message.corrections.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Corrections:</span>
                      </div>
                      {message.corrections.map((correction, j) => (
                        <div key={j} className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            {correction.type === "punctuation" && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                correction.ignored 
                                  ? "bg-gray-100 text-gray-500"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}>
                                {correction.ignored ? "Ignored Punctuation" : "Punctuation"}
                              </span>
                            )}
                            {correction.type === "grammar" && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                Grammar
                              </span>
                            )}
                            {correction.type === "vocabulary" && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                Vocabulary
                              </span>
                            )}
                          </div>
                          <p><strong>{correction.original}</strong> → {correction.correction}</p>
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

        <div className="mt-4">
          <SpeechInput onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  );
}