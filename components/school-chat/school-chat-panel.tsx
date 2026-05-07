"use client";

import { ChangeEvent, FormEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
import {
  Bell,
  CornerUpLeft,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Images,
  Link2,
  MessageSquareMore,
  Mic,
  MoreHorizontal,
  Paperclip,
  Presentation,
  Pin,
  Plus,
  SearchX,
  Search,
  Send,
  SmilePlus,
  Smile,
  Users,
  FileArchive,
  File,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SCHOOL_CHAT_ROOMS } from "@/lib/constants";
import { toUserFacingError } from "@/lib/errors";
import { SchoolMessage } from "@/types";
import { formatRelativeDate, initials } from "@/lib/utils";

type ChatListFilter = "all" | "unread" | "groups" | "direct";

interface SchoolChatPanelProps {
  schoolName?: string | null;
  messages: SchoolMessage[];
  loading: boolean;
  currentUserId: string;
  currentUserName?: string | null;
  currentUserAvatar?: string | null;
  onSendMessage: (input: {
    content: string;
    room: SchoolMessage["room"];
    parentId?: string | null;
    file?: File | null;
  }) => Promise<void>;
}

const ROOM_DESCRIPTIONS: Record<SchoolMessage["room"], string> = {
  general: "Whole-school announcements, coordination, and day-to-day communication.",
  "grade-3": "Planning, worksheets, and class updates for Grade 3 teachers.",
  science: "Experiments, lab ideas, and science department collaboration.",
};

const EMOJI_REACTIONS = [
  "👍",
  "❤️",
  "👏",
  "🎉",
  "😊",
  "🔥",
  "🙌",
  "✅",
  "📌",
  "💡",
  "🤝",
  "🙏",
  "😂",
  "😍",
  "😮",
  "🤔",
  "👀",
  "⭐",
  "📚",
  "📝",
  "🎓",
  "📎",
  "📣",
  "🚀",
  "👌",
  "💜",
  "😁",
  "😄",
  "😅",
  "🙂",
  "😉",
  "🥳",
  "😎",
  "🤩",
  "😇",
  "🤗",
  "✍️",
  "📖",
  "🧠",
  "📅",
  "🧪",
  "💻",
  "🖨️",
  "📐",
  "📊",
  "📘",
  "📙",
  "📗",
  "📕",
  "🗂️",
  "📂",
  "🫶",
  "🤞",
  "☑️",
  "💬",
  "🔔",
  "🌟",
  "🎯",
  "🛠️",
  "🧩",
  "📍",
  "📬",
  "🕒",
  "💯",
];

function getDateSeparatorLabel(dateString: string) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function extractFirstUrl(content: string) {
  const match = content.match(/https?:\/\/\S+/i);
  return match?.[0] ?? null;
}

function getAttachmentType(url: string | null) {
  if (!url) {
    return null;
  }

  const normalized = url.toLowerCase();
  if (normalized.match(/\.(pdf|doc|docx|ppt|pptx|xls|xlsx)(\?|$)/)) {
    return "document";
  }

  if (normalized.match(/\.(png|jpg|jpeg|webp|gif|svg)(\?|$)/)) {
    return "media";
  }

  return normalized.includes("/storage/") ? "document" : "link";
}

function getFileExtension(nameOrUrl: string | null | undefined) {
  if (!nameOrUrl) {
    return "";
  }

  const cleaned = nameOrUrl.split("?")[0] ?? "";
  const segment = cleaned.split("/").pop() ?? cleaned;
  const parts = segment.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() ?? "" : "";
}

function getFileNameFromUrl(url: string) {
  const cleaned = url.split("?")[0] ?? url;
  return decodeURIComponent(cleaned.split("/").pop() ?? "Attachment");
}

function formatFileSize(size?: number | null) {
  if (!size || Number.isNaN(size)) {
    return null;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(size > 1024 * 100 ? 0 : 1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(size > 1024 * 1024 * 100 ? 0 : 1)} MB`;
}

function getAttachmentKind(
  message: SchoolMessage,
  url: string,
): "image" | "pdf" | "presentation" | "document" | "archive" | "link" | "file" {
  if (message.attachmentType === "image") {
    return "image";
  }

  if (message.attachmentType === "link") {
    return "link";
  }

  const extension = getFileExtension(message.attachmentName || url);
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(extension)) {
    return "image";
  }
  if (extension === "pdf") {
    return "pdf";
  }
  if (["ppt", "pptx"].includes(extension)) {
    return "presentation";
  }
  if (["doc", "docx", "txt", "xls", "xlsx"].includes(extension)) {
    return "document";
  }
  if (["zip", "rar", "7z"].includes(extension)) {
    return "archive";
  }

  const fallbackType = getAttachmentType(url);
  if (fallbackType === "media") {
    return "image";
  }
  if (fallbackType === "document") {
    return "document";
  }
  if (fallbackType === "link") {
    return "link";
  }

  return "file";
}

function renderAttachmentPreview(message: SchoolMessage) {
  if (message.attachmentUrl) {
    const kind = getAttachmentKind(message, message.attachmentUrl);
    return {
      kind,
      label: message.attachmentName || getFileNameFromUrl(message.attachmentUrl),
      href: message.attachmentUrl,
      size: message.attachmentSize ?? null,
    };
  }

  const url = extractFirstUrl(message.content);
  const attachmentType = getAttachmentType(url);

  if (!url || !attachmentType) {
    return null;
  }

  return {
    kind: getAttachmentKind(message, url),
    label: getFileNameFromUrl(url),
    href: url,
    size: null,
  };
}

function AttachmentCard({
  attachment,
  isOwn,
  onOpenImage,
}: {
  attachment: NonNullable<ReturnType<typeof renderAttachmentPreview>>;
  isOwn: boolean;
  onOpenImage: (src: string, alt: string) => void;
}) {
  const meta = (() => {
    switch (attachment.kind) {
      case "image":
        return { icon: Images, accent: "bg-[#EEF2FF] text-[#6D28D9]", typeLabel: "Image" };
      case "pdf":
        return { icon: FileText, accent: "bg-[#FEF2F2] text-[#DC2626]", typeLabel: "PDF" };
      case "presentation":
        return { icon: Presentation, accent: "bg-[#FFF7ED] text-[#EA580C]", typeLabel: "PPT" };
      case "document":
        return { icon: FileText, accent: "bg-[#EFF6FF] text-[#2563EB]", typeLabel: "Document" };
      case "archive":
        return { icon: FileArchive, accent: "bg-[#F3F4F6] text-[#4B5563]", typeLabel: "Archive" };
      case "link":
        return { icon: Link2, accent: "bg-[#F5F3FF] text-[#6D28D9]", typeLabel: "Link" };
      default:
        return { icon: File, accent: "bg-[#F3F4F6] text-[#374151]", typeLabel: "File" };
    }
  })();

  if (attachment.kind === "image") {
    return (
      <button
        type="button"
        onClick={() => onOpenImage(attachment.href, attachment.label)}
        className={`mt-3 block w-full overflow-hidden rounded-[18px] border border-[#E5E7EB] bg-white text-left transition hover:bg-[#FAFAFA] ${
          isOwn ? "shadow-none" : ""
        }`}
      >
        <img
          src={attachment.href}
          alt={attachment.label}
          className="max-h-[180px] w-full max-w-[280px] object-cover"
        />
        <div className="flex items-center justify-between gap-3 px-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#111827]">{attachment.label}</p>
            <p className="mt-0.5 text-xs text-[#6B7280]">
              {[meta.typeLabel, formatFileSize(attachment.size)].filter(Boolean).join(" • ")}
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#6B7280]">
            <SearchX className="h-4 w-4" />
          </div>
        </div>
      </button>
    );
  }

  const Icon = meta.icon;
  return (
    <a
      href={attachment.href}
      target="_blank"
      rel="noreferrer"
      className="mt-3 flex items-center gap-3 rounded-[18px] border border-[#E5E7EB] bg-white px-3 py-3 transition hover:bg-[#FAFAFA]"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#111827]">{attachment.label}</p>
        <p className="mt-0.5 text-xs text-[#6B7280]">
          {[meta.typeLabel, formatFileSize(attachment.size)].filter(Boolean).join(" • ")}
        </p>
      </div>
      <div className="flex items-center gap-2 text-[#6B7280]">
        <ExternalLink className="h-4 w-4" />
        <Download className="h-4 w-4" />
      </div>
    </a>
  );
}

export function SchoolChatPanel({
  schoolName,
  messages,
  loading,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onSendMessage,
}: SchoolChatPanelProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [activeRoom, setActiveRoom] = useState<SchoolMessage["room"]>("general");
  const [activeFilter, setActiveFilter] = useState<ChatListFilter>("all");
  const [showPinnedMessage, setShowPinnedMessage] = useState(true);
  const [openReactionPickerFor, setOpenReactionPickerFor] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const [messageReactions, setMessageReactions] = useState<
    Record<string, Array<{ emoji: string; userIds: string[] }>>
  >({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const roomSummaries = useMemo(() => {
    return SCHOOL_CHAT_ROOMS.map((room) => {
      const roomMessages = messages.filter((message) => message.room === room.id);
      const latestMessage = roomMessages[roomMessages.length - 1] ?? null;
      const latestByOtherTeacher = latestMessage ? latestMessage.userId !== currentUserId : false;

      return {
        ...room,
        latestMessage,
        unreadCount: latestByOtherTeacher ? 1 : 0,
        members: Array.from(new Set(roomMessages.map((message) => message.userId))).length,
      };
    });
  }, [currentUserId, messages]);

  const filteredRooms = useMemo(() => {
    const query = chatSearch.trim().toLowerCase();

    return roomSummaries.filter((room) => {
      const matchesSearch =
        !query ||
        room.name.toLowerCase().includes(query) ||
        room.fallbackPreview.toLowerCase().includes(query) ||
        room.latestMessage?.content.toLowerCase().includes(query);

      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "unread" && room.unreadCount > 0) ||
        (activeFilter === "groups" && true) ||
        (activeFilter === "direct" && false);

      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, chatSearch, roomSummaries]);

  const activeRoomMeta = roomSummaries.find((room) => room.id === activeRoom) ?? roomSummaries[0];
  const activeRoomMessages = useMemo(
    () => messages.filter((message) => message.room === activeRoom),
    [activeRoom, messages],
  );
  const messagesById = useMemo(
    () => new Map(activeRoomMessages.map((message) => [message.id, message])),
    [activeRoomMessages],
  );
  const replyingToMessage = replyingToId ? messagesById.get(replyingToId) ?? null : null;

  const groupedMessages = useMemo(() => {
    const groups: Array<{ label: string; items: SchoolMessage[] }> = [];

    for (const message of activeRoomMessages) {
      const label = getDateSeparatorLabel(message.createdAt);
      const existing = groups[groups.length - 1];

      if (existing && existing.label === label) {
        existing.items.push(message);
      } else {
        groups.push({ label, items: [message] });
      }
    }

    return groups;
  }, [activeRoomMessages]);

  const activeMembers = useMemo(() => {
    const memberMap = new Map<
      string,
      {
        id: string;
        name: string;
        avatar: string | null;
        role: string;
        status: string;
      }
    >();

    if (currentUserId) {
      memberMap.set(currentUserId, {
        id: currentUserId,
        name: currentUserName || "You",
        avatar: currentUserAvatar ?? null,
        role: "Teacher",
        status: "Active now",
      });
    }

    activeRoomMessages.forEach((message) => {
      if (!memberMap.has(message.userId)) {
        memberMap.set(message.userId, {
          id: message.userId,
          name: message.userId === currentUserId ? currentUserName || "You" : message.userName,
          avatar:
            message.userId === currentUserId
              ? currentUserAvatar ?? message.userAvatar ?? null
              : message.userAvatar ?? null,
          role: "Teacher",
          status: formatRelativeDate(message.createdAt),
        });
      }
    });

    return Array.from(memberMap.values());
  }, [activeRoomMessages, currentUserAvatar, currentUserId, currentUserName]);

  const roomStats = useMemo(() => {
    const links = activeRoomMessages.filter(
      (message) => message.attachmentType === "link" || extractFirstUrl(message.content),
    ).length;
    const files = activeRoomMessages.filter(
      (message) =>
        message.attachmentType === "file" ||
        getAttachmentType(extractFirstUrl(message.content)) === "document",
    ).length;
    const media = activeRoomMessages.filter(
      (message) =>
        message.attachmentType === "image" ||
        getAttachmentType(extractFirstUrl(message.content)) === "media",
    ).length;

    return {
      links,
      files,
      media,
      pinned: showPinnedMessage ? 1 : 0,
    };
  }, [activeRoomMessages, showPinnedMessage]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();

    if (!content && !selectedFile) {
      return;
    }

    setSending(true);
    setError("");

    try {
      await onSendMessage({
        content,
        room: activeRoom,
        parentId: replyingToId,
        file: selectedFile,
      });
      setDraft("");
      setReplyingToId(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (sendError) {
      setError(toUserFacingError(sendError, "Could not send message."));
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!sending && (draft.trim() || selectedFile)) {
        event.currentTarget.form?.requestSubmit();
      }
    }
  }

  function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  function toggleReaction(messageId: string, emoji: string) {
    setMessageReactions((current) => {
      const currentReactions = current[messageId] ?? [];
      const existingReaction = currentReactions.find((reaction) => reaction.emoji === emoji);

      if (!existingReaction) {
        return {
          ...current,
          [messageId]: [...currentReactions, { emoji, userIds: [currentUserId] }],
        };
      }

      const hasReacted = existingReaction.userIds.includes(currentUserId);
      const nextUserIds = hasReacted
        ? existingReaction.userIds.filter((userId) => userId !== currentUserId)
        : [...existingReaction.userIds, currentUserId];

      const nextReactions = currentReactions
        .map((reaction) =>
          reaction.emoji === emoji ? { ...reaction, userIds: nextUserIds } : reaction,
        )
        .filter((reaction) => reaction.userIds.length > 0);

      return {
        ...current,
        [messageId]: nextReactions,
      };
    });
    setOpenReactionPickerFor(null);
  }

  return (
    <div className="h-full overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white">
      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)_320px]">
        <aside className="min-h-0 border-r border-[#E5E7EB] bg-white">
          <div className="border-b border-[#E5E7EB] px-5 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[20px] font-semibold text-[#111827]">School Chat</h2>
                <p className="mt-1 text-sm text-[#6B7280]">{schoolName ?? "Your school"}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-xl p-2 text-[#6B7280] transition hover:bg-[#F9FAFB] hover:text-[#111827]">
                  <Filter className="h-4 w-4" />
                </button>
                <button className="rounded-xl p-2 text-[#6B7280] transition hover:bg-[#F9FAFB] hover:text-[#111827]">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <Input
                value={chatSearch}
                onChange={(event) => setChatSearch(event.target.value)}
                placeholder="Search conversations"
                className="h-11 rounded-2xl border-[#E5E7EB] bg-[#F9FAFB] pl-11"
              />
            </div>

            <div className="mt-4 flex items-center gap-5 border-b border-[#F3F4F6] text-sm">
              {(["all", "unread", "groups", "direct"] as ChatListFilter[]).map((filter) => {
                const isActive = activeFilter === filter;

                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
                    className={`relative pb-3 capitalize transition ${
                      isActive ? "font-medium text-[#6D28D9]" : "text-[#6B7280]"
                    }`}
                  >
                    {filter}
                    {isActive ? (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#6D28D9]" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-[calc(100%-169px)] overflow-y-auto px-3 py-3">
            {filteredRooms.length > 0 ? (
              filteredRooms.map((room) => {
                const isActive = room.id === activeRoom;

                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setActiveRoom(room.id)}
                    className={`mb-2 flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                      isActive ? "bg-[#F5F3FF]" : "hover:bg-[#F9FAFB]"
                    }`}
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${room.tone}`}>
                      <Users className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className={`truncate text-sm ${isActive ? "font-semibold text-[#111827]" : "font-medium text-[#111827]"}`}>
                          {room.name}
                        </p>
                        <span className="shrink-0 text-xs text-[#9CA3AF]">
                          {room.latestMessage ? formatRelativeDate(room.latestMessage.createdAt) : ""}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-[#6B7280]">
                        {room.latestMessage?.content || room.fallbackPreview}
                      </p>
                    </div>
                    {room.unreadCount > 0 ? (
                      <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#6D28D9] px-1 text-[10px] font-semibold text-white">
                        {room.unreadCount}
                      </div>
                    ) : null}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-8 text-center">
                <p className="text-sm font-medium text-[#111827]">No conversations found</p>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Try a different search or switch the filter tab.
                </p>
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col bg-[#FAFAFA]">
          <div className="border-b border-[#E5E7EB] bg-white px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${activeRoomMeta.tone}`}>
                  <Users className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-[#111827]">{activeRoomMeta.name}</h3>
                  <p className="text-sm text-[#6B7280]">
                    {activeMembers.length} members
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="rounded-xl p-2 text-[#6B7280] transition hover:bg-[#F9FAFB] hover:text-[#111827]">
                  <Search className="h-4 w-4" />
                </button>
                <button className="rounded-xl p-2 text-[#6B7280] transition hover:bg-[#F9FAFB] hover:text-[#111827]">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            {showPinnedMessage ? (
              <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-[#E9D5FF] bg-[#FAF5FF] px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#6D28D9]">
                    <Pin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#111827]">
                      Welcome to the general chat! Please keep discussions respectful.
                    </p>
                    <p className="mt-1 text-xs text-[#6B7280]">
                      Pinned for all teachers in this room
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs font-medium text-[#6D28D9]"
                  onClick={() => setShowPinnedMessage(false)}
                >
                  Close
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-20 rounded-2xl bg-white/80" />
                  ))}
                </div>
              ) : groupedMessages.length === 0 ? (
                <EmptyState
                  icon={MessageSquareMore}
                  title={`No messages in ${activeRoomMeta.name} yet`}
                  description="Start the conversation and coordinate with teachers in this room."
                />
              ) : (
                <div className="space-y-6">
                  {groupedMessages.map((group) => (
                    <div key={group.label} className="space-y-4">
                      <div className="flex justify-center">
                        <span className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-medium text-[#6B7280]">
                          {group.label}
                        </span>
                      </div>

                      {group.items.map((message) => {
                        const isOwn = message.userId === currentUserId;
                        const attachment = renderAttachmentPreview(message);
                        const parentMessage = message.parentId ? messagesById.get(message.parentId) ?? null : null;

                        return (
                          <div key={message.id} className={`flex gap-3 ${isOwn ? "justify-end" : "justify-start"}`}>
                            {!isOwn ? (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-sm font-semibold text-[#111827]">
                                {message.userAvatar ? (
                                  <img
                                    src={message.userAvatar}
                                    alt={message.userName}
                                    className="h-full w-full rounded-full object-cover"
                                  />
                                ) : (
                                  initials(message.userName)
                                )}
                              </div>
                            ) : null}

                            <div className={`flex max-w-[78%] flex-col ${isOwn ? "items-end" : "items-start"}`}>
                              <div className="mb-1 flex items-center gap-2 px-1">
                                <p className="text-xs font-semibold text-[#111827]">
                                  {isOwn ? "You" : message.userName}
                                </p>
                                <span className="text-xs text-[#9CA3AF]">{formatRelativeDate(message.createdAt)}</span>
                              </div>

                              <div
                                className={`rounded-[20px] px-4 py-3 text-sm leading-6 ${
                                  isOwn
                                    ? "bg-[#EEE5FF] text-[#111827]"
                                    : "border border-[#E5E7EB] bg-white text-[#111827]"
                                }`}
                              >
                                {parentMessage ? (
                                  <div className="mb-3 rounded-2xl border border-[#E5E7EB] bg-black/[0.03] px-3 py-2">
                                    <p className="text-xs font-semibold text-[#6B7280]">
                                      Replying to {parentMessage.userId === currentUserId ? "You" : parentMessage.userName}
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-xs text-[#6B7280]">
                                      {parentMessage.content || parentMessage.attachmentName || "Shared attachment"}
                                    </p>
                                  </div>
                                ) : null}

                                {message.content ? (
                                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                ) : null}

                                {attachment ? (
                                  <AttachmentCard
                                    attachment={attachment}
                                    isOwn={isOwn}
                                    onOpenImage={(src, alt) => setLightboxImage({ src, alt })}
                                  />
                                ) : null}
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
                                <button
                                  type="button"
                                  onClick={() => setReplyingToId(message.id)}
                                  className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs text-[#6B7280] transition hover:bg-[#F9FAFB] hover:text-[#111827]"
                                >
                                  <CornerUpLeft className="h-3.5 w-3.5" />
                                  Reply
                                </button>

                                {(messageReactions[message.id] ?? []).map((reaction) => {
                                  const hasReacted = reaction.userIds.includes(currentUserId);

                                  return (
                                    <button
                                      key={reaction.emoji}
                                      type="button"
                                      onClick={() => toggleReaction(message.id, reaction.emoji)}
                                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition ${
                                        hasReacted
                                          ? "border-[#D8B4FE] bg-[#F5F3FF] text-[#6D28D9]"
                                          : "border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F9FAFB]"
                                      }`}
                                    >
                                      <span>{reaction.emoji}</span>
                                      <span>{reaction.userIds.length}</span>
                                    </button>
                                  );
                                })}

                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenReactionPickerFor((current) =>
                                        current === message.id ? null : message.id,
                                      )
                                    }
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-xs text-[#6B7280] transition hover:bg-[#F9FAFB] hover:text-[#111827]"
                                  >
                                    <SmilePlus className="h-3.5 w-3.5" />
                                  </button>

                                  {openReactionPickerFor === message.id ? (
                                    <div className={`absolute bottom-10 z-20 w-[248px] rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-[0_16px_32px_rgba(17,24,39,0.08)] ${
                                      isOwn ? "right-0" : "left-0"
                                    }`}>
                                      <div className="mb-2 px-1">
                                        <p className="text-xs font-medium text-[#6B7280]">Choose reaction</p>
                                      </div>
                                      <div className="grid max-h-[180px] grid-cols-6 gap-2 overflow-y-auto pr-1">
                                        {EMOJI_REACTIONS.map((emoji) => (
                                          <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => toggleReaction(message.id, emoji)}
                                            className="flex h-8 w-8 items-center justify-center rounded-xl text-base transition hover:bg-[#F5F3FF]"
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-[#E5E7EB] bg-white px-6 py-4">
              <form onSubmit={handleSubmit}>
                {replyingToMessage || selectedFile ? (
                  <div className="mb-3 flex flex-wrap items-start gap-3 rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-3">
                    {replyingToMessage ? (
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6D28D9]">
                          Replying to {replyingToMessage.userId === currentUserId ? "yourself" : replyingToMessage.userName}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-[#6B7280]">
                          {replyingToMessage.content || replyingToMessage.attachmentName || "Shared attachment"}
                        </p>
                      </div>
                    ) : null}

                    {selectedFile ? (
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6D28D9]">
                          Attachment ready
                        </p>
                        <p className="mt-1 truncate text-sm text-[#6B7280]">
                          {selectedFile.name} • {[getFileExtension(selectedFile.name).toUpperCase() || "FILE", formatFileSize(selectedFile.size)].filter(Boolean).join(" • ")}
                        </p>
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        setReplyingToId(null);
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="text-xs font-medium text-[#6D28D9]"
                    >
                      Clear
                    </button>
                  </div>
                ) : null}

                <div className="flex items-end gap-3 rounded-[24px] border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-3">
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleAttachmentChange} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl p-2 text-[#6B7280] transition hover:bg-white hover:text-[#111827]"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${activeRoomMeta.name}`}
                    className="min-h-[44px] flex-1 resize-none border-0 bg-transparent px-0 py-1 shadow-none focus-visible:ring-0"
                  />
                  <button type="button" className="rounded-xl p-2 text-[#6B7280] transition hover:bg-white hover:text-[#111827]">
                    <Smile className="h-4 w-4" />
                  </button>
                  <button type="button" className="rounded-xl p-2 text-[#6B7280] transition hover:bg-white hover:text-[#111827]">
                    <Mic className="h-4 w-4" />
                  </button>
                  <Button
                    type="submit"
                    loading={sending}
                    loadingText="Sending..."
                    disabled={sending}
                    className="rounded-2xl bg-[#6D28D9] px-4 text-white hover:bg-[#5B21B6]"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {error ? <p className="mt-3 text-sm text-foreground/80">{error}</p> : null}
              </form>
            </div>
          </div>
        </section>

        <aside className="hidden min-h-0 overflow-y-auto border-l border-[#E5E7EB] bg-white 2xl:block">
          <div className="border-b border-[#E5E7EB] px-5 py-6">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${activeRoomMeta.tone}`}>
              <Users className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-[20px] font-semibold text-[#111827]">{activeRoomMeta.name}</h3>
            <p className="mt-1 text-sm text-[#6B7280]">
              {activeMembers.length} members
            </p>
            <p className="mt-4 text-sm leading-6 text-[#6B7280]">
              {ROOM_DESCRIPTIONS[activeRoom]}
            </p>
          </div>

          <div className="space-y-6 px-5 py-5">
            <div>
              <p className="text-sm font-semibold text-[#111827]">Channel details</p>
              <div className="mt-4 space-y-3">
                {[
                  { label: "Notifications", value: "On", icon: Bell },
                  { label: "Shared Media", value: String(roomStats.media), icon: Images },
                  { label: "Files", value: String(roomStats.files), icon: FileText },
                  { label: "Links", value: String(roomStats.links), icon: Link2 },
                  { label: "Pinned Messages", value: String(roomStats.pinned), icon: Pin },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl border border-[#F3F4F6] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F9FAFB] text-[#6B7280]">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm text-[#111827]">{item.label}</span>
                    </div>
                    <span className="text-sm text-[#6B7280]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#111827]">Members</p>
                <span className="text-xs text-[#9CA3AF]">{activeMembers.length}</span>
              </div>

              <div className="mt-4 space-y-3">
                {activeMembers.slice(0, 6).map((member) => (
                  <div key={member.id} className="flex items-center gap-3 rounded-2xl border border-[#F3F4F6] px-3 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB] bg-[#FAFAFA] text-sm font-semibold text-[#111827]">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        initials(member.name)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#111827]">{member.name}</p>
                      <p className="text-xs text-[#6B7280]">{member.status}</p>
                    </div>
                    <span className="rounded-full bg-[#F5F3FF] px-2 py-1 text-[11px] font-medium text-[#6D28D9]">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>

              <button type="button" className="mt-4 text-sm font-medium text-[#6D28D9]">
                View all members →
              </button>
            </div>
          </div>
        </aside>
      </div>

      {lightboxImage ? (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-[24px] bg-white p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/75"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={lightboxImage.src}
              alt={lightboxImage.alt}
              className="max-h-[82vh] max-w-[82vw] rounded-[18px] object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
