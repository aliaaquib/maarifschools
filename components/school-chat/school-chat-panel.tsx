"use client";

import { FormEvent, useState } from "react";
import { Send, School2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { SchoolMessage } from "@/types";
import { formatRelativeDate, initials } from "@/lib/utils";

interface SchoolChatPanelProps {
  schoolName?: string | null;
  messages: SchoolMessage[];
  loading: boolean;
  currentUserId: string;
  onSendMessage: (content: string) => Promise<void>;
}

export function SchoolChatPanel({
  schoolName,
  messages,
  loading,
  currentUserId,
  onSendMessage,
}: SchoolChatPanelProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const content = String(formData.get("content") ?? "").trim();

    if (!content) {
      return;
    }

    setSending(true);
    setError("");

    try {
      await onSendMessage(content);
      form.reset();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">School Chat</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Messages shared here are visible only to teachers in {schoolName ?? "your school"}.
        </p>
      </div>

      <Card className="p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Textarea name="content" placeholder="Share an update with teachers in your school..." required />
          {error ? <p className="text-sm text-foreground/80">{error}</p> : null}
          <Button type="submit" loading={sending} loadingText="Sending..." disabled={sending}>
            <Send className="h-4 w-4" />
            Send message
          </Button>
        </form>
      </Card>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="p-6">
              <div className="h-5 w-1/2 animate-pulse rounded-lg bg-muted" />
              <div className="mt-3 h-4 w-full animate-pulse rounded-lg bg-muted" />
            </Card>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <EmptyState
          icon={School2}
          title="No school messages yet"
          description="Start the conversation and share something useful with teachers in your school."
        />
      ) : (
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwn = message.userId === currentUserId;

            return (
              <Card key={message.id} className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold text-foreground">
                    {message.userAvatar ? (
                      <img
                        src={message.userAvatar}
                        alt={message.userName}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      initials(message.userName)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {message.userName}
                          {isOwn ? <span className="ml-2 text-muted-foreground">(You)</span> : null}
                        </p>
                        <p className="text-sm text-muted-foreground">{formatRelativeDate(message.createdAt)}</p>
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{message.content}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
