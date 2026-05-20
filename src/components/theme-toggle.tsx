import { useEffect, useState } from "react";
import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light",  label: "Light",  icon: Sun },
  { value: "system", label: "System", icon: Laptop },
  { value: "dark",   label: "Dark",   icon: Moon },
] as const;

type Variant = "row" | "compact";

/**
 * 3-segment theme toggle (light / system / dark).
 *
 * `variant="row"` is the full segmented control used in the sidebar.
 * `variant="compact"` cycles through themes on click — used when the sidebar
 * is collapsed and we only have room for one icon.
 */
export function ThemeToggle({ variant = "row" }: { variant?: Variant }) {
  // next-themes is SSR-aware; theme is undefined until mounted. Avoid hydration
  // mismatch by only rendering the active state after mount.
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Render a neutral placeholder of the same size to avoid layout shift.
    return variant === "row" ? (
      <div className="h-8 w-full rounded-full bg-surface-sunken" aria-hidden />
    ) : (
      <div className="h-8 w-8 rounded-full bg-surface-sunken" aria-hidden />
    );
  }

  const active = (theme ?? "system") as (typeof OPTIONS)[number]["value"];

  if (variant === "compact") {
    const ActiveIcon =
      active === "system"
        ? Laptop
        : (resolvedTheme === "dark" || active === "dark")
          ? Moon
          : Sun;
    const next: typeof active =
      active === "light" ? "dark" : active === "dark" ? "system" : "light";
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        aria-label={`Theme: ${active}. Click to switch to ${next}.`}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-sunken text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]"
      >
        <ActiveIcon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex w-full items-center gap-1 rounded-full bg-surface-sunken p-1"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const isActive = active === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            onClick={() => setTheme(value)}
            className={cn(
              "flex h-7 flex-1 items-center justify-center gap-1 rounded-full text-body-sm font-medium transition-colors outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
              isActive
                ? "bg-surface-elevated text-content-primary shadow-elevation-sm"
                : "text-content-secondary hover:text-content-primary",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
