import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

/**
 * Thin wrapper around Supabase Auth. Mirrors the sciobot-next services/ shape:
 * a single domain module exposing async actions, with errors thrown as `Error`.
 */

export type AuthProvider = "google";

export interface AuthProfile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export function profileFromUser(user: User | null | undefined): AuthProfile | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const displayName =
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    (user.email ? user.email.split("@")[0] : null);
  return {
    id: user.id,
    email: user.email ?? "",
    displayName: displayName ?? null,
    avatarUrl: (meta.avatar_url as string | undefined) ?? null,
  };
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

export async function signInWithOAuth(
  provider: AuthProvider,
  options?: { redirectTo?: string },
): Promise<void> {
  const redirectTo = options?.redirectTo ?? `${window.location.origin}/auth/callback`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
  if (error) throw new Error(error.message);
}

export async function signInWithEmail(input: {
  email: string;
  redirectTo?: string;
}): Promise<void> {
  const emailRedirectTo = input.redirectTo ?? `${window.location.origin}/auth/callback`;
  const { error } = await supabase.auth.signInWithOtp({
    email: input.email,
    options: { emailRedirectTo },
  });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
