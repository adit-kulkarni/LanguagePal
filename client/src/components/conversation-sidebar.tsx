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
      <div className="py-1 space-y-0.5">
        {sessions.length === 0 ? (
          <div className="text-center p-4 text-sm text-muted-foreground">
            No conversations yet
          </div>
        ) : (
          sessions.map((session) => (
            <Button
              key={session.id}
              variant="ghost"
              className={cn(
                "w-full justify-start text-left h-auto px-3 py-2 rounded-none border-l-2 group",
                session.id === currentSessionId ? 
                  "bg-accent border-l-primary" : 
                  "border-l-transparent hover:border-l-muted-foreground/30"
              )}
              onClick={() => onSelectSession(session)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <div className="font-medium text-sm line-clamp-1 flex-1">
                    {session.title}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDelete(session.id, e)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <div className="text-xs text-muted-foreground truncate max-w-[7.5rem]">
                    {session.context}
                  </div>
                  <div className="text-xs text-muted-foreground/80 shrink-0">
                    {format(new Date(session.lastMessageAt), "MMM d")}
                  </div>
                </div>
              </div>
            </Button>
          ))
        )}
      </div>
    </ScrollArea>
  );
}