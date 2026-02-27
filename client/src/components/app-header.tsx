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
import { LogOut, CreditCard, LayoutDashboard, ChevronDown } from "lucide-react";
import { LeafLogo } from "@/components/leaf-logo";
import { useLocation, Link } from "wouter";

interface AppHeaderProps {
  showBackButton?: boolean;
  backTo?: string;
  backLabel?: string;
  rightContent?: React.ReactNode;
}

export function AppHeader({ showBackButton, backTo, backLabel, rightContent }: AppHeaderProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/95 border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link 
          href="/" 
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          data-testid="link-home"
        >
          <LeafLogo size={28} />
          <span className="font-serif text-xl font-semibold text-primary">Leaf</span>
        </Link>

        <div className="flex items-center gap-3">
          {rightContent}
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
                <DropdownMenuItem onClick={() => setLocation("/")} data-testid="menu-dashboard">
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
  );
}
