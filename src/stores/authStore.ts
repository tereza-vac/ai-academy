import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { profileFromUser, type AuthProfile } from "@/services/authApi";

/**
 * Zustand wrapper around Supabase Auth.
 *
 * The store owns the source of truth for "who is signed in", subscribing to
 * `onAuthStateChange` so changes from any tab / OAuth callback propagate
 * through the same selectors.
 *
 * Pattern mirrors `sciobot-next/src/stores/authStore.ts` — Zustand for state
 * shape and selectors, even though the actual auth mechanism differs (sciobot
 * uses a custom JWT, AI Academy uses Supabase Auth).
 */

interface AuthState {
  user: AuthProfile | null;
  isLoading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  setUser: (user: AuthProfile | null) => void;
}

let authSubscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    set({ initialized: true });

    try {
      const { data } = await supabase.auth.getSession();
      set({ user: profileFromUser(data.session?.user), isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }

    if (authSubscription) authSubscription.unsubscribe();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: profileFromUser(session?.user), isLoading: false });
    });
    authSubscription = sub.subscription;
  },

  setUser: (user) => set({ user, isLoading: false }),
}));

export const selectUser = (s: AuthState) => s.user;
export const selectIsLoading = (s: AuthState) => s.isLoading;
export const selectIsAuthenticated = (s: AuthState) => Boolean(s.user);
