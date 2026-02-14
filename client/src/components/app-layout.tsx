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
  Compass,
  LogOut,
  CreditCard,
  ChevronDown,
  LayoutDashboard,
  GraduationCap,
  MessageSquare,
  Target,
  BookOpen,
  Wrench,
  Calendar,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface NavGroup {
  groupLabel: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    groupLabel: "Action",
    items: [
      { label: "Plan", path: "/plan", icon: Target },
      { label: "Journal Calendar", path: "/journal", icon: Calendar },
      { label: "Today", path: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    groupLabel: "Learning",
    items: [
      { label: "Learn", path: "/learn", icon: GraduationCap },
      { label: "Coach", path: "/coach", icon: MessageSquare },
      { label: "Tools", path: "/tools", icon: Wrench },
    ],
  },
];

const allNavItems = navGroups.flatMap(g => g.items);

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

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
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            data-testid="link-home-logo"
          >
            <Compass className="h-7 w-7 text-primary" />
            <span className="font-serif text-xl font-semibold">Inner Journey</span>
          </Link>

          <nav className="hidden md:flex items-center gap-4" data-testid="desktop-nav">
            {navGroups.map((group) => (
              <div key={group.groupLabel} className="flex items-center gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mr-1">{group.groupLabel}</span>
                {group.items.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        active
                          ? "text-primary border-b-2 border-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
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
                  <DropdownMenuItem onClick={() => setLocation("/dashboard")} data-testid="menu-dashboard">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/billing")} data-testid="menu-billing">
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
          {allNavItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
                data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate max-w-[60px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
