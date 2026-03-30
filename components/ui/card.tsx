import type React from "react";

import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card transition-all duration-150 ease-out",
        className,
      )}
    >
      {children}
    </div>
  );
}
