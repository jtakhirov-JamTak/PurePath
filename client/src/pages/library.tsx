import { AppLayout } from "@/components/app-layout";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Brain, Heart, Target, Users, Lightbulb } from "lucide-react";

const documents = [
  {
    id: "identity",
    title: "Identity & Values",
    description: "Define who you are and what matters most to you",
    icon: Target,
  },
  {
    id: "meditation-guide",
    title: "Meditation Guide",
    description: "Step-by-step instructions for integrative meditation practice",
    icon: Brain,
  },
  {
    id: "emotional-containment",
    title: "Emotional Containment",
    description: "The 4-step containment process for processing difficult emotions",
    icon: Heart,
  },
  {
    id: "journaling-guide",
    title: "Journaling Framework",
    description: "Morning and evening journaling templates and best practices",
    icon: BookOpen,
  },
  {
    id: "eq-framework",
    title: "Emotional Intelligence",
    description: "Understanding and developing your emotional intelligence",
    icon: Users,
  },
  {
    id: "patterns",
    title: "Pattern Recognition",
    description: "How to identify and transform recurring behavioral patterns",
    icon: Lightbulb,
  },
];

export default function LibraryPage() {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-10 max-w-2xl">
          <h1 className="font-serif text-3xl font-bold mb-3" data-testid="text-library-title">Library</h1>
          <p className="text-muted-foreground text-lg">
            Supporting documents and reference materials for your practice.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
          {documents.map((doc) => {
            const Icon = doc.icon;
            return (
              <Card
                key={doc.id}
                className="hover-elevate cursor-pointer overflow-visible"
                data-testid={`card-doc-${doc.id}`}
              >
                <CardHeader>
                  <div className="h-12 w-12 rounded-md bg-primary/[0.08] flex items-center justify-center mb-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="font-serif text-base">{doc.title}</CardTitle>
                  <CardDescription className="text-sm">{doc.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
