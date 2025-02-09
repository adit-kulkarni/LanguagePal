import { useState } from "react";
import { TeacherAvatar } from "@/components/teacher-avatar";
import { SpeechInput } from "@/components/speech-input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle } from "lucide-react";

interface Message {
  type: "user" | "teacher";
  content: string;
  corrections?: Array<{
    original: string;
    correction: string;
    explanation: string;
  }>;
}

export default function Practice() {
  const [messages, setMessages] = useState<Message[]>([{
    type: "teacher",
    content: "¡Hola! I'm Profesora Ana. Let's practice Spanish together! How are you today?"
  }]);
  const { toast } = useToast();

  const handleSubmit = async (text: string) => {
    setMessages(prev => [...prev, { type: "user", content: text }]);

    try {
      const response = await apiRequest("POST", "/api/conversations", {
        userId: 1, // TODO: Get from auth
        transcript: text
      });
      
      const data = await response.json();
      setMessages(prev => [...prev, {
        type: "teacher",
        content: data.teacherResponse.message,
        corrections: data.teacherResponse.corrections.mistakes
      }]);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get teacher's response"
      });
    }
  };

  return (
    <div className="flex flex-col h-screen p-4 gap-4">
      <div className="flex items-center gap-4">
        <TeacherAvatar />
        <h1 className="text-2xl font-bold">Practice Spanish</h1>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4">
          {messages.map((message, i) => (
            <Card key={i} className={message.type === "user" ? "bg-accent" : "bg-background"}>
              <CardContent className="p-4 space-y-2">
                <p>{message.content}</p>
                {message.corrections?.length > 0 && (
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

      <SpeechInput onSubmit={handleSubmit} />
    </div>
  );
}
