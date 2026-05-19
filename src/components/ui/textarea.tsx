import * as React from "react";
import { cn } from "@/lib/utils";

type TextareaProps = React.ComponentPropsWithRef<"textarea">;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-body-md font-normal text-content-primary placeholder:text-content-tertiary transition-[color,border-color,background-color,opacity] outline-none focus-visible:border-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
