"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { getSchools } from "@/lib/supabase-data";
import { SchoolRecord } from "@/types";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(mode === "signup");
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (mode !== "signup") {
      return;
    }

    let cancelled = false;

    async function loadSchools() {
      try {
        const nextSchools = await getSchools();
        if (!cancelled) {
          setSchools(nextSchools);
        }
      } catch (schoolError) {
        if (!cancelled) {
          setError(
            schoolError instanceof Error
              ? schoolError.message
              : "We could not load schools right now.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSchools(false);
        }
      }
    }

    void loadSchools();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "");
    const schoolId = String(formData.get("schoolId") ?? "");

    try {
      if (mode === "signup") {
        if (!schoolId) {
          throw new Error("Select a school to continue.");
        }

        const result = await signUp({ name, email, password, schoolId });

        if (result.needsEmailConfirmation) {
          setSuccess("Account created. Check your email to confirm your account, then sign in.");
          router.replace("/login");
          return;
        }
      } else {
        await signIn({ email, password });
      }

      router.replace("/app");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md animate-fade-up p-8">
      <div className="mb-8 space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
          Teacher collaboration
        </p>
        <h1 className="text-3xl font-semibold text-foreground">
          {mode === "signup" ? "Create your workspace" : "Welcome back"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Share resources, coordinate lesson plans, and keep your school community aligned.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === "signup" ? <Input name="name" placeholder="Full name" required /> : null}
        {mode === "signup" ? (
          <select
            name="schoolId"
            required
            disabled={loadingSchools || schools.length === 0}
            className="flex h-11 w-full rounded-lg border border-border bg-card px-4 text-sm font-normal text-foreground outline-none transition-all duration-150 focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            defaultValue=""
          >
            <option value="">
              {loadingSchools ? "Loading schools..." : "Select School"}
            </option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        ) : null}
        <Input name="email" type="email" placeholder="Email address" required />
        <Input name="password" type="password" placeholder="Password" required minLength={6} />

        {mode === "signup" && !loadingSchools && schools.length === 0 && !error ? (
          <p className="text-sm text-foreground/80">No schools are available yet. Add schools in Supabase before creating accounts.</p>
        ) : null}
        {success ? <p className="text-sm text-muted-foreground">{success}</p> : null}
        {error ? <p className="text-sm text-foreground/80">{error}</p> : null}

        <Button
          className="w-full"
          disabled={isLoading || (mode === "signup" && (loadingSchools || schools.length === 0))}
          type="submit"
          loading={isLoading}
          loadingText={mode === "signup" ? "Creating account..." : "Signing in..."}
        >
          {mode === "signup" ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {mode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
        <Link
          href={mode === "signup" ? "/login" : "/signup"}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {mode === "signup" ? "Sign in" : "Create one"}
        </Link>
      </p>
    </Card>
  );
}
