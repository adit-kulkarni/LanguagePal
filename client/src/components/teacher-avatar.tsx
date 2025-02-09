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
        "rounded-full p-1 transition-all duration-700",
        speaking && "bg-gradient-to-r from-blue-200 to-cyan-200 animate-[pulse_2s_ease-in-out_infinite]"
      )}>
        <Avatar className={cn(
          "h-64 w-64 transition-transform duration-700",
          speaking && "scale-[1.01]"
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