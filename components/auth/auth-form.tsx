"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "");

    try {
      if (mode === "signup") {
        const result = await signUp({ name, email, password });

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
        <Input name="email" type="email" placeholder="Email address" required />
        <Input name="password" type="password" placeholder="Password" required minLength={6} />

        {success ? <p className="text-sm text-muted-foreground">{success}</p> : null}
        {error ? <p className="text-sm text-foreground/80">{error}</p> : null}

        <Button
          className="w-full"
          disabled={isLoading}
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
