import React from 'react';
import { Route, Switch } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import { Navigation } from '@/components/navigation';
import { ProtectedRoute } from '@/lib/protected-route';

// Import pages
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import Practice from '@/pages/practice';
import Progress from '@/pages/progress';
import Settings from '@/pages/settings';
import AuthPage from '@/pages/auth-page';
import AuthCallback from '@/pages/auth-callback';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
        <Navigation />
        
        <main className="flex-1 md:pl-16 pb-16 md:pb-0 relative">
          <Switch>
            {/* Root path renders Practice page directly without auth check */}
            <Route path="/">
              <Practice />
            </Route>
            
            {/* All other routes are also available without auth */}
            <Route path="/home">
              <Home />
            </Route>
            
            <Route path="/practice">
              <Practice />
            </Route>
            
            <Route path="/progress">
              <Progress />
            </Route>
            
            <Route path="/settings">
              <Settings />
            </Route>
            
            <Route>
              <NotFound />
            </Route>
          </Switch>
        </main>
        
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;