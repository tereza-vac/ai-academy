import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-gradient-to-r from-surface-sunken via-surface-hover to-surface-sunken bg-[length:200%_100%] animate-shimmer",
        className,
      )}
      {...props}
    />
  );
}
