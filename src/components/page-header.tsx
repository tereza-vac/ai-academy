import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="space-y-1">
        {eyebrow ? (
          <div className="text-caption-xs uppercase tracking-wide text-content-tertiary">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-heading-lg font-semibold tracking-tight text-content-primary">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-body-md text-content-secondary">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
