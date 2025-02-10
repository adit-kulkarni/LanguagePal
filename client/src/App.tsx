import { Switch, Route } from "wouter";
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
      <Route path="/auth">
        <AuthPage />
      </Route>
      <Route>
        {/* Default layout with navigation for authenticated routes */}
        <div className="md:grid md:grid-cols-[auto,1fr]">
          <Navigation />
          <main>
            <Switch>
              <ProtectedRoute path="/" component={Home} />
              <ProtectedRoute path="/home" component={Home} />
              <ProtectedRoute path="/practice" component={Practice} />
              <ProtectedRoute path="/settings" component={Settings} />
              <ProtectedRoute path="/progress" component={Progress} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </Route>
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