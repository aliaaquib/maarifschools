"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/errors";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, "Global app error");
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-6">
        <div className="w-full max-w-xl rounded-[28px] border border-[#E5E7EB] bg-white p-8 text-center shadow-[0_18px_60px_rgba(17,24,39,0.10)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6D28D9]">TeachShare</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#111827]">We couldn’t complete that request.</h1>
          <p className="mt-3 text-sm leading-6 text-[#6B7280]">
            Please try again. If the problem continues after a refresh, come back in a moment.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" className="rounded-xl border-[#E5E7EB]" onClick={() => window.location.assign("/")}>
              Go Home
            </Button>
            <Button className="rounded-xl bg-[#6D28D9] text-white hover:bg-[#5B21B6]" onClick={reset}>
              Reload App
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
