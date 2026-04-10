import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { ChevronDown } from "lucide-react";

const valueStack = [
  {
    name: "The Leaf Live Workshop",
    desc: "3.5 hours of facilitated self-examination with 6 exercises. Not a lecture — confrontation with support.",
    value: 899,
  },
  {
    name: "Discovery Profile",
    desc: "Your values, strengths, friction points, and pattern map — written by you, for you.",
    value: 200,
  },
  {
    name: "Identity Document",
    desc: "Vision, identity statement, and the gap between your current self and your required self.",
    value: 200,
  },
  {
    name: "1-Year Commitment",
    desc: "Your outcome, proof point, biggest obstacle, and IF-THEN plan.",
    value: 150,
  },
  {
    name: "Execution System",
    desc: "Monthly goal + 2–3 daily habits + weekly planning ritual. Built in the room, active that evening.",
    value: 300,
  },
  {
    name: "Accountability Pod",
    desc: "4-person group with structured weekly check-ins. These people won't let you edit the truth.",
    value: 500,
  },
  {
    name: "The Leaf App — 3 Months Free",
    desc: "Daily execution tracking, weekly review, real-time support system, and proof over time.",
    value: 450,
  },
];

const framework = [
  { phase: "SEEING", stages: [
    { name: "Awareness", question: "Who am I, honestly?" },
    { name: "Direction", question: "Where do I want to go, and why?" },
    { name: "Identity", question: "Who must I become to get there?" },
  ]},
  { phase: "DOING", stages: [
    { name: "Decision", question: "What am I committing to now?" },
    { name: "Action", question: "How do I stay consistent?" },
    { name: "Refinement", question: "What does the evidence say?" },
  ]},
];

const faqs = [
  {
    q: "It's expensive.",
    reframe: "That assumes the cost is the $599. The real cost is another year of the same pattern.",
    a: "Another year of the same pattern is more expensive. You're not paying for a workshop — you're paying to stop drifting.",
  },
  {
    q: "I can do this on my own.",
    reframe: "That assumes the problem is effort. The problem is you've never had a room that won't let you edit the truth.",
    a: "You've been trying on your own. That's the point. The Leaf gives you a room, a structure, and people who won't let you edit the truth.",
  },
  {
    q: "I don't have time.",
    a: "Clear one Saturday. The system after that takes minutes a day.",
  },
  {
    q: "Is this therapy?",
    a: "No. Therapy helps you understand why. The Leaf helps you face what is true and build from it.",
  },
  {
    q: "Can I try the app first?",
    a: "Without the workshop, the app is just a tracker. The workshop is what gives the tracking meaning.",
  },
  {
    q: "What if it doesn't work?",
    reframe: "That assumes the system does it for you. The system holds the mirror — you do the work.",
    a: "It works if you face it and use it. The room creates the shift. The system keeps it alive.",
  },
];

