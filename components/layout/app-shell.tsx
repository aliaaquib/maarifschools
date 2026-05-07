"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Plus, UserRound } from "lucide-react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { ClassesWorkspace } from "@/components/classes/classes-workspace";
import { CommunityPanel } from "@/components/community/community-panel";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { InviteTeachersModal } from "@/components/invite/invite-teachers-modal";
import { LessonPlannerModal } from "@/components/lesson-planner/lesson-planner-modal";
import { Sidebar } from "@/components/layout/sidebar";
import { SchoolChatPanel } from "@/components/school-chat/school-chat-panel";
import { UploadModal } from "@/components/resources/upload-modal";
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
import { toUserFacingError } from "@/lib/errors";
import {
  createComment,
  createPost,
  createClass,
  createClassPost,
  createSchoolChatConversation,
  createSchoolMessage,
  deleteComment,
  deletePost,
  deleteResource,
  deleteSchoolChatConversation,
  ensureUserProfile,
  getClassMembers,
  getClassPosts,
  getClassResources,
  getComments,
  getAllTeachers,
  getSchoolChatConversations,
  getSchoolTeachers,
  getTeacherClasses,
  getVisibleResources,
  getUserProfile,
  getSchoolMessages,
  getPosts,
  addResourceToClass,
  removeClassMember,
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
  ClassMember,
  ClassPost,
  ClassRecord,
  CreateResourceInput,
  DiscussionComment,
  DiscussionPost,
  NotificationItem,
  ResourceFilters,
  ResourceRecord,
  SchoolChatConversation,
  SchoolMessage,
  SchoolTeacher,
} from "@/types";

const defaultFilters: ResourceFilters = {
  search: "",
  subject: "",
  grade: "",
};

