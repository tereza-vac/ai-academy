import { create } from "zustand";
import { persist } from "zustand/middleware";
import { baseLocale, isLocale, locales } from "@/i18n/i18n-util";
import { loadLocaleAsync, loadNamespaceAsync } from "@/i18n/i18n-util.async";
import type { Locales, Namespaces } from "@/i18n/i18n-types";

/**
 * Locale store — owns the active locale, the loaded-translations flag, and
 * the list of locales available in the UI. Mirrors the sciobot pattern at
 * `sciobot-next/src/stores/localeStore.ts`, minus the profile sync (we don't
 * persist locale on the user profile yet).
 */

const ALL_NAMESPACES: Namespaces[] = [
  "auth",
  "buildLab",
  "common",
  "content",
  "home",
  "learn",
  "library",
  "nav",
  "paperSearch",
  "practice",
  "radar",
  "reader",
  "userMenu",
];

async function loadLocaleWithNamespaces(locale: Locales): Promise<void> {
  await loadLocaleAsync(locale);
  await Promise.all(ALL_NAMESPACES.map((ns) => loadNamespaceAsync(locale, ns)));
}

interface LocaleState {
  locale: Locales;
  isLoaded: boolean;
  availableLocales: readonly Locales[];
  setLocale: (locale: Locales) => void;
  loadLocale: (locale: Locales) => Promise<void>;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: baseLocale,
      isLoaded: false,
      availableLocales: locales,

      setLocale: (newLocale) => {
        if (get().locale === newLocale && get().isLoaded) return;
        set({ locale: newLocale, isLoaded: false });
        void get().loadLocale(newLocale);
      },

      loadLocale: async (locale) => {
        await loadLocaleWithNamespaces(locale);
        set({ isLoaded: true });
      },
    }),
    {
      name: "ai-academy-locale",
      partialize: (state) => ({ locale: state.locale }),
      onRehydrateStorage: () => (state) => {
        // Kick off translation loading right after rehydration so the rest of
        // the app can render against the persisted locale on first paint.
        if (state) void state.loadLocale(state.locale);
      },
    },
  ),
);

// Selectors
export const selectLocale = (s: LocaleState) => s.locale;
export const selectIsLocaleLoaded = (s: LocaleState) => s.isLoaded;
export const selectAvailableLocales = (s: LocaleState) => s.availableLocales;

// Display names rendered in the language picker. Keep them in the locale's
// own language so each option looks "right" regardless of the current UI locale.
export const localeNames: Record<Locales, string> = {
  cs: "Čeština",
  en: "English",
  pl: "Polski",
  sk: "Slovenčina",
};

// Re-export `isLocale` for convenience.
export { isLocale };
export type { Locales };
