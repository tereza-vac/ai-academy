import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "brand" | "success" | "warning" | "premium" | "coral" | "neutral";

const toneChip: Record<Tone, string> = {
  brand: "bg-brand-soft text-primary",
  success: "bg-success-soft text-[hsl(var(--success))]",
  warning: "bg-warning-soft text-[hsl(var(--warning))]",
  premium: "bg-premium-soft text-[hsl(var(--premium))]",
  coral: "bg-coral-soft text-[hsl(var(--coral))]",
  neutral: "bg-surface-sunken text-content-secondary",
};

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  className?: string;
}

/**
 * Compact metric tile with a tonal icon chip. Tones map to semantic tokens so
 * the colors stay consistent across light and dark themes.
 */
export function StatCard({ label, value, hint, icon: Icon, tone = "brand", className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border-subtle bg-surface-elevated p-4 shadow-elevation-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-elevation-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-caption-xs font-medium uppercase tracking-wide text-content-tertiary">{label}</p>
        {Icon ? (
          <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", toneChip[tone])}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-heading-md font-semibold tracking-tight text-content-primary">{value}</p>
      {hint ? <p className="mt-0.5 text-caption-xs text-content-tertiary">{hint}</p> : null}
    </div>
  );
}
