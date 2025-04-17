import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TeacherAvatar } from "@/components/teacher-avatar";

const SimplePractice: React.FC = () => {
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [speakingIntensity, setSpeakingIntensity] = React.useState(0);
  const [message, setMessage] = React.useState("¡Hola! I'm Profesora Ana. Let's practice Spanish!");
  
  // Function to speak text with animation
  const handleSpeakClick = () => {
    if (isSpeaking) return;
    
    setIsSpeaking(true);
    setSpeakingIntensity(1);
    
    // Simulate avatar animation
    const animationInterval = setInterval(() => {
      setSpeakingIntensity(prev => {
        if (prev <= 0.1) {
          return 0;
        }
        return Math.max(0, prev - 0.1);
      });
    }, 100);
    
    // Use browser's built-in speech synthesis
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'es-ES'; // Spanish
    utterance.rate = 0.9;     // Slightly slower for better comprehension
    
    // Stop animation and reset when speech ends
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
    
    // Fallback if speech synthesis doesn't trigger onend
    const maxSpeakingTime = 10000; // 10 seconds max
    setTimeout(() => {
      if (isSpeaking) {
        setIsSpeaking(false);
        setSpeakingIntensity(0);
        clearInterval(animationInterval);
        console.log("Speech timeout - forced end");
      }
    }, maxSpeakingTime);
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <h1 className="text-2xl font-bold mb-4">Simple Practice Page</h1>
      <p className="text-muted-foreground mb-4">This is a simplified version of the practice page.</p>
      
      <div className="flex flex-col items-center mb-6">
        <TeacherAvatar
          className="w-32 h-32"
          speaking={isSpeaking}
          intensity={speakingIntensity}
        />
        <p className="text-center mt-2">Profesora Ana</p>
      </div>
      
      <Card className="max-w-md w-full mb-4">
        <CardContent className="p-4">
          <p className="text-center">{message}</p>
        </CardContent>
      </Card>
      
      <Button onClick={handleSpeakClick} disabled={isSpeaking}>
        {isSpeaking ? "Speaking..." : "Speak message"}
      </Button>
    </div>
  );
};

export default SimplePractice;