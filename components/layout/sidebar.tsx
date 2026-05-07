"use client";

import { BookOpenText, LogOut, PanelLeftClose, PanelLeftOpen, School2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn, initials } from "@/lib/utils";
import { NAV_ITEMS, NavigationItemId } from "@/lib/constants";

interface SidebarProps {
  activeItem: NavigationItemId;
  schoolName?: string | null;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onNavigate: (id: NavigationItemId) => void;
  onLogOut: () => void;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

function SidebarNav({
  activeItem,
  onNavigate,
}: Pick<SidebarProps, "activeItem" | "onNavigate">) {
  return (
    <nav className="mt-8 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 pb-3">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeItem === item.id;
        const showNewBadge = item.id === "school-chat";

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              "flex h-10 items-center justify-between rounded-2xl px-3.5 text-sm text-[#4B5563] transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#F9FAFB] hover:text-[#111827]",
              isActive && "bg-[#F5F3FF] font-semibold text-[#6D28D9]",
            )}
          >
            <span className="flex items-center gap-3">
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </span>
            {showNewBadge ? (
              <span className="rounded-full bg-[#EDE9FE] px-2 py-0.5 text-xs font-semibold text-[#6D28D9]">
                New
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

function SidebarInner({
  activeItem,
  onNavigate,
  onLogOut,
  schoolName,
  mobile,
}: {
  activeItem: NavigationItemId;
  onNavigate: (id: NavigationItemId) => void;
  onLogOut: () => void;
  schoolName?: string | null;
  mobile?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-[240px] flex-col border-r border-[#E5E7EB] bg-white px-0 py-4",
        mobile && "shadow-sm",
      )}
    >
      <div className="px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6D28D9] text-white shadow-sm">
            <BookOpenText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[#111827]">TeachShare</p>
            <p className="text-sm text-[#6B7280]">Teacher Collaboration</p>
          </div>
        </div>
      </div>

      <SidebarNav activeItem={activeItem} onNavigate={onNavigate} />

      <div className="shrink-0 px-5 pt-3">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3.5 shadow-[0_10px_25px_rgba(17,24,39,0.04)]">
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F5F3FF] text-[#6D28D9]">
              <School2 className="h-4.5 w-4.5" />
            </div>
            <p className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.14em] text-[#9CA3AF]">
              Current School
            </p>
          </div>
          <p className="mt-3 break-words text-[14px] font-semibold leading-5 text-[#111827]">
            {schoolName || "Maarif International School"}
          </p>
          <Button
            variant="outline"
            className="mt-3 h-9 w-full justify-between border-[#F3D1D8] bg-[#FFF5F7] px-3 text-sm font-medium text-[#BE123C] hover:bg-[#FFE4EA] hover:text-[#9F1239]"
            type="button"
            onClick={onLogOut}
          >
            Log out
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <>
      <aside className="hidden h-screen shrink-0 lg:sticky lg:top-0 lg:block">
        <SidebarInner
          activeItem={props.activeItem}
          schoolName={props.schoolName}
          onNavigate={props.onNavigate}
          onLogOut={props.onLogOut}
        />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity lg:hidden",
          props.isMobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={props.onCloseMobile}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:hidden",
          props.isMobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarInner
          activeItem={props.activeItem}
          schoolName={props.schoolName}
          onNavigate={(id) => {
            props.onNavigate(id);
            props.onCloseMobile();
          }}
          onLogOut={() => {
            props.onLogOut();
            props.onCloseMobile();
          }}
          mobile
        />
      </aside>
    </>
  );
}

export function SidebarMobileTrigger({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB] lg:hidden"
      onClick={onToggle}
      aria-label="Toggle sidebar"
    >
      {isOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
    </Button>
  );
}
