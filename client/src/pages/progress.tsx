import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy } from "lucide-react";

export default function ProgressPage() {
  const { data: user } = useQuery({
    queryKey: ["/api/users/1"],
  });

  if (!user) return null;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Your Progress</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <CardTitle>CEFR Level: {user.progress.cefr}</CardTitle>
          </div>
          <CardDescription>
            Common European Framework of Reference for Languages
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Grammar</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={user.progress.grammar} className="h-2" />
            <p className="mt-2 text-sm text-muted-foreground">
              {user.progress.grammar}% mastery
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vocabulary</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={user.progress.vocabulary} className="h-2" />
            <p className="mt-2 text-sm text-muted-foreground">
              {user.progress.vocabulary}% mastery
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Speaking</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={user.progress.speaking} className="h-2" />
            <p className="mt-2 text-sm text-muted-foreground">
              {user.progress.speaking}% fluency
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
