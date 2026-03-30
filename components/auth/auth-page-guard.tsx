"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type React from "react";

import { useAuth } from "@/hooks/use-auth";
import { isAuthRequired, isSupabaseConfigured } from "@/lib/supabase";

export function AuthPageGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (isAuthRequired && isSupabaseConfigured && !loading && user) {
      router.replace("/app");
    }
  }, [loading, router, user]);

  if (isAuthRequired && isSupabaseConfigured && loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-border border-t-foreground" />
          <p className="text-sm text-muted-foreground">Checking your account...</p>
        </div>
      </main>
    );
  }

  if (isAuthRequired && isSupabaseConfigured && user) {
    return null;
  }

  return <>{children}</>;
}
