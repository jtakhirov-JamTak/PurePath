import { useState } from "react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/brand-logo";
import { Loader2 } from "lucide-react";

type Mode = "login" | "register";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const clearError = () => setError("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const url = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body =
        mode === "register"
          ? { email, password, firstName, lastName, accessCode }
          : { email, password };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      // Invalidate auth cache so useAuth picks up the new session
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/access-status"] });
      setLocation("/today");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isLoginValid = email.includes("@") && email.includes(".") && password.length >= 1;
  const isRegisterValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.includes("@") &&
    email.includes(".") &&
    password.length >= 8 &&
    accessCode.trim().length > 0;
  const isValid = mode === "login" ? isLoginValid : isRegisterValid;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <BrandLogo size={48} className="text-primary" />
          <h1 className="text-base font-medium text-foreground">
            {mode === "login" ? "Welcome Back" : "Join Proof Arc"}
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            {mode === "login"
              ? "Sign in to continue your practice"
              : "Create your account with your workshop access code"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="text"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); clearError(); }}
                placeholder="First name"
                data-testid="input-first-name"
              />
              <Input
                type="text"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); clearError(); }}
                placeholder="Last name"
                data-testid="input-last-name"
              />
            </div>
          )}

          <Input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearError(); }}
            placeholder="Email"
            data-testid="input-email"
          />

          <Input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearError(); }}
            placeholder={mode === "register" ? "Password (min 8 characters)" : "Password"}
            data-testid="input-password"
          />

          {mode === "register" && (
            <Input
              type="password"
              value={accessCode}
              onChange={(e) => { setAccessCode(e.target.value); clearError(); }}
              placeholder="Access code"
              autoComplete="off"
              data-testid="input-access-code"
            />
          )}

          {error && (
            <p className="text-sm text-red-500 text-center" data-testid="text-auth-error">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:opacity-90"
            disabled={!isValid || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "login" ? "Signing in..." : "Creating account..."}
              </>
            ) : mode === "login" ? (
              "Sign In"
            ) : (
              "Join Proof Arc"
            )}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          {mode === "login" ? (
            <>
              Need an account?{" "}
              <button
                type="button"
                onClick={() => { setMode("register"); clearError(); }}
                className="underline hover:text-foreground transition-colors"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => { setMode("login"); clearError(); }}
                className="underline hover:text-foreground transition-colors"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
