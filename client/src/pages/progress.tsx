import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import * as Progress from "@/components/ui/progress";
import { Trophy } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import React from "react";

interface UserProgress {
  cefr: string;
  grammar: number;
  vocabulary: number;
  speaking: number;
}

interface User {
  id: number;
  email: string;
  progress: UserProgress;
}

interface Mistake {
  type: "punctuation" | "grammar" | "vocabulary";
  original: string;
  correction: string;
  explanation: string;
  explanation_es: string;
}

interface CorrectionHistoryItem {
  sessionId: number;
  sessionContext: string;
  timestamp: string;
  mistakes: Mistake[];
  userMessage?: string;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <Progress.Root>
      <Progress.Indicator
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </Progress.Root>
  );
}

export default function ProgressPage() {
  const { data: user, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: ["/api/users/1"],
  });

  const { data: correctionsHistory, isLoading: isLoadingHistory } = useQuery<CorrectionHistoryItem[]>({
    queryKey: ["/api/users/1/corrections-history"],
  });

  // Group corrections by date
  const groupedCorrections = React.useMemo(() => {
    if (!correctionsHistory) return {};

    return correctionsHistory.reduce((acc: Record<string, CorrectionHistoryItem[]>, item) => {
      const date = format(new Date(item.timestamp), 'MMM d, yyyy');
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {});
  }, [correctionsHistory]);

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading progress data...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-bold">Your Progress</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <CardTitle>CEFR Level: {user.progress?.cefr || 'A1'}</CardTitle>
          </div>
          <CardDescription>
            Common European Framework of Reference for Languages
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Grammar</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressBar value={user.progress?.grammar || 0} />
            <p className="mt-2 text-sm text-muted-foreground">
              {user.progress?.grammar || 0}% mastery
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vocabulary</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressBar value={user.progress?.vocabulary || 0} />
            <p className="mt-2 text-sm text-muted-foreground">
              {user.progress?.vocabulary || 0}% mastery
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Speaking</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressBar value={user.progress?.speaking || 0} />
            <p className="mt-2 text-sm text-muted-foreground">
              {user.progress?.speaking || 0}% fluency
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Correction History</CardTitle>
          <CardDescription>
            Review your past corrections to track your progress and common mistakes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground">Loading corrections...</div>
              </div>
            ) : !correctionsHistory?.length ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground">No corrections yet. Start practicing to see your progress!</div>
              </div>
            ) : (
              <Accordion type="single" collapsible>
                {Object.entries(groupedCorrections).map(([date, items]) => (
                  <AccordionItem key={date} value={date}>
                    <AccordionTrigger className="text-sm">
                      {date} ({items.length} corrections)
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        {items.map((item, idx) => (
                          <Card key={idx} className="bg-accent/5">
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>Context: {item.sessionContext}</span>
                                <span>•</span>
                                <span>{format(new Date(item.timestamp), 'h:mm a')}</span>
                              </div>

                              {item.userMessage && (
                                <div className="text-sm font-mono bg-muted/50 p-2 rounded">
                                  {item.userMessage}
                                </div>
                              )}

                              <div className="space-y-2">
                                {item.mistakes.map((mistake, mIdx) => (
                                  <div key={mIdx} className="space-y-1">
                                    <Badge variant="outline" className="text-xs">
                                      {mistake.type.charAt(0).toUpperCase() + mistake.type.slice(1)}
                                    </Badge>
                                    <div className="flex items-center gap-2 text-sm font-mono">
                                      <span className="bg-red-50 px-1.5 py-0.5 rounded">
                                        {mistake.original}
                                      </span>
                                      <span className="text-gray-500">→</span>
                                      <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                                        {mistake.correction}
                                      </span>
                                    </div>
                                    <p className="text-sm text-blue-600">{mistake.explanation_es}</p>
                                    <p className="text-sm text-gray-600">{mistake.explanation}</p>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}