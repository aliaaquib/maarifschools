"use client";

import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Check,
  CornerUpLeft,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Images,
  Link2,
  Link as LinkIcon,
  MessageSquareMore,
  Mic,
  MoreHorizontal,
  Image as ImageIcon,
  Paperclip,
  Presentation,
  Pin,
  Plus,
  SearchX,
  Search,
  Send,
  Settings2,
  SmilePlus,
  Smile,
  Users,
  UserRound,
  FileArchive,
  File,
  X,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_SCHOOL_CHAT_ROOMS } from "@/lib/constants";
import { toUserFacingError } from "@/lib/errors";
import { SchoolChatConversation, SchoolMessage, SchoolTeacher } from "@/types";
import { formatRelativeDate, initials } from "@/lib/utils";

type ChatListFilter = "all" | "unread" | "groups" | "direct";
type GroupInfoTab = "members" | "media" | "files" | "links" | "pinned";

interface SchoolChatPanelProps {
  schoolName?: string | null;
  conversations: SchoolChatConversation[];
  teachers: SchoolTeacher[];
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
  onCreateConversation: (input: {
    name: string;
    type: SchoolChatConversation["type"];
    memberIds: string[];
  }) => Promise<SchoolChatConversation>;
}

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

function getConversationTone(conversation: SchoolChatConversation, index: number) {
  const preset = DEFAULT_SCHOOL_CHAT_ROOMS.find((room) => room.id === conversation.id);
  if (preset) {
    return preset.tone;
  }

  if (conversation.type === "direct") {
    return "bg-[#EFF6FF] text-[#2563EB]";
  }

  const tones = [
    "bg-[#F5F3FF] text-[#6D28D9]",
    "bg-[#FFF7ED] text-[#EA580C]",
    "bg-[#ECFDF5] text-[#16A34A]",
    "bg-[#FEE2E2] text-[#DC2626]",
  ];

  return tones[index % tones.length];
}

function getConversationDescription(conversation: SchoolChatConversation) {
  const preset = DEFAULT_SCHOOL_CHAT_ROOMS.find((room) => room.id === conversation.id);
  if (preset) {
    if (conversation.id === "general") {
      return "Whole-school announcements, coordination, and day-to-day communication.";
    }
    if (conversation.id === "grade-3") {
      return "Planning, worksheets, and class updates for Grade 3 teachers.";
    }
    if (conversation.id === "science") {
      return "Experiments, lab ideas, and science department collaboration.";
    }
  }

  return conversation.type === "direct"
    ? "Private teacher-to-teacher conversation."
    : "Custom school conversation for focused collaboration.";
}

