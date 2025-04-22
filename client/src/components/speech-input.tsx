import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, MicOff } from "lucide-react";
import { speechService } from "@/lib/speech";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface SpeechInputProps {
  onSubmit: (text: string) => void;
}

export function SpeechInput({ onSubmit }: SpeechInputProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const isMobile = useIsMobile();

  const toggleRecording = () => {
    if (isRecording) {
      speechService.stop();
      setIsRecording(false);
    } else {
      speechService.start((transcript, isFinal) => {
        setText(transcript);
      });
      setIsRecording(true);
    }
  };

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
      setText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <Button 
          variant={isRecording ? "destructive" : "default"}
          size={isMobile ? "sm" : "icon"}
          onClick={toggleRecording}
          className={cn(
            "flex-shrink-0",
            isMobile ? "h-9 w-9 p-0" : ""
          )}
        >
          {isRecording ? 
            <MicOff className={isMobile ? "h-4 w-4" : "h-4 w-4"} /> : 
            <Mic className={isMobile ? "h-4 w-4" : "h-4 w-4"} />
          }
        </Button>
        <div className="flex-1 flex flex-col md:flex-row gap-2 md:items-end">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type or speak Spanish here..."
            className={cn(
              "resize-none flex-1",
              isMobile ? "min-h-[80px] text-sm" : "min-h-[100px]"
            )}
          />
          <Button 
            className={cn(
              "flex-shrink-0",
              isMobile ? "h-9 w-9 p-0" : ""
            )}
            size={isMobile ? "sm" : "default"}
            onClick={handleSubmit}
            disabled={!text.trim()}
          >
            {isMobile ? (
              <Send className="h-4 w-4" />
            ) : (
              "Submit"
            )}
          </Button>
        </div>
      </div>
      {isRecording && (
        <div className="text-center text-xs text-muted-foreground animate-pulse">
          Listening... Speak in Spanish
        </div>
      )}
    </div>
  );
}