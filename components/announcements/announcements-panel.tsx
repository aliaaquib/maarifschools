"use client";

import {
  Bell,
  BellRing,
  Bookmark,
  BookMarked,
  CalendarDays,
  Check,
  Clock3,
  Filter,
  GraduationCap,
  ImagePlus,
  Link2,
  Mail,
  MapPin,
  Megaphone,
  Paperclip,
  Pin,
  PinOff,
  Save,
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
type AnnouncementFeedTab = "all" | "upcoming" | "past";
type AnnouncementCreateType = "announcement" | "event" | "workshop" | "school-update" | "meeting";

type AnnouncementItem = {
  id: string;
  title: string;
  description: string;
  category: AnnouncementCategory;
  badge: string;
  badgeClassName: string;
  icon: typeof Megaphone;
  iconWrapClassName: string;
  cardClassName: string;
  authorName: string;
  authorAvatar?: string | null;
  authorLabel: string;
  createdAt: string;
  likes: string[];
  bookmarks: string[];
  eventDate?: string | null;
  eventStart?: string | null;
  eventEnd?: string | null;
  location?: string | null;
  meetingLink?: string | null;
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

const categoryTabs: Array<{ id: AnnouncementFeedTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
];

const createTypeOptions: Array<{
  id: AnnouncementCreateType;
  title: string;
  description: string;
  category: AnnouncementCategory;
  icon: typeof Megaphone;
}> = [
  {
    id: "announcement",
    title: "Announcement",
    description: "Share a quick school-wide update.",
    category: "school",
    icon: Megaphone,
  },
  {
    id: "event",
    title: "Event",
    description: "Publish a scheduled event for your school.",
    category: "events",
    icon: CalendarDays,
  },
  {
    id: "workshop",
    title: "Workshop",
    description: "Organize a training or development session.",
    category: "events",
    icon: Sparkles,
  },
  {
    id: "school-update",
    title: "School Update",
    description: "Post an important update from leadership.",
    category: "school",
    icon: School,
  },
  {
    id: "meeting",
    title: "Meeting",
    description: "Schedule a department or staff meeting.",
    category: "events",
    icon: Users,
  },
];

const audienceOptions = ["All Teachers", "Students", "Grade 3 Teachers", "Science Department", "Specific Classes"];

const schoolKeywords = ["school", "principal", "campus", "holiday", "policy", "notice"];
const departmentKeywords = ["department", "science", "math", "english", "ict", "curriculum"];
const classKeywords = ["class", "grade", "section", "students", "homeroom"];
const eventKeywords = ["event", "workshop", "meeting", "conference", "fair", "training", "session"];
const announcementSignalKeywords = ["announcement", "notice", "update", "reminder", "important"];
const ANNOUNCEMENT_META_PREFIX = "[TeachShare Announcement]";

function readAnnouncementBody(content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    return {
      title: "School update",
      description: "",
      metaCategory: null as AnnouncementCategory | null,
      eventDate: null as string | null,
      eventStart: null as string | null,
      eventEnd: null as string | null,
      location: null as string | null,
      meetingLink: null as string | null,
    };
  }

  const [bodyPart, metaPart] = trimmed.split(ANNOUNCEMENT_META_PREFIX);
  const metadataLines = metaPart
    ? metaPart
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];
  const metadata = new Map(
    metadataLines
      .map((line) => {
        const separatorIndex = line.indexOf(":");
        if (separatorIndex === -1) {
          return null;
        }

        return [
          line.slice(0, separatorIndex).trim().toLowerCase(),
          line.slice(separatorIndex + 1).trim(),
        ] as const;
      })
      .filter((entry): entry is readonly [string, string] => Boolean(entry)),
  );

  const source = bodyPart.trim();
  const lines = source.split(/\n+/).filter(Boolean);
  const title = lines[0] ?? trimmed;
  const description =
    lines.length > 1 ? lines.slice(1).join(" ") : source.length > title.length ? source.slice(title.length).trim() : source;

  return {
    title: title.length > 90 ? `${title.slice(0, 87).trimEnd()}...` : title,
    description,
    metaCategory: (metadata.get("category") as AnnouncementCategory | undefined) ?? null,
    eventDate: metadata.get("eventdate") ?? null,
    eventStart: metadata.get("eventstart") ?? null,
    eventEnd: metadata.get("eventend") ?? null,
    location: metadata.get("location") ?? null,
    meetingLink: metadata.get("meetinglink") ?? null,
  };
}

