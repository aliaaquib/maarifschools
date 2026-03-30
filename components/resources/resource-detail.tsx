"use client";

import { Download, ExternalLink, FileText, Sparkles, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ResourceRecord } from "@/types";
import { formatRelativeDate } from "@/lib/utils";

interface ResourceDetailProps {
  resource: ResourceRecord | null;
  currentUserId?: string;
  onDelete?: (resource: ResourceRecord) => void;
}

export function ResourceDetail({ resource, currentUserId, onDelete }: ResourceDetailProps) {
  const [topic, setTopic] = useState("");
  const [lessonPlan, setLessonPlan] = useState("");
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [error, setError] = useState("");
  const isOwner = resource && currentUserId ? resource.userId === currentUserId : false;

  function handleDownload() {
    if (!resource?.fileUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = resource.fileUrl;
    link.download = resource.fileName ?? `${resource.title}.${resource.fileType}`;
    link.target = "_blank";
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function renderPreview() {
    if (!resource?.fileUrl) {
      return (
        <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/60 p-6 text-center">
          <div>
            <p className="text-sm font-medium text-foreground">Preview unavailable</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This resource does not have a previewable file attached yet.
            </p>
          </div>
        </div>
      );
    }

    if (resource.fileType === "image") {
      return (
        <div className="overflow-hidden rounded-2xl border border-border bg-muted/40">
          <img src={resource.fileUrl} alt={resource.title} className="h-auto w-full object-cover" />
        </div>
      );
    }

    if (resource.fileType === "pdf" || resource.fileType === "link") {
      return (
        <div className="overflow-hidden rounded-2xl border border-border bg-muted/40">
          <iframe
            src={resource.fileUrl}
            title={resource.title}
            className="h-[360px] w-full bg-white"
          />
        </div>
      );
    }

    return (
      <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/60 p-6 text-center">
        <div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground">
            <FileText className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">Preview unavailable in app</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Download or open this file in a new tab to view it.
          </p>
        </div>
      </div>
    );
  }

  async function handleGenerateLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextTopic = topic.trim() || resource?.title || "";
    if (!nextTopic) {
      setError("Enter a topic first.");
      return;
    }

    setLoadingLesson(true);
    setError("");

    try {
      const response = await fetch("/api/generate-lesson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic: nextTopic }),
      });

      const payload = (await response.json()) as { lessonPlan?: string; error?: string };
      if (!response.ok || !payload.lessonPlan) {
        throw new Error(payload.error ?? "We could not generate the lesson plan.");
      }

      setLessonPlan(payload.lessonPlan);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We could not generate the lesson plan.",
      );
    } finally {
      setLoadingLesson(false);
    }
  }

  if (!resource) {
    return (
      <Card className="sticky top-24 hidden h-fit p-6 xl:block">
        <p className="text-sm font-semibold text-foreground">Resource preview</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Select a resource from the feed to see more context and quick actions.
        </p>
      </Card>
    );
  }

  return (
    <Card className="sticky top-24 hidden h-fit animate-fade-up p-6 xl:block">
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Preview</p>
          <h3 className="mt-2 text-xl font-semibold text-foreground">{resource.title}</h3>
        </div>

        {renderPreview()}

        <p className="text-sm leading-6 text-muted-foreground">{resource.description}</p>

        <div className="flex flex-wrap gap-2">
          {resource.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-muted p-4">
          <p className="text-sm font-medium text-foreground">{resource.userName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Uploaded {formatRelativeDate(resource.createdAt)}
          </p>
        </div>

        <div className="grid gap-2">
          {resource.fileUrl ? (
            <>
              <Button variant="outline" className="w-full justify-start" onClick={handleDownload}>
                <Download className="h-4 w-4" />
                Download file
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => window.open(resource.fileUrl, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-4 w-4" />
                Open in new tab
              </Button>
            </>
          ) : null}
          {onDelete && isOwner ? (
            <Button variant="ghost" className="w-full justify-start" onClick={() => onDelete(resource)}>
              <Trash2 className="h-4 w-4" />
              Delete resource
            </Button>
          ) : null}
        </div>

        <form className="space-y-3 rounded-2xl border border-border bg-card p-4" onSubmit={handleGenerateLesson}>
          <div>
            <p className="text-sm font-medium text-foreground">Generate lesson plan</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter a topic to create a classroom-ready lesson outline.
            </p>
          </div>
          <Input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Enter topic"
          />
          {error ? <p className="text-sm text-foreground/80">{error}</p> : null}
          <Button className="w-full justify-start" disabled={loadingLesson} type="submit">
            <Sparkles className="h-4 w-4" />
            {loadingLesson ? "Generating..." : "Generate Lesson Plan"}
          </Button>
        </form>

        {lessonPlan ? (
          <div className="rounded-2xl border border-border bg-muted p-4">
            <p className="text-sm font-medium text-foreground">Lesson plan</p>
            <pre className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
              {lessonPlan}
            </pre>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
