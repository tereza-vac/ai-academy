/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-full border border-transparent text-body-md font-medium tracking-tight transition-[background-color,color,border-color,box-shadow,opacity,transform] duration-150 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-elevation-sm hover:bg-[hsl(var(--brand-600))] hover:shadow-elevation-md",
        gradient: "bg-gradient-brand text-white shadow-glow-brand hover:shadow-elevation-lg hover:brightness-105",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90",
        outline:
          "border-border-subtle bg-surface-base text-content-primary hover:border-border-strong hover:bg-surface-hover",
        secondary:
          "bg-brand-soft text-content-primary hover:bg-brand-muted",
        ghost:
          "bg-transparent text-content-secondary hover:bg-surface-hover hover:text-content-primary",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-2 px-4 [&_svg:not([class*='size-'])]:size-4",
        sm: "h-8 gap-1.5 px-3 text-body-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-10 gap-2 px-6 [&_svg:not([class*='size-'])]:size-5",
        icon: "size-9 [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
