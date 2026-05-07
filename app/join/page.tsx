"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function JoinClassPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedCode = inviteCode.trim();
    if (!trimmedCode) {
      return;
    }

    router.push(`/join/${encodeURIComponent(trimmedCode)}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-6 py-12">
      <Card className="w-full max-w-[520px] rounded-[24px] border-[#E5E7EB] bg-white p-8 shadow-[0_16px_36px_rgba(17,24,39,0.06)]">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[#6D28D9]">
            <KeyRound className="h-6 w-6" />
          </div>
          <p className="text-sm uppercase tracking-[0.18em] text-[#9CA3AF]">Join a class</p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#111827]">Enter your invite code</h1>
          <p className="text-sm leading-6 text-[#6B7280]">
            Use the class code your teacher shared with you to join the classroom workspace.
          </p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <Input
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            placeholder="e.g. ABC123"
            className="h-12 text-center text-base tracking-[0.12em] uppercase"
          />
          <Button className="w-full h-11" type="submit">
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[#6B7280]">
          Need a teacher account instead?{" "}
          <Link href="/signup" className="font-medium text-[#6D28D9] underline underline-offset-4">
            Create one
          </Link>
        </p>
      </Card>
    </main>
  );
}
