"use client";

import {
  Bell,
  BellRing,
  Bookmark,
  BookMarked,
  CalendarDays,
  Filter,
  GraduationCap,
  Megaphone,
  Pin,
  PinOff,
  School,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { toUserFacingError } from "@/lib/errors";
import { DiscussionPost, SchoolTeacher } from "@/types";
import { cn, formatRelativeDate, initials } from "@/lib/utils";

type AnnouncementCategory = "all" | "school" | "department" | "classes" | "events";

type AnnouncementItem = {
  id: string;
  title: string;
  description: string;
  category: AnnouncementCategory;
  badge: string;
  badgeClassName: string;
  icon: typeof Megaphone;
  iconWrapClassName: string;
  authorName: string;
  authorAvatar?: string | null;
  authorLabel: string;
  createdAt: string;
  likes: string[];
  bookmarks: string[];
  eventDate?: string | null;
  location?: string | null;
};

interface AnnouncementsPanelProps {
  posts: DiscussionPost[];
  loading: boolean;
  currentUserId: string;
  currentUserName?: string;
  currentUserAvatar?: string | null;
  searchQuery?: string;
  schoolTeachers?: SchoolTeacher[];
  onCreatePost: (input: { title: string; body: string }) => Promise<DiscussionPost | void>;
  onTogglePostBookmark: (post: DiscussionPost) => Promise<void>;
  onDeletePost: (post: DiscussionPost) => Promise<void>;
}

const categoryTabs: Array<{ id: AnnouncementCategory; label: string }> = [
  { id: "all", label: "All" },
  { id: "school", label: "School" },
  { id: "department", label: "Department" },
  { id: "classes", label: "Classes" },
  { id: "events", label: "Events" },
];

const schoolKeywords = ["school", "principal", "campus", "holiday", "policy", "notice"];
const departmentKeywords = ["department", "science", "math", "english", "ict", "curriculum"];
const classKeywords = ["class", "grade", "section", "students", "homeroom"];
const eventKeywords = ["event", "workshop", "meeting", "conference", "fair", "training", "session"];

function readAnnouncementBody(content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    return { title: "School update", description: "" };
  }

  const lines = trimmed.split(/\n+/).filter(Boolean);
  const title = lines[0] ?? trimmed;
  const description =
    lines.length > 1 ? lines.slice(1).join(" ") : trimmed.length > title.length ? trimmed.slice(title.length).trim() : trimmed;

  return {
    title: title.length > 90 ? `${title.slice(0, 87).trimEnd()}...` : title,
    description,
  };
}

function inferAnnouncementCategory(text: string) {
  const lowered = text.toLowerCase();

  if (eventKeywords.some((keyword) => lowered.includes(keyword))) {
    return "events" as const;
  }

  if (departmentKeywords.some((keyword) => lowered.includes(keyword))) {
    return "department" as const;
  }

  if (classKeywords.some((keyword) => lowered.includes(keyword))) {
    return "classes" as const;
  }

  if (schoolKeywords.some((keyword) => lowered.includes(keyword))) {
    return "school" as const;
  }

  return "school" as const;
}

function buildAnnouncementItem(post: DiscussionPost, teacher?: SchoolTeacher): AnnouncementItem {
  const { title, description } = readAnnouncementBody(post.content);
  const mergedText = `${title} ${description}`;
  const category = inferAnnouncementCategory(mergedText);

  const byCategory: Record<
    AnnouncementCategory,
    {
      badge: string;
      badgeClassName: string;
      icon: typeof Megaphone;
      iconWrapClassName: string;
    }
  > = {
    all: {
      badge: "Announcement",
      badgeClassName: "bg-[#F3F4F6] text-[#6B7280]",
      icon: Megaphone,
      iconWrapClassName: "bg-[#F5F3FF] text-[#6D28D9]",
    },
    school: {
      badge: "School Announcement",
      badgeClassName: "bg-[#EEF2FF] text-[#4F46E5]",
      icon: School,
      iconWrapClassName: "bg-[#EEF2FF] text-[#4F46E5]",
    },
    department: {
      badge: "Department Announcement",
      badgeClassName: "bg-[#ECFDF3] text-[#16A34A]",
      icon: Users,
      iconWrapClassName: "bg-[#ECFDF3] text-[#16A34A]",
    },
    classes: {
      badge: "Class Announcement",
      badgeClassName: "bg-[#FFF7ED] text-[#EA580C]",
      icon: GraduationCap,
      iconWrapClassName: "bg-[#FFF7ED] text-[#EA580C]",
    },
    events: {
      badge: "Event Announcement",
      badgeClassName: "bg-[#FEF3C7] text-[#D97706]",
      icon: CalendarDays,
      iconWrapClassName: "bg-[#FEF3C7] text-[#D97706]",
    },
  };

  const config = byCategory[category];
  const eventDate = category === "events" ? "May 25 • 2:00 PM" : null;
  const location = category === "events" ? "Conference Room A" : null;

  return {
    id: post.id,
    title,
    description,
    category,
    badge: config.badge,
    badgeClassName: config.badgeClassName,
    icon: config.icon,
    iconWrapClassName: config.iconWrapClassName,
    authorName: post.userName,
    authorAvatar: post.userAvatar ?? teacher?.avatar ?? null,
    authorLabel: teacher?.subject ? `${teacher.subject} Teacher` : "Teacher",
    createdAt: post.createdAt,
    likes: post.likes,
    bookmarks: post.bookmarks,
    eventDate,
    location,
  };
}

