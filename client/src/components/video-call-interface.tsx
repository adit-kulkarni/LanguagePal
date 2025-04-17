import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Mic, MicOff, Video, VideoOff, X, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { speechService } from "@/lib/speech";
import { useIsMobile } from "@/hooks/use-mobile";

interface VideoCallInterfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherAvatarUrl?: string;
  userAvatarUrl?: string;
  teacherMessage: string;
  onUserResponse: (text: string) => void;
  isSpeaking: boolean;
  currentWord: string;
  speakingIntensity: number;
}

export function VideoCallInterface({
  open,
  onOpenChange,
  teacherAvatarUrl = "https://api.dicebear.com/7.x/personas/svg?seed=teacher&backgroundColor=transparent",
  userAvatarUrl = "https://api.dicebear.com/7.x/personas/svg?seed=user&backgroundColor=transparent",
  teacherMessage,
  onUserResponse,
  isSpeaking,
  currentWord,
  speakingIntensity
}: VideoCallInterfaceProps) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = React.useState(false);
  const [responseDelay, setResponseDelay] = React.useState(2); // Default 2 second delay
  const [recordedText, setRecordedText] = React.useState("");
  const [isDelayActive, setIsDelayActive] = React.useState(false);
  const isMobile = useIsMobile();
  const delayTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Start recording when teacher stops speaking (after delay if set)
  React.useEffect(() => {
    if (!isSpeaking && open && !isRecording && !isDelayActive) {
      // If delay is active, wait before starting recording
      if (responseDelay > 0) {
        setIsDelayActive(true);
        delayTimerRef.current = setTimeout(() => {
          startRecording();
          setIsDelayActive(false);
        }, responseDelay * 1000);
      } else {
        startRecording();
      }
    }
    
    // Clean up effect
    return () => {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
      }
    };
  }, [isSpeaking, open, isRecording, responseDelay, isDelayActive]);

  // Clean up when dialog closes
  React.useEffect(() => {
    if (!open) {
      stopRecording();
      setRecordedText("");
      setIsDelayActive(false);
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
      }
    }
  }, [open]);

  const startRecording = () => {
    speechService.start((transcript, isFinal) => {
      setRecordedText(transcript);
      
      if (isFinal && transcript.trim()) {
        onUserResponse(transcript.trim());
        stopRecording();
      }
    });
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (isRecording) {
      speechService.stop();
      setIsRecording(false);
    }
  };

  const toggleMicrophone = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90%] md:max-w-[85%] lg:max-w-[75%] h-[85vh] max-h-[85vh] p-0 border-none gap-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Teacher section */}
          <div className="flex-1 flex items-center justify-center bg-accent/10 p-4 relative overflow-hidden">
            <div className="absolute right-2 top-2">
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
            
            <div className="flex flex-col items-center max-w-2xl mx-auto">
              <div className={cn(
                "rounded-full p-6 transition-all duration-100 mb-4",
                isSpeaking ? "bg-gradient-to-r from-blue-200 to-cyan-200" : ""
              )} style={{
                transform: isSpeaking ? `scale(${1 + speakingIntensity * 0.01})` : 'scale(1)'
              }}>
                <Avatar className="w-32 h-32 md:w-40 md:h-40">
                  <AvatarImage src={teacherAvatarUrl} alt="Teacher" />
                  <AvatarFallback>👩‍🏫</AvatarFallback>
                </Avatar>
              </div>
              
              {currentWord && isSpeaking && (
                <div className="min-h-[60px] flex items-center">
                  <Badge variant="secondary" className="text-xl px-6 py-3 bg-primary/90 text-white shadow-md">
                    {currentWord}
                  </Badge>
                </div>
              )}
              
              {!isSpeaking && teacherMessage && (
                <div className="text-center mt-4 max-w-md px-4">
                  <p className="text-lg">{teacherMessage}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* User section */}
          <div className="bg-background p-4 border-t relative">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-2xl mx-auto">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 md:w-20 md:h-20">
                  <AvatarImage src={userAvatarUrl} alt="User" />
                  <AvatarFallback>👤</AvatarFallback>
                </Avatar>
                
                {recordedText && (
                  <Badge variant="outline" className="text-base px-4 py-2 max-w-[200px] md:max-w-[300px] truncate">
                    {recordedText}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {isDelayActive && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm animate-pulse">
                      {responseDelay}s
                    </span>
                  </div>
                )}
                
                <Button 
                  variant={isRecording ? "destructive" : "default"}
                  size="icon"
                  onClick={toggleMicrophone}
                  className="h-10 w-10 rounded-full"
                >
                  {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                
                <Button 
                  variant={isVideoEnabled ? "default" : "outline"}
                  size="icon"
                  onClick={toggleVideo}
                  className="h-10 w-10 rounded-full"
                >
                  {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>
              </div>
            </div>
            
            {/* Response delay control */}
            <div className="mt-4 max-w-xs mx-auto">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Response delay</span>
                <span className="text-xs font-medium">{responseDelay}s</span>
              </div>
              <Slider
                value={[responseDelay]}
                min={0}
                max={10}
                step={1}
                onValueChange={(value) => setResponseDelay(value[0])}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}