"use client";

import {
  BellRing,
  Bookmark,
  BookMarked,
  Download,
  ExternalLink,
  FileText,
  Heart,
  Lightbulb,
  MessageCircle,
  MessageSquareText,
  MoreHorizontal,
  Paperclip,
  Pin,
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
import {
  CommunityCategory,
  DiscussionComment,
  DiscussionPost,
  ResourceRecord,
  SchoolTeacher,
} from "@/types";
import { cn, formatRelativeDate, initials } from "@/lib/utils";

type ComposerKind = Exclude<CommunityCategory, "all">;

type CommunityMeta = {
  kind: ComposerKind;
  title: string;
  tags: string[];
};

interface CommunityPanelProps {
  posts: DiscussionPost[];
  comments: DiscussionComment[];
  loading: boolean;
  currentUserId: string;
  currentUserName?: string;
  currentUserAvatar?: string | null;
  schoolTeachers?: SchoolTeacher[];
  resources?: ResourceRecord[];
  resourceCount?: number;
  searchQuery?: string;
  initialCategory?: CommunityCategory;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  showComposer?: boolean;
  onCreatePost: (input: { title: string; body: string }) => Promise<DiscussionPost | void>;
  onCreateComment: (input: { postId: string; body: string }) => Promise<void>;
  onTogglePostLike: (post: DiscussionPost) => Promise<void>;
  onTogglePostBookmark: (post: DiscussionPost) => Promise<void>;
  onDeletePost: (post: DiscussionPost) => Promise<void>;
  onDeleteComment: (comment: DiscussionComment) => Promise<void>;
}

const categoryTabs: Array<{ id: CommunityCategory; label: string }> = [
  { id: "all", label: "All Posts" },
  { id: "discussions", label: "Discussions" },
  { id: "resources", label: "Resources" },
  { id: "questions", label: "Questions" },
];

const knownTopicMatchers = [
  "Classroom Management",
  "Teaching Strategies",
  "Student Engagement",
  "Assessment",
  "Science",
  "Mathematics",
  "English",
  "ICT",
  "Computer Science",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
];

const contributorRankStyles = [
  "bg-[#FEF3C7] text-[#F59E0B]",
  "bg-[#E5E7EB] text-[#94A3B8]",
  "bg-[#FDE7D7] text-[#F97316]",
];

function normalizeTitle(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function parseComposerTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => normalizeTitle(tag))
        .filter(Boolean),
    ),
  ).slice(0, 5);
}

function readBody(post: DiscussionPost, meta?: CommunityMeta) {
  const trimmed = post.content.trim();
  if (!trimmed) {
    return "";
  }

  if (meta?.title && trimmed.startsWith(meta.title)) {
    return trimmed.slice(meta.title.length).replace(/^\s+/, "").replace(/^\n+/, "");
  }

  const parts = trimmed.split(/\n+/);
  if (parts.length > 1) {
    return parts.slice(1).join("\n\n");
  }

  return trimmed;
}

function detectMeta(post: DiscussionPost, resources: ResourceRecord[], stored?: CommunityMeta): CommunityMeta {
  if (stored) {
    return stored;
  }

  const content = post.content.trim();
  const lowered = content.toLowerCase();
  const lines = content.split(/\n+/).filter(Boolean);
  const matchedResource = resources.find((resource) =>
    lowered.includes(resource.title.toLowerCase()) ||
    lowered.includes(resource.fileName?.toLowerCase() ?? ""),
  );

  let kind: ComposerKind = "discussions";
  if (
    lowered.includes("announce") ||
    lowered.includes("reminder") ||
    lowered.includes("important") ||
    lowered.includes("workshop") ||
    lowered.includes("event") ||
    lowered.includes("session") ||
    lowered.includes("tomorrow")
  ) {
    kind = "announcements";
  } else if (lowered.includes("?")) {
    kind = "questions";
  } else if (
    matchedResource ||
    lowered.includes("resource") ||
    lowered.includes("worksheet") ||
    lowered.includes("lesson plan") ||
    lowered.includes("slides") ||
    lowered.includes("pdf")
  ) {
    kind = "resources";
  }

  const titleSource = lines[0] || content;
  const title = normalizeTitle(
    titleSource.length > 84 ? `${titleSource.slice(0, 81).trimEnd()}...` : titleSource,
  );

  const tags = [
    matchedResource?.tags?.[0],
    ...knownTopicMatchers.filter((topic) => lowered.includes(topic.toLowerCase())),
  ].filter(Boolean) as string[];

  return {
    kind,
    title: title || "Community update",
    tags: Array.from(new Set(tags)).slice(0, 3),
  };
}

