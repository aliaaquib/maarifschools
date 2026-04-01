import { RealtimeChannel } from "@supabase/supabase-js";

import { CreateResourceInput, DiscussionComment, DiscussionPost, ResourceRecord, SchoolMessage, SchoolRecord, UserProfile } from "@/types";
import { GUEST_USER_ID, supabase } from "@/lib/supabase";

type Row = Record<string, unknown>;

function toIsoDate(value: unknown) {
  if (typeof value === "string" && value) {
    return value;
  }

  return new Date().toISOString();
}

function detectFileType(input: { file?: File | null; externalUrl?: string }) {
  if (input.externalUrl) {
    return "link" as const;
  }

  const name = input.file?.name.toLowerCase() ?? "";
  if (name.endsWith(".pdf")) return "pdf" as const;
  if (name.endsWith(".ppt") || name.endsWith(".pptx")) return "ppt" as const;
  if (name.endsWith(".doc") || name.endsWith(".docx")) return "docx" as const;
  if (/\.(png|jpg|jpeg|webp|gif|svg)$/.test(name)) return "image" as const;
  return "other" as const;
}

function normalizeUserProfile(raw: Row): UserProfile {
  return {
    uid: String(raw.id ?? GUEST_USER_ID),
    name: String(raw.name ?? "Teacher"),
    email: String(raw.email ?? ""),
    avatar: raw.avatar ? String(raw.avatar) : null,
    subject: String(raw.subject ?? ""),
    grade: String(raw.grade ?? ""),
    schoolId: raw.school_id ? String(raw.school_id) : null,
    schoolName: raw.school_name ? String(raw.school_name) : null,
    createdAt: toIsoDate(raw.created_at),
  };
}

function normalizeSchool(raw: Row): SchoolRecord {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    createdAt: toIsoDate(raw.created_at),
  };
}

function normalizeSchoolMessage(raw: Row): SchoolMessage {
  const user = raw.users as Row | null | undefined;

  return {
    id: String(raw.id ?? ""),
    schoolId: String(raw.school_id ?? ""),
    userId: String(raw.user_id ?? ""),
    userName: String(user?.name ?? "Teacher"),
    userAvatar: user?.avatar ? String(user.avatar) : null,
    content: String(raw.content ?? ""),
    createdAt: toIsoDate(raw.created_at),
  };
}

function normalizePost(raw: Row): DiscussionPost {
  const user = raw.users as Row | null | undefined;

  return {
    id: String(raw.id ?? ""),
    content: String(raw.content ?? ""),
    userId: String(raw.user_id ?? ""),
    userName: String(user?.name ?? "Teacher"),
    userAvatar: user?.avatar ? String(user.avatar) : null,
    createdAt: toIsoDate(raw.created_at),
    likes: Array.isArray(raw.likes) ? raw.likes.filter((id): id is string => typeof id === "string") : [],
    bookmarks: Array.isArray(raw.bookmarks)
      ? raw.bookmarks.filter((id): id is string => typeof id === "string")
      : [],
  };
}

function normalizeComment(raw: Row): DiscussionComment {
  const user = raw.users as Row | null | undefined;

  return {
    id: String(raw.id ?? ""),
    postId: String(raw.post_id ?? ""),
    content: String(raw.content ?? ""),
    userId: String(raw.user_id ?? ""),
    userName: String(user?.name ?? "Teacher"),
    userAvatar: user?.avatar ? String(user.avatar) : null,
    createdAt: toIsoDate(raw.created_at),
  };
}

function normalizeResource(raw: Row): ResourceRecord {
  const user = raw.users as Row | null | undefined;
  const versions = Array.isArray(raw.resource_versions) ? (raw.resource_versions as Row[]) : [];
  const latestVersion = versions[0];

  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    description: String(raw.description ?? ""),
    fileUrl: String(raw.file_url ?? latestVersion?.file_url ?? ""),
    fileType: (raw.file_type ?? "other") as ResourceRecord["fileType"],
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === "string") : [],
    userId: String(raw.user_id ?? ""),
    userName: String(user?.name ?? "Teacher"),
    schoolId: raw.school_id ? String(raw.school_id) : null,
    createdAt: toIsoDate(raw.created_at),
    fileName: raw.file_name ? String(raw.file_name) : undefined,
    filePath: latestVersion?.storage_path ? String(latestVersion.storage_path) : undefined,
    likes: Array.isArray(raw.likes) ? raw.likes.filter((id): id is string => typeof id === "string") : [],
    bookmarks: Array.isArray(raw.bookmarks)
      ? raw.bookmarks.filter((id): id is string => typeof id === "string")
      : [],
  };
}

