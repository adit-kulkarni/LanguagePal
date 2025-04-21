import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Mic, MicOff, Video, VideoOff, X, Clock, Settings, Loader2, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { speechService } from "@/lib/speech";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { SpeechInput } from "@/components/speech-input";
import { AudioPlayer } from "@/components/audio-player";
import { DirectAudioPlayer } from "@/components/direct-audio-player";
import { SimplePlayer } from "@/components/simple-player";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VideoCallInterfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherAvatarUrl?: string;
  userAvatarUrl?: string;
  teacherMessage: string | null;
  onUserResponse: (text: string) => void;
  isSpeaking: boolean;
  currentWord: string;
  speakingIntensity: number;
  userRecordedText?: string; // Live transcription of user speech
  isRecording?: boolean; // Whether the user is currently recording
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
  speakingIntensity,
  userRecordedText = "",
  isRecording: externalIsRecording = false
}: VideoCallInterfaceProps) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = React.useState(false);
  const [responseDelay, setResponseDelay] = React.useState(2); // Default 2 second delay
  const [recordedText, setRecordedText] = React.useState("");
  const [isDelayActive, setIsDelayActive] = React.useState(false);
  const [recognitionMode, setRecognitionMode] = React.useState<'browser' | 'openai'>('openai');
  const [showSettings, setShowSettings] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [autoListenAfterTeacher, setAutoListenAfterTeacher] = React.useState(true);
  
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const delayTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Set speech recognition mode
  React.useEffect(() => {
    speechService.setMode(recognitionMode);
    speechService.configureSilenceDetection(true, 1500); // 1.5 seconds of silence to auto-stop
    speechService.setFallbackMode(true); // Enable fallback between modes if one fails
  }, [recognitionMode]);
  
  // Listen for word update events from AudioPlayer components
  React.useEffect(() => {
    const handleWordChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ word: string }>;
      console.log("[VideoCallInterface] Word changed:", customEvent.detail.word);
      
      // Broadcast an update to the parent component via a custom event
      // Instead of trying to directly update state in this component
      const wordUpdateEvent = new CustomEvent('update-current-word', {
        detail: { word: customEvent.detail.word }
      });
      window.dispatchEvent(wordUpdateEvent);
    };
    
    window.addEventListener('word-changed', handleWordChange);
    
    return () => {
      window.removeEventListener('word-changed', handleWordChange);
    };
  }, []);

  // Start recording when teacher stops speaking (after delay if set)
  React.useEffect(() => {
    if (!autoListenAfterTeacher) return;
    
    // When the teacher stops speaking and the interface is open
    if (!isSpeaking && open && !isDelayActive && !isRecording) {
      console.log("Teacher stopped speaking, preparing to activate microphone");
      
      // If delay/thinking time is active, wait before starting recording
      if (responseDelay > 0) {
        setIsDelayActive(true);
        delayTimerRef.current = setTimeout(() => {
          startRecording();
          setIsDelayActive(false);
        }, responseDelay * 1000);
      } else {
        // Start recording immediately if no delay
        startRecording();
      }
    }
    
    // Clean up effect
    return () => {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
    };
  }, [isSpeaking, open, isRecording, autoListenAfterTeacher]);

  // Clean up when dialog closes
  React.useEffect(() => {
    if (!open) {
      stopRecording();
      setRecordedText("");
      setIsDelayActive(false);
      setIsProcessing(false);
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
    }
  }, [open]);

  const startRecording = () => {
    // Don't start if already recording or processing a previous recording
    if (isRecording || isProcessing || !open) return;
    
    console.log("Starting microphone recording");
    setIsRecording(true);
    setIsProcessing(false);
    setRecordedText("");
    
    try {
      speechService.start((transcript, isFinal) => {
        console.log(`Speech recognition: "${transcript}", final: ${isFinal}`);
        
        // Handle processing state
        if (transcript === 'Procesando...') {
          setIsProcessing(true);
          return;
        }
        
        // Handle error state
        if (transcript === 'Error de transcripción') {
          setIsProcessing(false);
          setIsRecording(false);
          toast({
            title: "Error con la transcripción",
            description: "No se pudo procesar el audio. Intenta nuevamente.",
            variant: "destructive"
          });
          return;
        }
        
        // Update display
        setRecordedText(transcript);
        
        // If we have a final result with content, submit it
        if (isFinal && transcript.trim()) {
          console.log("Final transcript received, submitting response");
          setIsRecording(false);
          setIsProcessing(false);
          
          // Short delay to allow user to see what was transcribed
          setTimeout(() => {
            onUserResponse(transcript.trim());
          }, 300);
        }
      });
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      setIsRecording(false);
      setIsProcessing(false);
      
      toast({
        title: "Error activando micrófono",
        description: "No se pudo iniciar el reconocimiento de voz.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (isRecording) {
      console.log("Stopping microphone recording");
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
      <DialogContent 
        className="sm:max-w-[90%] md:max-w-[85%] lg:max-w-[75%] h-[85vh] max-h-[85vh] p-0 border-none gap-0 overflow-hidden"
        aria-describedby="video-call-description"
      >
        <div id="video-call-description" className="sr-only">Video call interface for language practice with a virtual teacher</div>
        <div className="flex flex-col h-full">
          {/* Teacher section */}
          <div className="flex-1 flex items-center justify-center bg-accent/10 p-4 relative overflow-hidden">
            <div className="absolute right-2 top-2 flex gap-2">
              {teacherMessage && (
                <Button 
                  variant="default" 
                  size="icon" 
                  className="rounded-full h-8 w-8 bg-primary hover:bg-primary/90 text-white shadow-md"
                  onClick={() => {
                    // This creates a manual trigger for playing audio
                    console.log("Manual audio trigger clicked");
                    // The hidden AudioPlayer below will handle this
                    const event = new CustomEvent('play-teacher-audio', {
                      detail: { message: teacherMessage }
                    });
                    window.dispatchEvent(event);
                    
                    // Show a toast to inform user
                    toast({
                      title: "Reproduciendo audio",
                      description: "Escucha el mensaje de la profesora"
                    });
                  }}
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              )}
              
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
            
            <div className="flex flex-col items-center max-w-2xl mx-auto">
              <div className={cn(
                "rounded-full p-6 transition-all duration-100 mb-4 relative",
                isSpeaking ? "bg-gradient-to-r from-blue-200 to-cyan-200" : ""
              )} style={{
                transform: isSpeaking ? `scale(${1 + speakingIntensity * 0.01})` : 'scale(1)'
              }}>
                <Avatar className="w-32 h-32 md:w-40 md:h-40">
                  <AvatarImage src={teacherAvatarUrl} alt="Teacher" />
                  <AvatarFallback>👩‍🏫</AvatarFallback>
                </Avatar>
                
                {/* Large play button overlay */}
                {teacherMessage && !isSpeaking && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center cursor-pointer"
                    onClick={() => {
                      console.log("Avatar play trigger clicked");
                      const event = new CustomEvent('play-teacher-audio', {
                        detail: { message: teacherMessage }
                      });
                      window.dispatchEvent(event);
                    }}
                  >
                    <div className="bg-primary/90 text-white rounded-full p-4 shadow-lg hover:bg-primary transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Word highlighting during speech - show even with blank currentWord */}
              <div className="min-h-[60px] flex items-center justify-center">
                {currentWord && isSpeaking ? (
                  <Badge variant="secondary" className="text-xl px-6 py-3 bg-primary/90 text-white shadow-md animate-pulse">
                    {currentWord}
                  </Badge>
                ) : isSpeaking ? (
                  <Badge variant="secondary" className="text-xl px-6 py-3 bg-primary/90 text-white shadow-md opacity-50">
                    ...
                  </Badge>
                ) : null}
              </div>
              
              {!isSpeaking && teacherMessage ? (
                <div className="text-center mt-4 max-w-md px-4">
                  <p className="text-lg">{teacherMessage}</p>
                  
                  {/* Add manual play button */}
                  <div className="mt-4 flex justify-center">
                    <Button 
                      variant="default" 
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 animate-pulse"
                      onClick={() => {
                        // Create and play audio manually
                        if (teacherMessage) {
                          console.log("Playing teacher message manually via button click");
                          // Dispatch a custom event to request audio playback
                          const playbackEvent = new CustomEvent('request-audio-playback', {
                            detail: { text: teacherMessage }
                          });
                          window.dispatchEvent(playbackEvent);
                          
                          // Also trigger the hidden player
                          const hiddenPlayer = document.getElementById('hidden-audio-player') as HTMLAudioElement;
                          if (hiddenPlayer) {
                            hiddenPlayer.play().catch(e => console.error("Error playing hidden audio:", e));
                          }
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                      Play Audio Message
                    </Button>
                  </div>
                  
                  {/* Add direct audio player for teacher's messages (hidden but always present) */}
                  <div className="mt-2 hidden">
                    <DirectAudioPlayer 
                      text={teacherMessage}
                      voice="nova"
                      autoPlay={false}
                      id="visible-audio-player" // Add ID for direct access 
                      onStart={() => console.log("Teacher audio started playing from visible player")}
                      onEnd={() => console.log("Teacher audio finished playing from visible player")}
                      onWordChange={(word) => {
                        console.log("Word changed in visible player:", word);
                        // Dispatch word change event
                        const wordEvent = new CustomEvent('word-changed', {
                          detail: { word }
                        });
                        window.dispatchEvent(wordEvent);
                      }}
                    />
                  </div>
                </div>
              ) : null}
              
              {/* Always include a backup DirectAudioPlayer with an ID for direct access */}
              {teacherMessage && (
                <div className="hidden">
                  <DirectAudioPlayer 
                    text={teacherMessage}
                    voice="nova"
                    autoPlay={false}
                    id="hidden-audio-player" // Add ID for direct access
                    onStart={() => {
                      console.log("Teacher audio started playing from hidden player");
                    }}
                    onEnd={() => {
                      console.log("Teacher audio finished playing from hidden player");
                    }}
                    onWordChange={(word) => {
                      console.log("Word changed in hidden player:", word);
                      // Dispatch word change event
                      const wordEvent = new CustomEvent('word-changed', {
                        detail: { word }
                      });
                      window.dispatchEvent(wordEvent);
                    }}
                  />
                </div>
              )}
              
              {/* Add SimplePlayer as a last resort solution */}
              {teacherMessage && (
                <div className="mt-4 text-center">
                  <h3 className="text-lg font-medium mb-2">¿Problemas con el audio?</h3>
                  <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                    <SimplePlayer 
                      text={teacherMessage} 
                      voice="nova"
                      id="simple-audio-player"
                      onWordChange={(word) => {
                        console.log("[VideoCallInterface] Word changed in SimplePlayer:", word);
                        // Dispatch word change event to ensure parent components are notified
                        const wordEvent = new CustomEvent('word-changed', {
                          detail: { word }
                        });
                        window.dispatchEvent(wordEvent);
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Haz clic en el botón para escuchar el mensaje
                  </p>
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
                
                {isProcessing ? (
                  <Badge variant="outline" className="text-base px-4 py-2 max-w-[200px] md:max-w-[300px] animate-pulse">
                    Procesando audio...
                  </Badge>
                ) : isRecording || externalIsRecording ? (
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline" className="text-base px-4 py-2 max-w-[200px] md:max-w-[300px] text-primary animate-pulse">
                      Escuchando...
                    </Badge>
                    {/* Show live transcription when available */}
                    {(userRecordedText || recordedText) && (
                      <Badge variant="secondary" className="text-sm px-4 py-1 max-w-[200px] md:max-w-[300px]">
                        {userRecordedText || recordedText}
                      </Badge>
                    )}
                  </div>
                ) : recordedText ? (
                  <Badge variant="outline" className="text-base px-4 py-2 max-w-[200px] md:max-w-[300px] truncate">
                    {recordedText}
                  </Badge>
                ) : null}
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
                  disabled={isProcessing}
                  className="h-10 w-10 rounded-full"
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </Button>
                
                <Button 
                  variant={isVideoEnabled ? "default" : "outline"}
                  size="icon"
                  onClick={toggleVideo}
                  className="h-10 w-10 rounded-full"
                >
                  {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>
                
                <Popover open={showSettings} onOpenChange={setShowSettings}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full"
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none">Speech Recognition</h4>
                        <p className="text-sm text-muted-foreground">
                          Configure speech recognition settings
                        </p>
                      </div>
                      <div className="grid gap-2">
                        <div className="grid grid-cols-3 items-center gap-4">
                          <label htmlFor="recognition-mode" className="text-sm">
                            Recognition Mode
                          </label>
                          <Select 
                            value={recognitionMode} 
                            onValueChange={(value: 'browser' | 'openai') => {
                              setRecognitionMode(value);
                              toast({
                                title: `Using ${value === 'openai' ? 'OpenAI Whisper' : 'Browser'} recognition`,
                                description: value === 'openai' 
                                  ? "Higher accuracy with punctuation support"
                                  : "Real-time feedback but less accurate",
                              });
                            }}
                          >
                            <SelectTrigger className="col-span-2 h-8">
                              <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="openai">OpenAI Whisper (Accurate)</SelectItem>
                              <SelectItem value="browser">Browser API (Real-time)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="grid grid-cols-3 items-center gap-4 pt-2">
                          <label htmlFor="auto-listen" className="text-sm">
                            Auto-Listen
                          </label>
                          <div className="col-span-2 flex items-center">
                            <div className="mr-2">
                              <Button
                                variant={autoListenAfterTeacher ? "default" : "outline"}
                                size="sm"
                                onClick={() => setAutoListenAfterTeacher(true)}
                              >
                                On
                              </Button>
                            </div>
                            <Button
                              variant={!autoListenAfterTeacher ? "default" : "outline"}
                              size="sm"
                              onClick={() => setAutoListenAfterTeacher(false)}
                            >
                              Off
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-xs text-muted-foreground mt-1">
                          {autoListenAfterTeacher ? 
                            "Microphone will automatically activate after teacher speaks" : 
                            "You'll need to manually activate the microphone"
                          }
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {/* Thinking time control */}
            <div className="mt-4 max-w-xs mx-auto">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Thinking time</span>
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