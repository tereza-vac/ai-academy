import { useEffect, type ReactNode } from "react";
import TypesafeI18n from "@/i18n/i18n-react";
import {
  selectIsLocaleLoaded,
  selectLocale,
  useLocaleStore,
} from "@/stores/localeStore";
import { LoadingScreen } from "@/components/loading-screen";

/**
 * Boots the i18n stack:
 *   1. Reads the active locale from the persisted `localeStore`.
 *   2. Triggers async loading of dictionary + formatters on first mount
 *      (covers the SSR / non-rehydrated case).
 *   3. Holds rendering behind a `LoadingScreen` until the locale has loaded,
 *      then wraps children in the generated `TypesafeI18n` provider.
 */
export function I18nBootProvider({ children }: { children: ReactNode }) {
  const locale = useLocaleStore(selectLocale);
  const isLoaded = useLocaleStore(selectIsLocaleLoaded);
  const loadLocale = useLocaleStore((s) => s.loadLocale);

  useEffect(() => {
    if (!isLoaded) void loadLocale(locale);
  }, [isLoaded, locale, loadLocale]);

  if (!isLoaded) return <LoadingScreen />;

  return (
    <TypesafeI18n locale={locale}>
      {children}
    </TypesafeI18n>
  );
}
