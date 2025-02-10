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
import { TeacherAvatar } from "@/components/teacher-avatar";
import { Loader2, MessageSquare } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import * as React from "react";
import { useState, useEffect } from "react";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AuthFormData = z.infer<typeof authSchema>;

const DemoMessage = ({ content, isTeacher }: { content: string; isTeacher: boolean }) => (
  <div className={`flex items-start gap-3 ${isTeacher ? 'flex-row' : 'flex-row-reverse'}`}>
    {isTeacher ? (
      <TeacherAvatar className="w-8 h-8" />
    ) : (
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <MessageSquare className="w-4 h-4" />
      </div>
    )}
    <div className={`rounded-lg p-3 max-w-[80%] ${isTeacher ? 'bg-primary/10' : 'bg-primary/5'}`}>
      {content}
    </div>
  </div>
);

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading, signIn, signUp, signInWithGoogle } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background to-primary/5">
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 opacity-5">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className={`absolute w-24 h-24`}
              style={{
                transform: `rotate(${Math.random() * 360}deg)`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: 0.1 + Math.random() * 0.2,
              }}
            >
              <TeacherAvatar />
            </div>
          ))}
        </div>
      </div>

      <div className="container mx-auto grid lg:grid-cols-2 gap-8 min-h-screen items-center py-8">
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
            <CardHeader>
              <CardTitle className="text-lg">Example Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DemoMessage
                isTeacher={true}
                content="¡Hola! ¿Cómo estás hoy?"
              />
              <DemoMessage
                isTeacher={false}
                content="Estoy bien, gracias. ¿Y tú?"
              />
              <DemoMessage
                isTeacher={true}
                content="¡Muy bien! ¿Quieres practicar el vocabulario de comida?"
              />
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