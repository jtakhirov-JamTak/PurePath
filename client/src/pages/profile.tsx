import { AppLayout } from "@/components/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { buildProcessUrl } from "@/hooks/use-return-to";
import { ChevronRight } from "lucide-react";
import type { IdentityDocument } from "@shared/schema";

export default function ProfilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: identityDoc } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
    enabled: !!user,
  });

  const identityFilled = !!(identityDoc?.identity?.trim() || identityDoc?.vision?.trim());
  const discoveryFilled = !!(identityDoc?.strengths?.trim() || identityDoc?.helpingPatterns?.trim());
  const scoreboardFilled = !!(identityDoc?.yearVision?.trim());

  const filledCount = [identityFilled, discoveryFilled, scoreboardFilled].filter(Boolean).length;

  const cards = [
    {
      title: "Identity Document",
      subtitle: "Vision, identity, purpose",
      filled: identityFilled,
      path: "/identity",
      testId: "card-nav-identity",
    },
    {
      title: "Values Profile",
      subtitle: "Values, strengths, patterns",
      filled: discoveryFilled,
      path: "/discovery-profile",
      testId: "card-nav-discovery",
    },
    {
      title: "1-Year Vision",
      subtitle: "Domain, scene, obstacles, IF-THEN",
      filled: scoreboardFilled,
      path: "/scoreboard",
      testId: "card-nav-scoreboard",
    },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <p className="text-xs text-muted-foreground mb-4">
          {filledCount}/3 complete
        </p>

        <div className="divide-y divide-border">
          {cards.map((card) => (
            <button
              key={card.path}
              className="w-full flex items-center gap-3 py-4 text-left hover:bg-muted/50 transition-colors"
              onClick={() => setLocation(buildProcessUrl(card.path, "/profile"))}
              data-testid={card.testId}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                  card.filled
                    ? "bg-emerald-500"
                    : "border-2 border-muted-foreground/30"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{card.title}</p>
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
