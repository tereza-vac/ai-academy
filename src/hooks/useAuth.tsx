import { useEffect } from "react";
import {
  selectIsAuthenticated,
  selectIsLoading,
  selectUser,
  useAuthStore,
} from "@/stores/authStore";

/**
 * `useAuth()` is the single hook the rest of the app uses. It boots the
 * Supabase Auth subscription on first call and exposes the same shape as
 * sciobot's `useAuth` (user / isLoading / isAuthenticated).
 */
export function useAuth() {
  const initialize = useAuthStore((s) => s.initialize);
  const user = useAuthStore(selectUser);
  const isLoading = useAuthStore(selectIsLoading);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return { user, isLoading, isAuthenticated };
}
