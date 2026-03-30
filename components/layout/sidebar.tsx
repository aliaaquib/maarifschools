"use client";

import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, NavigationItemId } from "@/lib/constants";

interface SidebarProps {
  activeItem: NavigationItemId;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onNavigate: (id: NavigationItemId) => void;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

function SidebarNav({
  activeItem,
  isCollapsed,
  onNavigate,
}: Pick<SidebarProps, "activeItem" | "isCollapsed" | "onNavigate">) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeItem === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            title={isCollapsed ? item.label : undefined}
            className={cn(
              "group relative flex h-11 items-center rounded-xl border border-transparent px-3 text-sm font-normal text-muted-foreground transition-all duration-150 ease-out hover:bg-muted hover:text-foreground",
              isActive && "bg-muted text-foreground",
              isCollapsed && "justify-center px-0",
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-2 h-7 w-px rounded-full bg-foreground opacity-0 transition-opacity duration-150",
                isActive && "opacity-100",
              )}
            />
            <Icon className="h-4 w-4 shrink-0" />
            <span
              className={cn(
                "ml-3 whitespace-nowrap transition-all duration-200",
                isCollapsed && "ml-0 w-0 overflow-hidden opacity-0",
              )}
            >
              {item.label}
            </span>
            {isCollapsed ? (
              <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 rounded-lg border border-border bg-card px-2 py-1 text-xs text-foreground opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100">
                {item.label}
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
  isCollapsed,
  onNavigate,
  onToggleCollapse,
  mobile,
}: {
  activeItem: NavigationItemId;
  isCollapsed: boolean;
  onNavigate: (id: NavigationItemId) => void;
  onToggleCollapse: () => void;
  mobile?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-border bg-background py-4",
        isCollapsed ? "w-[88px]" : "w-[272px]",
        mobile && "w-[272px] shadow-sm",
      )}
    >
      <div
        className={cn(
          "mb-6 flex items-center justify-between px-4",
          isCollapsed && !mobile && "justify-center",
        )}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-muted text-sm font-semibold">
            MS
          </div>
          <div className={cn("transition-all", isCollapsed && !mobile && "hidden")}>
            <p className="text-sm font-semibold text-foreground">Maarif Schools</p>
            <p className="text-sm font-normal text-muted-foreground">Teacher workspace</p>
          </div>
        </div>

        {!mobile ? (
          <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>

      <SidebarNav
        activeItem={activeItem}
        isCollapsed={isCollapsed && !mobile}
        onNavigate={onNavigate}
      />

      {!isCollapsed || mobile ? (
        <div className="mt-auto px-4 pt-6">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">Focused workspace</p>
            <p className="mt-1 text-sm font-normal text-muted-foreground">
              Resources, discussion, and profiles in one calm workflow.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <>
      <aside className="hidden h-screen shrink-0 lg:sticky lg:top-0 lg:block">
        <SidebarInner
          activeItem={props.activeItem}
          isCollapsed={props.isCollapsed}
          onNavigate={props.onNavigate}
          onToggleCollapse={props.onToggleCollapse}
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
          isCollapsed={false}
          onNavigate={(id) => {
            props.onNavigate(id);
            props.onCloseMobile();
          }}
          onToggleCollapse={() => undefined}
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
      className="lg:hidden"
      onClick={onToggle}
      aria-label="Toggle sidebar"
    >
      {isOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
    </Button>
  );
}
