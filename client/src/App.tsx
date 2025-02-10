import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/navigation";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import AuthPage from "@/pages/auth-page";
import Home from "@/pages/home";
import Practice from "@/pages/practice";
import Settings from "@/pages/settings";
import Progress from "@/pages/progress";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Root redirects to auth */}
      <Route path="/">
        <Redirect to="/auth" />
      </Route>

      {/* Authentication page */}
      <Route path="/auth" component={AuthPage} />

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