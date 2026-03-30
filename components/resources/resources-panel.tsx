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
  onSelectResource: (resource: ResourceRecord) => void;
  onLike: (resource: ResourceRecord) => void;
  onBookmark: (resource: ResourceRecord) => void;
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
  onSelectResource,
  onLike,
  onBookmark,
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

        {loading ? (
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
                : "Your workspace is ready. Add the first teaching resource to start building a shared library."
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
                onDelete={onDelete ? () => onDelete(resource) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <ResourceDetail resource={selectedResource} currentUserId={currentUserId} onDelete={onDelete} />
    </div>
  );
}
