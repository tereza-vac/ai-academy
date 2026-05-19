import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentPropsWithRef<"input">;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full min-w-0 rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-body-md font-normal text-content-primary placeholder:text-content-tertiary transition-[color,border-color,background-color,opacity] outline-none focus-visible:border-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-2 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
