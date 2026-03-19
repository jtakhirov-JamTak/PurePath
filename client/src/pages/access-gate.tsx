import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeafLogo } from "@/components/leaf-logo";
import { Loader2 } from "lucide-react";

export default function AccessGatePage() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/verify-access-code", { code });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Verification failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/access-status"] });
      setLocation("/dashboard");
    },
    onError: (err: Error) => {
      setError(err.message === "Invalid access code" ? "Invalid access code" : "Something went wrong. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    verifyMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <LeafLogo size={48} />
          <h1 className="font-serif text-2xl font-bold text-foreground">Enter Access Code</h1>
          <p className="text-sm text-muted-foreground text-center">
            Enter the code you received at the workshop
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(""); }}
              placeholder="Access code"
              className="text-center text-lg"
              data-testid="input-access-code"
            />
            {error && (
              <p className="text-sm text-red-500 text-center" data-testid="text-access-error">{error}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            style={{ backgroundColor: "#5a8a5c" }}
            disabled={!code.trim() || verifyMutation.isPending}
            data-testid="button-verify-code"
          >
            {verifyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Code"
            )}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          Don't have a code?{" "}
          <a href="/" className="underline hover:text-foreground transition-colors">
            Learn about the workshop
          </a>
        </p>
      </div>
    </div>
  );
}
