import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

/** Base card surface used across the dashboard: white, rounded-2xl, soft shadow. */
export function Card({ children, className, padded = true, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card bg-card shadow-soft border border-border/60",
        padded && "p-6",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
