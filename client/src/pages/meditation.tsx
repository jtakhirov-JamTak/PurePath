import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Clock, Headphones, Sofa } from "lucide-react";

export default function MeditationPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-14 w-14 rounded-xl bg-primary/[0.08] flex items-center justify-center">
              <Brain className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold">Integrative Meditation</h1>
              <p className="text-muted-foreground">Let your subconscious integrate thoughts freely</p>
            </div>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <Sofa className="h-5 w-5" />
              Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="outline">1</Badge>
              <span>Find a comfortable couch or chair in a dim or dark room</span>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline">2</Badge>
              <div className="flex items-center gap-2 flex-wrap">
                <Headphones className="h-4 w-4" />
                <span>Put on headphones with black noise at low volume</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-serif">Black Noise Audio</CardTitle>
            <CardDescription>Use this 12-hour black noise track during meditation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video w-full rounded-lg overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/zXntqw_LFu0"
                title="Black Noise for Meditation"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-lg"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Meditation Process (20-30 minutes)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-semibold text-lg mb-2">1. Downshift: Calm the Body (5 minutes)</h3>
              <p className="text-muted-foreground mb-2">Box breathing (4-4-4-4 pattern) for approximately 5 minutes.</p>
              <p className="text-sm text-muted-foreground italic">Move on when: body feels slower/heavier, jaw and shoulders soften.</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-semibold text-lg mb-2">2. Let Your Subconscious Thoughts Flow (20 minutes)</h3>
              <p className="text-muted-foreground mb-3">Let your thoughts, memories, and images arise freely. Let them come and go.</p>
              <p className="text-sm font-medium mb-2">You might experience:</p>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                <li>Multiple memories appear, seemingly unrelated, until you realize they share a pattern</li>
                <li>One strong emotion dominates, letting you face what you've been avoiding</li>
                <li>Imagination of how your actions may have impacted someone from their point of view (empathy insight)</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-semibold text-lg mb-2">3. Seal It (1-2 minutes)</h3>
              <p className="text-muted-foreground">Sit with the new state (clarity, insight, or empathy) without explaining it.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Post-Meditation Integration (2 minutes)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
              <p className="text-lg text-center font-medium">
                Write one sentence only:
              </p>
              <p className="text-xl text-center text-primary mt-2 font-serif">
                "The insight I gained was ______."
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
