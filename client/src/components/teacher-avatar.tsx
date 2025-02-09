import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface TeacherAvatarProps {
  className?: string;
  speaking?: boolean;
}

export function TeacherAvatar({ className, speaking }: TeacherAvatarProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className={cn(
        "rounded-full p-1 transition-all duration-300",
        speaking && "animate-pulse bg-gradient-to-r from-blue-500 to-cyan-500"
      )}>
        <Avatar className={cn(
          "h-64 w-64 transition-transform duration-200",
          speaking && "scale-[1.02]"
        )}>
          <AvatarImage src="https://api.dicebear.com/7.x/personas/svg?seed=teacher" />
          <AvatarFallback>👩‍🏫</AvatarFallback>
        </Avatar>
      </div>
      <span className="text-xl font-medium text-foreground">Profesora Ana</span>
      <p className="text-sm text-muted-foreground max-w-xs text-center">
        Native Colombian Spanish teacher, ready to help you practice!
      </p>
    </div>
  );
}