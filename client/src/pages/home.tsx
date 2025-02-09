import { TeacherAvatar } from "@/components/teacher-avatar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-8">
      <TeacherAvatar />
      
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          ¡Bienvenidos a Spanish AI!
        </h1>
        <p className="text-muted-foreground">
          Practice Spanish conversation with your personal AI teacher. 
          Get instant feedback and improve your language skills.
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link href="/practice">
          <Button size="lg" className="w-full">
            Start Practicing
          </Button>
        </Link>
        <Link href="/settings">
          <Button variant="outline" size="lg" className="w-full">
            Customize Learning
          </Button>
        </Link>
      </div>
    </div>
  );
}
