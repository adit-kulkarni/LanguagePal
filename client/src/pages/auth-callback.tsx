import { useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse hash fragment or query parameters
        const params = new URLSearchParams(window.location.hash.substring(1) || window.location.search);
        const error = params.get("error");
        const errorDescription = params.get("error_description");
        const type = params.get("type"); // Can be "signup" or "recovery"

        if (error) {
          throw new Error(errorDescription || error);
        }

        // Get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session) {
          throw new Error("No session found. Please try signing in again.");
        }

        // Show appropriate success message based on the type
        if (type === "signup") {
          toast({
            title: "Email verified successfully",
            description: "Your email has been verified. You can now use all features of the app.",
          });
        } else {
          toast({
            title: "Authentication successful",
            description: "You have been logged in successfully.",
          });
        }

        // Redirect to home on success
        setLocation("/home");
      } catch (error) {
        console.error("Error in auth callback:", error);
        toast({
          title: "Authentication failed",
          description: (error as Error).message,
          variant: "destructive",
        });
        setLocation("/auth");
      }
    };

    handleCallback();
  }, [setLocation, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-border" />
    </div>
  );
}