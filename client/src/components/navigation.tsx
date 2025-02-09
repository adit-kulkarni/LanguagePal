import { Link, useRoute } from "wouter";
import { cn } from "@/lib/utils";
import { Home, MessageSquare, Settings, ChartBar } from "lucide-react";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/practice", icon: MessageSquare, label: "Practice" },
  { href: "/progress", icon: ChartBar, label: "Progress" },
  { href: "/settings", icon: Settings, label: "Settings" }
];

export function Navigation() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t p-2 md:relative md:border-r md:h-screen">
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
    </nav>
  );
}
