import type React from "react";
import { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Card className="flex min-h-[280px] flex-col items-center justify-center gap-5 px-8 py-12 text-center">
      <div className="rounded-2xl border border-border bg-muted p-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <p className="max-w-md text-sm font-normal text-muted-foreground">{description}</p>
      </div>
      {action}
    </Card>
  );
}
