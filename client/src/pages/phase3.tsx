import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/app-header";
import { LockedCourseModal } from "@/components/locked-course-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { 
  Zap, Upload, FileText, Download, Loader2, Send, Video, 
  ArrowRight, Lock, Sparkles, RefreshCw
} from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Purchase } from "@shared/schema";

export default function Phase3Page() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [uploadedText, setUploadedText] = useState("");
  const [analysisResult, setAnalysisResult] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: purchases, isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
    enabled: !!user,
  });

  const hasAccess = purchases?.some(p => 
    p.courseType === "phase3" || p.courseType === "allinone" || p.courseType === "bundle"
  );

  useEffect(() => {
    if (!purchasesLoading && !authLoading) {
      setShowLockedModal(!hasAccess);
    }
  }, [hasAccess, purchasesLoading, authLoading]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 100000) {
      toast({
        title: "File too large",
        description: "Please upload a file under 100KB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setUploadedText(text);
      toast({
        title: "Document loaded",
        description: `${file.name} has been loaded successfully.`,
      });
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async () => {
    if (!uploadedText.trim()) {
      toast({
        title: "No content",
        description: "Please upload or paste your self-discovery document first.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult("");

    try {
      const response = await fetch("/api/phase3/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ documentText: uploadedText }),
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader");

      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullText += data.content;
                setAnalysisResult(fullText);
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      }
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Could not analyze your document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadReport = () => {
    if (!analysisResult) return;
    
    const blob = new Blob([analysisResult], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transformation-report.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading || purchasesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LockedCourseModal 
        courseType="phase3" 
        open={showLockedModal && !hasAccess} 
        onClose={() => setShowLockedModal(false)}
      />
      <AppHeader />

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="secondary">Phase 3</Badge>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">Transformation</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Upload your self-discovery documents and receive AI-powered pattern analysis and transformation insights.
          </p>
        </div>

        <Card className="mb-6 overflow-visible" data-testid="card-video-lesson">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="font-serif text-lg">You Are Your Patterns</CardTitle>
                <CardDescription>Video lesson - Coming soon</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
              <div className="text-center">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Video lesson will be available here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 overflow-visible" data-testid="card-upload">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="font-serif text-lg">Transformation Agent</CardTitle>
                <CardDescription>Upload your self-discovery documents for AI pattern analysis</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Step 1: Upload or paste your document</p>
              <p className="text-xs text-muted-foreground mb-3">
                Paste the output from your Self-Discovery GPT conversations, journal reflections, 
                or any self-discovery notes. The AI will analyze patterns in your thinking and behavior.
              </p>
              <div className="flex gap-3 mb-3 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.doc,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                  data-testid="input-file-upload"
                />
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-file"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
                {uploadedText && (
                  <Badge variant="secondary">
                    <FileText className="h-3 w-3 mr-1" />
                    Document loaded ({uploadedText.length} chars)
                  </Badge>
                )}
              </div>
              <Textarea
                placeholder="Or paste your self-discovery text here..."
                value={uploadedText}
                onChange={(e) => setUploadedText(e.target.value)}
                className="min-h-[150px]"
                data-testid="input-document-text"
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Step 2: Generate your transformation report</p>
              <Button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || !uploadedText.trim()}
                data-testid="button-analyze"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing patterns...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze My Patterns
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {analysisResult && (
          <Card className="overflow-visible" data-testid="card-analysis-result">
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="font-serif text-lg">Your Transformation Report</CardTitle>
                  <CardDescription>AI-generated pattern analysis and insights</CardDescription>
                </div>
                <Button 
                  variant="outline"
                  onClick={handleDownloadReport}
                  data-testid="button-download-report"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap" data-testid="text-analysis-result">
                {analysisResult}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
