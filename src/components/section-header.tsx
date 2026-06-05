import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
}

/**
 * Consistent section heading used inside pages: optional branded icon chip,
 * title, optional description, and right-aligned actions.
 */
export function SectionHeader({ title, description, icon: Icon, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-primary">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-heading-sm font-semibold tracking-tight text-content-primary truncate">
            {title}
          </h2>
          {description ? (
            <p className="text-body-sm text-content-tertiary truncate">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
