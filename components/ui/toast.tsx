"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

interface ToastProps {
  message: string;
  tone?: "success" | "error" | "warning" | "info";
}

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    border: "border-[rgb(var(--success))]/20",
    text: "text-[rgb(var(--success))]",
  },
  error: {
    icon: CircleAlert,
    border: "border-[rgb(var(--error))]/20",
    text: "text-[rgb(var(--error))]",
  },
  warning: {
    icon: CircleAlert,
    border: "border-amber-200",
    text: "text-amber-600",
  },
  info: {
    icon: CircleAlert,
    border: "border-sky-200",
    text: "text-sky-600",
  },
} as const;

export function Toast({ message, tone = "success" }: ToastProps) {
  const config = TOAST_STYLES[tone];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "animate-fade-in-up flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-sm shadow-sm",
        config.border,
      )}
      role="status"
      aria-live={tone === "error" ? "assertive" : "polite"}
    >
      <Icon className={cn("h-4 w-4", config.text)} />
      <span className="text-foreground">{message}</span>
    </div>
  );
}
