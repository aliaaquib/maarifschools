"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { toUserFacingError } from "@/lib/errors";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (password.length < 6) {
        throw new Error("Use at least 6 characters for your new password.");
      }

      if (password !== confirmPassword) {
        throw new Error("Your passwords do not match.");
      }

      await updatePassword(password);
      setMessage("Your password has been updated. You can sign in now.");
      window.setTimeout(() => {
        router.replace("/login");
      }, 1200);
    } catch (submitError) {
      setError(toUserFacingError(submitError, "We couldn't update your password right now. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <Card className="w-full max-w-md p-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Choose a new password</p>
          <h1 className="text-3xl font-semibold text-foreground">Set your new password</h1>
          <p className="text-sm text-muted-foreground">
            Enter a new password for your account, then we’ll send you back to sign in.
          </p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New password"
            required
            minLength={6}
          />
          <Input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm new password"
            required
            minLength={6}
          />

          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          {error ? <p className="text-sm text-foreground/80">{error}</p> : null}

          <Button className="w-full" type="submit" disabled={loading} loading={loading} loadingText="Updating password...">
            Update password
          </Button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          Need to go back?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Return to sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