export function AppShell({
  initialActiveItem = "dashboard",
  initialClassId = null,
  classViewMode = "overview",
}: {
  initialActiveItem?: NavigationItemId;
  initialClassId?: string | null;
  classViewMode?: "overview" | "detail";
}) {
  const router = useRouter();
  const { user, profile, logOut, saveProfile } = useAuth();
  const { isMobileOpen, setIsMobileOpen } = useSidebar();
  const [activeItem, setActiveItem] = useState<NavigationItemId>(initialActiveItem);
  const [filters, setFilters] = useState<ResourceFilters>(defaultFilters);
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [comments, setComments] = useState<DiscussionComment[]>([]);
  const [schoolMessages, setSchoolMessages] = useState<SchoolMessage[]>([]);
  const [schoolConversations, setSchoolConversations] = useState<SchoolChatConversation[]>([]);
  const [schoolTeachers, setSchoolTeachers] = useState<SchoolTeacher[]>([]);
  const [allTeachers, setAllTeachers] = useState<SchoolTeacher[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classMembersById, setClassMembersById] = useState<Record<string, ClassMember[]>>({});
  const [classPostsById, setClassPostsById] = useState<Record<string, ClassPost[]>>({});
  const [classResourcesById, setClassResourcesById] = useState<Record<string, ResourceRecord[]>>({});
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingResources, setLoadingResources] = useState(true);
  const [loadingCommunity, setLoadingCommunity] = useState(true);
  const [loadingSchoolChat, setLoadingSchoolChat] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceSuccess, setWorkspaceSuccess] = useState<string | null>(null);
  const [notificationsSeenAt, setNotificationsSeenAt] = useState(() => new Date().toISOString());
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isInviteTeachersOpen, setIsInviteTeachersOpen] = useState(false);
  const [isLessonPlannerOpen, setIsLessonPlannerOpen] = useState(false);
  const [inviteClassId, setInviteClassId] = useState<string | null>(null);
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
        schoolId:
          typeof user.user_metadata?.school_id === "string"
            ? user.user_metadata.school_id
            : null,
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
  const schoolConversationStorageKey = useMemo(
    () => (activeProfile.schoolId ? `teachshare-school-conversations:${activeProfile.schoolId}` : ""),
    [activeProfile.schoolId],
  );

  const mergeConversations = useCallback((primary: SchoolChatConversation[], secondary: SchoolChatConversation[]) => {
    const merged = [...primary];
    const existingIds = new Set(primary.map((conversation) => conversation.id));

    for (const conversation of secondary) {
      if (!existingIds.has(conversation.id)) {
        merged.push(conversation);
      }
    }

    return merged;
  }, []);

  const loadStoredSchoolConversations = useCallback(() => {
    if (typeof window === "undefined" || !schoolConversationStorageKey) {
      return [] as SchoolChatConversation[];
    }

    try {
      const raw = window.localStorage.getItem(schoolConversationStorageKey);
      if (!raw) {
        return [];
      }

      return JSON.parse(raw) as SchoolChatConversation[];
    } catch {
      return [];
    }
  }, [schoolConversationStorageKey]);

  const persistSchoolConversations = useCallback(
    (conversations: SchoolChatConversation[]) => {
      if (typeof window === "undefined" || !schoolConversationStorageKey) {
        return;
      }

      const customOnly = conversations.filter(
        (conversation) => !["general", "grade-3", "science"].includes(conversation.id),
      );
      window.localStorage.setItem(schoolConversationStorageKey, JSON.stringify(customOnly));
    },
    [schoolConversationStorageKey],
  );

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
      setLoadingClasses(false);
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
        setWorkspaceError(toUserFacingError(error, "We couldn't load community updates right now."));
      },
    );

    const unsubscribeComments = getComments(
      (nextComments) => setComments(nextComments),
      (error) => setWorkspaceError(toUserFacingError(error, "We couldn't load replies right now.")),
    );
    let unsubscribeSchoolMessages: () => void = () => undefined;

    let unsubscribeResources: () => void = () => undefined;

    setLoadingResources(true);

    unsubscribeResources = getVisibleResources(
      activeProfile.schoolId,
      (nextResources) => {
        setResources(nextResources);
        setLoadingResources(false);
      },
      (error) => {
        setResources([]);
        setLoadingResources(false);
        setWorkspaceError(toUserFacingError(error, "We couldn't load resources right now."));
      },
    );

    if (activeProfile.schoolId) {
      setLoadingSchoolChat(true);
      setLoadingClasses(true);
      void getTeacherClasses(currentUserId, activeProfile.schoolId)
        .then((nextClasses) => {
          setClasses(nextClasses);
          setSelectedClassId((current) => current ?? nextClasses[0]?.id ?? null);
          setLoadingClasses(false);
        })
        .catch(() => {
          setClasses([]);
          setSelectedClassId(null);
          setLoadingClasses(false);
        });
      void getSchoolChatConversations(activeProfile.schoolId)
        .then((nextConversations) => {
          const merged = mergeConversations(nextConversations, loadStoredSchoolConversations());
          setSchoolConversations(merged);
          persistSchoolConversations(merged);
        })
        .catch(() => {
          setSchoolConversations(loadStoredSchoolConversations());
        });
      void getSchoolTeachers(activeProfile.schoolId)
        .then((nextTeachers) => setSchoolTeachers(nextTeachers))
        .catch(() => setSchoolTeachers([]));
      void getAllTeachers()
        .then((nextTeachers) => setAllTeachers(nextTeachers))
        .catch(() => setAllTeachers([]));
      unsubscribeSchoolMessages = getSchoolMessages(
        activeProfile.schoolId,
        (nextMessages) => {
          setSchoolMessages(nextMessages);
          setLoadingSchoolChat(false);
        },
        (error) => {
          setSchoolMessages([]);
          setLoadingSchoolChat(false);
          setWorkspaceError(toUserFacingError(error, "We couldn't load school chat right now."));
        },
      );
    } else {
      setClasses([]);
      setSelectedClassId(null);
      setClassMembersById({});
      setClassPostsById({});
      setClassResourcesById({});
      setSchoolConversations([]);
      setSchoolTeachers([]);
      setAllTeachers([]);
      setSchoolMessages([]);
      setLoadingSchoolChat(false);
      setLoadingClasses(false);
    }

    return () => {
      unsubscribeResources();
      unsubscribeSchoolMessages();
      unsubscribePosts();
      unsubscribeComments();
    };
  }, [activeProfile.schoolId, currentUserId, loadStoredSchoolConversations, mergeConversations, persistSchoolConversations]);

  useEffect(() => {
    if (!selectedClassId) {
      return;
    }

    void Promise.all([
      getClassMembers(selectedClassId),
      getClassPosts(selectedClassId),
      getClassResources(selectedClassId),
    ])
      .then(([members, postsForClass, resourcesForClass]) => {
        setClassMembersById((current) => ({ ...current, [selectedClassId]: members }));
        setClassPostsById((current) => ({ ...current, [selectedClassId]: postsForClass }));
        setClassResourcesById((current) => ({ ...current, [selectedClassId]: resourcesForClass }));
      })
      .catch((error) => {
        setWorkspaceError(toUserFacingError(error, "We couldn't load class details right now."));
      });
  }, [selectedClassId]);

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

  const notifications = useMemo<NotificationItem[]>(() => {
    const resourceNotifications = resources
      .filter((resource) => resource.userId !== currentUserId)
      .map((resource) => ({
        id: `resource-${resource.id}`,
        type: "resource" as const,
        title: `${resource.userName} uploaded a new resource`,
        description: resource.title,
        createdAt: resource.createdAt,
      }));

    const postNotifications = posts
      .filter((post) => post.userId !== currentUserId)
      .map((post) => ({
        id: `post-${post.id}`,
        type: "post" as const,
        title: `${post.userName} started a discussion`,
        description: post.content,
        createdAt: post.createdAt,
      }));

    const commentNotifications = comments
      .filter((comment) => comment.userId !== currentUserId)
      .map((comment) => ({
        id: `comment-${comment.id}`,
        type: "comment" as const,
        title: `${comment.userName} replied in community`,
        description: comment.content,
        createdAt: comment.createdAt,
      }));

    const schoolNotifications = schoolMessages
      .filter((message) => message.userId !== currentUserId)
      .map((message) => ({
        id: `school-${message.id}`,
        type: "school-message" as const,
        title: `${message.userName} posted in school chat`,
        description: message.content,
        createdAt: message.createdAt,
      }));

    return [
      ...resourceNotifications,
      ...postNotifications,
      ...commentNotifications,
      ...schoolNotifications,
    ]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 12);
  }, [comments, currentUserId, posts, resources, schoolMessages]);

  const unreadNotifications = useMemo(() => {
    const seenAt = new Date(notificationsSeenAt).getTime();
    return notifications.filter((notification) => new Date(notification.createdAt).getTime() > seenAt).length;
  }, [notifications, notificationsSeenAt]);

  const handleMarkNotificationsSeen = useCallback(() => {
    setNotificationsSeenAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    if (activeItem === "bookmarks") {
      setSelectedResourceId(null);
    }
  }, [activeItem]);

  useEffect(() => {
    setActiveItem(initialActiveItem);
  }, [initialActiveItem]);

  useEffect(() => {
    setSelectedClassId(initialClassId);
  }, [initialClassId]);

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

    const existingProfile = await getUserProfile(user.id).catch(() => null);
    const resolvedSchoolId =
      activeProfile.schoolId ??
      existingProfile?.schoolId ??
      (typeof user.user_metadata?.school_id === "string" ? user.user_metadata.school_id : null);
    const resolvedSchoolName = activeProfile.schoolName ?? existingProfile?.schoolName ?? null;

    await ensureUserProfile({
      uid: user.id,
      name: activeProfile.name,
      email: activeProfile.email,
      avatar: activeProfile.avatar ?? null,
      subject: activeProfile.subject,
      grade: activeProfile.grade,
      schoolId: resolvedSchoolId,
      schoolName: resolvedSchoolName,
    });
  }

  async function handleUpload(input: CreateResourceInput) {
    setWorkspaceError(null);
    setWorkspaceSuccess(null);

    try {
      if (input.resourceScope === "school" && !activeProfile.schoolId) {
        throw new Error("Your account is not linked to a school yet.");
      }

      await ensureCurrentUserProfileRecord();

      await uploadResource({
        ...input,
        userId: currentUserId,
        userName: activeProfile.name,
        schoolId: input.resourceScope === "school" ? activeProfile.schoolId : null,
      });
      setWorkspaceSuccess("Resource uploaded successfully.");
    } catch (error) {
      throw new Error(toUserFacingError(error, "We could not upload your resource."));
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
      setWorkspaceError(toUserFacingError(error, "Could not update likes."));
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
      setWorkspaceError(toUserFacingError(error, "Could not update bookmarks."));
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
      setWorkspaceError(toUserFacingError(error, "Could not delete resource."));
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

  async function handleCreateSchoolMessage(input: {
    content: string;
    room: SchoolMessage["room"];
    parentId?: string | null;
    file?: File | null;
  }) {
    if (!activeProfile.schoolId || !user) {
      throw new Error("Your account is not linked to a school yet.");
    }

    await ensureCurrentUserProfileRecord();

    const createdMessage = await createSchoolMessage({
      schoolId: activeProfile.schoolId,
      userId: user.id,
      content: input.content,
      room: input.room,
      parentId: input.parentId,
      file: input.file,
    });

    setSchoolMessages((current) =>
      current.some((message) => message.id === createdMessage.id)
        ? current
        : [...current, createdMessage],
    );
    setWorkspaceSuccess("Message sent.");
  }

  async function handleCreateSchoolConversation(input: {
    name: string;
    type: SchoolChatConversation["type"];
    memberIds: string[];
  }) {
    if (!activeProfile.schoolId || !user) {
      throw new Error("Your account is not linked to a school yet.");
    }

    await ensureCurrentUserProfileRecord();

    const createdConversation = await createSchoolChatConversation({
      schoolId: activeProfile.schoolId,
      name: input.name,
      type: input.type,
      memberIds: Array.from(new Set([user.id, ...input.memberIds])),
      createdBy: user.id,
    }).catch(() => ({
      id:
        input.type === "direct"
          ? `direct-${[user.id, ...input.memberIds].sort().join("-")}`
          : `group-local-${Date.now()}`,
      schoolId: activeProfile.schoolId!,
      name: input.name,
      type: input.type,
      memberIds: Array.from(new Set([user.id, ...input.memberIds])),
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    }));

    setSchoolConversations((current) => {
      const next = current.some((conversation) => conversation.id === createdConversation.id)
        ? current
        : [createdConversation, ...current];
      persistSchoolConversations(next);
      return next;
    });
    setWorkspaceSuccess(input.type === "direct" ? "Direct chat started." : "Chat group created.");
    return createdConversation;
  }

  async function handleCreateClass(input: {
    name: string;
    subject: string;
    grade: string;
    description: string;
  }) {
    if (!activeProfile.schoolId || !user) {
      throw new Error("Your account is not linked to a school yet.");
    }

    await ensureCurrentUserProfileRecord();

    const createdClass = await createClass({
      teacherId: user.id,
      schoolId: activeProfile.schoolId,
      name: input.name,
      subject: input.subject || activeProfile.subject || "General Studies",
      grade: input.grade || activeProfile.grade || "Grade not set",
      description: input.description,
    });

    setClasses((current) => [createdClass, ...current]);
    setSelectedClassId(createdClass.id);
    setWorkspaceSuccess("Class created.");
  }

  async function handleCreateClassPost(input: {
    classId: string;
    type: "announcement" | "discussion" | "assignment";
    title: string;
    content: string;
  }) {
    if (!user) {
      throw new Error("Please sign in to post in a class.");
    }

    const createdPost = await createClassPost({
      classId: input.classId,
      authorId: user.id,
      type: input.type,
      title: input.title,
      content: input.content,
    });

    setClassPostsById((current) => ({
      ...current,
      [input.classId]: [createdPost, ...(current[input.classId] ?? [])],
    }));
    setWorkspaceSuccess("Class update posted.");
  }

  async function handleAddResourceToClass(classId: string, resourceId: string) {
    await addResourceToClass(classId, resourceId);
    const linkedResource = resources.find((resource) => resource.id === resourceId);
    if (linkedResource) {
      setClassResourcesById((current) => ({
        ...current,
        [classId]: current[classId]?.some((item) => item.id === resourceId)
          ? current[classId]
          : [linkedResource, ...(current[classId] ?? [])],
      }));
    }
    setWorkspaceSuccess("Resource added to class.");
  }

  async function handleRemoveStudentFromClass(classId: string, userId: string) {
    await removeClassMember(classId, userId);
    setClassMembersById((current) => ({
      ...current,
      [classId]: (current[classId] ?? []).filter((member) => member.userId !== userId),
    }));
    setClasses((current) =>
      current.map((classItem) =>
        classItem.id === classId
          ? { ...classItem, studentCount: Math.max(0, classItem.studentCount - 1) }
          : classItem,
      ),
    );
    setWorkspaceSuccess("Student removed from class.");
  }

  async function handleSidebarLogOut() {
    if (!isAuthRequired || !user) {
      return;
    }

    await logOut();
  }

  function handleOpenClass(classId: string) {
    setSelectedClassId(classId);
    setInviteClassId(null);
    setActiveItem("classes");
    router.push(`/app/classes/${classId}`);
  }

  function handleInviteStudents(classId: string) {
    setSelectedClassId(classId);
    setInviteClassId(classId);
    setActiveItem("classes");
    router.push(`/app/classes/${classId}`);
  }

  function handleBackToClasses() {
    setInviteClassId(null);
    setActiveItem("classes");
    router.push("/app/classes");
  }

  function handleSidebarNavigate(id: NavigationItemId) {
    if (id === "dashboard") {
      setActiveItem("dashboard");
      router.push("/app/dashboard");
      return;
    }

    if (id === "classes") {
      handleBackToClasses();
      return;
    }

    setActiveItem(id);
  }

  async function handleDeleteSchoolConversation(conversationId: string) {
    const previousConversations = schoolConversations;
    const previousMessages = schoolMessages;

    setSchoolConversations((current) => current.filter((conversation) => conversation.id !== conversationId));
    setSchoolMessages((current) => current.filter((message) => message.room !== conversationId));

    try {
      await deleteSchoolChatConversation(conversationId);
      setWorkspaceSuccess("Group deleted.");
    } catch (error) {
      setSchoolConversations(previousConversations);
      setSchoolMessages(previousMessages);
      setWorkspaceError(toUserFacingError(error, "Could not delete group."));
    }
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
      setWorkspaceError(toUserFacingError(error, "Could not update post like."));
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
      setWorkspaceError(toUserFacingError(error, "Could not update post bookmark."));
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
      setWorkspaceError(toUserFacingError(error, "Could not delete post."));
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
      setWorkspaceError(toUserFacingError(error, "Could not delete comment."));
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
      setProfileError(toUserFacingError(error, "Could not upload profile photo."));
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
      setProfileError(toUserFacingError(error, "We could not update your profile."));
    } finally {
      setSavingProfile(false);
    }
  }

  function renderWorkspace() {
    switch (activeItem) {
      case "dashboard":
        return (
          <DashboardOverview
            profile={activeProfile}
            currentUserId={currentUserId}
            classes={classes}
            resources={filteredResources}
            myResources={myResources}
            posts={posts}
            comments={comments}
            onOpenUpload={() => setIsUploadOpen(true)}
            onInviteTeachers={() => setIsInviteTeachersOpen(true)}
            onStartDiscussion={() => setActiveItem("community")}
            onExploreResources={() => setActiveItem("all")}
            onSelectResource={(resource) => {
              handleSelectResource(resource);
              setActiveItem("all");
            }}
            onOpenMyClasses={handleBackToClasses}
            onInviteStudents={handleInviteStudents}
            onOpenClass={handleOpenClass}
          />
        );
      case "classes":
        return (
          <ClassesWorkspace
            mode={classViewMode}
            profile={activeProfile}
            classes={classes}
            loading={loadingClasses}
            selectedClassId={selectedClassId}
            inviteClassId={inviteClassId}
            classMembers={selectedClassId ? (classMembersById[selectedClassId] ?? []) : []}
            classPosts={selectedClassId ? (classPostsById[selectedClassId] ?? []) : []}
            classResources={selectedClassId ? (classResourcesById[selectedClassId] ?? []) : []}
            myResources={myResources}
            onSelectClass={setSelectedClassId}
            onOpenClass={handleOpenClass}
            onBackToClasses={handleBackToClasses}
            onInviteClassChange={setInviteClassId}
            onCreateClass={handleCreateClass}
            onCreateClassPost={handleCreateClassPost}
            onAddResourceToClass={handleAddResourceToClass}
            onRemoveStudent={handleRemoveStudentFromClass}
          />
        );
      case "all":
        return (
          <>
            <SearchBar filters={filters} schoolName={activeProfile.schoolName} onFiltersChange={setFilters} />
            <ResourcesPanel
              title="All Resources"
              description="Browse common resources for everyone alongside materials shared within your school."
              resources={filteredResources}
              loading={loadingResources}
              hasActiveFilters={Boolean(filters.search || filters.subject || filters.grade)}
              currentUserId={currentUserId}
              selectedResource={selectedResource}
              emptyDescription="No resources are available yet. Be the first to upload to your school or the shared library."
              onSelectResource={handleSelectResource}
              onLike={handleToggleLike}
              onBookmark={handleToggleBookmark}
              onDownload={handleDownloadResource}
              onDelete={handleDeleteResource}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          </>
        );
      case "mine":
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
      case "school-chat":
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
            conversations={schoolConversations}
            schoolTeachers={schoolTeachers}
            teachers={allTeachers}
            messages={schoolMessages}
            loading={loadingSchoolChat}
            currentUserId={currentUserId}
            currentUserName={activeProfile.name}
            currentUserAvatar={activeProfile.avatar ?? null}
            onSendMessage={handleCreateSchoolMessage}
            onCreateConversation={handleCreateSchoolConversation}
            onDeleteConversation={handleDeleteSchoolConversation}
          />
        );
      case "community":
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
      case "bookmarks":
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
      case "settings":
        return (
          <div className="max-w-5xl space-y-8">
            <Card className="p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <p className="text-sm text-[#6B7280]">Settings</p>
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
                    <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">School</span><span>{activeProfile.schoolName || "Not linked yet"}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Subject</span><span>{profileForm.subject || "Not set"}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Grade</span><span>{profileForm.grade || "Not set"}</span></div>
                  </div>
                </Card>

                <Card className="p-6">
                  <p className="text-sm font-semibold text-foreground">Workspace rules</p>
                  <div className="mt-5 space-y-4 text-sm text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground">School visibility</p>
                      <p className="mt-1">School resources are limited to teachers in the same school.</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Common library</p>
                      <p className="mt-1">Common resources can be discovered across every connected school.</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Discussion space</p>
                      <p className="mt-1">Community discussions stay global so teachers can learn from every school.</p>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
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

                <Card className="p-6">
                  <p className="text-sm font-semibold text-foreground">Profile settings</p>
                  <p className="mt-1 text-sm font-normal text-muted-foreground">
                    Keep your subject and grade up to date so colleagues know what you teach.
                  </p>

                  <div className="mt-5 grid gap-4">
                    <div className="space-y-2">
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

                  {profileMessage ? <p className="mt-4 text-sm font-normal text-muted-foreground">{profileMessage}</p> : null}
                  {profileError ? <p className="mt-4 text-sm font-normal text-foreground/80">{profileError}</p> : null}

                  <div className="mt-5">
                    <Button
                      disabled={savingProfile}
                      loading={savingProfile}
                      loadingText="Saving..."
                      onClick={() => void handleProfileSave()}
                    >
                      Save settings
                    </Button>
                  </div>
                </Card>
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
        <div className="flex h-screen overflow-hidden bg-[#F9FAFB] text-foreground">
          <Sidebar
            activeItem={activeItem}
            schoolName={activeProfile.schoolName}
            isCollapsed={false}
            isMobileOpen={isMobileOpen}
            onNavigate={handleSidebarNavigate}
            onLogOut={() => void handleSidebarLogOut()}
            onToggleCollapse={() => undefined}
            onCloseMobile={() => setIsMobileOpen(false)}
          />

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Topbar
              search={filters.search}
              onSearchChange={(value) => setFilters((current) => ({ ...current, search: value }))}
              onOpenLessonPlanner={() => setIsLessonPlannerOpen(true)}
              schoolName={activeProfile.schoolName}
              userName={activeProfile.name}
              userAvatar={activeProfile.avatar ?? null}
              isMobileSidebarOpen={isMobileOpen}
              onToggleMobileSidebar={() => setIsMobileOpen((value) => !value)}
              notifications={notifications}
              unreadNotifications={unreadNotifications}
              onMarkNotificationsSeen={handleMarkNotificationsSeen}
            />

            <main className={activeItem === "dashboard" || activeItem === "school-chat" ? "min-h-0 flex-1 overflow-hidden" : "min-h-0 flex-1 overflow-y-auto"}>
              <div className={activeItem === "dashboard"
                ? "mx-auto flex h-full w-full max-w-[1440px] flex-col gap-4 px-4 pt-12 pb-3 md:px-6 md:pt-14 md:pb-4"
                : activeItem === "school-chat"
                  ? "mx-auto flex h-full w-full max-w-[1440px] flex-col px-4 pt-10 pb-3 md:px-6 md:pt-12 md:pb-4"
                  : "mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 pt-14 pb-6 md:px-6 md:pt-16 md:pb-8"}>
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
          <InviteTeachersModal
            open={isInviteTeachersOpen}
            onClose={() => setIsInviteTeachersOpen(false)}
            schoolId={activeProfile.schoolId}
            schoolName={activeProfile.schoolName}
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
