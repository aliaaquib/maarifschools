"use client";

import { startTransition, useDeferredValue } from "react";
import { Search } from "lucide-react";

import { GRADE_OPTIONS, SUBJECT_OPTIONS } from "@/lib/constants";
import { ResourceFilters } from "@/types";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  filters: ResourceFilters;
  onFiltersChange: (filters: ResourceFilters) => void;
}

export function SearchBar({ filters, onFiltersChange }: SearchBarProps) {
  const deferredSearch = useDeferredValue(filters.search);

  return (
    <div className="grid gap-4 rounded-2xl border border-border bg-card p-6 md:grid-cols-3">
      <div className="space-y-2">
        <p className="text-sm font-normal text-muted-foreground">
          Search
        </p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(event) =>
              startTransition(() =>
                onFiltersChange({ ...filters, search: event.target.value }),
              )
            }
            placeholder="Search by title, tag, or uploader"
            className="pl-10"
          />
        </div>
        <p className="text-sm font-normal text-muted-foreground">
          {deferredSearch ? `Searching for “${deferredSearch}”` : "Browse everything"}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-normal text-muted-foreground">
          Subject
        </p>
        <Select
          value={filters.subject}
          placeholder="All subjects"
          options={SUBJECT_OPTIONS}
          onChange={(event) =>
            startTransition(() =>
              onFiltersChange({ ...filters, subject: event.target.value }),
            )
          }
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-normal text-muted-foreground">
          Grade
        </p>
        <Select
          value={filters.grade}
          placeholder="All grades"
          options={GRADE_OPTIONS}
          onChange={(event) =>
            startTransition(() =>
              onFiltersChange({ ...filters, grade: event.target.value }),
            )
          }
        />
      </div>
    </div>
  );
}
