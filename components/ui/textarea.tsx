import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-[120px] w-full rounded-lg border border-border bg-card px-4 py-3 text-sm font-normal text-foreground outline-none transition-all duration-150 placeholder:text-muted-foreground focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
