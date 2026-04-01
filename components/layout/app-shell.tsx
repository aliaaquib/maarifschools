"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Plus, UserRound } from "lucide-react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { CommunityPanel } from "@/components/community/community-panel";
import { LessonPlannerModal } from "@/components/lesson-planner/lesson-planner-modal";
import { Sidebar } from "@/components/layout/sidebar";
import { SchoolChatPanel } from "@/components/school-chat/school-chat-panel";
import { Topbar } from "@/components/layout/topbar";
import { ResourcesPanel } from "@/components/resources/resources-panel";
import { SearchBar } from "@/components/resources/search-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/hooks/use-sidebar";
import { GRADE_OPTIONS, NAV_ITEMS, NavigationItemId, SUBJECT_OPTIONS } from "@/lib/constants";
import {
  createComment,
  createPost,
  createSchoolMessage,
  deleteComment,
  deletePost,
  deleteResource,
  ensureUserProfile,
  getComments,
  getResourcesBySchool,
  getSchoolMessages,
  getPosts,
  togglePostReaction,
  uploadAvatar,
  toggleResourceReaction,
  uploadResource,
} from "@/lib/supabase-data";
import {
  GUEST_USER_ID,
  isAuthRequired,
  isSupabaseConfigured,
  missingSupabaseEnvVars,
} from "@/lib/supabase";
import {
  CreateResourceInput,
  DiscussionComment,
  DiscussionPost,
  ResourceFilters,
  ResourceRecord,
  SchoolMessage,
} from "@/types";

const UploadModal = dynamic(
  () => import("@/components/resources/upload-modal").then((mod) => mod.UploadModal),
  { ssr: false },
);

const defaultFilters: ResourceFilters = {
  search: "",
  subject: "",
  grade: "",
};

