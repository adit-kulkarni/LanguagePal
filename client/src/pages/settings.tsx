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
      grammarTenses: ["simple present"],
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
                  Select the grammar tenses you're comfortable with
                </FormDescription>
                <div className="grid gap-4 pt-2">
                  {grammarTenses.map((tense) => (
                    <FormField
                      key={tense}
                      control={form.control}
                      name="grammarTenses"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(tense)}
                              onCheckedChange={(checked) => {
                                const value = field.value || [];
                                if (checked) {
                                  field.onChange([...value, tense]);
                                } else {
                                  field.onChange(value.filter((v) => v !== tense));
                                }
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {tense}
                          </FormLabel>
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
