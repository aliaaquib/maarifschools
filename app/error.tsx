"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { reportError } from "@/lib/errors";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, "App route error");
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-6">
      <Card className="w-full max-w-lg rounded-3xl border-[#E5E7EB] bg-white p-8 text-center shadow-[0_12px_40px_rgba(17,24,39,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6D28D9]">Something went wrong</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#111827]">We couldn’t load this page.</h1>
        <p className="mt-3 text-sm leading-6 text-[#6B7280]">
          Try refreshing this view. If the problem continues, your data is safe and you can return to the dashboard.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" className="rounded-xl border-[#E5E7EB]" onClick={() => window.location.assign("/app")}>
            Go to Dashboard
          </Button>
          <Button className="rounded-xl bg-[#6D28D9] text-white hover:bg-[#5B21B6]" onClick={reset}>
            Try Again
          </Button>
        </div>
      </Card>
    </main>
  );
}
