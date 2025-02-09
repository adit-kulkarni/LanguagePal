import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import * as React from "react";
import { Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = `/api/users/${userId}/sessions`;

  const { data: sessions } = useQuery<ConversationSession[]>({
    queryKey: [queryKey],
  });

  const handleDelete = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent session selection when clicking delete

    try {
      await apiRequest("DELETE", `/api/sessions/${sessionId}`);

      // Update the cached sessions list
      queryClient.setQueryData([queryKey], (oldData: ConversationSession[] | undefined) => 
        oldData?.filter(session => session.id !== sessionId)
      );

      toast({
        title: "Conversation deleted",
        description: "The conversation has been removed from your history."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete conversation"
      });
    }
  };

  if (!sessions) return null;

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-2">
        {sessions.map((session) => (
          <Button
            key={session.id}
            variant="ghost"
            className={cn(
              "w-full justify-start text-left h-auto py-3 group",
              session.id === currentSessionId && "bg-accent"
            )}
            onClick={() => onSelectSession(session)}
          >
            <div className="space-y-1 flex-1">
              <div className="font-medium line-clamp-1 flex items-center justify-between">
                <span>{session.title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity -mr-2"
                  onClick={(e) => handleDelete(session.id, e)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
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