import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import * as React from "react";

interface ConversationSession {
  id: number;
  title: string;
  context: string;
  createdAt: string;
  lastMessageAt: string;
}

interface ConversationSidebarProps {
  userId: number;
  currentSessionId?: number;
  onSelectSession: (session: ConversationSession) => void;
}

export function ConversationSidebar({ 
  userId, 
  currentSessionId,
  onSelectSession 
}: ConversationSidebarProps) {
  const { data: sessions } = useQuery<ConversationSession[]>({
    queryKey: [`/api/users/${userId}/sessions`],
  });

  if (!sessions) return null;

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-2">
        {sessions.map((session) => (
          <Button
            key={session.id}
            variant="ghost"
            className={cn(
              "w-full justify-start text-left h-auto py-3",
              session.id === currentSessionId && "bg-accent"
            )}
            onClick={() => onSelectSession(session)}
          >
            <div className="space-y-1">
              <div className="font-medium line-clamp-1">{session.title}</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Context: {session.context}</div>
                <div>
                  {format(new Date(session.lastMessageAt), "MMM d, yyyy h:mm a")}
                </div>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
}