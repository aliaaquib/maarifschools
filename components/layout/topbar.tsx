"use client";

import { Bell, ChevronDown, MessageCircle, Search, Upload, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { SidebarMobileTrigger } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { NotificationItem } from "@/types";
import { formatRelativeDate } from "@/lib/utils";
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
  notifications: NotificationItem[];
  unreadNotifications: number;
  onMarkNotificationsSeen: () => void;
  onOpenNotification: (notification: NotificationItem) => void;
}

export function Topbar({
  search,
  onSearchChange,
  userName,
  userAvatar,
  isMobileSidebarOpen,
  onToggleMobileSidebar,
  notifications,
  unreadNotifications,
  onMarkNotificationsSeen,
  onOpenNotification,
}: TopbarProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isNotificationsOpen) {
      return;
    }

    onMarkNotificationsSeen();

    const handleClickOutside = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isNotificationsOpen, onMarkNotificationsSeen]);

  function getNotificationIcon(type: NotificationItem["type"]) {
    if (type === "resource") return <Upload className="h-4 w-4" />;
    if (type === "school-message") return <Users className="h-4 w-4" />;
    return <MessageCircle className="h-4 w-4" />;
  }

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
        <div className="relative" ref={notificationsRef}>
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#111827] transition-all duration-150 hover:bg-[#F3F4F6]"
            onClick={() => setIsNotificationsOpen((value) => !value)}
            aria-label="Open notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 ? (
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#22C55E] ring-2 ring-white" />
            ) : null}
          </button>

          {isNotificationsOpen ? (
            <Card className="absolute right-0 top-12 z-40 w-[320px] rounded-2xl border-[#E5E7EB] bg-white p-0 shadow-[0_16px_32px_rgba(17,24,39,0.08)]">
              <div className="flex items-center justify-between border-b border-[#F3F4F6] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#111827]">Notifications</p>
                  <p className="text-xs text-[#6B7280]">Live updates from your workspace</p>
                </div>
              </div>
              <div className="max-h-[360px] overflow-y-auto p-2">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => {
                        onOpenNotification(notification);
                        setIsNotificationsOpen(false);
                      }}
                      className="flex w-full gap-3 rounded-2xl px-3 py-3 text-left transition-colors duration-150 hover:bg-[#F9FAFB]"
                    >
                      <div className="bg-app-accent-soft text-app-accent mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium text-[#111827]">{notification.title}</p>
                          <span className="shrink-0 text-xs text-[#9CA3AF]">
                            {formatRelativeDate(notification.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-[#6B7280]">
                          {notification.description}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-8 text-center">
                    <p className="text-sm font-medium text-[#111827]">No new notifications</p>
                    <p className="mt-1 text-sm text-[#6B7280]">
                      New resources, posts, and school chat messages will show up here.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ) : null}
        </div>

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