function createRealtimeChannel(
  name: string,
  table: string,
  refresh: () => Promise<void>,
) {
  const channel = supabase
    .channel(name)
    .on("postgres_changes", { event: "*", schema: "public", table }, () => {
      void refresh();
    })
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function getSchools() {
  const { data, error } = await supabase.from("schools").select("*").order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => normalizeSchool(row as Row));
}

async function getSchoolNameById(schoolId: string | null | undefined) {
  if (!schoolId) {
    return null;
  }

  const { data, error } = await supabase.from("schools").select("name").eq("id", schoolId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.name ? String(data.name) : null;
}

export async function createUserProfile(profile: Omit<UserProfile, "createdAt">) {
  const payload = {
    id: profile.uid,
    email: profile.email,
    name: profile.name,
    subject: profile.subject,
    grade: profile.grade,
    avatar: profile.avatar ?? null,
    school_id: profile.schoolId ?? null,
  };

  const { data, error } = await supabase
    .from("users")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const schoolName = await getSchoolNameById(profile.schoolId);
  return normalizeUserProfile({ ...(data as Row), school_name: schoolName });
}

export async function ensureUserProfile(profile: Omit<UserProfile, "createdAt">) {
  return createUserProfile(profile);
}

export async function getUserProfile(uid: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", uid)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const schoolName = await getSchoolNameById(data.school_id ? String(data.school_id) : null);
  return normalizeUserProfile({ ...(data as Row), school_name: schoolName });
}

export async function updateUser(uid: string, updates: Partial<Omit<UserProfile, "uid" | "createdAt">>) {
  const payload = {
    email: updates.email,
    name: updates.name,
    subject: updates.subject,
    grade: updates.grade,
    avatar: updates.avatar ?? null,
  };

  const { data, error } = await supabase
    .from("users")
    .update(payload)
    .eq("id", uid)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const schoolName = await getSchoolNameById(data.school_id ? String(data.school_id) : null);
  return normalizeUserProfile({ ...(data as Row), school_name: schoolName });
}

export function getSchoolMessages(
  schoolId: string,
  onData: (messages: SchoolMessage[]) => void,
  onError: (error: Error) => void,
) {
  const refresh = async () => {
    const { data, error } = await supabase
      .from("school_messages")
      .select("id, school_id, user_id, content, created_at, users(name, avatar)")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: true });

    if (error) {
      onError(new Error(error.message));
      return;
    }

    onData((data ?? []).map((row) => normalizeSchoolMessage(row as Row)));
  };

  void refresh();
  return createRealtimeChannel("school-messages-feed", "school_messages", refresh);
}

export async function createSchoolMessage(input: { schoolId: string; userId: string; content: string }) {
  const { data, error } = await supabase
    .from("school_messages")
    .insert([
      {
        school_id: input.schoolId,
        user_id: input.userId,
        content: input.content,
      },
    ])
    .select("id, school_id, user_id, content, created_at, users(name, avatar)")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not send message.");
  }

  return normalizeSchoolMessage(data as Row);
}

