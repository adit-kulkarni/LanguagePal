import { useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL
        const { error } = await supabase.auth.getSession();
        if (error) throw error;
        
        // Redirect to home on success
        setLocation("/home");
      } catch (error) {
        console.error("Error in auth callback:", error);
        setLocation("/auth");
      }
    };

    handleCallback();
  }, [setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-border" />
    </div>
  );
}
