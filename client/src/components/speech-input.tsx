import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff } from "lucide-react";
import { speechService } from "@/lib/speech";
import { cn } from "@/lib/utils";

interface SpeechInputProps {
  onSubmit: (text: string) => void;
}

export function SpeechInput({ onSubmit }: SpeechInputProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);

  useEffect(() => {
    let animationFrame: number;

    const updateVolume = () => {
      if (isRecording) {
        // Simulate volume meter with random values
        setVolume(Math.random() * 0.5 + 0.5);
        animationFrame = requestAnimationFrame(updateVolume);
      } else {
        setVolume(0);
      }
    };

    if (isRecording) {
      updateVolume();
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isRecording]);

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
    <div className="space-y-4">
      <div className="relative">
        <Button 
          variant={isRecording ? "destructive" : "default"}
          size="icon"
          className={cn(
            "w-16 h-16 rounded-full transition-all duration-200",
            isRecording && "scale-110"
          )}
          onClick={toggleRecording}
        >
          {isRecording ? (
            <MicOff className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>

        {/* Volume indicator rings */}
        {isRecording && (
          <>
            <div 
              className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping"
              style={{
                transform: `scale(${1 + volume * 0.5})`,
              }}
            />
            <div 
              className="absolute inset-0 rounded-full border-2 border-primary/40"
              style={{
                transform: `scale(${1 + volume * 0.3})`,
              }}
            />
          </>
        )}
      </div>

      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Your speech will appear here..."
          className={cn(
            "min-h-[100px] transition-opacity duration-200",
            !text && "opacity-50"
          )}
        />
        {text && (
          <Button 
            className="absolute bottom-2 right-2" 
            onClick={handleSubmit}
            size="sm"
          >
            Submit
          </Button>
        )}
      </div>
    </div>
  );
}