export function AppShell({ initialActiveItem = "all" }: { initialActiveItem?: NavigationItemId }) {
  const { user, profile, logOut, saveProfile } = useAuth();
  const { isCollapsed, isMobileOpen, setIsCollapsed, setIsMobileOpen } = useSidebar();
  const [activeItem, setActiveItem] = useState<NavigationItemId>(initialActiveItem);
  const [filters, setFilters] = useState<ResourceFilters>(defaultFilters);
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [comments, setComments] = useState<DiscussionComment[]>([]);
  const [schoolMessages, setSchoolMessages] = useState<SchoolMessage[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [loadingCommunity, setLoadingCommunity] = useState(true);
  const [loadingSchoolChat, setLoadingSchoolChat] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceSuccess, setWorkspaceSuccess] = useState<string | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLessonPlannerOpen, setIsLessonPlannerOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: "",
    subject: "",
    grade: "",
    avatar: "",
  });

  const activeProfile = useMemo(() => {
    if (profile) {
      return profile;
    }

    if (user) {
      return {
        uid: user.id,
        name: user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Teacher",
        email: user.email ?? "",
        avatar: user.user_metadata?.avatar_url ?? null,
        subject: "",
        grade: "",
        schoolId: null,
        schoolName: null,
        createdAt: new Date().toISOString(),
      };
    }

    return {
      uid: GUEST_USER_ID,
      name: "Guest Teacher",
      email: "guest@maarif.local",
      avatar: null,
      subject: "",
      grade: "",
      schoolId: null,
      schoolName: null,
      createdAt: new Date().toISOString(),
    };
  }, [profile, user]);

  const currentUserId = user?.id ?? activeProfile.uid;

  useEffect(() => {
    setProfileForm({
      name: activeProfile.name,
      subject: activeProfile.subject,
      grade: activeProfile.grade,
      avatar: activeProfile.avatar ?? "",
    });
  }, [activeProfile]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoadingResources(false);
      setLoadingCommunity(false);
      setLoadingSchoolChat(false);
      return;
    }

    const unsubscribePosts = getPosts(
      (nextPosts) => {
        setPosts(nextPosts);
        setLoadingCommunity(false);
      },
      (error) => {
        setPosts([]);
        setLoadingCommunity(false);
        setWorkspaceError(error.message);
      },
    );

    const unsubscribeComments = getComments(
      (nextComments) => setComments(nextComments),
      (error) => setWorkspaceError(error.message),
    );
    let unsubscribeSchoolMessages: () => void = () => undefined;

    let unsubscribeResources: () => void = () => undefined;

    if (activeProfile.schoolId) {
      unsubscribeResources = getResourcesBySchool(
        activeProfile.schoolId,
        (nextResources) => {
          setResources(nextResources);
          setLoadingResources(false);
        },
        (error) => {
          setResources([]);
          setLoadingResources(false);
          setWorkspaceError(error.message);
        },
      );
      unsubscribeSchoolMessages = getSchoolMessages(
        activeProfile.schoolId,
        (nextMessages) => {
          setSchoolMessages(nextMessages);
          setLoadingSchoolChat(false);
        },
        (error) => {
          setSchoolMessages([]);
          setLoadingSchoolChat(false);
          setWorkspaceError(error.message);
        },
      );
    } else {
      setResources([]);
      setLoadingResources(false);
      setSchoolMessages([]);
      setLoadingSchoolChat(false);
    }

    return () => {
      unsubscribeResources();
      unsubscribeSchoolMessages();
      unsubscribePosts();
      unsubscribeComments();
    };
  }, [activeProfile.schoolId]);

  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      const matchesSearch =
        !filters.search ||
        [resource.title, resource.description, resource.userName, ...resource.tags]
          .join(" ")
          .toLowerCase()
          .includes(filters.search.toLowerCase());

      const matchesSubject = !filters.subject || resource.tags.includes(filters.subject);
      const matchesGrade = !filters.grade || resource.tags.includes(filters.grade);

      return matchesSearch && matchesSubject && matchesGrade;
    });
  }, [filters.grade, filters.search, filters.subject, resources]);

  const myResources = useMemo(
    () => filteredResources.filter((resource) => resource.userId === currentUserId),
    [currentUserId, filteredResources],
  );

  const bookmarkedResources = useMemo(
    () => filteredResources.filter((resource) => resource.bookmarks.includes(currentUserId)),
    [currentUserId, filteredResources],
  );

  const recentResources = useMemo(() => filteredResources.slice(0, 5), [filteredResources]);

  const trendingResources = useMemo(() => {
    return [...filteredResources]
      .sort((left, right) => {
        const leftScore = (left.likes.length * 2) + left.bookmarks.length;
        const rightScore = (right.likes.length * 2) + right.bookmarks.length;
        return rightScore - leftScore;
      })
      .slice(0, 5);
  }, [filteredResources]);

  const bookmarkedPosts = useMemo(
    () => posts.filter((post) => post.bookmarks.includes(currentUserId)),
    [currentUserId, posts],
  );

  const selectedResource = useMemo(
    () =>
      filteredResources.find((resource) => resource.id === selectedResourceId) ??
      resources.find((resource) => resource.id === selectedResourceId) ??
      null,
    [filteredResources, resources, selectedResourceId],
  );

  const bookmarkedSelectedResource = useMemo(
    () => bookmarkedResources.find((resource) => resource.id === selectedResourceId) ?? null,
    [bookmarkedResources, selectedResourceId],
  );

  const myResourceStats = useMemo(() => {
    const totalDownloads = myResources.reduce((total, resource) => total + (resource.downloadCount ?? Math.max(0, resource.bookmarks.length)), 0);
    const totalSaves = myResources.reduce((total, resource) => total + resource.bookmarks.length, 0);

    return [
      { label: "Total uploads", value: myResources.length },
      { label: "Total downloads", value: totalDownloads },
      { label: "Total saves", value: totalSaves },
    ];
  }, [myResources]);

  const recentPosts = useMemo(() => posts.filter((post) => post.userId === currentUserId).slice(0, 3), [currentUserId, posts]);
  const recentUploads = useMemo(() => myResources.slice(0, 3), [myResources]);

  const contributorLevel = useMemo(() => {
    const contributionScore = myResources.length + recentPosts.length;
    if (contributionScore >= 8) return "Contributor";
    if (contributionScore >= 3) return "Active";
    return "Beginner";
  }, [myResources.length, recentPosts.length]);

  const activityFeed = useMemo(() => {
    const resourceActivity = resources.slice(0, 4).map((resource) => ({
      id: `resource-${resource.id}`,
      text: `${resource.userName} uploaded a resource`,
      time: resource.createdAt,
    }));

    const postActivity = posts.slice(0, 4).map((post) => ({
      id: `post-${post.id}`,
      text: `${post.userName} posted in community`,
      time: post.createdAt,
    }));

    return [...resourceActivity, ...postActivity]
      .sort((left, right) => new Date(right.time).getTime() - new Date(left.time).getTime())
      .slice(0, 6);
  }, [posts, resources]);

  useEffect(() => {
    if (activeItem === "bookmarks") {
      setSelectedResourceId(null);
    }
  }, [activeItem]);

  useEffect(() => {
    setActiveItem(initialActiveItem);
  }, [initialActiveItem]);

  useEffect(() => {
    if (!workspaceSuccess && !workspaceError) {
      return;
    }

    const timer = window.setTimeout(() => {
      setWorkspaceSuccess(null);
      setWorkspaceError(null);
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [workspaceError, workspaceSuccess]);

  async function ensureCurrentUserProfileRecord() {
    if (!user) {
      return;
    }

    await ensureUserProfile({
      uid: user.id,
      name: activeProfile.name,
      email: activeProfile.email,
      avatar: activeProfile.avatar ?? null,
      subject: activeProfile.subject,
      grade: activeProfile.grade,
      schoolId: activeProfile.schoolId ?? null,
      schoolName: activeProfile.schoolName ?? null,
    });
  }

  async function handleUpload(input: CreateResourceInput) {
    setWorkspaceError(null);
    setWorkspaceSuccess(null);

    try {
      if (!activeProfile.schoolId) {
        throw new Error("Your account is not linked to a school yet.");
      }

      await ensureCurrentUserProfileRecord();

      await uploadResource({
        ...input,
        userId: currentUserId,
        userName: activeProfile.name,
        schoolId: activeProfile.schoolId,
      });
      setWorkspaceSuccess("Resource uploaded successfully.");
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "We could not upload your resource.");
    }
  }

  async function handleToggleLike(resource: ResourceRecord) {
    const previousResources = resources;
    const nextLikes = resource.likes.includes(currentUserId)
      ? resource.likes.filter((value) => value !== currentUserId)
      : [...resource.likes, currentUserId];

    setWorkspaceError(null);
    setResources((current) =>
      current.map((item) => (item.id === resource.id ? { ...item, likes: nextLikes } : item)),
    );

    try {
      await toggleResourceReaction(resource, currentUserId, "likes");
    } catch (error) {
      setResources(previousResources);
      setWorkspaceError(error instanceof Error ? error.message : "Could not update likes.");
    }
  }

  async function handleToggleBookmark(resource: ResourceRecord) {
    const previousResources = resources;
    const nextBookmarks = resource.bookmarks.includes(currentUserId)
      ? resource.bookmarks.filter((value) => value !== currentUserId)
      : [...resource.bookmarks, currentUserId];

    setWorkspaceError(null);
    setResources((current) =>
      current.map((item) => (item.id === resource.id ? { ...item, bookmarks: nextBookmarks } : item)),
    );

    try {
      await toggleResourceReaction(resource, currentUserId, "bookmarks");
    } catch (error) {
      setResources(previousResources);
      setWorkspaceError(error instanceof Error ? error.message : "Could not update bookmarks.");
    }
  }

  async function handleDeleteResource(resource: ResourceRecord) {
    const previousResources = resources;
    const previousSelectedResourceId = selectedResourceId;

    setWorkspaceError(null);
    setWorkspaceSuccess(null);
    setResources((current) => current.filter((item) => item.id !== resource.id));
    setSelectedResourceId((current) => (current === resource.id ? null : current));

    try {
      await deleteResource(resource.id);
      setWorkspaceSuccess("Resource deleted.");
    } catch (error) {
      setResources(previousResources);
      setSelectedResourceId(previousSelectedResourceId);
      setWorkspaceError(error instanceof Error ? error.message : "Could not delete resource.");
    }
  }

  function handleSelectResource(resource: ResourceRecord) {
    setSelectedResourceId(resource.id);
    setResources((current) =>
      current.map((item) =>
        item.id === resource.id ? { ...item, viewCount: (item.viewCount ?? Math.max(3, item.likes.length + item.bookmarks.length + 2)) + 1 } : item,
      ),
    );
  }

  function handleDownloadResource(resource: ResourceRecord) {
    setResources((current) =>
      current.map((item) =>
        item.id === resource.id ? { ...item, downloadCount: (item.downloadCount ?? Math.max(0, item.bookmarks.length)) + 1 } : item,
      ),
    );
  }

  async function handleCreatePost(input: { title: string; body: string }) {
    await ensureCurrentUserProfileRecord();

    const createdPost = await createPost({
      content: input.body,
      userId: currentUserId,
      userName: activeProfile.name,
    });
    setPosts((current) =>
      current.some((post) => post.id === createdPost.id) ? current : [createdPost, ...current],
    );
    setWorkspaceSuccess("Post published.");
  }

  async function handleCreateComment(input: { postId: string; body: string }) {
    await ensureCurrentUserProfileRecord();

    const createdComment = await createComment({
      postId: input.postId,
      content: input.body,
      userId: currentUserId,
      userName: activeProfile.name,
    });
    setComments((current) =>
      current.some((comment) => comment.id === createdComment.id)
        ? current
        : [...current, createdComment],
    );
    setWorkspaceSuccess("Comment added.");
  }

  async function handleCreateSchoolMessage(content: string) {
    if (!profile?.schoolId || !user) {
      throw new Error("Your account is not linked to a school yet.");
    }

    await ensureCurrentUserProfileRecord();

    const createdMessage = await createSchoolMessage({
      schoolId: profile.schoolId,
      userId: user.id,
      content,
    });

    setSchoolMessages((current) =>
      current.some((message) => message.id === createdMessage.id)
        ? current
        : [...current, createdMessage],
    );
    setWorkspaceSuccess("Message sent.");
  }

  async function handleTogglePostLike(post: DiscussionPost) {
    const previousPosts = posts;
    const nextLikes = post.likes.includes(currentUserId)
      ? post.likes.filter((value) => value !== currentUserId)
      : [...post.likes, currentUserId];

    setWorkspaceError(null);
    setPosts((current) =>
      current.map((item) => (item.id === post.id ? { ...item, likes: nextLikes } : item)),
    );

    try {
      await togglePostReaction(post, currentUserId, "likes");
    } catch (error) {
      setPosts(previousPosts);
      setWorkspaceError(error instanceof Error ? error.message : "Could not update post like.");
    }
  }

  async function handleTogglePostBookmark(post: DiscussionPost) {
    const previousPosts = posts;
    const nextBookmarks = post.bookmarks.includes(currentUserId)
      ? post.bookmarks.filter((value) => value !== currentUserId)
      : [...post.bookmarks, currentUserId];

    setWorkspaceError(null);
    setPosts((current) =>
      current.map((item) => (item.id === post.id ? { ...item, bookmarks: nextBookmarks } : item)),
    );

    try {
      await togglePostReaction(post, currentUserId, "bookmarks");
    } catch (error) {
      setPosts(previousPosts);
      setWorkspaceError(error instanceof Error ? error.message : "Could not update post bookmark.");
    }
  }

  async function handleDeletePost(post: DiscussionPost) {
    const previousPosts = posts;
    const previousComments = comments;

    setWorkspaceError(null);
    setWorkspaceSuccess(null);
    setPosts((current) => current.filter((item) => item.id !== post.id));
    setComments((current) => current.filter((item) => item.postId !== post.id));

    try {
      await deletePost(post.id);
      setWorkspaceSuccess("Post deleted.");
    } catch (error) {
      setPosts(previousPosts);
      setComments(previousComments);
      setWorkspaceError(error instanceof Error ? error.message : "Could not delete post.");
    }
  }

  async function handleDeleteComment(comment: DiscussionComment) {
    const previousComments = comments;

    setWorkspaceError(null);
    setWorkspaceSuccess(null);
    setComments((current) => current.filter((item) => item.id !== comment.id));

    try {
      await deleteComment(comment.id);
      setWorkspaceSuccess("Comment deleted.");
    } catch (error) {
      setComments(previousComments);
      setWorkspaceError(error instanceof Error ? error.message : "Could not delete comment.");
    }
  }

  async function handleAvatarChange(file: File | null) {
    if (!file) {
      return;
    }

    setProfileError(null);
    setProfileMessage(null);
    setUploadingAvatar(true);

    try {
      const avatarUrl = await uploadAvatar(currentUserId, file);
      setProfileForm((current) => ({ ...current, avatar: avatarUrl }));
      setProfileMessage("Profile photo uploaded. Save profile to keep it.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not upload profile photo.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleProfileSave() {
    setProfileError(null);
    setProfileMessage(null);
    setSavingProfile(true);

    try {
      if (user) {
        await saveProfile(profileForm);
      } else {
        await ensureUserProfile({
          uid: activeProfile.uid,
          name: profileForm.name,
          subject: profileForm.subject,
          grade: profileForm.grade,
          email: activeProfile.email,
          avatar: profileForm.avatar || activeProfile.avatar,
          schoolId: activeProfile.schoolId ?? null,
          schoolName: activeProfile.schoolName ?? null,
        });
      }

      setProfileMessage("Profile updated successfully.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "We could not update your profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  function renderWorkspace() {
    switch (activeItem) {
      case NAV_ITEMS[0].id:
        return (
          <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr]">
              <Card className="p-6">
                <p className="text-sm text-muted-foreground">Welcome back</p>
                <h2 className="mt-3 text-3xl font-semibold text-foreground">Keep your teaching resources moving</h2>
                <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                  Track activity, revisit recommended materials, and keep your next contribution close at hand.
                </p>
                {activeProfile.schoolName ? (
                  <p className="mt-4 text-sm text-muted-foreground">Showing resources from {activeProfile.schoolName}</p>
                ) : null}
              </Card>
              <Card className="p-6">
                <p className="text-sm text-muted-foreground">Your stats</p>
                <p className="mt-3 text-3xl font-semibold text-foreground">{myResources.length}</p>
                <p className="mt-2 text-sm text-muted-foreground">resources uploaded</p>
              </Card>
              <Card className="p-6">
                <p className="text-sm text-muted-foreground">Community</p>
                <p className="mt-3 text-3xl font-semibold text-foreground">{posts.length}</p>
                <p className="mt-2 text-sm text-muted-foreground">recent discussions</p>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Recent activity</p>
                    <p className="mt-1 text-sm text-muted-foreground">See what educators are doing across the workspace.</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveItem("community")}>
                    Open community
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-6 space-y-3">
                  {activityFeed.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border bg-muted/40 px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{item.text}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{new Date(item.time).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="space-y-6">
                <Card className="p-6">
                  <p className="text-sm font-semibold text-foreground">Recommended resources</p>
                  <div className="mt-5 space-y-3">
                    {trendingResources.slice(0, 3).map((resource) => (
                      <button
                        key={resource.id}
                        className="flex w-full items-start justify-between rounded-2xl border border-border bg-muted/30 px-4 py-3 text-left transition hover:-translate-y-[1px] hover:bg-muted/60"
                        onClick={() => {
                          handleSelectResource(resource);
                          setActiveItem("all");
                        }}
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">{resource.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{resource.userName}</p>
                        </div>
                        <span className="text-sm text-muted-foreground">{resource.bookmarks.length} saves</span>
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <p className="text-sm font-semibold text-foreground">Your stats</p>
                  <div className="mt-5 grid gap-3">
                    {myResourceStats.map((stat) => (
                      <div key={stat.label} className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        );
      case NAV_ITEMS[1].id:
        return (
          <>
            <SearchBar filters={filters} schoolName={activeProfile.schoolName} onFiltersChange={setFilters} />
            <ResourcesPanel
              title="All Resources"
              description="A shared library for lesson plans, worksheets, slide decks, and reference materials."
              resources={filteredResources}
              loading={loadingResources}
              hasActiveFilters={Boolean(filters.search || filters.subject || filters.grade)}
              currentUserId={currentUserId}
              selectedResource={selectedResource}
              emptyDescription="No resources in your school yet. Be the first to upload."
              onSelectResource={handleSelectResource}
              onLike={handleToggleLike}
              onBookmark={handleToggleBookmark}
              onDownload={handleDownloadResource}
              onDelete={handleDeleteResource}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          </>
        );
      case NAV_ITEMS[2].id:
        return (
          <ResourcesPanel
            title="Trending"
            description="The resources teachers are saving, revisiting, and using most this week."
            resources={trendingResources}
            loading={loadingResources}
            currentUserId={currentUserId}
            selectedResource={selectedResource}
            showResourceGrid={false}
            emptyDescription="No resources in your school yet. Be the first to upload."
            featuredSections={[
              {
                title: "Trending this week",
                description: "High-interest materials gaining attention across the workspace.",
                resources: trendingResources.slice(0, 5),
              },
              {
                title: "Recently added",
                description: "Fresh uploads that teachers can discover right away.",
                resources: recentResources.slice(0, 5),
              },
            ]}
            onSelectResource={handleSelectResource}
            onLike={handleToggleLike}
            onBookmark={handleToggleBookmark}
            onDownload={handleDownloadResource}
            onDelete={handleDeleteResource}
          />
        );
      case NAV_ITEMS[3].id:
        return (
          <ResourcesPanel
            title="My Resources"
            description="Manage what you have uploaded, keep materials current, and remove outdated content."
            resources={myResources}
            loading={loadingResources}
            hasActiveFilters={Boolean(filters.search || filters.subject || filters.grade)}
            currentUserId={currentUserId}
            selectedResource={selectedResource}
            summaryStats={myResourceStats}
            emptyDescription="You haven’t uploaded any resources yet. Start by sharing your first lesson plan to help other teachers."
            onSelectResource={handleSelectResource}
            onLike={handleToggleLike}
            onBookmark={handleToggleBookmark}
            onDownload={handleDownloadResource}
            onDelete={handleDeleteResource}
            onOpenUpload={() => setIsUploadOpen(true)}
          />
        );
      case NAV_ITEMS[4].id:
        return (
          <Card className="max-w-3xl p-8">
            <p className="text-sm text-muted-foreground">Upload</p>
            <h2 className="mt-3 text-3xl font-semibold text-foreground">Share something useful with other teachers</h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Add lesson plans, worksheets, presentations, or links. Clear titles and descriptions help other teachers discover your work faster.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">This resource is shared within your school.</p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Supported formats</p>
                <p className="mt-3 text-lg font-semibold text-foreground">PDF, PPT, DOCX</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Best results</p>
                <p className="mt-3 text-lg font-semibold text-foreground">Use clear titles and tags</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Helpful tip</p>
                <p className="mt-3 text-lg font-semibold text-foreground">Share what another teacher can reuse today</p>
              </Card>
            </div>
            <div className="mt-8">
              <Button onClick={() => setIsUploadOpen(true)}>
                <Plus className="h-4 w-4" />
                Upload Resource
              </Button>
            </div>
          </Card>
        );
      case NAV_ITEMS[5].id:
        if (!profile?.schoolId) {
          return (
            <Card className="max-w-3xl p-8">
              <p className="text-sm text-muted-foreground">School chat</p>
              <h2 className="mt-3 text-3xl font-semibold text-foreground">Your account is not linked to a school yet</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Sign up with a school or update your profile record before using school chat.
              </p>
            </Card>
          );
        }

        return (
          <SchoolChatPanel
            schoolName={profile.schoolName}
            messages={schoolMessages}
            loading={loadingSchoolChat}
            currentUserId={currentUserId}
            onSendMessage={handleCreateSchoolMessage}
          />
        );
      case NAV_ITEMS[6].id:
        return (
          <CommunityPanel
            posts={posts}
            comments={comments}
            loading={loadingCommunity}
            currentUserId={currentUserId}
            onCreatePost={handleCreatePost}
            onCreateComment={handleCreateComment}
            onTogglePostLike={handleTogglePostLike}
            onTogglePostBookmark={handleTogglePostBookmark}
            onDeletePost={handleDeletePost}
            onDeleteComment={handleDeleteComment}
          />
        );
      case NAV_ITEMS[7].id:
        return (
          <div className="space-y-12">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold text-foreground">Bookmarks</h2>
              <p className="max-w-2xl text-sm text-muted-foreground">Quickly revisit saved materials and discussions.</p>
            </div>
            <ResourcesPanel
              title="Bookmarked Resources"
              description="Quickly revisit the materials you want to reuse, share, or include in future lesson planning."
              resources={bookmarkedResources}
              loading={loadingResources}
              hasActiveFilters={Boolean(filters.search || filters.subject || filters.grade)}
              currentUserId={currentUserId}
              selectedResource={bookmarkedSelectedResource}
              onSelectResource={handleSelectResource}
              onLike={handleToggleLike}
              onBookmark={handleToggleBookmark}
              onDownload={handleDownloadResource}
              onDelete={handleDeleteResource}
            />

            <CommunityPanel
              title="Bookmarked Threads"
              description="Return to the discussions you saved without losing the context around each reply."
              emptyTitle="No bookmarked threads yet"
              emptyDescription="Bookmark a discussion in Community to keep it here for later."
              showComposer={false}
              posts={bookmarkedPosts}
              comments={comments}
              loading={loadingCommunity}
              currentUserId={currentUserId}
              onCreatePost={handleCreatePost}
              onCreateComment={handleCreateComment}
              onTogglePostLike={handleTogglePostLike}
              onTogglePostBookmark={handleTogglePostBookmark}
              onDeletePost={handleDeletePost}
              onDeleteComment={handleDeleteComment}
            />
          </div>
        );
      case NAV_ITEMS[8].id:
        return (
          <div className="max-w-5xl space-y-8">
            <Card className="p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                  {profileForm.avatar ? (
                    <img src={profileForm.avatar} alt={activeProfile.name} className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h2 className="text-3xl font-semibold text-foreground">{activeProfile.name}</h2>
                  <p className="mt-1 text-sm font-normal text-muted-foreground">{activeProfile.email}</p>
                  <div className="mt-3 inline-flex rounded-full border border-border bg-muted px-3 py-1 text-sm text-foreground">
                    {contributorLevel}
                  </div>
                </div>
              </div>

              {user && isAuthRequired ? (
                <Button variant="outline" onClick={() => void logOut()}>
                  Sign out
                </Button>
              ) : null}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <Card className="p-4">
                <p className="text-sm font-normal text-muted-foreground">Uploads</p>
                <p className="mt-3 text-3xl font-semibold text-foreground">{myResources.length}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm font-normal text-muted-foreground">Bookmarks</p>
                <p className="mt-3 text-3xl font-semibold text-foreground">{bookmarkedResources.length}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm font-normal text-muted-foreground">Posts</p>
                <p className="mt-3 text-3xl font-semibold text-foreground">
                  {posts.filter((post) => post.userId === currentUserId).length}
                </p>
              </Card>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <Card className="p-6">
                <p className="text-sm font-semibold text-foreground">Identity</p>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Name</span><span>{activeProfile.name}</span></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Email</span><span>{activeProfile.email}</span></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Subject</span><span>{profileForm.subject || "Not set"}</span></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Grade</span><span>{profileForm.grade || "Not set"}</span></div>
                </div>
              </Card>

              <Card className="p-6">
                <p className="text-sm font-semibold text-foreground">Activity</p>
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Recent uploads</p>
                    <div className="mt-3 space-y-2">
                      {recentUploads.length > 0 ? recentUploads.map((resource) => (
                        <button key={resource.id} className="flex w-full items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2 text-left" onClick={() => { handleSelectResource(resource); setActiveItem("mine"); }}>
                          <span className="text-sm font-medium text-foreground">{resource.title}</span>
                          <span className="text-sm text-muted-foreground">{resource.downloadCount ?? Math.max(0, resource.bookmarks.length)} downloads</span>
                        </button>
                      )) : <p className="text-sm text-muted-foreground">No uploads yet.</p>}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Recent posts</p>
                    <div className="mt-3 space-y-2">
                      {recentPosts.length > 0 ? recentPosts.map((post) => (
                        <button key={post.id} className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-left" onClick={() => setActiveItem("community")}>
                          <p className="line-clamp-2 text-sm font-medium text-foreground">{post.content}</p>
                        </button>
                      )) : <p className="text-sm text-muted-foreground">No posts yet.</p>}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="mt-8 space-y-4 rounded-2xl border border-border bg-muted p-6">
              <div>
                <p className="text-sm font-semibold text-foreground">Profile settings</p>
                <p className="mt-1 text-sm font-normal text-muted-foreground">
                  Keep your subject and grade up to date so colleagues know what you teach.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <p className="text-sm font-normal text-muted-foreground">Profile photo</p>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => void handleAvatarChange(event.target.files?.[0] ?? null)}
                      />
                      <span className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm text-foreground transition hover:bg-muted">
                        {uploadingAvatar ? "Uploading..." : "Upload photo"}
                      </span>
                    </label>
                    {profileForm.avatar ? (
                      <button
                        type="button"
                        className="text-sm text-muted-foreground underline underline-offset-4"
                        onClick={() => setProfileForm((current) => ({ ...current, avatar: "" }))}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
                <Input
                  value={profileForm.name}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Full name"
                />
                <Select
                  value={profileForm.subject}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, subject: event.target.value }))
                  }
                  options={SUBJECT_OPTIONS}
                  placeholder="Select subject"
                />
                <Select
                  value={profileForm.grade}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, grade: event.target.value }))
                  }
                  options={GRADE_OPTIONS}
                  placeholder="Select grade"
                />
              </div>

              {profileMessage ? <p className="text-sm font-normal text-muted-foreground">{profileMessage}</p> : null}
              {profileError ? <p className="text-sm font-normal text-foreground/80">{profileError}</p> : null}

              <Button
                disabled={savingProfile}
                loading={savingProfile}
                loadingText="Saving..."
                onClick={() => void handleProfileSave()}
              >
                Save profile
              </Button>
            </div>
            </Card>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <AuthGuard>
      {!isSupabaseConfigured ? (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
          <Card className="w-full max-w-2xl p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Supabase setup required</p>
            <h1 className="mt-3 text-3xl font-semibold text-foreground">
              Add your project credentials to launch the workspace
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              This build is ready, but Supabase credentials are still missing. Create
              <code className="mx-1 rounded bg-muted px-1.5 py-0.5">.env.local</code>
              from
              <code className="mx-1 rounded bg-muted px-1.5 py-0.5">.env.example</code>
              and fill in the keys below.
            </p>

            <div className="mt-6 rounded-2xl border border-border bg-muted p-5">
              <p className="text-sm font-medium text-foreground">Missing variables</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {missingSupabaseEnvVars.map((item) => (
                  <span key={item} className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="flex min-h-screen bg-background text-foreground">
          <Sidebar
            activeItem={activeItem}
            schoolName={activeProfile.schoolName}
            isCollapsed={isCollapsed}
            isMobileOpen={isMobileOpen}
            onNavigate={setActiveItem}
            onToggleCollapse={() => setIsCollapsed((value) => !value)}
            onCloseMobile={() => setIsMobileOpen(false)}
          />

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Topbar
              search={filters.search}
              onSearchChange={(value) => setFilters((current) => ({ ...current, search: value }))}
              onOpenLessonPlanner={() => setIsLessonPlannerOpen(true)}
              schoolName={activeProfile.schoolName}
              isMobileSidebarOpen={isMobileOpen}
              onToggleMobileSidebar={() => setIsMobileOpen((value) => !value)}
            />

            <main className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
                {renderWorkspace()}
              </div>
            </main>
          </div>

          <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-3">
            {workspaceSuccess ? <Toast message={workspaceSuccess} tone="success" /> : null}
            {workspaceError ? <Toast message={workspaceError} tone="error" /> : null}
          </div>

          <UploadModal
            open={isUploadOpen}
            onClose={() => setIsUploadOpen(false)}
            onSubmit={handleUpload}
          />
          <LessonPlannerModal
            open={isLessonPlannerOpen}
            onClose={() => setIsLessonPlannerOpen(false)}
          />
        </div>
      )}
    </AuthGuard>
  );
}
