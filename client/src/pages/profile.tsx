import { AppLayout } from "@/components/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { buildProcessUrl } from "@/hooks/use-return-to";
import { ChevronRight } from "lucide-react";
import type { IdentityDocument, PatternProfile } from "@shared/schema";

export default function ProfilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: identityDoc } = useQuery<IdentityDocument>({
    queryKey: ["/api/identity-document"],
    enabled: !!user,
  });

  const { data: patternProfile } = useQuery<PatternProfile>({
    queryKey: ["/api/pattern-profile"],
    enabled: !!user,
  });

  const identityFilled = !!(identityDoc?.identity?.trim() || identityDoc?.vision?.trim());
  const patternsFilled = !!(patternProfile?.helpingPattern1Condition?.trim() || patternProfile?.hurtingPattern1Condition?.trim());
  const scoreboardFilled = !!(identityDoc?.yearVision?.trim());

  const filledCount = [identityFilled, patternsFilled, scoreboardFilled].filter(Boolean).length;

  const cards = [
    {
      title: "Identity Document",
      subtitle: "Vision, identity, purpose",
      filled: identityFilled,
      path: "/identity",
      testId: "card-nav-identity",
    },
    {
      title: "Pattern Profile",
      subtitle: "Patterns, triggers, blind spots",
      filled: patternsFilled,
      path: "/pattern-profile",
      testId: "card-nav-patterns",
    },
    {
      title: "1-Year Commitment",
      subtitle: "Domain, proof, obstacles, IF-THEN",
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
                    ? "bg-primary"
                    : "border-2 border-muted-foreground/30"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-serif">{card.title}</p>
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
