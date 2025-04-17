import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, MicOff, Loader2 } from "lucide-react";
import { speechService } from "@/lib/speech";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface SpeechInputProps {
  onSubmit: (text: string) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  placeholder?: string;
  autoActivate?: boolean;
  activationDelay?: number;
}

const STATUS_MESSAGES = {
  listening: "Escuchando... Habla en español",
  processing: "Procesando audio...",
  error: "Error al procesar audio. Intenta de nuevo."
};

export function SpeechInput({ 
  onSubmit, 
  onRecordingStateChange,
  placeholder = "Escribe o habla en español...",
  autoActivate = false,
  activationDelay = 500
}: SpeechInputProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<"listening" | "processing" | "error" | null>(null);
  const isMobile = useIsMobile();
  const activationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Effect to handle auto-activation of microphone
  useEffect(() => {
    if (autoActivate && activationTimeoutRef.current === null) {
      activationTimeoutRef.current = setTimeout(() => {
        startRecording();
      }, activationDelay);
    }
    
    return () => {
      if (activationTimeoutRef.current) {
        clearTimeout(activationTimeoutRef.current);
        activationTimeoutRef.current = null;
      }
    };
  }, [autoActivate, activationDelay]);

  // Effect to notify parent of recording state changes
  useEffect(() => {
    if (onRecordingStateChange) {
      onRecordingStateChange(isRecording);
    }
  }, [isRecording, onRecordingStateChange]);

  const startRecording = () => {
    // Clear any previous text first
    setText("");
    setIsRecording(true);
    setStatus("listening");

    // Use the improved speech service
    speechService.setMode('openai'); // Use OpenAI for better accuracy
    speechService.configureSilenceDetection(true, 1500); // Silence detection after 1.5s
    
    speechService.start((transcript, isFinal) => {
      console.log(`Speech result: "${transcript}", final: ${isFinal}`);
      
      if (transcript === 'Procesando...') {
        setIsProcessing(true);
        setStatus("processing");
        return;
      }
      
      if (transcript === 'Error de transcripción') {
        setStatus("error");
        setIsProcessing(false);
        return;
      }
      
      // Update the text with the latest transcription
      setText(transcript);
      setIsProcessing(false);
      
      // If final result and not empty, auto-submit after short delay
      if (isFinal && transcript.trim()) {
        setStatus(null);
        setIsRecording(false);
        
        // Add small delay before submission to allow user to see the text
        setTimeout(() => {
          onSubmit(transcript.trim());
          // setText(""); // Clear text after submission - commented out to show what was submitted
        }, 500);
      }
    });
  };

  const stopRecording = () => {
    speechService.stop();
    setIsRecording(false);
    setStatus(null);
    setIsProcessing(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSubmit = () => {
    if (text.trim()) {
      // Stop recording if active
      if (isRecording) {
        stopRecording();
      }
      
      onSubmit(text.trim());
      setText("");
      
      // Focus the textarea after submission
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
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
          disabled={isProcessing}
          className={cn(
            "flex-shrink-0",
            isMobile ? "h-9 w-9 p-0" : ""
          )}
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isRecording ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
        <div className="flex-1 flex flex-col md:flex-row gap-2 md:items-end">
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isProcessing}
            className={cn(
              "resize-none flex-1",
              isMobile ? "min-h-[80px] text-sm" : "min-h-[100px]",
              isProcessing && "opacity-70"
            )}
          />
          <Button 
            className={cn(
              "flex-shrink-0",
              isMobile ? "h-9 w-9 p-0" : ""
            )}
            size={isMobile ? "sm" : "default"}
            onClick={handleSubmit}
            disabled={!text.trim() || isProcessing}
          >
            {isMobile ? (
              <Send className="h-4 w-4" />
            ) : (
              "Submit"
            )}
          </Button>
        </div>
      </div>
      {status && (
        <div className={cn(
          "text-center text-xs",
          status === "error" ? "text-destructive" : "text-muted-foreground",
          status === "processing" ? "animate-pulse" : status === "listening" ? "animate-pulse" : ""
        )}>
          {STATUS_MESSAGES[status]}
        </div>
      )}
    </div>
  );
}