function inferAnnouncementCategory(text: string, metaCategory: AnnouncementCategory | null = null) {
  if (metaCategory) {
    return metaCategory;
  }

  const lowered = text.toLowerCase();

  if (eventKeywords.some((keyword) => lowered.includes(keyword))) {
    return "events" as const;
  }

  const hasAnnouncementSignal = announcementSignalKeywords.some((keyword) => lowered.includes(keyword));
  if (!hasAnnouncementSignal) {
    return null;
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

function buildAnnouncementItem(post: DiscussionPost, teacher?: SchoolTeacher): AnnouncementItem | null {
  const {
    title,
    description,
    metaCategory,
    eventDate,
    eventStart,
    eventEnd,
    location,
    meetingLink,
  } = readAnnouncementBody(post.content);
  const mergedText = `${title} ${description}`;
  const category = inferAnnouncementCategory(mergedText, metaCategory);
  if (!category) {
    return null;
  }

  const byCategory: Record<
    AnnouncementCategory,
    {
      badge: string;
      badgeClassName: string;
      icon: typeof Megaphone;
      iconWrapClassName: string;
      cardClassName: string;
    }
  > = {
    all: {
      badge: "Announcement",
      badgeClassName: "bg-[#F3F4F6] text-[#6B7280]",
      icon: Megaphone,
      iconWrapClassName: "bg-[#F5F3FF] text-[#6D28D9]",
      cardClassName: "bg-[linear-gradient(135deg,#FFFFFF_0%,#FAFAFB_58%,#F5F3FF_100%)]",
    },
    school: {
      badge: "School Announcement",
      badgeClassName: "bg-[#EEF2FF] text-[#4F46E5]",
      icon: School,
      iconWrapClassName: "bg-[#EEF2FF] text-[#4F46E5]",
      cardClassName: "bg-[linear-gradient(135deg,#FFFFFF_0%,#F3F6FF_42%,#E0E7FF_100%)]",
    },
    department: {
      badge: "Department Announcement",
      badgeClassName: "bg-[#ECFDF3] text-[#16A34A]",
      icon: Users,
      iconWrapClassName: "bg-[#ECFDF3] text-[#16A34A]",
      cardClassName: "bg-[linear-gradient(135deg,#FFFFFF_0%,#F2FCF5_42%,#DCFCE7_100%)]",
    },
    classes: {
      badge: "Class Announcement",
      badgeClassName: "bg-[#FFF7ED] text-[#EA580C]",
      icon: GraduationCap,
      iconWrapClassName: "bg-[#FFF7ED] text-[#EA580C]",
      cardClassName: "bg-[linear-gradient(135deg,#FFFFFF_0%,#FFF8F1_42%,#FED7AA_100%)]",
    },
    events: {
      badge: "Event Announcement",
      badgeClassName: "bg-[#FEF3C7] text-[#D97706]",
      icon: CalendarDays,
      iconWrapClassName: "bg-[#FEF3C7] text-[#D97706]",
      cardClassName: "bg-[linear-gradient(135deg,#FFFFFF_0%,#FFF7D6_30%,#FCE7F3_100%)]",
    },
  };

  const config = byCategory[category];

  return {
    id: post.id,
    title,
    description,
    category,
    badge: config.badge,
    badgeClassName: config.badgeClassName,
    icon: config.icon,
    iconWrapClassName: config.iconWrapClassName,
    cardClassName: config.cardClassName,
    authorName: post.userName,
    authorAvatar: post.userAvatar ?? teacher?.avatar ?? null,
    authorLabel: teacher?.subject ? `${teacher.subject} Teacher` : "Teacher",
    createdAt: post.createdAt,
    likes: post.likes,
    bookmarks: post.bookmarks,
    eventDate: eventDate ?? (category === "events" ? "Date to be announced" : null),
    eventStart,
    eventEnd,
    location: location ?? (category === "events" ? "Location to be announced" : null),
    meetingLink,
  };
}

function getAnnouncementDateBadge(item: AnnouncementItem) {
  const date = new Date(item.createdAt);
  if (Number.isNaN(date.getTime())) {
    return { month: "NOW", day: "--" };
  }

  return {
    month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: date.toLocaleDateString("en-US", { day: "2-digit" }),
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
  const [activeCategory, setActiveCategory] = useState<AnnouncementFeedTab>("all");
  const [inlineSearch, setInlineSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("latest");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pinnedAnnouncementId, setPinnedAnnouncementId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AnnouncementItem | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [createType, setCreateType] = useState<AnnouncementCreateType>("announcement");
  const [category, setCategory] = useState<AnnouncementCategory>("school");
  const [eventDateInput, setEventDateInput] = useState("");
  const [startTimeInput, setStartTimeInput] = useState("");
  const [endTimeInput, setEndTimeInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [meetingLinkInput, setMeetingLinkInput] = useState("");
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>(["All Teachers"]);
  const [pinOnPublish, setPinOnPublish] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [emailTeachers, setEmailTeachers] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [draftSaved, setDraftSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const createInputRef = useRef<HTMLInputElement | null>(null);
  const draftStorageKey = `teachshare-announcement-draft:${currentUserId}`;

  useEffect(() => {
    if (!isCreateOpen) {
      return;
    }

    const timer = window.setTimeout(() => createInputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [isCreateOpen]);

  useEffect(() => {
    if (typeof window === "undefined" || !isCreateOpen) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(draftStorageKey);
      if (!raw) {
        return;
      }

      const draft = JSON.parse(raw) as {
        title?: string;
        description?: string;
        createType?: AnnouncementCreateType;
        category?: AnnouncementCategory;
        eventDateInput?: string;
        startTimeInput?: string;
        endTimeInput?: string;
        locationInput?: string;
        meetingLinkInput?: string;
        selectedAudiences?: string[];
        pinOnPublish?: boolean;
        sendNotification?: boolean;
        emailTeachers?: boolean;
        allowComments?: boolean;
      };

      setTitle(draft.title ?? "");
      setDescription(draft.description ?? "");
      setCreateType(draft.createType ?? "announcement");
      setCategory(draft.category ?? "school");
      setEventDateInput(draft.eventDateInput ?? "");
      setStartTimeInput(draft.startTimeInput ?? "");
      setEndTimeInput(draft.endTimeInput ?? "");
      setLocationInput(draft.locationInput ?? "");
      setMeetingLinkInput(draft.meetingLinkInput ?? "");
      setSelectedAudiences(draft.selectedAudiences?.length ? draft.selectedAudiences : ["All Teachers"]);
      setPinOnPublish(draft.pinOnPublish ?? false);
      setSendNotification(draft.sendNotification ?? true);
      setEmailTeachers(draft.emailTeachers ?? false);
      setAllowComments(draft.allowComments ?? true);
    } catch {
      window.localStorage.removeItem(draftStorageKey);
    }
  }, [draftStorageKey, isCreateOpen]);

  const teacherMap = useMemo(
    () => new Map(schoolTeachers.map((teacher) => [teacher.id, teacher])),
    [schoolTeachers],
  );
  const postMap = useMemo(() => new Map(posts.map((post) => [post.id, post])), [posts]);

  function clearCreateAnnouncementState() {
    setTitle("");
    setDescription("");
    setCreateType("announcement");
    setCategory("school");
    setEventDateInput("");
    setStartTimeInput("");
    setEndTimeInput("");
    setLocationInput("");
    setMeetingLinkInput("");
    setSelectedAudiences(["All Teachers"]);
    setPinOnPublish(false);
    setSendNotification(true);
    setEmailTeachers(false);
    setAllowComments(true);
    setCoverPreview(null);
    setAttachments([]);
    setDraftSaved(false);
    setError("");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(draftStorageKey);
    }
  }

  function handleSaveDraft() {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      draftStorageKey,
      JSON.stringify({
        title,
        description,
        createType,
        category,
        eventDateInput,
        startTimeInput,
        endTimeInput,
        locationInput,
        meetingLinkInput,
        selectedAudiences,
        pinOnPublish,
        sendNotification,
        emailTeachers,
        allowComments,
      }),
    );
    setDraftSaved(true);
    window.setTimeout(() => setDraftSaved(false), 1800);
  }

  function updateCreateType(nextType: AnnouncementCreateType) {
    setCreateType(nextType);
    const option = createTypeOptions.find((item) => item.id === nextType);
    if (option) {
      setCategory(option.category);
    }
  }

  function toggleAudience(option: string) {
    setSelectedAudiences((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    );
  }

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
      .filter((item): item is AnnouncementItem => Boolean(item && (item.title || item.description)));
  }, [posts, teacherMap]);

  const activeFeed = useMemo(() => {
    const mergedSearch = `${searchQuery} ${inlineSearch}`.trim().toLowerCase();
    const list = announcementPosts.filter((item) => {
      const matchesTab =
        activeCategory === "all"
          ? true
          : activeCategory === "upcoming"
            ? item.category === "events"
            : item.category !== "events";
      if (!matchesTab) {
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
  const pinnedAnnouncementPost = useMemo(
    () => (pinnedAnnouncement ? posts.find((post) => post.id === pinnedAnnouncement.id) ?? null : null),
    [pinnedAnnouncement, posts],
  );
  const standardAnnouncements = useMemo(
    () => activeFeed.filter((item) => item.id !== pinnedAnnouncement?.id),
    [activeFeed, pinnedAnnouncement],
  );
  const selectedEventPost = useMemo(
    () => (selectedEvent ? posts.find((post) => post.id === selectedEvent.id) ?? null : null),
    [posts, selectedEvent],
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
    const nextLocation = locationInput.trim();
    const nextMeetingLink = meetingLinkInput.trim();

    if (!nextTitle || !nextDescription) {
      setError("Add a title and description before publishing the announcement.");
      setSubmitting(false);
      return;
    }

    if (category === "events" && (!eventDateInput || !startTimeInput || !nextLocation)) {
      setError("Add the date, start time, and location before publishing this event.");
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
      const createdPost = await onCreatePost({
        title: `${prefix} Announcement: ${nextTitle}`,
        body: [
          nextTitle,
          "",
          nextDescription,
          "",
          ANNOUNCEMENT_META_PREFIX,
          `Category: ${category}`,
          `CreateType: ${createType}`,
          `EventDate: ${eventDateInput}`,
          `EventStart: ${startTimeInput}`,
          `EventEnd: ${endTimeInput}`,
          `Location: ${nextLocation}`,
          `MeetingLink: ${nextMeetingLink}`,
          `Audience: ${selectedAudiences.join(", ")}`,
          `PinOnPublish: ${pinOnPublish ? "yes" : "no"}`,
          `SendNotification: ${sendNotification ? "yes" : "no"}`,
          `EmailTeachers: ${emailTeachers ? "yes" : "no"}`,
          `AllowComments: ${allowComments ? "yes" : "no"}`,
        ].join("\n"),
      });
      if (pinOnPublish && createdPost?.id) {
        setPinnedAnnouncementId(createdPost.id);
      }
      clearCreateAnnouncementState();
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
    const rawPost = postMap.get(item.id);
    const isBookmarked = rawPost ? rawPost.bookmarks.includes(currentUserId) : false;
    const isOwner = rawPost?.userId === currentUserId;
    const isPinned = pinnedAnnouncementId === item.id;
    const isEvent = item.category === "events";

    return (
      <Card
        key={item.id}
        className={cn(
          "rounded-2xl border-[#E5E7EB] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 hover:-translate-y-[1px]",
          item.cardClassName,
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
                      {pinnedAnnouncementPost?.userId === currentUserId ? (
                        <Button
                          variant="outline"
                          className="rounded-xl border-[#FECACA] bg-white/80 text-[#DC2626] hover:bg-white"
                          onClick={() => {
                            setPinnedAnnouncementId(null);
                            void onDeletePost(pinnedAnnouncementPost);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      ) : null}
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
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event, index) => {
                  const dateMeta = getAnnouncementDateBadge(event);
                  const rawPost = postMap.get(event.id);
                  const isOwner = rawPost?.userId === currentUserId;
                  const tintClasses = [
                    "text-[#7C3AED]",
                    "text-[#F43F5E]",
                    "text-[#D97706]",
                    "text-[#0F766E]",
                    "text-[#2563EB]",
                  ];
                  const tintClass = tintClasses[index % tintClasses.length];

                  return (
                    <div key={event.id} className="flex items-start gap-4">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-start gap-4 text-left transition hover:opacity-90"
                        onClick={() => openAnnouncementDetails(event)}
                      >
                        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#F9FAFB] text-center ring-1 ring-[#EEF0F3]">
                          <span className={cn("text-[11px] font-semibold", tintClass)}>{dateMeta.month}</span>
                          <span className="text-[18px] font-semibold text-[#111827]">{dateMeta.day}</span>
                        </div>
                        <div className="min-w-0 space-y-1.5">
                          <p className="text-[15px] font-semibold text-[#111827]">{event.title}</p>
                          <p className="text-[13px] text-[#6B7280]">{event.eventDate}</p>
                          <p className="text-[13px] text-[#6B7280]">{event.location}</p>
                        </div>
                      </button>
                      {isOwner && rawPost ? (
                        <button
                          type="button"
                          className="mt-1 rounded-full p-2 text-[#9CA3AF] transition hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                          onClick={() => void onDeletePost(rawPost)}
                          aria-label="Delete event announcement"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#FAFAFB] p-4 text-sm text-[#6B7280]">
                    No upcoming events yet. Create an event announcement and the latest five will appear here.
                  </div>
                )}
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
                {selectedEvent.eventEnd ? <p className="mt-1 text-[13px] text-[#6B7280]">Ends at {selectedEvent.eventEnd}</p> : null}
              </div>
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Location</p>
                <p className="mt-2 text-[15px] font-semibold text-[#111827]">{selectedEvent.location || "School Campus"}</p>
                {selectedEvent.meetingLink ? (
                  <a
                    href={selectedEvent.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-[#6D28D9]"
                  >
                    Open meeting link
                    <Link2 className="h-3.5 w-3.5" />
                  </a>
                ) : null}
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
            {selectedEventPost?.userId === currentUserId ? (
              <div className="mt-6 flex justify-end">
                <Button
                  variant="outline"
                  className="rounded-xl border-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2]"
                  onClick={() => {
                    setSelectedEvent(null);
                    if (pinnedAnnouncementId === selectedEvent.id) {
                      setPinnedAnnouncementId(null);
                    }
                    void onDeletePost(selectedEventPost);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Announcement
                </Button>
              </div>
            ) : null}
          </Card>
        </div>
      ) : null}

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm">
          <Card className="flex max-h-[90vh] w-full max-w-[920px] flex-col overflow-hidden rounded-[32px] border-[#E5E7EB] bg-white shadow-[0_24px_80px_rgba(17,24,39,0.22)]">
            <div className="flex items-start justify-between gap-6 border-b border-[#F3F4F6] px-6 py-6">
              <div className="space-y-2">
                <h2 className="text-[36px] font-bold tracking-[-0.03em] text-[#111827]">Create Announcement</h2>
                <p className="max-w-2xl text-[14px] leading-[1.6] text-[#6B7280]">
                  Publish an update, event, or important notice for your teachers and students.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="rounded-xl border-[#E5E7EB]" onClick={handleSaveDraft}>
                  <Save className="h-4 w-4" />
                  {draftSaved ? "Draft Saved" : "Save Draft"}
                </Button>
                <button
                  type="button"
                  className="rounded-full p-2 text-[#9CA3AF] transition hover:bg-[#F9FAFB] hover:text-[#111827]"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setError("");
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => void handleCreateAnnouncement(event)}>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <div className="grid gap-3 md:grid-cols-5">
                  {createTypeOptions.map((option) => {
                    const Icon = option.icon;
                    const selected = createType === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => updateCreateType(option.id)}
                        className={cn(
                          "rounded-2xl border p-4 text-left transition-all duration-150 hover:-translate-y-[1px]",
                          selected
                            ? "border-[#6D28D9] bg-[#F5F3FF] shadow-[0_8px_24px_rgba(109,40,217,0.08)]"
                            : "border-[#E5E7EB] bg-white hover:border-[#D8DCE3]",
                        )}
                      >
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", selected ? "bg-white text-[#6D28D9]" : "bg-[#F9FAFB] text-[#6B7280]")}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-[16px] font-semibold text-[#111827]">{option.title}</p>
                        <p className="mt-2 text-[13px] leading-[1.5] text-[#6B7280]">{option.description}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Title</label>
                      <input
                        ref={createInputRef}
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Professional Development Workshop"
                        className="h-[60px] w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-5 text-[18px] font-semibold text-[#111827] outline-none transition focus:border-[#C4B5FD]"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Description</label>
                      <Textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Share important details, schedules, speakers, or instructions..."
                        className="min-h-[180px] rounded-2xl border-[#E5E7EB] bg-[#F9FAFB] p-4 text-[14px] leading-[1.6]"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Cover Image</label>
                      <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-[#D8DCE3] bg-[#FAFAFB] p-4 transition hover:border-[#C4B5FD] hover:bg-[#FBFAFF]">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#6D28D9] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                            <ImagePlus className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[14px] font-medium text-[#111827]">Upload banner or cover image</p>
                            <p className="text-[13px] text-[#6B7280]">Drag a file here or browse from your device.</p>
                          </div>
                        </div>
                        <span className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] font-medium text-[#111827]">Browse</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) {
                              return;
                            }
                            setCoverPreview(URL.createObjectURL(file));
                          }}
                        />
                      </label>
                      {coverPreview ? (
                        <div className="overflow-hidden rounded-2xl border border-[#E5E7EB]">
                          <img src={coverPreview} alt="Cover preview" className="h-44 w-full object-cover" />
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Attachments</label>
                      <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-[#D8DCE3] bg-[#FAFAFB] p-4 transition hover:border-[#C4B5FD] hover:bg-[#FBFAFF]">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#6D28D9] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                            <Paperclip className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[14px] font-medium text-[#111827]">Attach supporting files</p>
                            <p className="text-[13px] text-[#6B7280]">PDFs, Docs, slides, schedules, and workshop materials.</p>
                          </div>
                        </div>
                        <span className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] font-medium text-[#111827]">Add files</span>
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(event) => {
                            const files = Array.from(event.target.files ?? []);
                            if (files.length === 0) {
                              return;
                            }
                            setAttachments((current) => [...current, ...files]);
                          }}
                        />
                      </label>
                      {attachments.length > 0 ? (
                        <div className="space-y-2">
                          {attachments.map((file, index) => (
                            <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F9FAFB] text-[#6B7280]">
                                  <Paperclip className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-[14px] font-medium text-[#111827]">{file.name}</p>
                                  <p className="text-[12px] text-[#6B7280]">{Math.max(1, Math.round(file.size / 1024))} KB</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="rounded-full p-2 text-[#9CA3AF] transition hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                                onClick={() => setAttachments((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <Card className="rounded-3xl border-[#E5E7EB] bg-[#FCFCFD] p-5 shadow-none">
                      <div className="space-y-4">
                        <h3 className="text-[18px] font-semibold text-[#111827]">Event Details</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Date</label>
                            <div className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4">
                              <CalendarDays className="h-4 w-4 text-[#9CA3AF]" />
                              <input
                                type="date"
                                value={eventDateInput}
                                onChange={(event) => setEventDateInput(event.target.value)}
                                className="h-12 w-full border-0 bg-transparent text-[14px] text-[#111827] outline-none"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Location</label>
                            <div className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4">
                              <MapPin className="h-4 w-4 text-[#9CA3AF]" />
                              <input
                                value={locationInput}
                                onChange={(event) => setLocationInput(event.target.value)}
                                placeholder="Conference Room A"
                                className="h-12 w-full border-0 bg-transparent text-[14px] text-[#111827] outline-none"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Start Time</label>
                            <div className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4">
                              <Clock3 className="h-4 w-4 text-[#9CA3AF]" />
                              <input
                                type="time"
                                value={startTimeInput}
                                onChange={(event) => setStartTimeInput(event.target.value)}
                                className="h-12 w-full border-0 bg-transparent text-[14px] text-[#111827] outline-none"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">End Time</label>
                            <div className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4">
                              <Clock3 className="h-4 w-4 text-[#9CA3AF]" />
                              <input
                                type="time"
                                value={endTimeInput}
                                onChange={(event) => setEndTimeInput(event.target.value)}
                                className="h-12 w-full border-0 bg-transparent text-[14px] text-[#111827] outline-none"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Meeting Link</label>
                          <div className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4">
                            <Link2 className="h-4 w-4 text-[#9CA3AF]" />
                            <input
                              value={meetingLinkInput}
                              onChange={(event) => setMeetingLinkInput(event.target.value)}
                              placeholder="https://meet.google.com/..."
                              className="h-12 w-full border-0 bg-transparent text-[14px] text-[#111827] outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="rounded-3xl border-[#E5E7EB] bg-[#FCFCFD] p-5 shadow-none">
                      <div className="space-y-4">
                        <h3 className="text-[18px] font-semibold text-[#111827]">Audience</h3>
                        <div className="flex flex-wrap gap-2">
                          {audienceOptions.map((option) => {
                            const selected = selectedAudiences.includes(option);
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => toggleAudience(option)}
                                className={cn(
                                  "rounded-full border px-3 py-2 text-[13px] font-medium transition",
                                  selected
                                    ? "border-[#6D28D9] bg-[#F5F3FF] text-[#6D28D9]"
                                    : "border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F9FAFB]",
                                )}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </Card>

                    <Card className="rounded-3xl border-[#E5E7EB] bg-[#FCFCFD] p-5 shadow-none">
                      <div className="space-y-4">
                        <h3 className="text-[18px] font-semibold text-[#111827]">Visibility Settings</h3>
                        <div className="space-y-3">
                          {[
                            { label: "Pin announcement", value: pinOnPublish, onChange: setPinOnPublish, icon: Pin },
                            { label: "Send notification", value: sendNotification, onChange: setSendNotification, icon: Bell },
                            { label: "Email teachers", value: emailTeachers, onChange: setEmailTeachers, icon: Mail },
                            { label: "Allow comments", value: allowComments, onChange: setAllowComments, icon: Check },
                          ].map((item) => {
                            const Icon = item.icon;
                            return (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => item.onChange(!item.value)}
                                className="flex w-full items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-left transition hover:border-[#D8DCE3]"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F9FAFB] text-[#6B7280]">
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <span className="text-[14px] font-medium text-[#111827]">{item.label}</span>
                                </div>
                                <span
                                  className={cn(
                                    "flex h-6 w-11 items-center rounded-full p-1 transition",
                                    item.value ? "justify-end bg-[#6D28D9]" : "justify-start bg-[#E5E7EB]",
                                  )}
                                >
                                  <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </Card>

                    <Card className="rounded-3xl border-[#E5E7EB] bg-[#FCFCFD] p-5 shadow-none">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#111827] text-sm font-semibold text-white">
                          {currentUserAvatar ? (
                            <img src={currentUserAvatar} alt={currentUserName} className="h-full w-full object-cover" />
                          ) : (
                            initials(currentUserName)
                          )}
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-[#111827]">Published by {currentUserName}</p>
                          <p className="text-[13px] text-[#6B7280]">TeachShare organizer</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-[#E5E7EB] bg-white px-6 py-4">
                <div>
                  {draftSaved ? <p className="text-[13px] font-medium text-[#16A34A]">Draft saved locally.</p> : null}
                  {error ? <p className="text-[14px] text-[#B91C1C]">{error}</p> : null}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-[#E5E7EB]"
                    onClick={() => {
                      setIsCreateOpen(false);
                      setError("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="button" variant="outline" className="rounded-xl border-[#E5E7EB]" onClick={handleSaveDraft}>
                    <Save className="h-4 w-4" />
                    Save Draft
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl bg-[linear-gradient(135deg,#7C3AED_0%,#6D28D9_55%,#5B21B6_100%)] px-5 py-3 text-white hover:opacity-95"
                    loading={submitting}
                    loadingText="Publishing..."
                  >
                    Publish Announcement
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
