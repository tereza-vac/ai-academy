import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-subtle bg-surface-soft p-10 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated text-content-tertiary shadow-elevation-sm">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <div className="space-y-1">
        <h3 className="text-body-lg font-semibold text-content-primary">{title}</h3>
        {description ? (
          <p className="max-w-md text-body-md text-content-secondary">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
