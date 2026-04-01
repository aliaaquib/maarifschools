"use client";

import {
  Bookmark,
  BookMarked,
  Heart,
  Lightbulb,
  MessageCircleMore,
  MessageSquareDashed,
  Paperclip,
  Reply,
  Send,
  Share2,
  Trash2,
} from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { CommunityCategory, DiscussionComment, DiscussionPost } from "@/types";
import { formatRelativeDate, initials } from "@/lib/utils";

interface CommunityPanelProps {
  posts: DiscussionPost[];
  comments: DiscussionComment[];
  loading: boolean;
  currentUserId: string;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  showComposer?: boolean;
  onCreatePost: (input: { title: string; body: string }) => Promise<void>;
  onCreateComment: (input: { postId: string; body: string }) => Promise<void>;
  onTogglePostLike: (post: DiscussionPost) => Promise<void>;
  onTogglePostBookmark: (post: DiscussionPost) => Promise<void>;
  onDeletePost: (post: DiscussionPost) => Promise<void>;
  onDeleteComment: (comment: DiscussionComment) => Promise<void>;
}

export function CommunityPanel({
  posts,
  comments,
  loading,
  currentUserId,
  title = "Community",
  description = "Start lightweight discussions, share tips, and keep lesson planning collaborative.",
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
  const postComposerRef = useRef<HTMLTextAreaElement | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CommunityCategory>("all");
  const [submittingPost, setSubmittingPost] = useState(false);
  const [submittingCommentFor, setSubmittingCommentFor] = useState<string | null>(null);
  const [postError, setPostError] = useState("");
  const [commentError, setCommentError] = useState("");

  const categoryTabs: Array<{ id: CommunityCategory; label: string }> = [
    { id: "all", label: "All" },
    { id: "questions", label: "Questions" },
    { id: "ideas", label: "Ideas" },
    { id: "resources", label: "Resources" },
  ];

  function detectCategory(post: DiscussionPost): CommunityCategory {
    const content = post.content.toLowerCase();
    if (content.includes("?")) return "questions";
    if (content.includes("resource") || content.includes("worksheet") || content.includes("lesson plan") || content.includes("pdf")) {
      return "resources";
    }
    return "ideas";
  }

  const commentsByPostId = useMemo(() => {
    return comments.reduce<Record<string, DiscussionComment[]>>((accumulator, comment) => {
      accumulator[comment.postId] = [...(accumulator[comment.postId] ?? []), comment];
      return accumulator;
    }, {});
  }, [comments]);

  const filteredPosts = useMemo(() => {
    if (activeCategory === "all") {
      return posts;
    }

    return posts.filter((post) => detectCategory(post) === activeCategory);
  }, [activeCategory, posts]);

  async function handlePostSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPostError("");
    setSubmittingPost(true);

    try {
      const formData = new FormData(form);
      await onCreatePost({
        title: "",
        body: String(formData.get("content") ?? ""),
      });
      form.reset();
    } catch (error) {
      setPostError(
        error instanceof Error ? error.message : "We could not publish your post. Please try again.",
      );
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
      setCommentError(
        error instanceof Error ? error.message : "We could not add your comment. Please try again.",
      );
    } finally {
      setSubmittingCommentFor(null);
    }
  }

  async function handleShare(post: DiscussionPost) {
    const shareUrl = `${window.location.origin}/app#post-${post.id}`;

    if (navigator.share) {
      await navigator.share({
        title: "Maarif Schools discussion",
        text: post.content,
        url: shareUrl,
      });
      return;
    }

    await navigator.clipboard.writeText(shareUrl);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="max-w-2xl text-sm font-normal text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {categoryTabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeCategory === tab.id ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveCategory(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {showComposer ? (
        <Card className="p-6">
          <form className="space-y-4" onSubmit={handlePostSubmit}>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1">
                <MessageSquareDashed className="h-4 w-4" />
                Ask how others teach a topic
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1">
                <Lightbulb className="h-4 w-4" />
                Share a useful teaching idea
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1">
                <Paperclip className="h-4 w-4" />
                Post a resource tip
              </span>
            </div>
            <Textarea
              ref={postComposerRef}
              name="content"
              placeholder="Ask how others teach a topic, or share a useful teaching idea..."
              required
            />
            {postError ? <p className="text-sm text-foreground/80">{postError}</p> : null}
            <Button disabled={submittingPost} type="submit" loading={submittingPost} loadingText="Posting...">
              <Send className="h-4 w-4" />
              Create post
            </Button>
          </form>
        </Card>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="p-6">
              <div className="h-5 w-1/2 animate-pulse rounded-lg bg-muted" />
              <div className="mt-3 h-4 w-full animate-pulse rounded-lg bg-muted" />
              <div className="mt-2 h-4 w-3/4 animate-pulse rounded-lg bg-muted" />
            </Card>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <EmptyState
          icon={MessageCircleMore}
          title={emptyTitle}
          description={emptyDescription}
          action={
            showComposer ? <Button onClick={() => postComposerRef.current?.focus()}>Start a discussion</Button> : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const threadComments = commentsByPostId[post.id] ?? [];
            const isExpanded = expandedPostId === post.id;
            const hasLiked = post.likes.includes(currentUserId);
            const hasBookmarked = post.bookmarks.includes(currentUserId);
            const isOwner = post.userId === currentUserId;

            return (
              <Card key={post.id} className="p-6" >
                <div id={`post-${post.id}`} className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold text-foreground">
                      {post.userAvatar ? (
                        <img
                          src={post.userAvatar}
                          alt={post.userName}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        initials(post.userName)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{post.userName}</p>
                          <p className="text-sm font-normal text-muted-foreground">
                            {formatRelativeDate(post.createdAt)}
                          </p>
                        </div>
                        {isOwner ? (
                          <Button variant="ghost" size="sm" onClick={() => void onDeletePost(post)}>
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        ) : null}
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{post.content}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                    <Button variant={hasLiked ? "secondary" : "ghost"} size="sm" onClick={() => void onTogglePostLike(post)}>
                      <Heart className="h-4 w-4" />
                      {post.likes.length}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setExpandedPostId(isExpanded ? null : post.id)}>
                      <Reply className="h-4 w-4" />
                      {threadComments.length > 0 ? `${threadComments.length} replies` : "Reply"}
                    </Button>
                    <Button
                      variant={hasBookmarked ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => void onTogglePostBookmark(post)}
                    >
                      {hasBookmarked ? <BookMarked className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                      Bookmark
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void handleShare(post)}>
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                  </div>

                  {isExpanded ? (
                    <div className="space-y-3 border-t border-border pt-4">
                      {threadComments.map((comment) => {
                      const isCommentOwner = comment.userId === currentUserId;

                      return (
                        <div key={comment.id} className="ml-6 rounded-2xl border border-border bg-muted/70 p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-foreground">
                              {comment.userAvatar ? (
                                <img
                                  src={comment.userAvatar}
                                  alt={comment.userName}
                                  className="h-full w-full rounded-full object-cover"
                                />
                              ) : (
                                initials(comment.userName)
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">{comment.userName}</p>
                                  <p className="text-sm font-normal text-muted-foreground">
                                    {formatRelativeDate(comment.createdAt)}
                                  </p>
                                </div>
                                {isCommentOwner ? (
                                  <Button variant="ghost" size="sm" onClick={() => void onDeleteComment(comment)}>
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </Button>
                                ) : null}
                              </div>
                              <p className="mt-2 text-sm text-foreground">{comment.content}</p>
                            </div>
                          </div>
                        </div>
                      );
                      })}

                      <form className="space-y-3" onSubmit={(event) => void handleCommentSubmit(post.id, event)}>
                        <Textarea name="content" placeholder="Write a reply..." required />
                        {commentError ? <p className="text-sm text-foreground/80">{commentError}</p> : null}
                        <Button
                          disabled={submittingCommentFor === post.id}
                          type="submit"
                          loading={submittingCommentFor === post.id}
                          loadingText="Sending..."
                        >
                          Reply
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
