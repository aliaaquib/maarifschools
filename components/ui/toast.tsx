"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

interface ToastProps {
  message: string;
  tone?: "success" | "error";
}

export function Toast({ message, tone = "success" }: ToastProps) {
  const isSuccess = tone === "success";

  return (
    <div
      className={cn(
        "animate-fade-in-up flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-sm shadow-sm",
        isSuccess ? "border-[rgb(var(--success))]/20" : "border-[rgb(var(--error))]/20",
      )}
    >
      {isSuccess ? (
        <CheckCircle2 className="h-4 w-4 text-[rgb(var(--success))]" />
      ) : (
        <CircleAlert className="h-4 w-4 text-[rgb(var(--error))]" />
      )}
      <span className="text-foreground">{message}</span>
    </div>
  );
}
