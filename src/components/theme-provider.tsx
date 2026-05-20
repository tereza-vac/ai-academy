import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";

/**
 * Thin wrapper around next-themes so call sites stay stable if we ever swap
 * the implementation. Mirrors the same pattern used in `sciobot-next`.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