export function SchoolChatPanel({
  schoolName,
  conversations,
  teachers,
  messages,
  loading,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onSendMessage,
  onCreateConversation,
}: SchoolChatPanelProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [activeRoom, setActiveRoom] = useState<SchoolMessage["room"]>("general");
  const [activeFilter, setActiveFilter] = useState<ChatListFilter>("all");
  const [showPinnedMessage, setShowPinnedMessage] = useState(true);
  const [isCreateConversationOpen, setIsCreateConversationOpen] = useState(false);
  const [isHeaderSearchOpen, setIsHeaderSearchOpen] = useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [infoPanelTab, setInfoPanelTab] = useState<GroupInfoTab>("members");
  const [conversationType, setConversationType] = useState<SchoolChatConversation["type"]>("group");
  const [conversationName, setConversationName] = useState("");
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [openReactionPickerFor, setOpenReactionPickerFor] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const [lastSeenByConversation, setLastSeenByConversation] = useState<Record<string, string>>({});
  const [messageReactions, setMessageReactions] = useState<
    Record<string, Array<{ emoji: string; userIds: string[] }>>
  >({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const headerSearchInputRef = useRef<HTMLInputElement | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const menuRef = useRef<HTMLDivElement | null>(null);
  const unreadStorageKey = `teachshare-school-chat-seen:${currentUserId}:${schoolName ?? "school"}`;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(unreadStorageKey);
    if (!stored) {
      setLastSeenByConversation({});
      return;
    }

    try {
      setLastSeenByConversation(JSON.parse(stored) as Record<string, string>);
    } catch {
      setLastSeenByConversation({});
    }
  }, [unreadStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(unreadStorageKey, JSON.stringify(lastSeenByConversation));
  }, [lastSeenByConversation, unreadStorageKey]);

  const roomSummaries = useMemo(() => {
    return conversations.map((conversation, index) => {
      const roomMessages = messages.filter((message) => message.room === conversation.id);
      const latestMessage = roomMessages[roomMessages.length - 1] ?? null;
      const seenAt = lastSeenByConversation[conversation.id];
      const unreadCount = roomMessages.filter(
        (message) =>
          message.userId !== currentUserId &&
          (!seenAt || new Date(message.createdAt).getTime() > new Date(seenAt).getTime()),
      ).length;

      return {
        ...conversation,
        tone: getConversationTone(conversation, index),
        fallbackPreview:
          DEFAULT_SCHOOL_CHAT_ROOMS.find((room) => room.id === conversation.id)?.fallbackPreview ??
          (conversation.type === "direct" ? "Start a private conversation" : "Start the group conversation"),
        latestMessage,
        unreadCount,
        members: conversation.memberIds.length || Array.from(new Set(roomMessages.map((message) => message.userId))).length,
      };
    });
  }, [conversations, currentUserId, lastSeenByConversation, messages]);

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
        (activeFilter === "groups" && room.type === "group") ||
        (activeFilter === "direct" && room.type === "direct");

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

  useEffect(() => {
    if (!activeRoomMeta && roomSummaries.length > 0) {
      setActiveRoom(roomSummaries[0].id);
    }
  }, [activeRoomMeta, roomSummaries]);

  useEffect(() => {
    if (!activeRoomMeta?.id || !activeRoomMessages.length) {
      return;
    }

    const latestVisibleMessage = activeRoomMessages[activeRoomMessages.length - 1];
    setLastSeenByConversation((current) => {
      if (current[activeRoomMeta.id] === latestVisibleMessage.createdAt) {
        return current;
      }

      return {
        ...current,
        [activeRoomMeta.id]: latestVisibleMessage.createdAt,
      };
    });
  }, [activeRoomMessages, activeRoomMeta?.id]);

  useEffect(() => {
    if (!isHeaderSearchOpen) {
      return;
    }

    headerSearchInputRef.current?.focus();
  }, [isHeaderSearchOpen]);

  useEffect(() => {
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      setIsHeaderSearchOpen(false);
      setHeaderSearchQuery("");
      setIsMenuOpen(false);
      setIsInfoPanelOpen(false);
      setIsCreateConversationOpen(false);
      setOpenReactionPickerFor(null);
    };

    const handleOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleOutside);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleOutside);
    };
  }, []);

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

  const teacherMap = useMemo(
    () => new Map(teachers.map((teacher) => [teacher.id, teacher])),
    [teachers],
  );

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

    activeRoomMeta?.memberIds.forEach((memberId) => {
      const teacher = teacherMap.get(memberId);
      if (teacher && !memberMap.has(memberId)) {
        memberMap.set(memberId, {
          id: memberId,
          name: memberId === currentUserId ? currentUserName || "You" : teacher.name,
          avatar: memberId === currentUserId ? currentUserAvatar ?? teacher.avatar ?? null : teacher.avatar ?? null,
          role: "Teacher",
          status: memberId === currentUserId ? "Active now" : "Available",
        });
      }
    });

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
  }, [activeRoomMessages, activeRoomMeta?.memberIds, currentUserAvatar, currentUserId, currentUserName, teacherMap]);

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

  const sharedItems = useMemo(() => {
    return activeRoomMessages
      .map((message) => ({
        message,
        attachment: renderAttachmentPreview(message),
      }))
      .filter((item) => item.attachment);
  }, [activeRoomMessages]);

  const sharedMedia = useMemo(
    () => sharedItems.filter((item) => item.attachment?.kind === "image"),
    [sharedItems],
  );
  const sharedFiles = useMemo(
    () => sharedItems.filter((item) => item.attachment && item.attachment.kind !== "image" && item.attachment.kind !== "link"),
    [sharedItems],
  );
  const sharedLinks = useMemo(
    () => sharedItems.filter((item) => item.attachment?.kind === "link"),
    [sharedItems],
  );

  const pinnedMessages = useMemo(() => activeRoomMessages.slice(0, showPinnedMessage ? 1 : 0), [activeRoomMessages, showPinnedMessage]);

  const searchResults = useMemo(() => {
    const query = headerSearchQuery.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return activeRoomMessages.filter((message) => {
      const teacher = teacherMap.get(message.userId);
      const attachment = renderAttachmentPreview(message);
      return [
        message.content,
        message.userName,
        teacher?.name ?? "",
        teacher?.subject ?? "",
        attachment?.label ?? "",
        attachment?.href ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [activeRoomMessages, headerSearchQuery, teacherMap]);

  function highlightMatch(text: string, query: string) {
    if (!query.trim()) {
      return text;
    }

    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(${safeQuery})`, "ig");
    const parts = text.split(pattern);

    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={`${part}-${index}`} className="rounded bg-[#E9D5FF] px-0.5 text-[#5B21B6]">
          {part}
        </mark>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      ),
    );
  }

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

  function openInfoPanel(tab: GroupInfoTab) {
    setInfoPanelTab(tab);
    setIsInfoPanelOpen(true);
    setIsMenuOpen(false);
  }

  function scrollToMessage(messageId: string) {
    const node = messageRefs.current[messageId];
    if (!node) {
      return;
    }

    node.scrollIntoView({ behavior: "smooth", block: "center" });
    node.classList.add("ring-2", "ring-[#C4B5FD]");
    window.setTimeout(() => {
      node.classList.remove("ring-2", "ring-[#C4B5FD]");
    }, 1800);
  }

  function handleSelectRoom(roomId: string) {
    setActiveRoom(roomId);
    const latestMessage = messages.filter((message) => message.room === roomId).at(-1);
    if (!latestMessage) {
      return;
    }

    setLastSeenByConversation((current) => ({
      ...current,
      [roomId]: latestMessage.createdAt,
    }));
  }

  async function handleCreateConversationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const memberIds = Array.from(new Set(selectedTeacherIds.filter(Boolean)));
    const trimmedName = conversationName.trim();
    const resolvedName =
      conversationType === "direct"
        ? teachers.find((teacher) => teacher.id === memberIds[0])?.name ?? "Direct chat"
        : trimmedName;

    if ((conversationType === "group" && !resolvedName) || memberIds.length === 0) {
      setError("Choose teachers and complete the conversation details.");
      return;
    }

    setCreatingConversation(true);
    setError("");

    try {
      const createdConversation = await onCreateConversation({
        name: resolvedName,
        type: conversationType,
        memberIds,
      });

      setConversationName("");
      setSelectedTeacherIds([]);
      setIsCreateConversationOpen(false);
      handleSelectRoom(createdConversation.id);
    } catch (conversationError) {
      setError(toUserFacingError(conversationError, "Could not create conversation."));
    } finally {
      setCreatingConversation(false);
    }
  }

  const availableTeachers = useMemo(
    () => teachers.filter((teacher) => teacher.id !== currentUserId),
    [currentUserId, teachers],
  );

  function renderInfoList(items: Array<{ icon: React.ComponentType<{ className?: string }>; label: string; value: string; onClick: () => void }>) {
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className="flex w-full items-center justify-between rounded-2xl border border-[#F3F4F6] px-4 py-3 text-left transition hover:bg-[#FAFAFA]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F9FAFB] text-[#6B7280]">
                <item.icon className="h-4 w-4" />
              </div>
              <span className="text-sm text-[#111827]">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#6B7280]">{item.value}</span>
              <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />
            </div>
          </button>
        ))}
      </div>
    );
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
      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]">
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
                <button
                  type="button"
                  onClick={() => setIsCreateConversationOpen(true)}
                  className="rounded-xl p-2 text-[#6B7280] transition hover:bg-[#F9FAFB] hover:text-[#111827]"
                >
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
                    onClick={() => handleSelectRoom(room.id)}
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
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-medium text-[#6B7280]">
                          {room.type === "direct" ? "Direct" : "Group"}
                        </span>
                        <span className="text-[11px] text-[#9CA3AF]">{room.members} members</span>
                      </div>
                    </div>
                    {room.unreadCount > 0 ? (
                      <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#6D28D9] px-1 text-[10px] font-semibold text-white">
                        {Math.min(room.unreadCount, 99)}
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
                  <h3 className="truncate text-lg font-semibold text-[#111827]">{activeRoomMeta?.name ?? "Conversation"}</h3>
                  <p className="text-sm text-[#6B7280]">
                    {activeMembers.length} members
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderSearchOpen((current) => !current);
                    if (isHeaderSearchOpen) {
                      setHeaderSearchQuery("");
                    }
                  }}
                  className={`rounded-xl p-2 transition hover:bg-[#F9FAFB] hover:text-[#111827] ${
                    isHeaderSearchOpen ? "bg-[#F5F3FF] text-[#6D28D9]" : "text-[#6B7280]"
                  }`}
                >
                  <Search className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen((current) => !current)}
                  className="rounded-xl p-2 text-[#6B7280] transition hover:bg-[#F9FAFB] hover:text-[#111827]"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {isMenuOpen ? (
                  <div className="absolute right-6 top-[74px] z-20 w-[240px] rounded-2xl border border-[#E5E7EB] bg-white p-2 shadow-[0_16px_32px_rgba(17,24,39,0.08)]">
                    {[
                      { label: "Group Info", action: () => openInfoPanel("members") },
                      { label: "View Members", action: () => openInfoPanel("members") },
                      { label: "Shared Media", action: () => openInfoPanel("media") },
                      { label: "Shared Files", action: () => openInfoPanel("files") },
                      { label: "Pinned Messages", action: () => openInfoPanel("pinned") },
                      { label: "Notification Settings", action: () => openInfoPanel("links") },
                      { label: "Leave Group", action: () => setIsMenuOpen(false) },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={item.action}
                        className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-[#111827] transition hover:bg-[#F9FAFB]"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {isHeaderSearchOpen ? (
              <div className="mt-4 space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <Input
                    ref={headerSearchInputRef}
                    value={headerSearchQuery}
                    onChange={(event) => setHeaderSearchQuery(event.target.value)}
                    placeholder="Search messages, files, links..."
                    className="h-11 rounded-2xl border-[#E5E7EB] bg-[#FAFAFA] pl-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderSearchOpen(false);
                      setHeaderSearchQuery("");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#9CA3AF] transition hover:bg-white hover:text-[#111827]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {headerSearchQuery.trim() ? (
                  <div className="max-h-[220px] overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                    {searchResults.length > 0 ? (
                      searchResults.map((message) => (
                        <button
                          key={message.id}
                          type="button"
                          onClick={() => {
                            scrollToMessage(message.id);
                            setIsHeaderSearchOpen(false);
                          }}
                          className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-xs font-semibold text-[#111827]">
                            {message.userAvatar ? (
                              <img src={message.userAvatar} alt={message.userName} className="h-full w-full rounded-full object-cover" />
                            ) : (
                              initials(message.userName)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-sm font-medium text-[#111827]">{message.userName}</p>
                              <span className="text-xs text-[#9CA3AF]">{formatRelativeDate(message.createdAt)}</span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-sm text-[#6B7280]">
                              {highlightMatch(
                                message.content || message.attachmentName || renderAttachmentPreview(message)?.label || "Shared attachment",
                                headerSearchQuery,
                              )}
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <p className="text-sm font-medium text-[#111827]">No matching messages</p>
                        <p className="mt-1 text-sm text-[#6B7280]">Try a different keyword or file name.</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

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
                  title={`No messages in ${activeRoomMeta?.name ?? "this conversation"} yet`}
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
                          <div
                            key={message.id}
                            ref={(node) => {
                              messageRefs.current[message.id] = node;
                            }}
                            className={`flex gap-3 rounded-2xl transition-all duration-200 ${isOwn ? "justify-end" : "justify-start"}`}
                          >
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
                    placeholder={`Message ${activeRoomMeta?.name ?? "conversation"}`}
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

      </div>

      {isCreateConversationOpen ? (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/35 p-6 backdrop-blur-sm"
          onClick={() => setIsCreateConversationOpen(false)}
        >
          <div
            className="w-full max-w-[520px] rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_48px_rgba(17,24,39,0.12)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-[#111827]">Start a new conversation</h3>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Create a group for your school team or message a teacher directly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateConversationOpen(false)}
                className="rounded-xl p-2 text-[#6B7280] transition hover:bg-[#F9FAFB] hover:text-[#111827]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleCreateConversationSubmit}>
              <div className="flex gap-2 rounded-2xl bg-[#F9FAFB] p-1">
                {(["group", "direct"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setConversationType(type);
                      setConversationName("");
                      setSelectedTeacherIds([]);
                    }}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      conversationType === type
                        ? "bg-white text-[#6D28D9] shadow-[0_1px_2px_rgba(17,24,39,0.05)]"
                        : "text-[#6B7280]"
                    }`}
                  >
                    {type === "group" ? "Group chat" : "Direct message"}
                  </button>
                ))}
              </div>

              {conversationType === "group" ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#111827]">Group name</label>
                  <Input
                    value={conversationName}
                    onChange={(event) => setConversationName(event.target.value)}
                    placeholder="e.g. ICT Teachers"
                    className="h-11 rounded-2xl border-[#E5E7EB]"
                  />
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-[#111827]">
                  {conversationType === "group" ? "Choose teachers" : "Message teacher"}
                </label>
                <div className="max-h-[240px] space-y-2 overflow-y-auto rounded-2xl border border-[#E5E7EB] p-2">
                  {availableTeachers.map((teacher) => {
                    const isSelected = selectedTeacherIds.includes(teacher.id);
                    return (
                      <button
                        key={teacher.id}
                        type="button"
                        onClick={() => {
                          if (conversationType === "direct") {
                            setSelectedTeacherIds([teacher.id]);
                            return;
                          }

                          setSelectedTeacherIds((current) =>
                            isSelected ? current.filter((id) => id !== teacher.id) : [...current, teacher.id],
                          );
                        }}
                        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                          isSelected ? "bg-[#F5F3FF]" : "hover:bg-[#F9FAFB]"
                        }`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[#E5E7EB] bg-[#FAFAFA] text-sm font-semibold text-[#111827]">
                          {teacher.avatar ? (
                            <img src={teacher.avatar} alt={teacher.name} className="h-full w-full object-cover" />
                          ) : (
                            initials(teacher.name)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#111827]">{teacher.name}</p>
                          <p className="truncate text-xs text-[#6B7280]">{teacher.email}</p>
                        </div>
                        {isSelected ? (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6D28D9] text-white">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        ) : conversationType === "direct" ? (
                          <UserRound className="h-4 w-4 text-[#9CA3AF]" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setIsCreateConversationOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={creatingConversation}
                  loadingText="Creating..."
                  className="rounded-xl bg-[#6D28D9] text-white hover:bg-[#5B21B6]"
                >
                  {conversationType === "group" ? "Create Group" : "Start Chat"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div
        className={`pointer-events-none absolute inset-y-0 right-0 z-30 w-full max-w-[360px] transform border-l border-[#E5E7EB] bg-white transition duration-200 ${
          isInfoPanelOpen ? "translate-x-0 pointer-events-auto" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-[#E5E7EB] px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${activeRoomMeta?.tone ?? "bg-[#F5F3FF] text-[#6D28D9]"}`}>
                  {activeRoomMeta?.type === "direct" ? <UserRound className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-[20px] font-semibold text-[#111827]">{activeRoomMeta?.name ?? "Conversation"}</h3>
                  <p className="mt-1 text-sm text-[#6B7280]">{activeMembers.length} members</p>
                  <p className="mt-3 text-sm leading-6 text-[#6B7280]">
                    {activeRoomMeta ? getConversationDescription(activeRoomMeta) : "School collaboration conversation."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInfoPanelOpen(false)}
                className="rounded-xl p-2 text-[#6B7280] transition hover:bg-[#F9FAFB] hover:text-[#111827]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="border-b border-[#E5E7EB] px-5 py-3">
            <div className="grid grid-cols-5 gap-2 text-xs">
              {[
                { id: "members", label: "Members" },
                { id: "media", label: "Media" },
                { id: "files", label: "Files" },
                { id: "links", label: "Links" },
                { id: "pinned", label: "Pinned" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInfoPanelTab(tab.id as GroupInfoTab)}
                  className={`rounded-xl px-2 py-2 font-medium transition ${
                    infoPanelTab === tab.id ? "bg-[#F5F3FF] text-[#6D28D9]" : "text-[#6B7280] hover:bg-[#F9FAFB]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {infoPanelTab === "members" ? (
              <div className="space-y-3">
                {renderInfoList([
                  { label: "Notifications", value: "On", icon: Bell, onClick: () => setInfoPanelTab("links") },
                  { label: "Shared Media", value: String(sharedMedia.length), icon: Images, onClick: () => setInfoPanelTab("media") },
                  { label: "Files", value: String(sharedFiles.length), icon: FileText, onClick: () => setInfoPanelTab("files") },
                  { label: "Links", value: String(sharedLinks.length), icon: LinkIcon, onClick: () => setInfoPanelTab("links") },
                  { label: "Pinned Messages", value: String(pinnedMessages.length), icon: Pin, onClick: () => setInfoPanelTab("pinned") },
                ])}

                <div className="pt-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#111827]">Members</p>
                    <span className="text-xs text-[#9CA3AF]">{activeMembers.length}</span>
                  </div>
                  <div className="space-y-3">
                    {activeMembers.map((member) => {
                      const teacher = teacherMap.get(member.id);
                      const role = member.id === activeRoomMeta?.createdBy || member.id === currentUserId ? "Admin" : "Teacher";
                      return (
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
                            <p className="truncate text-xs text-[#6B7280]">
                              {teacher?.subject || "Teacher"}{teacher?.grade ? ` • ${teacher.grade}` : ""} • {member.status}
                            </p>
                          </div>
                          <span className="rounded-full bg-[#F5F3FF] px-2 py-1 text-[11px] font-medium text-[#6D28D9]">
                            {role}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {infoPanelTab === "media" ? (
              sharedMedia.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {sharedMedia.map(({ message, attachment }) => (
                    <button
                      key={message.id}
                      type="button"
                      onClick={() => attachment && setLightboxImage({ src: attachment.href, alt: attachment.label })}
                      className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] text-left transition hover:bg-white"
                    >
                      <img src={attachment!.href} alt={attachment!.label} className="h-28 w-full object-cover" />
                      <div className="px-3 py-3">
                        <p className="truncate text-sm font-medium text-[#111827]">{attachment!.label}</p>
                        <p className="mt-1 text-xs text-[#6B7280]">by {message.userName}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState icon={ImageIcon} title="No shared media yet" description="Images shared in this conversation will appear here." />
              )
            ) : null}

            {infoPanelTab === "files" ? (
              sharedFiles.length > 0 ? (
                <div className="space-y-3">
                  {sharedFiles.map(({ message, attachment }) => (
                    <a
                      key={message.id}
                      href={attachment!.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-3 transition hover:bg-white"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#6D28D9]">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#111827]">{attachment!.label}</p>
                        <p className="mt-1 text-xs text-[#6B7280]">
                          {[formatFileSize(attachment!.size), `by ${message.userName}`, formatRelativeDate(message.createdAt)].filter(Boolean).join(" • ")}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-[#6B7280]" />
                    </a>
                  ))}
                </div>
              ) : (
                <EmptyState icon={FileText} title="No shared files yet" description="Documents and worksheets shared in chat will appear here." />
              )
            ) : null}

            {infoPanelTab === "links" ? (
              sharedLinks.length > 0 ? (
                <div className="space-y-3">
                  {sharedLinks.map(({ message, attachment }) => (
                    <a
                      key={message.id}
                      href={attachment!.href}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-3 transition hover:bg-white"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#6D28D9]">
                          <Link2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#111827]">{attachment!.label}</p>
                          <p className="mt-1 truncate text-xs text-[#6B7280]">{attachment!.href}</p>
                          <p className="mt-2 text-xs text-[#9CA3AF]">Shared by {message.userName}</p>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#6D28D9]">
                        <Settings2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#111827]">Notifications</p>
                        <p className="mt-1 text-xs text-[#6B7280]">Message alerts are enabled for this conversation.</p>
                      </div>
                    </div>
                  </div>
                  <EmptyState icon={Link2} title="No shared links yet" description="Links shared in chat will appear here." />
                </div>
              )
            ) : null}

            {infoPanelTab === "pinned" ? (
              pinnedMessages.length > 0 ? (
                <div className="space-y-3">
                  {pinnedMessages.map((message) => (
                    <button
                      key={message.id}
                      type="button"
                      onClick={() => {
                        setIsInfoPanelOpen(false);
                        scrollToMessage(message.id);
                      }}
                      className="w-full rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-4 text-left transition hover:bg-white"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#6D28D9]">
                          <Pin className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#111827]">{message.userId === currentUserId ? "You" : message.userName}</p>
                          <p className="mt-1 line-clamp-3 text-sm text-[#6B7280]">{message.content || message.attachmentName || "Pinned attachment"}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Pin} title="No pinned messages" description="Pinned items for this conversation will appear here." />
              )
            ) : null}
          </div>
        </div>
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
