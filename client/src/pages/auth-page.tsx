import * as React from "react";
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"; // Added import for Avatar components

import { Loader2 } from "lucide-react";
import { SiGoogle } from "react-icons/si";

const teacherAvatars = [
  "maria", // Colombian teacher
  "juan",  // Spanish instructor
  "sofia", // Latin American tutor
  "carlos", // Mexican educator
  "ana"    // Original teacher
];

const FallingAvatar = ({ 
  delay, 
  column,
  seed,
  index,
  offsetX
}: { 
  delay: number; 
  column: number; 
  seed: string;
  index: number;
  offsetX: number;
}) => (
  <div
    className="absolute animate-fall"
    style={{
      left: `calc(${column * 25}% + ${offsetX}px)`,
      animationDelay: `${delay}s`,
      top: `${index * -100}px`, // Reduced from -150px to -100px for smaller gaps
      opacity: 0.15,
      pointerEvents: 'none',
      zIndex: -1
    }}
  >
    <Avatar className="w-24 h-24"> {/* Doubled from w-12 h-12 */}
      <AvatarImage src={`https://api.dicebear.com/7.x/personas/svg?seed=${seed}&backgroundColor=transparent`} />
      <AvatarFallback>👩‍🏫</AvatarFallback>
    </Avatar>
  </div>
);

const authSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AuthFormData = z.infer<typeof authSchema>;


export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading, signIn, signUp, signInWithGoogle } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fallingAvatars, setFallingAvatars] = useState<Array<{
    id: number;
    delay: number;
    column: number;
    seed: string;
    index: number;
    offsetX: number;
  }>>([]);

  // Initialize falling avatars in columns with staggered delays
  useEffect(() => {
    const columns = 4;
    const avatarsPerColumn = 3;
    const avatars = [];
    const baseDelay = 2; // Base delay between avatars
    const columnDelay = 0.5; // Additional delay between columns

    for (let col = 0; col < columns; col++) {
      for (let i = 0; i < avatarsPerColumn; i++) {
        avatars.push({
          id: col * avatarsPerColumn + i,
          delay: (i * baseDelay) + (col * columnDelay) + Math.random(), // Add randomness to delay
          column: col,
          seed: teacherAvatars[Math.floor(Math.random() * teacherAvatars.length)],
          index: i,
          offsetX: Math.floor(Math.random() * 50) - 25 // Random offset between -25px and 25px
        });
      }
    }
    setFallingAvatars(avatars);
  }, []);

  // Form and auth logic
  const loginForm = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hashParams.get("access_token");
    if (accessToken) {
      setLocation("/home");
    }
  }, [setLocation]);

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/home");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Falling Avatars Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {fallingAvatars.map((fa) => (
          <FallingAvatar
            key={fa.id}
            delay={fa.delay}
            column={fa.column}
            seed={fa.seed}
            index={fa.index}
            offsetX={fa.offsetX}
          />
        ))}
      </div>

      <style jsx global>{`
        @keyframes fall {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(calc(100vh + 100px));
          }
        }
        .animate-fall {
          animation: fall 10s linear infinite;
        }
      `}</style>

      <div className="container relative mx-auto grid lg:grid-cols-2 gap-8 min-h-screen items-center py-8">
        {/* Left column - Hero & Demo */}
        <div className="space-y-8 order-2 lg:order-1">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-foreground/90">
              Master Spanish with AI
            </h1>
            <p className="text-xl text-muted-foreground">
              Interactive conversations, instant feedback, and personalized learning with your AI language tutor.
            </p>
          </div>

          {/* Demo Conversation */}
          <Card className="border-primary/20 bg-background/60 backdrop-blur">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start">
                <div className="rounded-lg p-3 bg-primary/10 max-w-[80%]">
                  ¡Hola! ¿Cómo estás hoy?
                </div>
              </div>
              <div className="flex items-start justify-end">
                <div className="rounded-lg p-3 bg-accent/5 max-w-[80%]">
                  Estoy bien, gracias. ¿Y tú?
                </div>
              </div>
              <div className="flex items-start">
                <div className="rounded-lg p-3 bg-primary/10 max-w-[80%]">
                  ¡Muy bien! ¿Quieres practicar el vocabulario de comida?
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Auth Forms */}
        <div className="lg:order-2">
          <Card className="w-full max-w-md mx-auto backdrop-blur bg-background/80">
            <CardHeader>
              <CardTitle>Welcome to Spanish Learning</CardTitle>
              <CardDescription>
                Log in or create an account to start learning Spanish
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form
                      onSubmit={loginForm.handleSubmit(async (data) => {
                        setIsSubmitting(true);
                        try {
                          await signIn(data.email, data.password);
                        } finally {
                          setIsSubmitting(false);
                        }
                      })}
                      className="space-y-4"
                    >
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="email@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="••••••"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Signing in..." : "Sign in"}
                      </Button>
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background/80 px-2 text-muted-foreground">Or continue with</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => signInWithGoogle()}
                        disabled={isSubmitting}
                      >
                        <SiGoogle className="mr-2 h-4 w-4" />
                        Sign in with Google
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="register">
                  <Form {...registerForm}>
                    <form
                      onSubmit={registerForm.handleSubmit(async (data) => {
                        setIsSubmitting(true);
                        try {
                          await signUp(data.email, data.password);
                        } finally {
                          setIsSubmitting(false);
                        }
                      })}
                      className="space-y-4"
                    >
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="email@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="••••••"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Creating account..." : "Create account"}
                      </Button>
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background/80 px-2 text-muted-foreground">Or continue with</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => signInWithGoogle()}
                        disabled={isSubmitting}
                      >
                        <SiGoogle className="mr-2 h-4 w-4" />
                        Sign in with Google
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}