"use client";

import { Search, Sparkles } from "lucide-react";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SidebarMobileTrigger } from "@/components/layout/sidebar";

interface TopbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onOpenLessonPlanner: () => void;
  schoolName?: string | null;
  isMobileSidebarOpen: boolean;
  onToggleMobileSidebar: () => void;
}

export function Topbar({
  search,
  onSearchChange,
  onOpenLessonPlanner,
  schoolName,
  isMobileSidebarOpen,
  onToggleMobileSidebar,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-4 backdrop-blur md:px-8">
      <SidebarMobileTrigger isOpen={isMobileSidebarOpen} onToggle={onToggleMobileSidebar} />

      <div className="relative max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search resources, tags, and contributors..."
          className="pl-10"
        />
      </div>

      <Button variant="outline" className="hidden md:inline-flex" onClick={onOpenLessonPlanner}>
        <Sparkles className="h-4 w-4" />
        Lesson planning
      </Button>

      {schoolName ? (
        <div className="hidden rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground md:block">
          {schoolName}
        </div>
      ) : null}

      <ThemeToggle />
    </header>
  );
}
