import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface TeacherAvatarProps {
  className?: string;
  speaking?: boolean;
  intensity?: number;
  hideText?: boolean;
}

export function TeacherAvatar({ className, speaking, intensity = 0, hideText = false }: TeacherAvatarProps) {
  const avatar = (
    <div className={cn(
      "rounded-full p-4 transition-all duration-100",
      speaking && "bg-gradient-to-r from-blue-200 to-cyan-200"
    )}
      style={{
        transform: speaking ? `scale(${1 + intensity * 0.01})` : 'scale(1)'
      }}
    >
      <Avatar className={cn(
        "w-full h-full",
        className
      )}>
        <AvatarImage src="https://api.dicebear.com/7.x/personas/svg?seed=teacher&backgroundColor=transparent" />
        <AvatarFallback>👩‍🏫</AvatarFallback>
      </Avatar>
    </div>
  );

  if (hideText) {
    return avatar;
  }

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {avatar}
      <div className="text-center mt-4">
        <p className="text-sm text-muted-foreground">
          Native Colombian Spanish teacher
        </p>
      </div>
    </div>
  );
}