import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff } from "lucide-react";
import { speechService } from "@/lib/speech";

interface SpeechInputProps {
  onSubmit: (text: string) => void;
}

export function SpeechInput({ onSubmit }: SpeechInputProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);

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
      <div className="flex gap-2">
        <Button 
          variant={isRecording ? "destructive" : "default"}
          size="icon"
          onClick={toggleRecording}
        >
          {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Your speech will appear here..."
          className="min-h-[100px]"
        />
      </div>
      <Button 
        className="w-full" 
        onClick={handleSubmit}
        disabled={!text.trim()}
      >
        Submit
      </Button>
    </div>
  );
}