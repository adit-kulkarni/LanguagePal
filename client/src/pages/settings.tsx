import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { grammarTenses, vocabularySets } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { HelpCircle } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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

const settingsSchema = z.object({
  grammarTenses: z.array(z.string()).min(1, "Select at least one grammar tense"),
  vocabularySets: z.array(z.string()).min(1, "Select at least one vocabulary set")
});

type SettingsData = z.infer<typeof settingsSchema>;

export default function Settings() {
  const { toast } = useToast();

  const form = useForm<SettingsData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      grammarTenses: ["presente (present indicative)"],
      vocabularySets: ["100 most common nouns"]
    }
  });

  const { data: correctionsHistory, isLoading } = useQuery<CorrectionHistoryItem[]>({
    queryKey: ["/api/users/1/corrections-history"],
  });

  const onSubmit = async (data: SettingsData) => {
    try {
      await apiRequest("PATCH", "/api/users/1/settings", data);
      toast({
        title: "Settings updated",
        description: "Your learning preferences have been saved."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update settings"
      });
    }
  };

  // Group corrections by date
  const groupedCorrections = React.useMemo(() => {
    if (!correctionsHistory) return {} as Record<string, CorrectionHistoryItem[]>;

    return correctionsHistory.reduce((acc: Record<string, CorrectionHistoryItem[]>, item) => {
      const date = format(new Date(item.timestamp), 'MMM d, yyyy');
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {});
  }, [correctionsHistory]);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Learning Settings</h1>

      <div className="space-y-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="grammarTenses"
              render={() => (
                <FormItem>
                  <FormLabel>Grammar Tenses</FormLabel>
                  <FormDescription>
                    Select the grammar tenses you want to practice. Click the question mark to see examples.
                  </FormDescription>
                  <div className="grid gap-4 pt-2">
                    {grammarTenses.map((tense) => (
                      <FormField
                        key={tense.name}
                        control={form.control}
                        name="grammarTenses"
                        render={({ field }) => (
                          <FormItem className="flex items-start gap-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(tense.name)}
                                onCheckedChange={(checked) => {
                                  const value = field.value || [];
                                  if (checked) {
                                    field.onChange([...value, tense.name]);
                                  } else {
                                    field.onChange(value.filter((v) => v !== tense.name));
                                  }
                                }}
                              />
                            </FormControl>
                            <div className="flex items-center gap-2">
                              <FormLabel className="font-normal">
                                {tense.name}
                              </FormLabel>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HoverCard openDelay={200}>
                                    <HoverCardTrigger asChild>
                                      <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-80">
                                      <div className="space-y-2">
                                        <p className="text-sm font-semibold">{tense.description}</p>
                                        <div className="text-sm bg-muted/50 p-2 rounded-md">
                                          <p className="font-medium text-primary">{tense.example}</p>
                                          <p className="text-muted-foreground">{tense.translation}</p>
                                        </div>
                                      </div>
                                    </HoverCardContent>
                                  </HoverCard>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Click for example
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vocabularySets"
              render={() => (
                <FormItem>
                  <FormLabel>Vocabulary Sets</FormLabel>
                  <FormDescription>
                    Choose the vocabulary topics you want to focus on
                  </FormDescription>
                  <div className="grid gap-4 pt-2">
                    {vocabularySets.map((set) => (
                      <FormField
                        key={set}
                        control={form.control}
                        name="vocabularySets"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(set)}
                                onCheckedChange={(checked) => {
                                  const value = field.value || [];
                                  if (checked) {
                                    field.onChange([...value, set]);
                                  } else {
                                    field.onChange(value.filter((v) => v !== set));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {set}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit">Save Settings</Button>
          </form>
        </Form>

        <Card>
          <CardHeader>
            <CardTitle>Correction History</CardTitle>
            <CardDescription>
              Review your past corrections to track your progress and common mistakes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {isLoading ? (
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

                                <div className="text-sm font-mono bg-muted/50 p-2 rounded">
                                  {item.userMessage}
                                </div>

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
    </div>
  );
}