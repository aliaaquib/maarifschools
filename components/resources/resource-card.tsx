"use client";

import {
  BookMarked,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Heart,
  Presentation,
  StickyNote,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRelativeDate } from "@/lib/utils";
import { ResourceRecord } from "@/types";

interface ResourceCardProps {
  resource: ResourceRecord;
  currentUserId?: string;
  onSelect: () => void;
  onLike: () => void;
  onBookmark: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
}

function handleDownload(resource: ResourceRecord) {
  if (!resource.fileUrl) {
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

function ResourceIcon({ type }: { type: ResourceRecord["fileType"] }) {
  if (type === "ppt") {
    return <Presentation className="h-5 w-5" />;
  }

  if (type === "link") {
    return <ExternalLink className="h-5 w-5" />;
  }

  if (type === "docx") {
    return <StickyNote className="h-5 w-5" />;
  }

  return <FileText className="h-5 w-5" />;
}

export function ResourceCard({
  resource,
  currentUserId,
  onSelect,
  onLike,
  onBookmark,
  onDownload,
  onDelete,
}: ResourceCardProps) {
  const hasLiked = currentUserId ? resource.likes.includes(currentUserId) : false;
  const hasBookmarked = currentUserId ? resource.bookmarks.includes(currentUserId) : false;
  const isOwner = currentUserId ? resource.userId === currentUserId : false;
  const primaryTag = resource.tags[0] ?? "General";
  const secondaryTag = resource.tags[1] ?? resource.fileType.toUpperCase();
  const views = resource.viewCount ?? Math.max(3, resource.likes.length + resource.bookmarks.length + 2);
  const downloads = resource.downloadCount ?? Math.max(0, resource.bookmarks.length);
  const saves = resource.bookmarks.length;

  return (
    <Card className="group rounded-2xl border border-border p-6 transition-all duration-150 ease-out hover:-translate-y-[2px] hover:shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <button className="flex-1 text-left" onClick={onSelect}>
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground transition-colors duration-150 group-hover:bg-background">
            <ResourceIcon type={resource.fileType} />
          </div>
          <div className="space-y-2">
            <h3 className="line-clamp-1 text-lg font-semibold text-foreground">{resource.title}</h3>
            <p className="line-clamp-2 max-w-md text-sm font-normal text-muted-foreground">
              {resource.description}
            </p>
          </div>
        </button>

        {onDelete && isOwner ? (
          <Button variant="ghost" size="sm" onClick={onDelete}>
            Delete
          </Button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>{primaryTag}</Badge>
        <Badge>{secondaryTag}</Badge>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span>{resource.userName}</span>
        <span>{formatRelativeDate(resource.createdAt)}</span>
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
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
          {saves}
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-sm font-normal text-muted-foreground">Used across collaborative planning</p>

        <div className="flex items-center gap-2">
          {resource.fileUrl ? (
            <Button variant="ghost" size="sm" onClick={onDownload ?? (() => handleDownload(resource))}>
              <Download className="h-4 w-4" />
            </Button>
          ) : null}
          <Button variant={hasLiked ? "secondary" : "ghost"} size="sm" onClick={onLike}>
            <Heart className="h-4 w-4" />
            {resource.likes.length}
          </Button>
          <Button
            variant={hasBookmarked ? "secondary" : "ghost"}
            size="sm"
            onClick={onBookmark}
          >
            <BookMarked className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
