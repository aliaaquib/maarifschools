"use client";

import { GraduationCap, School, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

interface RoleSelectionModalProps {
  open: boolean;
  onClose: () => void;
}

export function RoleSelectionModal({ open, onClose }: RoleSelectionModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="animate-scale-in w-full max-w-3xl rounded-[28px] border border-border bg-background p-6 shadow-sm md:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Get started</p>
            <h2 className="mt-2 text-3xl font-semibold text-foreground">Choose how you want to continue</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 transition-all duration-150 hover:-translate-y-[2px] hover:shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground">
              <School className="h-5 w-5" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-foreground">Continue as Teacher</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Share resources, collaborate, and contribute.
            </p>
            <div className="mt-6">
              <Button
                className="w-full"
                onClick={() => {
                  onClose();
                  router.push("/signup");
                }}
              >
                Continue
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 transition-all duration-150 hover:-translate-y-[2px] hover:shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-foreground">Continue as Student</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Access learning materials (coming soon).
            </p>
            <div className="mt-6">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  onClose();
                  router.push("/coming-soon");
                }}
              >
                Coming Soon
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
