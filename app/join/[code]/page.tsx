"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Copy, School2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { toUserFacingError } from "@/lib/errors";
import { getClassByInviteCode, joinClassByInviteCode } from "@/lib/supabase-data";
import { ClassRecord } from "@/types";

export default function JoinClassInvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const inviteCode = Array.isArray(params?.code) ? params?.code[0] : params?.code ?? "";
  const [classRecord, setClassRecord] = useState<ClassRecord | null>(null);
  const [pageError, setPageError] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadClass() {
      setPageLoading(true);
      setPageError("");

      try {
        const nextClass = await getClassByInviteCode(inviteCode);
        if (!cancelled) {
          if (!nextClass) {
            setPageError("This class invite is no longer available.");
          }
          setClassRecord(nextClass);
        }
      } catch (error) {
        if (!cancelled) {
          setPageError(toUserFacingError(error, "We could not load this class invite right now."));
        }
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    }

    void loadClass();
    return () => {
      cancelled = true;
    };
  }, [inviteCode]);

  async function handleJoinClass() {
    if (!user) {
      return;
    }

    setJoining(true);
    setPageError("");

    try {
      await joinClassByInviteCode(inviteCode, user.id);
      setJoined(true);
    } catch (error) {
      setPageError(toUserFacingError(error, "We could not join this class right now."));
    } finally {
      setJoining(false);
    }
  }

  const authHref = `/login?next=${encodeURIComponent(`/join/${inviteCode}`)}`;
  const signupHref = `/signup?next=${encodeURIComponent(`/join/${inviteCode}`)}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-6 py-12">
      <Card className="w-full max-w-[620px] rounded-[28px] border-[#E5E7EB] bg-white p-8 shadow-[0_16px_36px_rgba(17,24,39,0.06)]">
        {pageLoading ? (
          <div className="space-y-4 py-10 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#6D28D9]" />
            <p className="text-sm text-[#6B7280]">Checking your class invite...</p>
          </div>
        ) : classRecord ? (
          <div className="space-y-6">
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F5F3FF] text-[#6D28D9]">
                <School2 className="h-7 w-7" />
              </div>
              <p className="text-sm uppercase tracking-[0.18em] text-[#9CA3AF]">Class invitation</p>
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#111827]">{classRecord.name}</h1>
              <p className="text-sm text-[#6B7280]">
                {classRecord.subject} • {classRecord.grade}
              </p>
              <p className="mx-auto max-w-[480px] text-sm leading-6 text-[#6B7280]">
                {classRecord.description || "Join this class to access stream updates, resources, assignments, and discussions."}
              </p>
            </div>

            <div className="grid gap-4 rounded-[20px] border border-[#E5E7EB] bg-[#FCFCFD] p-5 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-[#9CA3AF]">Invite code</p>
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-lg font-semibold text-[#111827]">{classRecord.inviteCode}</p>
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-[#6B7280] transition hover:bg-white hover:text-[#111827]"
                    onClick={() => void navigator.clipboard.writeText(classRecord.inviteCode)}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-[#9CA3AF]">Current class size</p>
                <p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-[#111827]">
                  <Users className="h-4.5 w-4.5 text-[#6D28D9]" />
                  {classRecord.studentCount} students
                </p>
              </div>
            </div>

            {joined ? (
              <div className="rounded-[20px] border border-[#DCFCE7] bg-[#F0FDF4] p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#16A34A]" />
                  <div>
                    <p className="text-sm font-semibold text-[#166534]">You have joined this class.</p>
                    <p className="mt-1 text-sm text-[#166534]/80">
                      Your membership is saved. Open the app to continue into the classroom workspace.
                    </p>
                    <Button className="mt-4" onClick={() => router.push("/app")}>
                      Open app
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : user ? (
              <Button className="h-11 w-full" onClick={() => void handleJoinClass()} disabled={joining} loading={joining} loadingText="Joining class...">
                Join class
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <div className="rounded-[20px] border border-[#E5E7EB] bg-[#FAFAFA] p-5 text-center">
                <p className="text-sm font-medium text-[#111827]">Sign in to join this class</p>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Use your account first, then we will bring you right back to this invite.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={authHref}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-[#6D28D9] px-4 text-sm font-medium text-white transition hover:bg-[#5B21B6]"
                  >
                    Sign in
                  </Link>
                  <Link
                    href={signupHref}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#111827] transition hover:bg-[#F9FAFB]"
                  >
                    Create account
                  </Link>
                </div>
              </div>
            )}

            {pageError ? <p className="text-sm text-[#7C2D12]">{pageError}</p> : null}
          </div>
        ) : (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F3F4F6] text-[#6B7280]">
              <School2 className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#111827]">Class invite unavailable</h1>
              <p className="text-sm leading-6 text-[#6B7280]">
                {pageError || "This invite could not be found. Ask your teacher for a fresh link or invite code."}
              </p>
            </div>
            <Link
              href="/join"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#111827] transition hover:bg-[#F9FAFB]"
            >
              Enter another code
            </Link>
          </div>
        )}
      </Card>
    </main>
  );
}