export async function uploadAvatar(userId: string, file: File) {
  const path = `avatars/${userId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("resources").upload(path, file, {
    upsert: true,
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from("resources").getPublicUrl(path);
  return data.publicUrl;
}

export async function createPost(input: {
  content: string;
  userId: string;
  userName: string;
}): Promise<DiscussionPost> {
  const { data, error } = await supabase
    .from("posts")
    .insert([
      {
        content: input.content,
        user_id: input.userId,
        likes: [],
        bookmarks: [],
      },
    ])
    .select("id, content, user_id, created_at, likes, bookmarks, users(name, avatar)")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create post.");
  }

  return normalizePost(data as Row);
}

export async function createComment(input: {
  postId: string;
  content: string;
  userId: string;
  userName: string;
}): Promise<DiscussionComment> {
  const { data, error } = await supabase
    .from("comments")
    .insert([
      {
        post_id: input.postId,
        content: input.content,
        user_id: input.userId,
      },
    ])
    .select("id, post_id, content, user_id, created_at, users(name, avatar)")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create comment.");
  }

  return normalizeComment(data as Row);
}

export function getPosts(onData: (posts: DiscussionPost[]) => void, onError: (error: Error) => void) {
  const refresh = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("id, content, user_id, created_at, likes, bookmarks, users(name, avatar)")
      .order("created_at", { ascending: false });

    if (error) {
      onError(new Error(error.message));
      return;
    }

    onData((data ?? []).map((row) => normalizePost(row as Row)));
  };

  void refresh();
  return createRealtimeChannel("posts-feed", "posts", refresh);
}

export function getComments(onData: (comments: DiscussionComment[]) => void, onError: (error: Error) => void) {
  const refresh = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("id, post_id, content, user_id, created_at, users(name, avatar)")
      .order("created_at", { ascending: true });

    if (error) {
      onError(new Error(error.message));
      return;
    }

    onData((data ?? []).map((row) => normalizeComment(row as Row)));
  };

  void refresh();
  return createRealtimeChannel("comments-feed", "comments", refresh);
}

export function getResourcesBySchool(
  schoolId: string,
  onData: (resources: ResourceRecord[]) => void,
  onError: (error: Error) => void,
) {
  const refresh = async () => {
    const { data, error } = await supabase
      .from("resources")
      .select("id, title, description, user_id, school_id, file_type, tags, file_name, likes, bookmarks, created_at, users(name, avatar), resource_versions(file_url, storage_path, created_at)")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (error) {
      onError(new Error(error.message));
      return;
    }

    onData((data ?? []).map((row) => normalizeResource(row as Row)));
  };

  void refresh();
  return createRealtimeChannel("resources-feed", "resources", refresh);
}

export async function createResource(input: CreateResourceInput & { userId: string; userName: string; schoolId: string }) {
  let fileUrl = input.externalUrl ?? "";
  let storagePath = "";

  if (input.file) {
    storagePath = `files/${input.userId}/${Date.now()}-${input.file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("resources")
      .upload(storagePath, input.file, { upsert: false });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from("resources").getPublicUrl(storagePath);
    fileUrl = data.publicUrl;
  }

  const tags = [input.subject, input.grade].filter(Boolean);

  const { data: resource, error: resourceError } = await supabase
    .from("resources")
    .insert([
      {
        title: input.title,
        description: input.description,
        user_id: input.userId,
        school_id: input.schoolId,
        file_type: detectFileType(input),
        tags,
        file_name: input.file?.name ?? null,
        likes: [],
        bookmarks: [],
      },
    ])
    .select("id")
    .single();

  if (resourceError || !resource) {
    throw new Error(resourceError?.message ?? "Unable to create resource.");
  }

  const { error: versionError } = await supabase.from("resource_versions").insert([
    {
      resource_id: resource.id,
      file_url: fileUrl,
      storage_path: storagePath || null,
    },
  ]);

  if (versionError) {
    throw new Error(versionError.message);
  }
}

export async function uploadResource(input: CreateResourceInput & { userId: string; userName: string; schoolId: string }) {
  return createResource(input);
}

export async function toggleResourceReaction(
  resource: ResourceRecord,
  userId: string,
  field: "likes" | "bookmarks",
) {
  const currentValues = resource[field];
  const nextValues = currentValues.includes(userId)
    ? currentValues.filter((value) => value !== userId)
    : [...currentValues, userId];

  const { error } = await supabase.from("resources").update({ [field]: nextValues }).eq("id", resource.id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteResource(resourceId: string) {
  const { data: versions, error: versionsError } = await supabase
    .from("resource_versions")
    .select("storage_path")
    .eq("resource_id", resourceId);

  if (versionsError) {
    throw new Error(versionsError.message);
  }

  const storagePaths = (versions ?? [])
    .map((version) => version.storage_path)
    .filter((path): path is string => typeof path === "string" && path.length > 0);

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage.from("resources").remove(storagePaths);
    if (storageError) {
      throw new Error(storageError.message);
    }
  }

  const { error: versionsDeleteError } = await supabase
    .from("resource_versions")
    .delete()
    .eq("resource_id", resourceId);

  if (versionsDeleteError) {
    throw new Error(versionsDeleteError.message);
  }

  const { error } = await supabase.from("resources").delete().eq("id", resourceId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function togglePostReaction(
  post: DiscussionPost,
  userId: string,
  field: "likes" | "bookmarks",
) {
  const currentValues = post[field];
  const nextValues = currentValues.includes(userId)
    ? currentValues.filter((value) => value !== userId)
    : [...currentValues, userId];

  const { error } = await supabase.from("posts").update({ [field]: nextValues }).eq("id", post.id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deletePost(postId: string) {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteComment(commentId: string) {
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) {
    throw new Error(error.message);
  }
}
