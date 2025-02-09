import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Navigation } from "@/components/navigation";
import Home from "@/pages/home";
import Practice from "@/pages/practice";
import Settings from "@/pages/settings";
import Progress from "@/pages/progress";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="md:grid md:grid-cols-[auto,1fr]">
      <Navigation />
      <main>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/practice" component={Practice} />
          <Route path="/settings" component={Settings} />
          <Route path="/progress" component={Progress} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
