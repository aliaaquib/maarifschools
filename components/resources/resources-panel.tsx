"use client";

import { FolderOpen, Plus } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { ResourceCard } from "@/components/resources/resource-card";
import { ResourceDetail } from "@/components/resources/resource-detail";
import { ResourceRecord } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ResourcesPanelProps {
  title: string;
  description: string;
  resources: ResourceRecord[];
  loading: boolean;
  hasActiveFilters?: boolean;
  currentUserId?: string;
  selectedResource: ResourceRecord | null;
  summaryStats?: Array<{ label: string; value: string | number }>;
  featuredSections?: Array<{ title: string; description: string; resources: ResourceRecord[] }>;
  emptyDescription?: string;
  showResourceGrid?: boolean;
  onSelectResource: (resource: ResourceRecord) => void;
  onLike: (resource: ResourceRecord) => void;
  onBookmark: (resource: ResourceRecord) => void;
  onDownload?: (resource: ResourceRecord) => void;
  onDelete?: (resource: ResourceRecord) => void;
  onOpenUpload?: () => void;
}

export function ResourcesPanel({
  title,
  description,
  resources,
  loading,
  hasActiveFilters,
  currentUserId,
  selectedResource,
  summaryStats,
  featuredSections,
  emptyDescription,
  showResourceGrid = true,
  onSelectResource,
  onLike,
  onBookmark,
  onDownload,
  onDelete,
  onOpenUpload,
}: ResourcesPanelProps) {
  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-8">
        <div className="space-y-2">
          <h2 className="max-w-3xl text-3xl font-semibold text-foreground">{title}</h2>
          <p className="max-w-2xl text-sm font-normal text-muted-foreground">{description}</p>
        </div>

        {summaryStats?.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {summaryStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-3 text-3xl font-semibold text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {featuredSections?.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {featuredSections.map((section) => (
              <div key={section.title} className="rounded-2xl border border-border bg-card p-6">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{section.title}</p>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </div>
                <div className="mt-5 space-y-3">
                  {section.resources.length > 0 ? section.resources.map((resource) => (
                    <button
                      key={resource.id}
                      className="flex w-full items-start justify-between rounded-xl border border-border bg-background px-4 py-3 text-left transition hover:-translate-y-[1px] hover:bg-muted/40"
                      onClick={() => onSelectResource(resource)}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{resource.title}</p>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{resource.userName}</p>
                      </div>
                      <span className="text-sm text-muted-foreground">{resource.bookmarks.length} saves</span>
                    </button>
                  )) : (
                    <p className="text-sm text-muted-foreground">Nothing here yet.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {showResourceGrid ? loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-border bg-card p-6">
                <Skeleton className="mb-4 h-11 w-11 rounded-2xl" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-1 h-4 w-4/5" />
                <div className="mt-6 flex gap-2">
                  <Skeleton className="h-7 w-20 rounded-full" />
                  <Skeleton className="h-7 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : resources.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={hasActiveFilters ? "No results found" : "No resources yet"}
            description={
              hasActiveFilters
                ? "Try a different search term or clear one of the filters."
                : (emptyDescription ?? "No resources yet. Be the first to contribute.")
            }
            action={
              onOpenUpload && !hasActiveFilters ? (
                <Button onClick={onOpenUpload}>
                  <Plus className="h-4 w-4" />
                  Upload Resource
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {resources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                currentUserId={currentUserId}
                onSelect={() => onSelectResource(resource)}
                onLike={() => onLike(resource)}
                onBookmark={() => onBookmark(resource)}
                onDownload={onDownload ? () => onDownload(resource) : undefined}
                onDelete={onDelete ? () => onDelete(resource) : undefined}
              />
            ))}
          </div>
        ) : null}
      </div>

      <ResourceDetail
        resource={selectedResource}
        currentUserId={currentUserId}
        onDownload={onDownload}
        onOpen={onSelectResource}
        onDelete={onDelete}
      />
    </div>
  );
}
