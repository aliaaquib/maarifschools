import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-lg border border-border bg-card px-4 text-sm font-normal text-foreground outline-none transition-all duration-150 placeholder:text-muted-foreground focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
