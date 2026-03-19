import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LeafLogo } from "@/components/leaf-logo";

const SAGE = "#5a8a5c";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontSize: 13 }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background" style={{ borderBottom: "0.5px solid hsl(var(--border))" }}>
        <div className="container mx-auto px-6 flex items-center justify-between h-11">
          <div className="flex items-center gap-1.5">
            <LeafLogo size={20} />
            <span className="font-medium" style={{ color: SAGE }}>Leaf</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild className="text-xs h-7 px-3">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 max-w-2xl">
        {/* Hero */}
        <section className="pt-16 pb-14">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">One session. Real change.</p>
          <h1 className="font-serif text-2xl font-bold mb-3 leading-tight">
            Clarity <span className="text-muted-foreground font-normal mx-1">&rarr;</span> Commitment <span className="text-muted-foreground font-normal mx-1">&rarr;</span> System
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-6 max-w-lg">
            A 3.5-hour live workshop that gives you the tools to understand yourself, choose who to become, and build a daily system you can sustain.
          </p>
          <div>
            {/* TODO: connect to workshop registration / payment system */}
            <a
              href="#pricing"
              className="inline-flex items-center justify-center rounded-md px-5 py-2 text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: SAGE }}
            >
              Reserve Your Spot &mdash; $899
            </a>
            <p className="text-[11px] text-muted-foreground mt-1.5">Regular price $1,249</p>
          </div>
        </section>

        {/* What You Leave With */}
        <section className="pb-14">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">What you leave with</p>
          <div className="grid sm:grid-cols-3 gap-x-8 gap-y-3">
            <div>
              <p className="font-medium text-sm">Discovery Profile</p>
              <p className="text-muted-foreground">Values, strengths, friction points, pattern map</p>
            </div>
            <div>
              <p className="font-medium text-sm">Identity Document</p>
              <p className="text-muted-foreground">Vision, identity statement, relational identity</p>
            </div>
            <div>
              <p className="font-medium text-sm">1-Year Scoreboard</p>
              <p className="text-muted-foreground">Outcome, proof point, obstacle, IF-THEN plan</p>
            </div>
            <div>
              <p className="font-medium text-sm">Starter System</p>
              <p className="text-muted-foreground">1 monthly goal + 2 daily habits</p>
            </div>
            <div>
              <p className="font-medium text-sm">Accountability Pod</p>
              <p className="text-muted-foreground">4-person group with structured weekly check-in</p>
            </div>
            <div>
              <p className="font-medium text-sm">Daily Practice App</p>
              <p className="text-muted-foreground">Track, reflect, and build awareness over time</p>
            </div>
          </div>
        </section>

        {/* The Framework */}
        <section className="pb-14">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">The framework</p>
          <div className="space-y-3 sm:space-y-0 sm:flex sm:items-start sm:gap-3">
            {[
              { label: "Discover", desc: "Values, vision, strengths, friction points" },
              { label: "Decide", desc: "Identity, blind spots, trigger awareness" },
              { label: "Do", desc: "1-year outcome, monthly goal, 2 habits, weekly plan" },
              { label: "Repeat", desc: "Daily practice, weekly review, monthly reset" },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex sm:flex-col items-start sm:items-stretch gap-2 sm:gap-0 flex-1">
                <p className="font-medium text-sm whitespace-nowrap">
                  {step.label}{i < arr.length - 1 && <span className="text-muted-foreground/40 font-normal"> &rarr;</span>}
                </p>
                <p className="text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The Workshop */}
        <section className="pb-14">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">The workshop</p>
          <div className="grid sm:grid-cols-2 gap-8" style={{ borderTop: "0.5px solid hsl(var(--border))", paddingTop: 16 }}>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Duration</span><span>3.5 hours</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Break</span><span>30-min networking</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Exercises</span><span>6</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Format</span><span>Live, in-person</span></div>
            </div>
            <div className="space-y-2 text-muted-foreground" style={{ borderLeft: "0.5px solid hsl(var(--border))", paddingLeft: 24 }}>
              <p>Part 1 creates care &mdash; values, vision, reality.</p>
              <p>Part 2 creates honesty &mdash; identity, triggers, containment.</p>
              <p>Part 3 creates consistency &mdash; outcome, system, pods.</p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="pb-16">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">Pricing</p>
          <div className="rounded-md p-6" style={{ border: "0.5px solid hsl(var(--border))", background: "hsl(var(--muted) / 0.3)" }}>
            <p className="font-medium text-sm mb-2">The Leaf Workshop</p>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-xl font-bold">$899</span>
              <span className="text-muted-foreground line-through text-sm">$1,249</span>
            </div>
            <ul className="space-y-1 text-muted-foreground mb-5">
              <li>– Live 3.5-hour workshop session</li>
              <li>– 3 core documents</li>
              <li>– Starter system (monthly goal + 2 habits)</li>
              <li>– 4-person accountability pod</li>
              <li>– Full access to daily practice app</li>
              <li>– Structured first 7 days</li>
            </ul>
            {/* TODO: connect to workshop registration / payment system */}
            <a
              href="#pricing"
              className="inline-flex items-center justify-center rounded-md px-5 py-2 text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: SAGE }}
            >
              Reserve Your Spot
            </a>
            <p className="text-[11px] text-muted-foreground mt-3">
              Already attended?{" "}
              <a href="/api/login" className="underline hover:text-foreground transition-colors">Sign in</a>
              {" "}to access your app.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="pb-10 px-6" style={{ borderTop: "0.5px solid hsl(var(--border))", paddingTop: 16 }}>
        <div className="container mx-auto max-w-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <LeafLogo size={16} />
            <span className="text-sm font-medium" style={{ color: SAGE }}>Leaf</span>
          </div>
          <p className="text-[11px] text-muted-foreground">&copy; 2026 Leaf</p>
        </div>
        <div className="container mx-auto max-w-2xl mt-3">
          <p className="text-[11px] text-muted-foreground italic text-center">
            The app helps you collect the truth. The AI helps you see the pattern.
          </p>
        </div>
      </footer>
    </div>
  );
}
