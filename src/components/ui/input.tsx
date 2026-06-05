import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentPropsWithRef<"input">;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full min-w-0 rounded-xl border border-border-strong bg-surface-base px-3.5 py-2 text-body-md font-normal text-content-primary placeholder:text-content-tertiary transition-[color,border-color,background-color,box-shadow,opacity] outline-none focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)] disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_3px_hsl(var(--destructive)/0.12)]",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
