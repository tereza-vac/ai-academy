import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GradientHeroProps {
  children: ReactNode;
  className?: string;
  /** When true the hero uses the full brand gradient with white text. */
  solid?: boolean;
}

/**
 * Hero banner used at the top of feature pages. Two looks:
 * - default: elevated surface with a soft brand/accent aura
 * - solid: full brand gradient with white foreground
 */
export function GradientHero({ children, className, solid = false }: GradientHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border p-6 sm:p-8",
        solid
          ? "border-transparent bg-gradient-brand text-white shadow-glow-brand"
          : "border-border-subtle bg-surface-elevated bg-aura shadow-elevation-sm",
        className,
      )}
    >
      {solid ? (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(255,255,255,0.22),transparent_55%)]" />
      ) : null}
      <div className="relative">{children}</div>
    </section>
  );
}
