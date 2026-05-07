"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { toUserFacingError } from "@/lib/errors";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      await requestPasswordReset(email.trim());
      setMessage("If that email is valid, a password reset link has been sent.");
    } catch (submitError) {
      setError(toUserFacingError(submitError, "We couldn't send the reset link right now. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <Card className="w-full max-w-md p-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Password recovery</p>
          <h1 className="text-3xl font-semibold text-foreground">Reset your password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email address and we’ll send you a link to choose a new password.
          </p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            required
          />

          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          {error ? <p className="text-sm text-foreground/80">{error}</p> : null}

          <Button className="w-full" type="submit" disabled={loading} loading={loading} loadingText="Sending link...">
            Send reset link
          </Button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          Remembered your password?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
