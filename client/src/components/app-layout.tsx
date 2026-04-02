import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
  ChevronDown,
  Sprout,
  TreePine,
  Award,
  Download,
  Shield,
} from "lucide-react";
import { LeafLogo } from "@/components/leaf-logo";
import { useLocation } from "wouter";
import type { LucideIcon } from "lucide-react";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";
import { useToast } from "@/hooks/use-toast";

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { label: "Today", path: "/dashboard", icon: Sprout },
  { label: "Plan", path: "/plan", icon: TreePine },
  { label: "Proof", path: "/journal", icon: Award },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const { safeNavigate } = useUnsavedGuard();
  const { toast } = useToast();
  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
    enabled: isAuthenticated,
    retry: false,
    staleTime: Infinity,
  });
  const showAdminLink = adminCheck?.isAdmin === true;

  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!isStandalone) {
        setShowInstallBanner(true);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

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
        <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <button
            onClick={() => safeNavigate("/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            data-testid="link-home-logo"
          >
            <LeafLogo size={20} />
            <span className="text-sm font-medium hidden sm:inline text-primary">Leaf</span>
          </button>

          <nav className="hidden md:flex items-center gap-1" data-testid="desktop-nav">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => safeNavigate(item.path)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                    active
                      ? "text-primary bg-primary/[0.08]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`nav-link-${item.label.toLowerCase()}`}
                >
                  <Icon className="h-3.5 w-3.5" />
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
                    <Avatar className="h-7 w-7">
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
                  {showAdminLink && (
                    <DropdownMenuItem onClick={() => safeNavigate("/admin")} data-testid="menu-admin">
                      <Shield className="h-4 w-4 mr-2" />
                      Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={async () => {
                    try {
                      const response = await fetch("/api/export-all", { credentials: "include" });
                      if (!response.ok) {
                        toast({ title: "Export failed", description: "Please try again.", variant: "destructive" });
                        return;
                      }
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `the-leaf-export-${new Date().toISOString().split("T")[0]}.md`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    } catch {
                      toast({ title: "Export failed", description: "Please try again.", variant: "destructive" });
                    }
                  }} data-testid="menu-export">
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
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

      {showInstallBanner && (
        <div className="bg-bark/5 border-b border-bark/20 px-4 py-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Add Leaf to your home screen for the best experience</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowInstallBanner(false)} className="text-[10px] h-6 px-2">
              Dismiss
            </Button>
            <Button size="sm" onClick={handleInstall} className="text-[10px] h-6 px-2">
              Install
            </Button>
          </div>
        </div>
      )}

      <main className="flex-1 pb-16 md:pb-0" data-testid="main-content">
        {children}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden"
        data-testid="mobile-bottom-nav"
      >
        <div className="flex items-center justify-around h-[52px]">
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
