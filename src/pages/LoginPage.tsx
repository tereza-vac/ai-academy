import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { signInWithEmail, signInWithOAuth } from "@/services/authApi";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" className={className} aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.838.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A9 9 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A9 9 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

export function Component() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [email, setEmail] = useState("");
  const [pending, setPending] = useState<"google" | "email" | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    // Surface any error returned by Supabase via the URL hash
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const errorDescription = hash.get("error_description");
    if (errorDescription) toast.error(errorDescription);
  }, []);

  if (!isLoading && user) {
    return <Navigate to={from} replace />;
  }

  async function handleGoogle() {
    setPending("google");
    try {
      await signInWithOAuth("google");
      // Browser will redirect to Google — no further UI needed.
    } catch (e) {
      setPending(null);
      toast.error(e instanceof Error ? e.message : "Google sign-in failed");
    }
  }

  async function handleEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setPending("email");
    try {
      await signInWithEmail({ email: email.trim() });
      setEmailSent(true);
      toast.success("Magic link sent — check your inbox.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Email sign-in failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-elevation-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-body-lg font-semibold tracking-tight text-content-primary">
              AI Academy
            </div>
            <div className="text-caption-xs text-content-tertiary">internal · MVP</div>
          </div>
        </div>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <p className="text-body-md text-content-secondary">
              Use your work Google account, or get a one-time magic link by email.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogle}
              disabled={pending !== null}
            >
              {pending === "google" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon className="h-4 w-4" />
              )}
              Continue with Google
            </Button>

            <div className="flex items-center gap-3 text-caption-xs uppercase tracking-wide text-content-tertiary">
              <Separator className="flex-1" />
              or
              <Separator className="flex-1" />
            </div>

            {emailSent ? (
              <div className="rounded-xl border border-border-subtle bg-success-soft p-4 text-body-md text-content-primary">
                <div className="font-medium">Check your inbox</div>
                <p className="text-body-sm text-content-secondary">
                  We sent a magic link to <strong>{email}</strong>. Click it to finish signing in.
                </p>
              </div>
            ) : (
              <form onSubmit={handleEmail} className="space-y-2">
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={pending !== null}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  className="w-full"
                  disabled={pending !== null || !email.trim()}
                >
                  {pending === "email" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Email me a magic link
                </Button>
              </form>
            )}

            <p className="text-caption-xs text-content-tertiary">
              By signing in you agree to our internal usage guidelines.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Component;
