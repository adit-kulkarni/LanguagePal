import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/navigation";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import AuthPage from "@/pages/auth-page";
import AuthCallback from "@/pages/auth-callback";
import Home from "@/pages/home";
import Practice from "@/pages/practice";
import SimplePractice from "@/pages/simple-practice";
import SimpleVideoCall from "@/pages/simple-video";
import StablePractice from "@/pages/stable-practice";
import Settings from "@/pages/settings";
import Progress from "@/pages/progress";
import NotFound from "@/pages/not-found";
import TestPage from "@/pages/test-page";
import { useEffect } from "react";

console.log("🔵 App.tsx loaded successfully");
console.log("🔵 Root element:", document.getElementById("root"));

// Development mode testing - modify as needed
const IS_DEV_MODE = true; // Set to true to bypass authentication in development
const SKIP_AUTH = IS_DEV_MODE;

function Router() {
  useEffect(() => {
    console.log("🔵 Router component mounted");
  }, []);

  return (
    <Switch>
      {/* Simplified test pages with no dependencies */}
      <Route path="/test">
        <TestPage />
      </Route>
      
      <Route path="/simple">
        <SimplePractice />
      </Route>
      
      <Route path="/video">
        <SimpleVideoCall />
      </Route>
      
      <Route path="/stable">
        <StablePractice />
      </Route>

      {/* Development direct access routes */}
      {SKIP_AUTH && (
        <Route path="/dev-practice">
          <div className="md:grid md:grid-cols-[auto,1fr]">
            <Navigation />
            <main>
              <Practice />
            </main>
          </div>
        </Route>
      )}

      {/* Root redirects to test page for now */}
      <Route path="/">
        {/* {SKIP_AUTH ? <Redirect to="/dev-practice" /> : <Redirect to="/auth" />} */}
        <Redirect to="/test" />
      </Route>

      {/* Authentication routes */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/callback" component={AuthCallback} />

      {/* Protected routes */}
      <ProtectedRoute path="/home">
        <div className="md:grid md:grid-cols-[auto,1fr]">
          <Navigation />
          <main>
            <Home />
          </main>
        </div>
      </ProtectedRoute>

      <ProtectedRoute path="/practice">
        <div className="md:grid md:grid-cols-[auto,1fr]">
          <Navigation />
          <main>
            <Practice />
          </main>
        </div>
      </ProtectedRoute>

      <ProtectedRoute path="/settings">
        <div className="md:grid md:grid-cols-[auto,1fr]">
          <Navigation />
          <main>
            <Settings />
          </main>
        </div>
      </ProtectedRoute>

      <ProtectedRoute path="/progress">
        <div className="md:grid md:grid-cols-[auto,1fr]">
          <Navigation />
          <main>
            <Progress />
          </main>
        </div>
      </ProtectedRoute>

      {/* 404 page */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    console.log("🔵 App component mounted");
    console.log("🔵 Window location:", window.location.href);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;