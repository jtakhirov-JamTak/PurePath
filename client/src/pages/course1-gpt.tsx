import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { LockedCourseModal } from "@/components/locked-course-modal";
import { Send, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { ChatMessage, Purchase } from "@shared/schema";

export default function Course1GPTPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [input, setInput] = useState("");
  const [streamingMessage, setStreamingMessage] = useState("");
  const [showLockedModal, setShowLockedModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: purchases, isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
    enabled: !!user,
  });

  const hasAccess = purchases?.some(p => p.courseType === "course1" || p.courseType === "bundle");

  useEffect(() => {
    if (!purchasesLoading && !authLoading) {
      setShowLockedModal(!hasAccess);
    }
  }, [hasAccess, purchasesLoading, authLoading]);

  const handleCloseModal = () => {
    setShowLockedModal(false);
    setLocation("/dashboard");
  };

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/messages"],
    enabled: !!user && hasAccess,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      setStreamingMessage("");
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Failed to send message");
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");
      
      const decoder = new TextDecoder();
      let fullResponse = "";
      
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
                fullResponse += data.content;
                setStreamingMessage(fullResponse);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
      
      return fullResponse;
    },
    onSuccess: () => {
      setStreamingMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  const handleSend = () => {
    if (!input.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (authLoading || purchasesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    return "U";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LockedCourseModal 
        courseType="course1" 
        open={showLockedModal && !hasAccess} 
        onClose={handleCloseModal}
      />
      <header className="border-b shrink-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="font-serif text-lg font-medium">Self-Discovery GPT</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="container mx-auto max-w-3xl space-y-4">
            {messagesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : messages.length === 0 && !streamingMessage ? (
              <div className="text-center py-12">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <h2 className="font-serif text-2xl font-bold mb-3">Begin Your Self-Discovery Journey</h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  I'm your AI companion for deep personal insights. Share your thoughts, questions, or feelings, 
                  and I'll guide you through meaningful self-reflection.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    "What are my core values?",
                    "Help me understand my fears",
                    "What brings me joy?",
                  ].map((prompt) => (
                    <Button 
                      key={prompt} 
                      variant="outline" 
                      size="sm"
                      onClick={() => setInput(prompt)}
                      data-testid={`button-prompt-${prompt.slice(0, 10)}`}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    data-testid={`message-${message.id}`}
                  >
                    {message.role === "assistant" && (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Sparkles className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-md px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.role === "user" && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={user?.profileImageUrl || undefined} />
                        <AvatarFallback>{getInitials()}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                {streamingMessage && (
                  <div className="flex gap-3 justify-start">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="max-w-[80%] rounded-md px-4 py-3 bg-card border">
                      <p className="whitespace-pre-wrap">{streamingMessage}</p>
                      <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4 shrink-0">
          <div className="container mx-auto max-w-3xl">
            <div className="flex gap-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Share your thoughts, questions, or feelings..."
                className="min-h-[60px] resize-none"
                disabled={sendMessageMutation.isPending}
                data-testid="input-message"
              />
              <Button 
                onClick={handleSend} 
                disabled={!input.trim() || sendMessageMutation.isPending}
                size="icon"
                className="h-[60px] w-[60px]"
                data-testid="button-send"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