export function AnnouncementsPanel({
  posts,
  loading,
  currentUserId,
  currentUserName = "Teacher",
  currentUserAvatar = null,
  searchQuery = "",
  schoolTeachers = [],
  onCreatePost,
  onTogglePostBookmark,
  onDeletePost,
}: AnnouncementsPanelProps) {
  const [activeCategory, setActiveCategory] = useState<AnnouncementCategory>("all");
  const [inlineSearch, setInlineSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("latest");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pinnedAnnouncementId, setPinnedAnnouncementId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AnnouncementItem | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>("school");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const createInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isCreateOpen) {
      return;
    }

    const timer = window.setTimeout(() => createInputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [isCreateOpen]);

  const teacherMap = useMemo(
    () => new Map(schoolTeachers.map((teacher) => [teacher.id, teacher])),
    [schoolTeachers],
  );

  const pinnedStorageKey = `teachshare-announcement-pinned:${currentUserId}`;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(pinnedStorageKey);
    setPinnedAnnouncementId(stored || null);
  }, [pinnedStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (pinnedAnnouncementId) {
      window.localStorage.setItem(pinnedStorageKey, pinnedAnnouncementId);
      return;
    }

    window.localStorage.removeItem(pinnedStorageKey);
  }, [pinnedAnnouncementId, pinnedStorageKey]);

  const announcementPosts = useMemo(() => {
    return posts
      .map((post) => buildAnnouncementItem(post, teacherMap.get(post.userId)))
      .filter((item) => item.title || item.description);
  }, [posts, teacherMap]);

  const activeFeed = useMemo(() => {
    const mergedSearch = `${searchQuery} ${inlineSearch}`.trim().toLowerCase();
    const list = announcementPosts.filter((item) => {
      const categoryMatch = activeCategory === "all" ? true : item.category === activeCategory;
      if (!categoryMatch) {
        return false;
      }

      if (!mergedSearch) {
        return true;
      }

      return `${item.title} ${item.description} ${item.authorName} ${item.badge}`.toLowerCase().includes(mergedSearch);
    });

    return [...list].sort((left, right) =>
      sortOrder === "latest"
        ? new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        : new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );
  }, [activeCategory, announcementPosts, inlineSearch, searchQuery, sortOrder]);

  const pinnedAnnouncement = useMemo(
    () => activeFeed.find((item) => item.id === pinnedAnnouncementId) ?? null,
    [activeFeed, pinnedAnnouncementId],
  );
  const standardAnnouncements = useMemo(
    () => activeFeed.filter((item) => item.id !== pinnedAnnouncement?.id),
    [activeFeed, pinnedAnnouncement],
  );

  const upcomingEvents = useMemo(
    () =>
      [...announcementPosts]
        .filter((item) => item.category === "events")
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 5),
    [announcementPosts],
  );

  async function handleCreateAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const nextTitle = title.trim();
    const nextDescription = description.trim();

    if (!nextTitle || !nextDescription) {
      setError("Add a title and description before publishing the announcement.");
      setSubmitting(false);
      return;
    }

    const prefix =
      category === "department"
        ? "Department"
        : category === "classes"
          ? "Class"
          : category === "events"
            ? "Event"
            : "School";

    try {
      await onCreatePost({
        title: `${prefix} Announcement: ${nextTitle}`,
        body: `${nextTitle}\n\n${nextDescription}`,
      });
      setTitle("");
      setDescription("");
      setCategory("school");
      setIsCreateOpen(false);
    } catch (cause) {
      setError(toUserFacingError(cause, "We could not publish this announcement right now."));
    } finally {
      setSubmitting(false);
    }
  }

  function handleTogglePinned(item: AnnouncementItem) {
    setPinnedAnnouncementId((current) => (current === item.id ? null : item.id));
  }

  function openAnnouncementDetails(item: AnnouncementItem) {
    setSelectedEvent(item);
  }

  function renderAnnouncementCard(item: AnnouncementItem) {
    const Icon = item.icon;
    const rawPost = posts.find((post) => post.id === item.id);
    const isBookmarked = rawPost ? rawPost.bookmarks.includes(currentUserId) : false;
    const isOwner = rawPost?.userId === currentUserId;
    const isPinned = pinnedAnnouncementId === item.id;
    const isEvent = item.category === "events";

    return (
      <Card
        key={item.id}
        className={cn(
          "rounded-2xl border-[#E5E7EB] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 hover:-translate-y-[1px]",
          isEvent ? "hover:border-[#DDD6FE]" : "",
        )}
      >
        <div
          className={cn("flex gap-4", isEvent ? "cursor-pointer" : "")}
          onClick={() => {
            if (isEvent) {
              openAnnouncementDetails(item);
            }
          }}
        >
          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full", item.iconWrapClassName)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      className={cn(
                        "text-left text-[18px] font-semibold text-[#111827]",
                        isEvent ? "transition hover:text-[#6D28D9]" : "",
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (isEvent) {
                          openAnnouncementDetails(item);
                        }
                      }}
                    >
                      {item.title}
                    </button>
                  </div>
                  <p className="max-w-2xl text-[14px] leading-[1.6] text-[#4B5563]">{item.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#6B7280]">
                  <span>{formatRelativeDate(item.createdAt)}</span>
                  <span>•</span>
                  <span>{item.authorName}</span>
                  <span>•</span>
                  <span>{item.authorLabel}</span>
                  {item.eventDate ? (
                    <>
                      <span>•</span>
                      <span>{item.eventDate}</span>
                    </>
                  ) : null}
                  {item.location ? (
                    <>
                      <span>•</span>
                      <span>{item.location}</span>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("rounded-full px-3 py-1.5 text-[12px] font-semibold", item.badgeClassName)}>
                  {item.badge}
                </span>
                <button
                  type="button"
                  className={cn(
                    "rounded-full p-2 transition",
                    isPinned
                      ? "bg-[#F5F3FF] text-[#6D28D9]"
                      : "text-[#9CA3AF] hover:bg-[#F9FAFB] hover:text-[#111827]",
                  )}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleTogglePinned(item);
                  }}
                  aria-label={isPinned ? "Unpin announcement" : "Pin announcement"}
                  title={isPinned ? "Unpin announcement" : "Pin announcement"}
                >
                  {isPinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />}
                </button>
                {isOwner && rawPost ? (
                  <button
                    type="button"
                    className="rounded-full p-2 text-[#9CA3AF] transition hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                    onClick={(event) => {
                      event.stopPropagation();
                      void onDeletePost(rawPost);
                    }}
                    aria-label="Delete announcement"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded-full p-2 text-[#9CA3AF] transition hover:bg-[#F9FAFB] hover:text-[#111827]"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (rawPost) {
                      void onTogglePostBookmark(rawPost);
                    }
                  }}
                  aria-label={isBookmarked ? "Remove bookmark" : "Bookmark announcement"}
                >
                  {isBookmarked ? <BookMarked className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-8">
      <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-h-0 flex-col gap-6">
          <div className="shrink-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-3">
                {categoryTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-[14px] font-medium transition",
                      activeCategory === tab.id
                        ? "border-transparent bg-[#6D28D9] text-white"
                        : "border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F9FAFB]",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <Button
                className="rounded-xl bg-[#6D28D9] px-[18px] py-3 text-white hover:bg-[#5B21B6]"
                onClick={() => setIsCreateOpen(true)}
              >
                + Create Announcement
              </Button>
            </div>

            <Card className="rounded-2xl border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="relative min-w-0">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  value={inlineSearch}
                  onChange={(event) => setInlineSearch(event.target.value)}
                  placeholder="Search announcements..."
                  className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] pl-11 pr-[230px] text-[14px] text-[#111827] outline-none transition focus:border-[#D1D5DB]"
                />
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
                  <select
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value)}
                    className="h-8 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[13px] text-[#111827] outline-none"
                  >
                    <option value="latest">Latest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                  <Button variant="outline" className="h-8 rounded-lg border-[#E5E7EB] bg-white px-3 text-[13px] text-[#111827] hover:bg-[#F9FAFB]">
                    <Filter className="h-3.5 w-3.5" />
                    Filter
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="min-h-0 overflow-y-auto pr-1">
          {loading ? (
            <div className="space-y-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="rounded-2xl border-[#E5E7EB] p-6">
                  <div className="h-5 w-48 animate-pulse rounded-full bg-[#F3F4F6]" />
                  <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-[#F3F4F6]" />
                  <div className="mt-2 h-4 w-3/4 animate-pulse rounded-full bg-[#F3F4F6]" />
                </Card>
              ))}
            </div>
          ) : activeFeed.length === 0 ? (
            <EmptyState
              icon={BellRing}
              title="No announcements yet"
              description="Share the first important update for your school community."
              action={<Button onClick={() => setIsCreateOpen(true)}>Create Announcement</Button>}
            />
          ) : (
            <div className="space-y-5">
              {pinnedAnnouncement ? (
                <Card className="overflow-hidden rounded-2xl border-[#E5E7EB] bg-[linear-gradient(135deg,#F5F3FF_0%,#F3E8FF_52%,#FFFFFF_100%)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-4">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#6D28D9]">
                        <Pin className="h-3.5 w-3.5" />
                        Pinned Announcement
                      </span>
                      <div className="flex items-start gap-4">
                        <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-full", pinnedAnnouncement.iconWrapClassName)}>
                          <pinnedAnnouncement.icon className="h-6 w-6" />
                        </div>
                        <div className="space-y-3">
                          <h2 className="text-[22px] font-semibold text-[#111827]">{pinnedAnnouncement.title}</h2>
                          <p className="max-w-3xl text-[14px] leading-[1.6] text-[#4B5563]">{pinnedAnnouncement.description}</p>
                          <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#6B7280]">
                            <span>{formatRelativeDate(pinnedAnnouncement.createdAt)}</span>
                            {pinnedAnnouncement.eventDate ? (
                              <>
                                <span>•</span>
                                <span>{pinnedAnnouncement.eventDate}</span>
                              </>
                            ) : null}
                            {pinnedAnnouncement.location ? (
                              <>
                                <span>•</span>
                                <span>{pinnedAnnouncement.location}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        variant="outline"
                        className="rounded-xl border-white/70 bg-white/80 text-[#111827] hover:bg-white"
                        onClick={() => openAnnouncementDetails(pinnedAnnouncement)}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl border-white/70 bg-white/80 text-[#6D28D9] hover:bg-white"
                        onClick={() => setPinnedAnnouncementId(null)}
                      >
                        <PinOff className="h-4 w-4" />
                        Unpin
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : null}

              {standardAnnouncements.map((item) => renderAnnouncementCard(item))}
            </div>
          )}
          </div>
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-6 max-h-[calc(100vh-48px)] space-y-5 overflow-y-auto pr-1">
            <Card className="rounded-2xl border-[#E5E7EB] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-[22px] font-semibold text-[#111827]">Upcoming Events</h3>
              </div>
              <div className="mt-5 space-y-5">
                {(upcomingEvents.length > 0
                  ? upcomingEvents
                  : [
                      { id: "workshop", title: "Professional Development Workshop", eventDate: "2:00 PM - 4:00 PM", location: "Conference Room A" },
                      { id: "meeting", title: "Parent-Teacher Meeting", eventDate: "10:00 AM - 12:00 PM", location: "Main Hall" },
                      { id: "fair", title: "Science Fair 2024", eventDate: "9:00 AM - 3:00 PM", location: "School Auditorium" },
                      { id: "ceremony", title: "End of Year Ceremony", eventDate: "1:00 PM - 4:00 PM", location: "School Auditorium" },
                      { id: "assembly", title: "Leadership Assembly", eventDate: "11:00 AM - 12:30 PM", location: "North Hall" },
                    ]
                ).slice(0, 5)
                .map((event, index) => {
                  const eventDates = [
                    { month: "MAY", day: "25", tint: "text-[#7C3AED]" },
                    { month: "MAY", day: "28", tint: "text-[#F43F5E]" },
                    { month: "JUN", day: "05", tint: "text-[#D97706]" },
                    { month: "JUN", day: "10", tint: "text-[#F43F5E]" },
                  ];
                  const dateMeta = eventDates[index] ?? eventDates[eventDates.length - 1];

                  return (
                    <button
                      key={event.id}
                      type="button"
                      className="flex w-full items-start gap-4 text-left transition hover:opacity-90"
                      onClick={() => openAnnouncementDetails(event as AnnouncementItem)}
                    >
                      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#F9FAFB] text-center ring-1 ring-[#EEF0F3]">
                        <span className={cn("text-[11px] font-semibold", dateMeta.tint)}>{dateMeta.month}</span>
                        <span className="text-[18px] font-semibold text-[#111827]">{dateMeta.day}</span>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[15px] font-semibold text-[#111827]">{event.title}</p>
                        <p className="text-[13px] text-[#6B7280]">{event.eventDate}</p>
                        <p className="text-[13px] text-[#6B7280]">{event.location}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

          </div>
        </aside>
      </div>

      {selectedEvent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm">
          <Card className="w-full max-w-2xl rounded-2xl border-[#E5E7EB] bg-white p-6 shadow-[0_20px_60px_rgba(17,24,39,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <span className={cn("inline-flex rounded-full px-3 py-1.5 text-[12px] font-semibold", selectedEvent.badgeClassName)}>
                  {selectedEvent.badge}
                </span>
                <h2 className="text-[22px] font-semibold text-[#111827]">{selectedEvent.title}</h2>
                <p className="text-[14px] leading-[1.6] text-[#4B5563]">{selectedEvent.description}</p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-[#9CA3AF] transition hover:bg-[#F9FAFB] hover:text-[#111827]"
                onClick={() => setSelectedEvent(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Date & Time</p>
                <p className="mt-2 text-[15px] font-semibold text-[#111827]">{selectedEvent.eventDate || "To be announced"}</p>
              </div>
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Location</p>
                <p className="mt-2 text-[15px] font-semibold text-[#111827]">{selectedEvent.location || "School Campus"}</p>
              </div>
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Posted By</p>
                <p className="mt-2 text-[15px] font-semibold text-[#111827]">{selectedEvent.authorName}</p>
                <p className="mt-1 text-[13px] text-[#6B7280]">{selectedEvent.authorLabel}</p>
              </div>
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Published</p>
                <p className="mt-2 text-[15px] font-semibold text-[#111827]">{formatRelativeDate(selectedEvent.createdAt)}</p>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm">
          <Card className="w-full max-w-2xl rounded-2xl border-[#E5E7EB] bg-white p-6 shadow-[0_20px_60px_rgba(17,24,39,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-[22px] font-semibold text-[#111827]">Create Announcement</h2>
                <p className="text-[14px] text-[#6B7280]">Publish a clear update for teachers across your school.</p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-[#9CA3AF] transition hover:bg-[#F9FAFB] hover:text-[#111827]"
                onClick={() => setIsCreateOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={(event) => void handleCreateAnnouncement(event)}>
              <div className="space-y-2">
                <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Title</label>
                <input
                  ref={createInputRef}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Professional Development Workshop"
                  className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 text-[14px] text-[#111827] outline-none transition focus:border-[#D1D5DB]"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Category</label>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value as AnnouncementCategory)}
                    className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 text-[14px] text-[#111827] outline-none"
                  >
                    <option value="school">School</option>
                    <option value="department">Department</option>
                    <option value="classes">Classes</option>
                    <option value="events">Events</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Audience</label>
                  <div className="flex h-12 items-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 text-[14px] text-[#6B7280]">
                    All teachers in your workspace
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Description</label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Share the key details, schedule, and any action teachers should take."
                  className="min-h-[140px] rounded-xl border-[#E5E7EB] bg-[#F9FAFB] text-[14px] leading-[1.6]"
                />
              </div>

              {error ? <p className="text-[14px] text-[#B91C1C]">{error}</p> : null}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" className="rounded-xl border-[#E5E7EB]" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-[#6D28D9] px-[18px] py-3 text-white hover:bg-[#5B21B6]"
                  loading={submitting}
                  loadingText="Publishing..."
                >
                  Publish Announcement
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
