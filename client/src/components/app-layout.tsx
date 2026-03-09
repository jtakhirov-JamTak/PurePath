import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  CreditCard,
  ChevronDown,
  Sprout,
  TreePine,
  BookOpen,
  CalendarDays,
} from "lucide-react";
import { LeafLogo } from "@/components/leaf-logo";
import { useLocation, Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { label: "Today", path: "/dashboard", icon: Sprout },
  { label: "Plan", path: "/plan", icon: TreePine },
  { label: "Learn", path: "/learn", icon: BookOpen },
  { label: "Journal", path: "/journal", icon: CalendarDays },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const { safeNavigate } = useUnsavedGuard();

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location === "/" || location === "/dashboard";
    }
    return location.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/95 border-b" data-testid="top-nav">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            onClick={() => safeNavigate("/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            data-testid="link-home-logo"
          >
            <LeafLogo size={28} />
            <span className="font-serif text-xl font-semibold hidden sm:inline text-primary">Leaf</span>
          </button>

          <nav className="hidden md:flex items-center gap-1" data-testid="desktop-nav">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => safeNavigate(item.path)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    active
                      ? "text-primary bg-primary/[0.08]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`nav-link-${item.label.toLowerCase()}`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 pl-2 pr-3" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profileImageUrl || undefined} />
                      <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
                      {user?.firstName || user?.email?.split("@")[0]}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => safeNavigate("/dashboard")} data-testid="menu-dashboard">
                    <Sprout className="h-4 w-4 mr-2" />
                    Today
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => safeNavigate("/billing")} data-testid="menu-billing">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} data-testid="menu-logout">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" asChild data-testid="link-login">
                <a href="/api/login">Sign In</a>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-16 md:pb-0" data-testid="main-content">
        {children}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden"
        data-testid="mobile-bottom-nav"
      >
        <div className="flex items-center justify-around h-[60px]">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => safeNavigate(item.path)}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
                data-testid={`mobile-nav-${item.label.toLowerCase()}`}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate max-w-[60px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
