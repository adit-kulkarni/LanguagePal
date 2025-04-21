import React from 'react';
import { Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

// Create QueryClient
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
          <Navigation />
          
          <main className="flex-1 md:pl-16 pb-16 md:pb-0 relative">
            <Switch>
              <Route path="/" exact>
                <AuthPage />
              </Route>
              
              <Route path="/auth/callback">
                <AuthCallback />
              </Route>
              
              <ProtectedRoute path="/home">
                <Home />
              </ProtectedRoute>
              
              <ProtectedRoute path="/practice">
                <Practice />
              </ProtectedRoute>
              
              <ProtectedRoute path="/progress">
                <Progress />
              </ProtectedRoute>
              
              <ProtectedRoute path="/settings">
                <Settings />
              </ProtectedRoute>
              
              <Route>
                <NotFound />
              </Route>
            </Switch>
          </main>
          
          <Toaster />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;