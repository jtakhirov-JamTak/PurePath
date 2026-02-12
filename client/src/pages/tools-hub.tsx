import { AppLayout } from "@/components/app-layout";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Heart, Users, Grid3X3, FileText } from "lucide-react";
import { useLocation } from "wouter";

const tools = [
  {
    id: "identity",
    title: "Identity Document",
    description: "Define your identity, vision, and core values",
    icon: FileText,
    path: "/identity",
  },
  {
    id: "meditation",
    title: "Meditation",
    description: "Integrative meditation for subconscious processing and insight",
    icon: Brain,
    path: "/meditation",
  },
  {
    id: "emotional",
    title: "Emotional Containment",
    description: "Feel, name, regulate, and move forward in 60 seconds",
    icon: Heart,
    path: "/emotional-processing",
  },
  {
    id: "eisenhower",
    title: "Eisenhower Matrix",
    description: "Weekly priority planning by category and quadrant",
    icon: Grid3X3,
    path: "/eisenhower",
  },
  {
    id: "empathy",
    title: "EQ Module",
    description: "Reflect on interactions and build emotional understanding",
    icon: Users,
    path: "/empathy",
  },
];

export default function ToolsHubPage() {
  const [, setLocation] = useLocation();

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-10 max-w-2xl">
          <h1 className="font-serif text-3xl font-bold mb-3" data-testid="text-tools-title">Tools</h1>
          <p className="text-muted-foreground text-lg">
            Free self-development tools to support your daily practice.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 max-w-3xl">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card
                key={tool.id}
                className="hover-elevate cursor-pointer overflow-visible"
                onClick={() => setLocation(tool.path)}
                data-testid={`card-tool-${tool.id}`}
              >
                <CardHeader>
                  <div className="h-12 w-12 rounded-md bg-primary/[0.08] flex items-center justify-center mb-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="font-serif text-base">{tool.title}</CardTitle>
                  <CardDescription className="text-sm">{tool.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