export function CommunityPanel({
  posts,
  comments,
  loading,
  currentUserId,
  currentUserName = "Teacher",
  currentUserAvatar = null,
  schoolTeachers = [],
  resources = [],
  resourceCount = 0,
  searchQuery = "",
  initialCategory = "all",
  title = "Community",
  description = "Connect, share, and learn with teachers across every school in TeachShare.",
  emptyTitle = "No posts yet",
  emptyDescription = "Start a discussion to share context, ask questions, or align lesson planning.",
  showComposer = true,
  onCreatePost,
  onCreateComment,
  onTogglePostLike,
  onTogglePostBookmark,
  onDeletePost,
  onDeleteComment,
}: CommunityPanelProps) {
  const isPrimaryView = showComposer && title === "Community";
  const composerRef = useRef<HTMLInputElement | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CommunityCategory>(initialCategory);
  const [composerKind, setComposerKind] = useState<ComposerKind>("discussions");
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [composerTitle, setComposerTitle] = useState("");
  const [composerBody, setComposerBody] = useState("");
  const [composerTags, setComposerTags] = useState("");
  const [postMetaById, setPostMetaById] = useState<Record<string, CommunityMeta>>({});
  const [pendingMeta, setPendingMeta] = useState<CommunityMeta | null>(null);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [submittingCommentFor, setSubmittingCommentFor] = useState<string | null>(null);
  const [postError, setPostError] = useState("");
  const [commentError, setCommentError] = useState("");

  const metadataStorageKey = "teachshare-community-meta";
  const teacherMap = useMemo(
    () => new Map(schoolTeachers.map((teacher) => [teacher.id, teacher])),
    [schoolTeachers],
  );

  useEffect(() => {
    setActiveCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    if (!isCreatePostOpen) {
      return;
    }

    const timer = window.setTimeout(() => composerRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [isCreatePostOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(metadataStorageKey);
      if (!raw) {
        return;
      }

      setPostMetaById(JSON.parse(raw) as Record<string, CommunityMeta>);
    } catch {
      setPostMetaById({});
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(metadataStorageKey, JSON.stringify(postMetaById));
  }, [postMetaById]);

  const commentsByPostId = useMemo(() => {
    return comments.reduce<Record<string, DiscussionComment[]>>((accumulator, comment) => {
      accumulator[comment.postId] = [...(accumulator[comment.postId] ?? []), comment];
      return accumulator;
    }, {});
  }, [comments]);

  const enrichedPosts = useMemo(() => {
    return posts.map((post) => {
      const meta = detectMeta(post, resources, postMetaById[post.id]);
      const teacher = teacherMap.get(post.userId);
      const attachment = resources.find((resource) => {
        const lowered = post.content.toLowerCase();
        return (
          lowered.includes(resource.title.toLowerCase()) ||
          lowered.includes(resource.fileName?.toLowerCase() ?? "")
        );
      });

      return {
        post,
        meta,
        teacher,
        body: readBody(post, meta),
        attachment,
        comments: commentsByPostId[post.id] ?? [],
      };
    });
  }, [commentsByPostId, postMetaById, posts, resources, teacherMap]);

  useEffect(() => {
    if (!pendingMeta || posts.length === 0) {
      return;
    }

    const newestPost = posts[0];
    if (postMetaById[newestPost.id]) {
      setPendingMeta(null);
      return;
    }

    setPostMetaById((current) => ({
      ...current,
      [newestPost.id]: pendingMeta,
    }));
    setPendingMeta(null);
  }, [pendingMeta, postMetaById, posts]);

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return enrichedPosts.filter((item) => {
      const categoryMatch = activeCategory === "all" ? true : item.meta.kind === activeCategory;
      if (!categoryMatch) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        item.meta.title,
        item.body,
        item.post.userName,
        item.teacher?.subject,
        ...item.meta.tags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeCategory, enrichedPosts, searchQuery]);

  const featuredItem = useMemo(() => {
    return enrichedPosts.find((item) => item.meta.kind === "announcements") ?? null;
  }, [enrichedPosts]);

  const contributorStats = useMemo(() => {
    const map = new Map<string, { id: string; name: string; avatar?: string | null; subject?: string; score: number }>();

    enrichedPosts.forEach((item) => {
      const teacher = teacherMap.get(item.post.userId);
      map.set(item.post.userId, {
        id: item.post.userId,
        name: item.post.userName,
        avatar: item.post.userAvatar ?? teacher?.avatar ?? null,
        subject: teacher?.subject,
        score: (map.get(item.post.userId)?.score ?? 0) + 1 + item.comments.length,
      });
    });

    comments.forEach((comment) => {
      const teacher = teacherMap.get(comment.userId);
      map.set(comment.userId, {
        id: comment.userId,
        name: comment.userName,
        avatar: comment.userAvatar ?? teacher?.avatar ?? null,
        subject: teacher?.subject,
        score: (map.get(comment.userId)?.score ?? 0) + 1,
      });
    });

    return Array.from(map.values())
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);
  }, [comments, enrichedPosts, teacherMap]);

  const popularTopics = useMemo(() => {
    const counts = new Map<string, number>();

    enrichedPosts.forEach((item) => {
      item.meta.tags.forEach((tag) => {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5);
  }, [enrichedPosts]);

  const questionCount = useMemo(
    () => enrichedPosts.filter((item) => item.meta.kind === "questions").length,
    [enrichedPosts],
  );

  const totalTeacherCount = useMemo(() => {
    const ids = new Set<string>();
    posts.forEach((post) => ids.add(post.userId));
    comments.forEach((comment) => ids.add(comment.userId));
    return ids.size;
  }, [comments, posts]);

  const postStats = [
    {
      label: "Teachers",
      value: totalTeacherCount,
      icon: Users,
      iconClassName: "bg-[#EEF2FF] text-[#4F46E5]",
    },
    {
      label: "Resources",
      value: resourceCount,
      icon: Paperclip,
      iconClassName: "bg-[#ECFDF3] text-[#16A34A]",
    },
    {
      label: "Discussions",
      value: posts.length,
      icon: MessageSquareText,
      iconClassName: "bg-[#FFF7ED] text-[#EA580C]",
    },
    {
      label: "Questions",
      value: questionCount,
      icon: Sparkles,
      iconClassName: "bg-[#F5F3FF] text-[#7C3AED]",
    },
  ];

  async function handlePostSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPostError("");
    setSubmittingPost(true);

    const nextTitle = normalizeTitle(composerTitle);
    const nextBody = composerBody.trim();
    if (!nextBody) {
      setPostError("Add a thought before creating a post.");
      setSubmittingPost(false);
      return;
    }

    const manualTags = parseComposerTags(composerTags);
    const tags = [
      composerKind === "resources" ? "Resources" : null,
      composerKind === "questions" ? "Questions" : null,
      composerKind === "announcements" ? "Announcements" : null,
      ...manualTags,
    ].filter(Boolean) as string[];

    setPendingMeta({
      kind: composerKind,
      title: nextTitle || nextBody.slice(0, 70),
      tags,
    });

    try {
      await onCreatePost({
        title: nextTitle,
        body: nextTitle ? `${nextTitle}\n\n${nextBody}` : nextBody,
      });
      setComposerTitle("");
      setComposerBody("");
      setComposerTags("");
      setComposerKind("discussions");
      setIsCreatePostOpen(false);
    } catch (error) {
      setPendingMeta(null);
      setPostError(toUserFacingError(error, "We could not publish your post. Please try again."));
    } finally {
      setSubmittingPost(false);
    }
  }

  async function handleCommentSubmit(postId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setCommentError("");
    setSubmittingCommentFor(postId);

    try {
      const formData = new FormData(form);
      await onCreateComment({
        postId,
        body: String(formData.get("content") ?? ""),
      });
      form.reset();
    } catch (error) {
      setCommentError(toUserFacingError(error, "We could not add your comment. Please try again."));
    } finally {
      setSubmittingCommentFor(null);
    }
  }

  function renderComposer() {
    if (!showComposer) {
      return null;
    }

    return (
      <div className="pointer-events-none fixed bottom-6 right-6 z-40">
        <Button
          className="pointer-events-auto rounded-xl bg-[#6D28D9] px-5 text-white shadow-[0_12px_30px_rgba(109,40,217,0.18)] hover:bg-[#5B21B6]"
          onClick={() => setIsCreatePostOpen(true)}
        >
          Create Post
        </Button>
      </div>
    );
  }

  function renderFeatured() {
    if (!isPrimaryView) {
      return null;
    }

    if (!featuredItem) {
      return null;
    }

    return (
      <Card className="overflow-hidden rounded-[20px] border-[#E5E7EB] bg-[linear-gradient(135deg,#F5F3FF_0%,#EDE9FE_55%,#F9FAFB_100%)] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2.5">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#6D28D9]">
              <Pin className="h-3.5 w-3.5" />
              Featured Announcement
            </span>
            <div>
              <h3 className="text-[20px] font-semibold text-[#111827]">{featuredItem.meta.title}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">
                {featuredItem.body || featuredItem.post.content}
              </p>
            </div>
            <p className="text-sm text-[#6B7280]">{formatRelativeDate(featuredItem.post.createdAt)}</p>
          </div>

          <Button
            variant="outline"
            className="rounded-xl border-white/70 bg-white/80 text-[#111827] hover:bg-white"
            onClick={() => setExpandedPostId(featuredItem.post.id)}
          >
            View details
          </Button>
        </div>
      </Card>
    );
  }

  function renderAttachmentCard(resource: ResourceRecord) {
    return (
      <div className="mt-3 rounded-2xl border border-[#E5E7EB] bg-[#FCFCFD] p-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[#6D28D9]">
              {resource.fileType === "image" && resource.fileUrl ? (
                <img
                  src={resource.fileUrl}
                  alt={resource.title}
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                <FileText className="h-5 w-5" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#111827]">{resource.title}</p>
              <p className="text-xs text-[#6B7280]">
                {(resource.fileName || resource.fileType).toUpperCase()} • {resource.fileType.toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-[#E5E7EB]"
              onClick={() => window.open(resource.fileUrl, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </Button>
            <Button
              size="sm"
              className="rounded-xl bg-[#6D28D9] text-white hover:bg-[#5B21B6]"
              onClick={() => window.open(resource.fileUrl, "_blank", "noopener,noreferrer")}
            >
              <Download className="h-4 w-4" />
              View
            </Button>
          </div>
        </div>
      </div>
    );
  }

  function renderFeed() {
    if (loading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-[20px] border-[#E5E7EB] p-4">
              <div className="h-5 w-40 animate-pulse rounded-full bg-[#F3F4F6]" />
              <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-[#F3F4F6]" />
              <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-[#F3F4F6]" />
            </Card>
          ))}
        </div>
      );
    }

    if (filteredPosts.length === 0) {
      return (
        <EmptyState
          icon={MessageSquareText}
          title={emptyTitle}
          description={emptyDescription}
          action={
            showComposer ? (
              <Button onClick={() => setIsCreatePostOpen(true)}>Create a post</Button>
            ) : undefined
          }
        />
      );
    }

    return (
      <div className="space-y-3.5">
        {filteredPosts.map((item) => {
          const isExpanded = expandedPostId === item.post.id;
          const hasLiked = item.post.likes.includes(currentUserId);
          const hasBookmarked = item.post.bookmarks.includes(currentUserId);
          const isOwner = item.post.userId === currentUserId;

          return (
            <Card
              key={item.post.id}
              className="rounded-[20px] border-[#E5E7EB] p-4 transition-all duration-150 hover:-translate-y-[1px]"
            >
              <div id={`post-${item.post.id}`} className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#111827] text-sm font-semibold text-white">
                    {item.post.userAvatar ? (
                      <img
                        src={item.post.userAvatar}
                        alt={item.post.userName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials(item.post.userName)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <p className="text-[15px] font-semibold text-[#111827]">{item.post.userName}</p>
                          <span className="rounded-full bg-[#F5F3FF] px-3 py-1 text-[12px] font-semibold text-[#7C3AED]">
                            Teacher
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-[#6B7280]">
                          <span>{item.teacher?.subject || "Teacher"}</span>
                          <span className="text-[#D1D5DB]">•</span>
                          <span>{formatRelativeDate(item.post.createdAt)}</span>
                        </div>
                      </div>
                      {isOwner ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full text-[#6B7280]"
                          onClick={() => void onDeletePost(item.post)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <button
                          type="button"
                          className="rounded-full p-2 text-[#9CA3AF] transition hover:bg-[#F9FAFB] hover:text-[#111827]"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="mt-3.5 space-y-2">
                      <h3 className="text-[17px] font-semibold leading-7 text-[#111827] md:text-[18px]">
                        {item.meta.title}
                      </h3>
                      <p className="whitespace-pre-wrap text-[14px] leading-6 text-[#374151]">
                        {item.body || item.post.content}
                      </p>
                    </div>

                    {item.meta.tags.length > 0 ? (
                      <div className="mt-3.5 flex flex-wrap gap-2">
                        {item.meta.tags.map((tag) => (
                          <span
                            key={`${item.post.id}-${tag}`}
                            className="rounded-full bg-[#F3F4F6] px-3 py-1 text-[12px] font-medium text-[#6B7280]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {item.attachment ? renderAttachmentCard(item.attachment) : null}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[#F3F4F6] pt-3.5">
                      <div className="flex flex-wrap items-center gap-5">
                        <button
                          type="button"
                          className="flex items-center gap-2 text-[15px] font-medium text-[#6B7280] transition hover:text-[#111827]"
                          onClick={() => void onTogglePostLike(item.post)}
                        >
                          <div
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-full",
                              hasLiked ? "bg-[#FEE2E2] text-[#EF4444]" : "bg-[#F9FAFB] text-[#9CA3AF]",
                            )}
                          >
                            <Heart className={cn("h-4 w-4", hasLiked ? "fill-current" : "")} />
                          </div>
                          <span>{item.post.likes.length}</span>
                        </button>
                        <button
                          type="button"
                          className="flex items-center gap-2 text-[15px] font-medium text-[#6B7280] transition hover:text-[#111827]"
                          onClick={() => setExpandedPostId(isExpanded ? null : item.post.id)}
                        >
                          <MessageCircle className="h-5 w-5" />
                          <span>{item.comments.length}</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-5 text-[15px] text-[#6B7280]">
                        <button
                          type="button"
                          className="font-medium transition hover:text-[#111827]"
                          onClick={() => setExpandedPostId(isExpanded ? null : item.post.id)}
                        >
                          {item.comments.length} {item.comments.length === 1 ? "Comment" : "Comments"}
                        </button>
                        <button
                          type="button"
                          className="transition hover:text-[#111827]"
                          onClick={() => void onTogglePostBookmark(item.post)}
                          aria-label={hasBookmarked ? "Remove bookmark" : "Bookmark post"}
                        >
                          {hasBookmarked ? <BookMarked className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="mt-4 space-y-3.5 border-t border-[#F3F4F6] pt-4">
                        {item.comments.map((comment) => {
                          const isCommentOwner = comment.userId === currentUserId;

                          return (
                            <div key={comment.id} className="rounded-2xl bg-[#F9FAFB] p-3">
                              <div className="flex items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-xs font-semibold text-[#111827]">
                                  {comment.userAvatar ? (
                                    <img
                                      src={comment.userAvatar}
                                      alt={comment.userName}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    initials(comment.userName)
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-[#111827]">{comment.userName}</p>
                                      <p className="text-xs text-[#9CA3AF]">{formatRelativeDate(comment.createdAt)}</p>
                                    </div>
                                    {isCommentOwner ? (
                                      <Button variant="ghost" size="sm" onClick={() => void onDeleteComment(comment)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    ) : null}
                                  </div>
                                  <p className="mt-2 text-sm leading-6 text-[#4B5563]">{comment.content}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        <form className="space-y-3" onSubmit={(event) => void handleCommentSubmit(item.post.id, event)}>
                          <Textarea
                            name="content"
                            placeholder="Write a thoughtful reply..."
                            required
                            className="min-h-[96px] rounded-2xl border-[#E5E7EB] bg-white"
                          />
                          {commentError ? <p className="text-sm text-[#B91C1C]">{commentError}</p> : null}
                          <Button
                            className="rounded-xl bg-[#111827] text-white hover:bg-black"
                            disabled={submittingCommentFor === item.post.id}
                            loading={submittingCommentFor === item.post.id}
                            loadingText="Sending..."
                            type="submit"
                          >
                            Reply
                          </Button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  function renderInsights() {
    if (!isPrimaryView) {
      return null;
    }

    return (
      <aside className="hidden xl:block">
        <div className="sticky top-6 space-y-5">
          <Card className="rounded-[20px] border-[#E5E7EB] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#111827]">Community stats</h3>
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-x-3.5 gap-y-3.5">
              {postStats.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="min-w-0">
                    <div className="flex items-start gap-3">
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl", item.iconClassName)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xl font-semibold leading-none text-[#111827]">{item.value}</p>
                        <p className="mt-2 text-xs text-[#6B7280]">{item.label}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="rounded-[20px] border-[#E5E7EB] p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] font-semibold text-[#111827]">Top Contributors</h3>
            </div>
            <div className="mt-5 space-y-4">
              {contributorStats.length > 0 ? (
                contributorStats.map((contributor, index) => (
                  <div key={contributor.id} className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        contributorRankStyles[index] ?? "bg-[#F3F4F6] text-[#6B7280]",
                      )}
                    >
                      {index + 1}
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#111827] text-sm font-semibold text-white">
                      {contributor.avatar ? (
                        <img src={contributor.avatar} alt={contributor.name} className="h-full w-full object-cover" />
                      ) : (
                        initials(contributor.name)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-[#111827]">{contributor.name}</p>
                      <p className="truncate text-[13px] text-[#6B7280]">{contributor.subject || "Teacher"}</p>
                    </div>
                    <span className="rounded-full bg-[#F5F3FF] px-3 py-1.5 text-[12px] font-semibold text-[#7C3AED]">
                      {contributor.score} posts
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#6B7280]">Contributors will appear here as teachers join the conversation.</p>
              )}
            </div>
            <button type="button" className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-[#6D28D9]">
              View all contributors
              <span aria-hidden="true">→</span>
            </button>
          </Card>

          <Card className="rounded-[20px] border-[#E5E7EB] p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] font-semibold text-[#111827]">Popular Topics</h3>
            </div>
            <div className="mt-5 space-y-4">
              {popularTopics.length > 0 ? (
                popularTopics.map(([topic, count]) => (
                  <div
                    key={topic}
                    className="flex items-center justify-between gap-3"
                  >
                    <p className="text-[15px] font-medium text-[#111827]">{topic}</p>
                    <span className="shrink-0 rounded-full bg-[#F3F4F6] px-3 py-1.5 text-[12px] font-semibold text-[#6B7280]">
                      {count} posts
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#6B7280]">Topics will appear here once the community starts tagging conversations.</p>
              )}
            </div>
            <button type="button" className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-[#6D28D9]">
              View all topics
              <span aria-hidden="true">→</span>
            </button>
          </Card>
        </div>
      </aside>
    );
  }

  if (!isPrimaryView) {
    return (
      <div className="space-y-4">
        {renderFeed()}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-h-0 min-w-0 flex-col gap-5">
          <div className="shrink-0 space-y-5">
            {renderComposer()}
            {renderFeatured()}
            <div className="bg-[#F9FAFB] px-1 py-1">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold text-[#4B5563]">Most Recent</span>
                <MoreHorizontal className="h-4 w-4 rotate-90 text-[#9CA3AF]" />
              </div>
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto pr-1 scroll-smooth">
            {renderFeed()}
          </div>
        </div>
        {renderInsights()}
      </div>

      {isCreatePostOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm">
          <Card className="w-full max-w-2xl rounded-2xl border-[#E5E7EB] bg-white p-6 shadow-[0_20px_60px_rgba(17,24,39,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-[22px] font-semibold text-[#111827]">Create Post</h2>
                <p className="text-[14px] text-[#6B7280]">Share an update, question, or teaching idea with the community.</p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-[#9CA3AF] transition hover:bg-[#F9FAFB] hover:text-[#111827]"
                onClick={() => setIsCreatePostOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={(event) => void handlePostSubmit(event)}>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Post type</label>
                  <select
                    value={composerKind}
                    onChange={(event) => setComposerKind(event.target.value as ComposerKind)}
                    className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 text-[14px] text-[#111827] outline-none"
                  >
                    <option value="discussions">Discussion</option>
                    <option value="resources">Resource</option>
                    <option value="questions">Question</option>
                    <option value="announcements">Announcement</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Title</label>
                  <input
                    ref={composerRef}
                    value={composerTitle}
                    onChange={(event) => setComposerTitle(event.target.value)}
                    placeholder={`What's on your mind, ${currentUserName}?`}
                    className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 text-[14px] text-[#111827] outline-none transition focus:border-[#D1D5DB]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Description</label>
                <Textarea
                  value={composerBody}
                  onChange={(event) => setComposerBody(event.target.value)}
                  placeholder="Describe your topic..."
                  className="min-h-[140px] rounded-xl border-[#E5E7EB] bg-[#F9FAFB] text-[14px] leading-[1.6]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Tags</label>
                <input
                  value={composerTags}
                  onChange={(event) => setComposerTags(event.target.value)}
                  placeholder="Add tags separated by commas"
                  className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 text-[14px] text-[#111827] outline-none transition focus:border-[#D1D5DB]"
                />
              </div>

              {postError ? <p className="text-[14px] text-[#B91C1C]">{postError}</p> : null}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" className="rounded-xl border-[#E5E7EB]" onClick={() => setIsCreatePostOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-[#6D28D9] px-5 text-white hover:bg-[#5B21B6]"
                  loading={submittingPost}
                  loadingText="Posting..."
                >
                  Create Post
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
