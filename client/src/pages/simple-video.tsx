import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TeacherAvatar } from "@/components/teacher-avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// Simple video call interface component
const SimpleVideoCall: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [speakingIntensity, setSpeakingIntensity] = React.useState(0);
  const [teacherMessage, setTeacherMessage] = React.useState("¡Hola! ¿Cómo estás hoy?");
  const [userInput, setUserInput] = React.useState("");
  
  // Simple speak function using browser's built-in speech synthesis
  const speak = () => {
    if (isSpeaking) return;
    
    setIsSpeaking(true);
    setSpeakingIntensity(1);
    
    // Animation interval
    const animationInterval = setInterval(() => {
      setSpeakingIntensity(prev => Math.max(0, prev - 0.1));
    }, 100);
    
    // Create speech utterance
    const utterance = new SpeechSynthesisUtterance(teacherMessage);
    utterance.lang = 'es-ES'; // Spanish
    utterance.rate = 0.9;     // Slightly slower
    
    // Handle speech end
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingIntensity(0);
      clearInterval(animationInterval);
      console.log("Speech ended");
    };
    
    // Error handling
    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      setIsSpeaking(false);
      setSpeakingIntensity(0);
      clearInterval(animationInterval);
    };
    
    // Start speaking
    window.speechSynthesis.speak(utterance);
    
    // Fallback timeout
    setTimeout(() => {
      if (isSpeaking) {
        setIsSpeaking(false);
        setSpeakingIntensity(0);
        clearInterval(animationInterval);
      }
    }, 10000);
  };
  
  // Handle user response submission
  const handleSubmit = () => {
    if (!userInput.trim()) return;
    
    // Simple response logic
    const response = `Gracias por decir: "${userInput}"`;
    setTeacherMessage(response);
    setUserInput("");
    
    // Auto-speak response after a short delay
    setTimeout(() => {
      speak();
    }, 500);
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <h1 className="text-2xl font-bold mb-4">Simple Video Call Test</h1>
      <p className="text-muted-foreground mb-6">Testing the video call interface in isolation</p>
      
      <Button 
        onClick={() => setIsOpen(true)}
        className="mb-4"
      >
        Open Video Call
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0">
          {/* Split-screen video call layout */}
          <div className="grid grid-rows-2 md:grid-rows-1 md:grid-cols-2 h-full">
            {/* Teacher's video area */}
            <div className="bg-accent/10 flex flex-col items-center justify-center p-4 relative">
              <TeacherAvatar 
                className="w-32 h-32"
                speaking={isSpeaking}
                intensity={speakingIntensity}
              />
              
              <div className="absolute bottom-4 left-0 right-0 px-4">
                <Card className="bg-background/80 backdrop-blur-sm">
                  <CardContent className="p-3">
                    <p className="text-center">{teacherMessage}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* User's video area */}
            <div className="bg-accent/5 flex flex-col items-center justify-center p-4 relative">
              <div className="rounded-full w-32 h-32 bg-muted flex items-center justify-center mb-4">
                <span className="text-muted-foreground">You</span>
              </div>
              
              <div className="absolute bottom-4 left-0 right-0 px-4 flex items-center">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="Type your response..."
                  className="flex-1 p-2 rounded-l-md border"
                />
                <Button 
                  onClick={handleSubmit}
                  className="rounded-l-none"
                >
                  Send
                </Button>
              </div>
              
              <div className="absolute bottom-20 left-0 right-0 px-4 flex justify-center gap-4">
                <Button 
                  onClick={speak}
                  disabled={isSpeaking}
                  variant="outline"
                >
                  {isSpeaking ? "Speaking..." : "Hear teacher"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SimpleVideoCall;