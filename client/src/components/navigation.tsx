import { Link, useRoute } from "wouter";
import { cn } from "@/lib/utils";
import { Home, MessageSquare, Settings, ChartBar, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import React from 'react';

const navItems = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/practice", icon: MessageSquare, label: "Practice" },
  { href: "/progress", icon: ChartBar, label: "Progress" },
  { href: "/settings", icon: Settings, label: "Settings" }
];

export function Navigation() {
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t p-2 md:relative md:border-r md:h-screen md:flex md:flex-col">
      <div className="flex justify-around md:flex-col md:gap-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const [isActive] = useRoute(href);

          return (
            <Link 
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg hover:bg-accent",
                isActive && "bg-accent text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Logout button */}
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="hidden md:flex items-center gap-2 p-2 rounded-lg hover:bg-destructive hover:text-destructive-foreground mt-auto mx-2 mb-2"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden md:inline">
          {isLoggingOut ? "Logging out..." : "Logout"}
        </span>
      </button>

      {/* Mobile logout button */}
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="md:hidden flex items-center justify-center p-2 rounded-lg hover:bg-destructive hover:text-destructive-foreground"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </nav>
  );
}