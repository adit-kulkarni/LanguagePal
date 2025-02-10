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
      "rounded-full p-1 transition-all duration-100",
      speaking && "bg-gradient-to-r from-blue-200 to-cyan-200"
    )}
      style={{
        transform: speaking ? `scale(${1 + intensity * 0.01})` : 'scale(1)'
      }}
    >
      <Avatar className={cn("transition-transform duration-100", className)}>
        <AvatarImage src="https://api.dicebear.com/7.x/personas/svg?seed=teacher&backgroundColor=transparent" />
        <AvatarFallback>👩‍🏫</AvatarFallback>
      </Avatar>
    </div>
  );

  if (hideText) {
    return avatar;
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {avatar}
      <span className="text-xl font-medium text-foreground">Profesora Ana</span>
      <p className="text-sm text-muted-foreground max-w-xs text-center">
        Native Colombian Spanish teacher, ready to help you practice!
      </p>
    </div>
  );
}