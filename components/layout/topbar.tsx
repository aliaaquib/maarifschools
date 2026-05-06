"use client";

import { Bell, ChevronDown, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SidebarMobileTrigger } from "@/components/layout/sidebar";
import { initials } from "@/lib/utils";

interface TopbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onOpenLessonPlanner: () => void;
  schoolName?: string | null;
  userName?: string | null;
  userAvatar?: string | null;
  isMobileSidebarOpen: boolean;
  onToggleMobileSidebar: () => void;
}

export function Topbar({
  search,
  onSearchChange,
  userName,
  userAvatar,
  isMobileSidebarOpen,
  onToggleMobileSidebar,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-[#E5E7EB] bg-white px-4 py-3 md:px-6">
      <SidebarMobileTrigger isOpen={isMobileSidebarOpen} onToggle={onToggleMobileSidebar} />

      <div className="mx-auto flex max-w-[520px] flex-1 items-center xl:ml-0 xl:mr-auto">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search resources, discussions, teachers..."
            className="h-10 rounded-2xl border-[#E5E7EB] bg-[#F9FAFB] pl-11 pr-20 text-[#111827] placeholder:text-[#9CA3AF] focus:ring-[#6D28D9]/10"
          />
          <div className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs font-medium text-[#6B7280] md:flex">
            <span className="text-sm">⌘</span>
            <span>K</span>
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#111827] transition-all duration-150 hover:bg-[#F3F4F6]">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-semibold text-white">
            3
          </span>
        </button>

        <div className="hidden items-center gap-3 rounded-full pl-1 pr-1 md:flex">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#111827] text-sm font-semibold text-white">
            {userAvatar ? (
              <img src={userAvatar} alt={userName ?? "Teacher"} className="h-full w-full object-cover" />
            ) : (
              initials(userName || "Teacher")
            )}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-[#111827]">{userName || "Teacher"}</p>
            <p className="text-sm text-[#6B7280]">Teacher</p>
          </div>
          <ChevronDown className="h-4 w-4 text-[#6B7280]" />
        </div>
      </div>
    </header>
  );
}
