"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { toUserFacingError } from "@/lib/errors";
import { getSchools } from "@/lib/supabase-data";
import { getSupabaseConnectionErrorMessage, isNetworkFetchError, isSupabaseConfigured } from "@/lib/supabase";
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
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [nextDestination, setNextDestination] = useState("/app");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setNextDestination(params.get("next") || "/app");

    if (mode !== "signup") {
      return;
    }

    const schoolIdFromQuery = params.get("schoolId") || "";
    if (schoolIdFromQuery) {
      setSelectedSchoolId(schoolIdFromQuery);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "signup") {
      return;
    }

    let cancelled = false;

    async function loadSchools() {
      if (!cancelled) {
        setLoadingSchools(true);
        setError("");
      }

      if (!isSupabaseConfigured) {
        if (!cancelled) {
          setLoadingSchools(false);
          setError(getSupabaseConnectionErrorMessage("load schools"));
        }
        return;
      }

      try {
        const nextSchools = await getSchools();
        if (!cancelled) {
          setSchools(nextSchools);
        }
      } catch (schoolError) {
        if (!cancelled) {
          setError(
            isNetworkFetchError(schoolError)
              ? getSupabaseConnectionErrorMessage("load schools")
              : toUserFacingError(schoolError, "We could not load schools right now."),
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
    const schoolId = selectedSchoolId || String(formData.get("schoolId") ?? "");

    try {
      if (mode === "signup") {
        if (!schoolId) {
          throw new Error("Select a school to continue.");
        }

        const result = await signUp({ name, email, password, schoolId });

        if (result.needsEmailConfirmation) {
          setSuccess("Account created. Check your email to confirm your account, then sign in.");
          const nextLoginHref = `/login${nextDestination ? `?next=${encodeURIComponent(nextDestination)}` : ""}`;
          router.replace(nextLoginHref);
          return;
        }
      } else {
        await signIn({ email, password });
      }

      router.replace(nextDestination);
    } catch (submitError) {
      setError(
        toUserFacingError(submitError, "Something went wrong. Please try again."),
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
            value={selectedSchoolId}
            onChange={(event) => setSelectedSchoolId(event.target.value)}
          >
            <option value="">
              {loadingSchools ? "Loading schools..." : error ? "Unable to load schools" : "Select School"}
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
        {mode === "signup" && error ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => {
              setSchools([]);
              setSuccess("");
              setError("");
              setLoadingSchools(true);
              void (async () => {
                try {
                  const nextSchools = await getSchools();
                  setSchools(nextSchools);
                } catch (schoolError) {
                  setError(
                    isNetworkFetchError(schoolError)
                      ? getSupabaseConnectionErrorMessage("load schools")
                      : toUserFacingError(schoolError, "We could not load schools right now."),
                  );
                } finally {
                  setLoadingSchools(false);
                }
              })();
            }}
            disabled={loadingSchools}
          >
            Retry loading schools
          </Button>
        ) : null}

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
          href={
            mode === "signup"
              ? `/login${nextDestination ? `?next=${encodeURIComponent(nextDestination)}` : ""}`
              : `/signup${[
                  nextDestination ? `next=${encodeURIComponent(nextDestination)}` : "",
                  selectedSchoolId ? `schoolId=${encodeURIComponent(selectedSchoolId)}` : "",
                ]
                  .filter(Boolean)
                  .join("&")
                  .replace(/^/, "?")}`
          }
          className="font-medium text-foreground underline underline-offset-4"
        >
          {mode === "signup" ? "Sign in" : "Create one"}
        </Link>
      </p>
    </Card>
  );
}
