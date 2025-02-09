import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

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

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Learning Settings</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="grammarTenses"
            render={() => (
              <FormItem>
                <FormLabel>Grammar Tenses</FormLabel>
                <FormDescription>
                  Select the grammar tenses you want to practice. Hover over each tense to see examples.
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
                          <div className="grid gap-1.5">
                            <HoverCard openDelay={200}>
                              <HoverCardTrigger asChild>
                                <FormLabel className="font-normal hover:cursor-help">
                                  {tense.name}
                                </FormLabel>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-80">
                                <div className="space-y-2">
                                  <p className="text-sm font-semibold">{tense.description}</p>
                                  <div className="text-sm">
                                    <p className="font-medium text-primary">{tense.example}</p>
                                    <p className="text-muted-foreground">{tense.translation}</p>
                                  </div>
                                </div>
                              </HoverCardContent>
                            </HoverCard>
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
    </div>
  );
}