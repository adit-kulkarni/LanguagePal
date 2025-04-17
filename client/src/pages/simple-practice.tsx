import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TeacherAvatar } from "@/components/teacher-avatar";

const SimplePractice: React.FC = () => {
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [speakingIntensity, setSpeakingIntensity] = React.useState(0);
  const [message, setMessage] = React.useState("¡Hola! I'm Profesora Ana. Let's practice Spanish!");
  
  // Simple function to simulate speaking animation
  const handleSpeakClick = () => {
    if (isSpeaking) return;
    
    setIsSpeaking(true);
    setSpeakingIntensity(1);
    
    // Simulate avatar animation
    const animationInterval = setInterval(() => {
      setSpeakingIntensity(prev => {
        if (prev <= 0.1) {
          clearInterval(animationInterval);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    
    // Stop speaking after 3 seconds
    setTimeout(() => {
      setIsSpeaking(false);
      setSpeakingIntensity(0);
      clearInterval(animationInterval);
    }, 3000);
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