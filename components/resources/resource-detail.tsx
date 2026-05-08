"use client";

import { BookMarked, Download, ExternalLink, Eye, FileText, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ResourceRecord } from "@/types";
import { formatRelativeDate } from "@/lib/utils";

interface ResourceDetailProps {
  resource: ResourceRecord | null;
  currentUserId?: string;
  onDownload?: (resource: ResourceRecord) => void;
  onOpen?: (resource: ResourceRecord) => void;
  onDelete?: (resource: ResourceRecord) => void;
  onClose?: () => void;
}

export function ResourceDetail({ resource, currentUserId, onDownload, onOpen, onDelete, onClose }: ResourceDetailProps) {
  const isOwner = resource && currentUserId ? resource.userId === currentUserId : false;
  const views = resource?.viewCount ?? 0;
  const downloads = resource?.downloadCount ?? 0;
  const usedBy = resource ? Math.max(1, new Set([...resource.likes, ...resource.bookmarks]).size) : 0;

  function handleDownload() {
    if (!resource?.fileUrl) {
      return;
    }

    onDownload?.(resource);

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

  if (!resource) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[980px]" onClick={(event) => event.stopPropagation()}>
      <Card
        className="relative h-[min(88vh,920px)] w-full overflow-y-auto rounded-[28px] border-[#E5E7EB] bg-white p-6 shadow-[0_32px_64px_rgba(17,24,39,0.14)]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full border border-[#E5E7EB] bg-white p-2 text-[#6B7280] transition hover:bg-[#F9FAFB] hover:text-[#111827]"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Resource details</p>
            <h3 className="mt-2 text-xl font-semibold text-foreground">{resource.title}</h3>
          </div>

          {renderPreview()}

          <p className="break-words text-sm leading-6 text-muted-foreground">{resource.description}</p>

          <div className="flex flex-wrap gap-2">
            <Badge>{resource.resourceScope === "common" ? "Common resource" : "School resource"}</Badge>
            {resource.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-muted p-4">
            <p className="text-sm font-medium text-foreground">{resource.userName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Uploaded {formatRelativeDate(resource.createdAt)}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">File type: {resource.fileType.toUpperCase()}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Visibility: {resource.resourceScope === "common" ? "Shared with everyone" : "Shared within one school"}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                {views}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Download className="h-4 w-4" />
                {downloads}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BookMarked className="h-4 w-4" />
                {resource.bookmarks.length}
              </span>
            </div>
            <p className="mt-4 text-sm text-foreground">Used by {usedBy} teachers</p>
          </div>

          <div className="grid gap-2">
            {resource.fileUrl ? (
              <>
                <Button variant="outline" className="w-full justify-start text-left" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                  Download file
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left"
                  onClick={() => {
                    onOpen?.(resource);
                    window.open(resource.fileUrl, "_blank", "noopener,noreferrer");
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in new tab
                </Button>
              </>
            ) : null}
            {onDelete && isOwner ? (
              <Button variant="ghost" className="w-full justify-start text-left" onClick={() => onDelete(resource)}>
                <Trash2 className="h-4 w-4" />
                Delete resource
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
      </div>
    </div>
  );
}
