/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption-xs font-medium tracking-tight",
  {
    variants: {
      variant: {
        default: "bg-brand-soft text-primary",
        muted: "bg-surface-sunken text-content-secondary",
        outline: "border border-border-subtle text-content-secondary",
        success: "bg-success-soft text-[hsl(var(--success))]",
        warning: "bg-warning-soft text-[hsl(var(--warning))]",
        danger: "bg-coral-soft text-[hsl(var(--coral))]",
        premium: "bg-premium-soft text-[hsl(var(--premium))]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
