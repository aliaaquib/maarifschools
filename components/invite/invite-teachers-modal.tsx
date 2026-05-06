"use client";

import { Copy, ExternalLink, Mail, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toUserFacingError } from "@/lib/errors";

interface InviteTeachersModalProps {
  open: boolean;
  schoolId?: string | null;
  schoolName?: string | null;
  onClose: () => void;
}

export function InviteTeachersModal({
  open,
  schoolId,
  schoolName,
  onClose,
}: InviteTeachersModalProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const inviteUrl = useMemo(() => {
    if (!schoolId || typeof window === "undefined") {
      return "";
    }

    const url = new URL("/signup", window.location.origin);
    url.searchParams.set("schoolId", schoolId);
    return url.toString();
  }, [schoolId]);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setError("");
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  async function handleCopy() {
    if (!inviteUrl) {
      setError("We could not create an invite link right now.");
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setError("");
      window.setTimeout(() => setCopied(false), 2200);
    } catch (copyError) {
      setError(toUserFacingError(copyError, "We could not copy the invite link."));
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-scale-in w-full max-w-xl rounded-[28px] border border-border bg-background p-6 shadow-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-normal text-muted-foreground">Invite teachers</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">Share your school invite</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Invite teachers to join{" "}
              <span className="font-medium text-foreground">
                {schoolName || "your school"}
              </span>{" "}
              with a direct signup link.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-muted/60 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[#6D28D9]">
              <Users className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">School-based invite</p>
              <p className="text-sm text-muted-foreground">
                Teachers who open this link will arrive on signup with your school already selected.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <p className="text-sm font-medium text-foreground">Invite link</p>
          <Input readOnly value={inviteUrl} className="h-11" />
        </div>

        {copied ? <p className="mt-3 text-sm text-muted-foreground">Invite link copied.</p> : null}
        {error ? <p className="mt-3 text-sm text-foreground/80">{error}</p> : null}

        <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button variant="ghost" type="button" onClick={onClose}>
            Close
          </Button>
          <Button variant="outline" type="button" onClick={() => window.open(inviteUrl, "_blank", "noopener,noreferrer")}>
            <ExternalLink className="h-4 w-4" />
            Open invite
          </Button>
          <Button type="button" onClick={() => void handleCopy()}>
            <Copy className="h-4 w-4" />
            {copied ? "Copied" : "Copy invite URL"}
          </Button>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              You can paste this link into email, WhatsApp, or your school staff chat to invite teachers directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