function FAQ({ q, a, reframe }: { q: string; a: string; reframe?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/40">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left"
        aria-expanded={open}
      >
        <span className="font-medium text-sm">&ldquo;{q}&rdquo;</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground shrink-0 ml-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="pb-4 space-y-2">
          {reframe && (
            <p className="text-sm italic text-muted-foreground/80 leading-relaxed">{reframe}</p>
          )}
          <p className="text-muted-foreground text-sm leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

function CTABlock({ dark = false }: { dark?: boolean }) {
  const mutedClass = dark ? "text-white/50" : "text-muted-foreground";
  return (
    <div className="flex flex-col items-center gap-2">
      <Button asChild size="lg" className="bg-primary text-primary-foreground hover:opacity-90 px-8 py-3 text-base font-medium">
        <a href="/auth">Reserve Your Seat — $599</a>
      </Button>
      <p className={`text-xs ${mutedClass}`}>
        Regular $899. Launch cohort pricing. Limited seats.
      </p>
    </div>
  );
}

const totalValue = valueStack.reduce((sum, item) => sum + item.value, 0);

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── HERO (dark) ── */}
      <section className="bg-[#0B1120] text-white">
        <div className="max-w-2xl mx-auto px-6 pt-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/70">
            <BrandLogo size={20} />
            <span className="text-sm font-medium">The Leaf</span>
          </div>
          <a href="/auth" className="text-xs text-white/50 hover:text-white/80 transition-colors">
            Sign In
          </a>
        </div>
        <div className="max-w-2xl mx-auto px-6 py-16 sm:py-24">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/50 mb-6">
            The Leaf Live
          </p>
          <h1 className="font-serif text-[28px] sm:text-[36px] leading-[1.2] font-medium mb-6">
            You already know what needs to change.
            <br />
            <span className="text-white/70">You haven't faced why you keep avoiding it.</span>
          </h1>
          <p className="text-white/60 text-base sm:text-lg leading-relaxed max-w-xl mb-10">
            A live 3.5-hour workshop where you stop editing the truth — and leave with a system that turns honesty into daily proof.
          </p>
          <CTABlock dark />
        </div>
      </section>

      {/* ── THE PATTERN ── */}
      <section className="max-w-2xl mx-auto px-6 py-16 sm:py-20">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-6">
          The Pattern
        </p>
        <div className="space-y-5 text-[15px] leading-relaxed">
          <p>
            You've read the books. Done the thinking. Had the conversations with yourself.
          </p>
          <p>
            And you're still in the same loop — knowing what needs to change, negotiating with yourself about when, and waking up months later in the exact same spot.
          </p>
          <p>
            The problem was never information. The problem is you haven't faced the gap between who you are and who your goals actually require you to become.
          </p>
        </div>
      </section>

      {/* ── WHY THIS EXISTS ── */}
      <section className="max-w-2xl mx-auto px-6 pb-16 sm:pb-20">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-6">
          Why This Exists
        </p>
        <div className="space-y-5 text-[15px] leading-relaxed">
          <p>This system exists because of a breakup.</p>
          <p>
            Not because of heartbreak — but because of what it revealed. The founder realized he didn't understand what had gone wrong because he didn't understand himself. He'd been outsourcing decisions, reacting from blind spots, and living from patterns he'd never examined honestly.
          </p>
          <p>
            So he built a system: foundational self-examination, daily practices, trigger awareness, weekly review, and evidence over time. It worked — not because it was inspiring, but because it was true.
          </p>
          <p>The Leaf is that system, turned into something other people can use.</p>
        </div>
      </section>

      {/* ── VALUE STACK ── */}
      <section id="pricing" className="max-w-2xl mx-auto px-6 pb-16 sm:pb-20">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-6">
          What's Included
        </p>
        <div className="space-y-0 rounded-lg border border-border/60 overflow-hidden">
          {valueStack.map((item, i) => (
            <div
              key={item.name}
              className={`p-5 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 ${
                i > 0 ? "border-t border-border/40" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-muted-foreground text-sm mt-0.5">{item.desc}</p>
              </div>
              <p className="text-sm font-medium text-muted-foreground sm:text-right shrink-0">
                ${item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center space-y-1">
          <p className="text-sm font-medium">
            Total Value: <span className="text-base">${totalValue.toLocaleString()}</span>
          </p>
          <p className="text-2xl sm:text-3xl font-bold">Today: $599</p>
          <p className="text-muted-foreground text-sm">You save ${(totalValue - 599).toLocaleString()}</p>
        </div>

        <div className="mt-8">
          <CTABlock />
        </div>
      </section>

      {/* ── THE FRAMEWORK ── */}
      <section className="max-w-2xl mx-auto px-6 pb-16 sm:pb-20">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
          The Framework
        </p>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          Most systems help you set goals. The Leaf makes you face the gap between who you are and who your goals require — before you commit.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {framework.map((group) => (
            <div key={group.phase}>
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-medium mb-3">
                {group.phase}
              </p>
              <div className="space-y-3">
                {group.stages.map((stage) => (
                  <div key={stage.name}>
                    <p className="font-serif font-medium text-sm">{stage.name}</p>
                    <p className="text-muted-foreground text-sm">{stage.question}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground text-sm italic mt-8">
          The workshop takes you deep through Seeing and initiates Doing. The app sustains Doing every day after.
        </p>
      </section>

      {/* ── COST OF INACTION ── */}
      <section className="max-w-2xl mx-auto px-6 pb-16 sm:pb-20">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-6">
          The Cost of Waiting
        </p>
        <div className="space-y-4 text-[15px] leading-relaxed">
          <p>Another quarter of knowing what needs to change and still not confronting why you won't.</p>
          <p>Another year of the same pattern.</p>
          <p>Another year of performing instead of proving.</p>
          <p className="font-medium">That is the expensive option.</p>
        </div>
      </section>

      {/* ── ONE SATURDAY ── */}
      <section className="max-w-2xl mx-auto px-6 pb-16 sm:pb-20">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-6">
          One Saturday
        </p>
        <div className="space-y-6">
          <div>
            <p className="font-medium text-sm">Part 1 — <span className="text-primary">SEEING:</span> Awareness + Direction</p>
            <p className="text-muted-foreground text-sm mt-1">
              Values discovery, long-term vision, why it matters. You stop editing what's true.
            </p>
          </div>
          <div>
            <p className="font-medium text-sm">Part 2 — <span className="text-primary">SEEING:</span> Identity</p>
            <p className="text-muted-foreground text-sm mt-1">
              Strengths, friction points, the gap. This is the part most programs skip.
            </p>
          </div>
          <div>
            <p className="font-medium text-sm">Part 3 — <span className="text-primary">DOING:</span> Decision + Action</p>
            <p className="text-muted-foreground text-sm mt-1">
              1-year commitment, execution system, pod formation. You leave already in action.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>Duration: 3.5 hours</span>
          <span>Break: 30-min networking</span>
          <span>Exercises: 6</span>
          <span>Format: Live, in-person</span>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-2xl mx-auto px-6 pb-16 sm:pb-20">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-6">
          Common Questions
        </p>
        <div>
          {faqs.map((faq) => (
            <FAQ key={faq.q} q={faq.q} a={faq.a} reframe={faq.reframe} />
          ))}
        </div>
      </section>

      {/* ── FINAL CTA (dark) ── */}
      <section className="bg-[#0B1120] text-white">
        <div className="max-w-2xl mx-auto px-6 py-20 sm:py-24 text-center">
          <h2 className="font-serif text-[24px] sm:text-[32px] font-medium mb-4">
            The day you stop drifting.
          </h2>
          <p className="text-white/60 text-base mb-10">
            One Saturday. A system you'll use every day.
          </p>
          <CTABlock dark />
          <p className="text-xs text-white/40 mt-8">
            Already attended?{" "}
            <a href="/auth" className="underline hover:text-white/60 transition-colors">
              Sign in to access your app.
            </a>
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/40 py-8 px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <BrandLogo size={20} />
            <span className="text-sm font-medium">The Leaf</span>
          </div>
          <p className="text-xs text-muted-foreground">&copy; 2026 The Leaf</p>
        </div>
      </footer>
    </div>
  );
}
