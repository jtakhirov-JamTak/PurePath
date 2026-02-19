import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, BookOpen, BarChart3, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export default function HistoryPage() {
  const [, setLocation] = useLocation();

  const sections = [
    {
      id: "journal-calendar",
      title: "Journal Calendar",
      description: "View your morning and evening journal entries by date",
      icon: Calendar,
      path: "/journal",
    },
    {
      id: "course2-journal",
      title: "Course 2 Journal",
      description: "Your structured journaling course with weekly exports",
      icon: BookOpen,
      path: "/course2",
    },
    {
      id: "progress",
      title: "Progress",
      description: "Track your habits, goals, and overall growth over time",
      icon: BarChart3,
      path: "/progress",
    },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-10">
          <h1 className="font-serif text-3xl font-bold mb-3" data-testid="text-history-title">History</h1>
          <p className="text-muted-foreground text-lg">
            Review your past journals, habits, and personal growth over time.
          </p>
        </div>

        <div className="space-y-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card
                key={section.id}
                className="hover-elevate cursor-pointer overflow-visible"
                onClick={() => setLocation(section.path)}
                data-testid={`card-history-${section.id}`}
              >
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-md bg-primary/[0.08] flex items-center justify-center shrink-0">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="font-serif text-base">{section.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
