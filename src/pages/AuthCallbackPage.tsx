import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18nContext } from "@/i18n/i18n-react";

/**
 * Lands here from the OAuth provider (and magic-link) callback.
 *
 * Supabase's client (configured with `detectSessionInUrl: true` in
 * `src/integrations/supabase/client.ts`) parses tokens from the URL and stores
 * the session. We just wait for the auth store to reflect that and route on.
 */
export function Component() {
  const { LL } = useI18nContext();
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    navigate(user ? "/" : "/login", { replace: true });
  }, [user, isLoading, navigate]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background text-content-secondary">
      <div className="flex items-center gap-2 text-body-md">
        <Loader2 className="h-4 w-4 animate-spin" />
        {LL.auth.finishingSignIn()}
      </div>
    </div>
  );
}

export default Component;
