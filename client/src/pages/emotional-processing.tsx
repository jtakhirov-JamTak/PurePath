import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Eye, Tag, Wind, MoveRight } from "lucide-react";

export default function EmotionalProcessingPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-rose-500/20 to-rose-500/5 flex items-center justify-center">
              <Heart className="h-7 w-7 text-rose-500" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold">Emotional Containment</h1>
              <p className="text-muted-foreground">Real emotional processing in 4 steps</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 mb-8">
          <p className="text-lg font-medium text-center">
            Real emotional processing = <span className="text-primary">Feel</span> → <span className="text-primary">Name</span> → <span className="text-primary">Regulate</span> → <span className="text-primary">Move</span>
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-rose-500/20 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-rose-500" />
                </div>
                <div>
                  <CardTitle className="font-serif">1. FEEL (10-20 seconds)</CardTitle>
                  <CardDescription>Notice the emotion in your body</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Notice the emotion in your body — throat, chest, jaw. Don't push it away.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Tag className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="font-serif">2. LABEL (1 sentence)</CardTitle>
                  <CardDescription>Name what you're feeling</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border-l-4 border-amber-500">
                <p className="text-lg font-medium italic">
                  "I feel ___ right now because ____, and it's okay to feel that way."
                </p>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>Why it works:</strong> You shift control from your limbic system (emotional) → to your prefrontal cortex (reasoning)</p>
                <p>This is called <em>affect labeling</em> — it literally processes emotion biologically.</p>
                <p>"It's okay to feel that way" validates your emotional state, so you don't fight it or suppress it.</p>
                <p><strong>Validation = processed emotion.</strong></p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <Wind className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <CardTitle className="font-serif">3. REGULATE (2-3 slow exhales)</CardTitle>
                  <CardDescription>Stabilize your nervous system</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Take 2-3 slow, deep exhales. This stabilizes your nervous system.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <MoveRight className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="font-serif">4. MOVE</CardTitle>
                  <CardDescription>Take a small, grounding action</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border-l-4 border-emerald-500">
                <p className="text-lg font-medium italic">
                  "Given that, the next small thing is ___."
                </p>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>You're telling your nervous system:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>"I'm allowed to feel this,"</li>
                  <li>"AND I'm capable of taking a calm action anyway."</li>
                </ul>
                <p>Your body learns: <strong>"Feeling does not mean danger."</strong></p>
                <p>This rewires the old trauma loop where emotion = threat.</p>
                <p>This is called <em>behavioral activation</em> — clinically proven to reduce anxiety & depression.</p>
              </div>
              
              <div className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="font-medium mb-2">The action must be:</p>
                <p className="text-sm text-muted-foreground mb-3">Small, neutral, physical, grounding, low-stimulation</p>
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Examples</Badge>
                  </div>
                </div>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li>Wash a dish, tidy a small object, drink water</li>
                  <li>Walk 2 minutes, arm raises, stretch</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">These anchor your nervous system.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
