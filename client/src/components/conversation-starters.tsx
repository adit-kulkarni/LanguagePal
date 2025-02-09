import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useState } from "react";

const DEFAULT_CONTEXTS = [
  {
    title: "Start a simple conversation",
    description: "Practice basic greetings and small talk",
    context: "casual conversation"
  },
  {
    title: "At a restaurant",
    description: "Order food and interact with waitstaff",
    context: "restaurant ordering"
  },
  {
    title: "Making new friends",
    description: "Meet people and share interests",
    context: "social interaction"
  },
  {
    title: "Shopping",
    description: "Buy clothes and ask about products",
    context: "retail shopping"
  },
  {
    title: "Travel directions",
    description: "Ask for and give directions",
    context: "navigation"
  }
];

interface ConversationStartersProps {
  onSelectContext: (context: string) => void;
}

export function ConversationStarters({ onSelectContext }: ConversationStartersProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customContext, setCustomContext] = useState("");

  const handleCustomContextSubmit = () => {
    if (customContext.trim()) {
      onSelectContext(customContext.trim());
      setCustomContext("");
      setShowCustomInput(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {DEFAULT_CONTEXTS.map((item, index) => (
        <Card
          key={index}
          className="p-4 cursor-pointer hover:bg-accent transition-colors"
          onClick={() => onSelectContext(item.context)}
        >
          <h3 className="font-semibold text-sm line-clamp-1">{item.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
        </Card>
      ))}

      {showCustomInput ? (
        <Card className="p-4">
          <div className="space-y-2">
            <Input
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              placeholder="Enter conversation context..."
              onKeyDown={(e) => e.key === 'Enter' && handleCustomContextSubmit()}
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleCustomContextSubmit}
                disabled={!customContext.trim()}
                className="w-full"
              >
                Start
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCustomInput(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card
          className="p-4 cursor-pointer hover:bg-accent transition-colors flex items-center justify-center gap-2"
          onClick={() => setShowCustomInput(true)}
        >
          <Plus className="w-4 h-4" />
          <span>Custom Context</span>
        </Card>
      )}
    </div>
  );
}