import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function TeacherAvatar({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <Avatar className="h-24 w-24">
        <AvatarImage src="https://api.dicebear.com/7.x/personas/svg?seed=teacher" />
        <AvatarFallback>👩‍🏫</AvatarFallback>
      </Avatar>
      <span className="text-sm text-muted-foreground">Profesora Ana</span>
    </div>
  );
}
