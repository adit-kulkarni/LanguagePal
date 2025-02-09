import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function TeacherAvatar({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <Avatar className="h-64 w-64">
        <AvatarImage src="https://api.dicebear.com/7.x/personas/svg?seed=teacher" />
        <AvatarFallback>👩‍🏫</AvatarFallback>
      </Avatar>
      <span className="text-xl font-medium text-foreground">Profesora Ana</span>
      <p className="text-sm text-muted-foreground max-w-xs text-center">
        Native Colombian Spanish teacher, ready to help you practice!
      </p>
    </div>
  );
}