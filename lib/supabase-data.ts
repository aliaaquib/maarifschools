import { RealtimeChannel } from "@supabase/supabase-js";

import {
  ClassMember,
  ClassPost,
  ClassRecord,
  ClassPostType,
  CreateResourceInput,
  DiscussionComment,
  DiscussionPost,
  ResourceRecord,
  SchoolChatConversation,
  SchoolMessage,
  SchoolRecord,
  SchoolTeacher,
  UserProfile,
} from "@/types";
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

function normalizeSchoolConversation(raw: Row): SchoolChatConversation {
  return {
    id: String(raw.id ?? ""),
    schoolId: String(raw.school_id ?? ""),
    name: String(raw.name ?? "Conversation"),
    type: raw.type === "direct" ? "direct" : "group",
    memberIds: Array.isArray(raw.member_ids)
      ? raw.member_ids.filter((value): value is string => typeof value === "string")
      : [],
    createdBy: raw.created_by ? String(raw.created_by) : null,
    createdAt: toIsoDate(raw.created_at),
  };
}

function normalizeTeacher(raw: Row): SchoolTeacher {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? "Teacher"),
    avatar: raw.avatar ? String(raw.avatar) : null,
    email: String(raw.email ?? ""),
    subject: String(raw.subject ?? ""),
    grade: String(raw.grade ?? ""),
  };
}

function normalizeClassRecord(raw: Row): ClassRecord {
  return {
    id: String(raw.id ?? ""),
    teacherId: String(raw.teacher_id ?? ""),
    schoolId: String(raw.school_id ?? ""),
    name: String(raw.name ?? "Class"),
    subject: String(raw.subject ?? ""),
    grade: String(raw.grade ?? ""),
    description: String(raw.description ?? ""),
    inviteCode: String(raw.invite_code ?? ""),
    bannerUrl: raw.banner_url ? String(raw.banner_url) : null,
    createdAt: toIsoDate(raw.created_at),
    studentCount:
      typeof raw.student_count === "number"
        ? raw.student_count
        : typeof raw.student_count === "string"
          ? Number(raw.student_count)
          : 0,
  };
}

function normalizeClassMember(raw: Row): ClassMember {
  const user = raw.users as Row | null | undefined;
  return {
    id: String(raw.id ?? ""),
    classId: String(raw.class_id ?? ""),
    userId: String(raw.user_id ?? ""),
    role: raw.role === "teacher" ? "teacher" : "student",
    name: String(user?.name ?? raw.name ?? "Member"),
    email: String(user?.email ?? raw.email ?? ""),
    avatar: user?.avatar ? String(user.avatar) : null,
    subject: user?.subject ? String(user.subject) : "",
    grade: user?.grade ? String(user.grade) : "",
    joinedAt: toIsoDate(raw.joined_at),
  };
}

function normalizeClassPost(raw: Row): ClassPost {
  const user = raw.users as Row | null | undefined;
  return {
    id: String(raw.id ?? ""),
    classId: String(raw.class_id ?? ""),
    authorId: String(raw.author_id ?? ""),
    authorName: String(user?.name ?? "Teacher"),
    authorAvatar: user?.avatar ? String(user.avatar) : null,
    type:
      raw.type === "assignment" || raw.type === "discussion"
        ? raw.type
        : "announcement",
    title: String(raw.title ?? ""),
    content: String(raw.content ?? ""),
    createdAt: toIsoDate(raw.created_at),
  };
}

function normalizeSchoolMessage(raw: Row): SchoolMessage {
  const user = raw.users as Row | null | undefined;
  const normalizedRoom =
    typeof raw.room === "string" && raw.room.trim().length > 0 ? raw.room : "";

  return {
    id: String(raw.id ?? ""),
    schoolId: String(raw.school_id ?? ""),
    room: normalizedRoom,
    userId: String(raw.user_id ?? ""),
    userName: String(user?.name ?? "Teacher"),
    userAvatar: user?.avatar ? String(user.avatar) : null,
    content: String(raw.content ?? ""),
    parentId: raw.parent_id ? String(raw.parent_id) : null,
    attachmentUrl: raw.attachment_url ? String(raw.attachment_url) : null,
    attachmentName: raw.attachment_name ? String(raw.attachment_name) : null,
    attachmentSize:
      typeof raw.attachment_size === "number"
        ? raw.attachment_size
        : typeof raw.attachment_size === "string"
          ? Number(raw.attachment_size)
          : null,
    attachmentType:
      raw.attachment_type === "image" || raw.attachment_type === "link" || raw.attachment_type === "file"
        ? raw.attachment_type
        : null,
    createdAt: toIsoDate(raw.created_at),
  };
}

function normalizeDirectMessage(raw: Row): SchoolMessage {
  const user = raw.users as Row | null | undefined;
  const normalizedRoom =
    typeof raw.conversation_id === "string" && raw.conversation_id.trim().length > 0
      ? raw.conversation_id
      : typeof raw.room === "string" && raw.room.trim().length > 0
        ? raw.room
        : "";

  return {
    id: String(raw.id ?? ""),
    schoolId: String(raw.school_id ?? ""),
    room: normalizedRoom,
    userId: String(raw.sender_id ?? raw.user_id ?? ""),
    userName: String(user?.name ?? "Teacher"),
    userAvatar: user?.avatar ? String(user.avatar) : null,
    content: String(raw.content ?? ""),
    parentId: raw.parent_id ? String(raw.parent_id) : null,
    attachmentUrl: raw.attachment_url ? String(raw.attachment_url) : null,
    attachmentName: raw.attachment_name ? String(raw.attachment_name) : null,
    attachmentSize:
      typeof raw.attachment_size === "number"
        ? raw.attachment_size
        : typeof raw.attachment_size === "string"
          ? Number(raw.attachment_size)
          : null,
    attachmentType:
      raw.attachment_type === "image" || raw.attachment_type === "link" || raw.attachment_type === "file"
        ? raw.attachment_type
        : null,
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
    resourceScope: raw.resource_scope === "common" ? "common" : "school",
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

async function attachUsers(rows: Row[], userIdField: string = "user_id") {
  const userIds = Array.from(
    new Set(
      rows
        .map((row) => row[userIdField])
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );

  if (userIds.length === 0) {
    return rows;
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, name, avatar")
    .in("id", userIds);

  if (error) {
    return rows;
  }

  const usersById = new Map(
    (data ?? []).map((user) => [String(user.id), user as Row]),
  );

  return rows.map((row) => ({
    ...row,
    users: usersById.get(String(row[userIdField] ?? "")) ?? null,
  }));
}

async function attachResourceVersions(rows: Row[]) {
  const resourceIds = Array.from(
    new Set(
      rows
        .map((row) => row.id)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );

  if (resourceIds.length === 0) {
    return rows;
  }

  const { data, error } = await supabase
    .from("resource_versions")
    .select("resource_id, file_url, storage_path, created_at")
    .in("resource_id", resourceIds)
    .order("created_at", { ascending: false });

  if (error) {
    return rows.map((row) => ({ ...row, resource_versions: [] }));
  }

  const versionsByResourceId = new Map<string, Row[]>();
  for (const version of (data ?? []) as Row[]) {
    const resourceId = String(version.resource_id ?? "");
    if (!versionsByResourceId.has(resourceId)) {
      versionsByResourceId.set(resourceId, []);
    }
    versionsByResourceId.get(resourceId)?.push(version);
  }

  return rows.map((row) => ({
    ...row,
    resource_versions: versionsByResourceId.get(String(row.id ?? "")) ?? [],
  }));
}

async function getResourcesByIds(resourceIds: string[]) {
  if (resourceIds.length === 0) {
    return [] as ResourceRecord[];
  }

  const { data, error } = await supabase
    .from("resources")
    .select("id, title, description, user_id, school_id, resource_scope, file_type, tags, file_name, likes, bookmarks, created_at")
    .in("id", resourceIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  let rows = (data ?? []) as Row[];
  rows = await attachUsers(rows);
  rows = await attachResourceVersions(rows);
  return rows.map((row) => normalizeResource(row));
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

export async function getSchoolTeachers(schoolId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, avatar, email, subject, grade")
    .eq("school_id", schoolId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => normalizeTeacher(row as Row));
}

export async function getAllTeachers() {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, avatar, email, subject, grade")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => normalizeTeacher(row as Row));
}

export async function getTeacherClasses(teacherId: string, schoolId: string | null | undefined) {
  if (!teacherId || !schoolId) {
    return [] as ClassRecord[];
  }

  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("teacher_id", teacherId)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const classes = (data ?? []).map((row) => normalizeClassRecord(row as Row));
  if (classes.length === 0) {
    return [];
  }

  const classIds = classes.map((item) => item.id);
  const { data: membersData, error: membersError } = await supabase
    .from("class_members")
    .select("class_id, role")
    .in("class_id", classIds)
    .eq("role", "student");

  if (membersError) {
    return classes;
  }

  const countsByClassId = new Map<string, number>();
  for (const member of (membersData ?? []) as Row[]) {
    const classId = String(member.class_id ?? "");
    countsByClassId.set(classId, (countsByClassId.get(classId) ?? 0) + 1);
  }

  return classes.map((item) => ({
    ...item,
    studentCount: countsByClassId.get(item.id) ?? item.studentCount,
  }));
}

function generateInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function createClass(input: {
  teacherId: string;
  schoolId: string;
  name: string;
  subject: string;
  grade: string;
  description: string;
  bannerUrl?: string | null;
}) {
  const payload = {
    teacher_id: input.teacherId,
    school_id: input.schoolId,
    name: input.name,
    subject: input.subject,
    grade: input.grade,
    description: input.description,
    banner_url: input.bannerUrl ?? null,
    invite_code: generateInviteCode(),
  };

  const { data, error } = await supabase
    .from("classes")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const createdClass = normalizeClassRecord({ ...(data as Row), student_count: 0 });

  const { error: memberError } = await supabase
    .from("class_members")
    .insert([
      {
        class_id: createdClass.id,
        user_id: input.teacherId,
        role: "teacher",
      },
    ]);

  if (memberError) {
    throw new Error(memberError.message);
  }

  return createdClass;
}

export async function getClassMembers(classId: string) {
  const joinedQuery = await supabase
    .from("class_members")
    .select("id, class_id, user_id, role, joined_at, users(name, email, avatar, subject, grade)")
    .eq("class_id", classId)
    .order("joined_at", { ascending: true });

  if (!joinedQuery.error) {
    return (joinedQuery.data ?? []).map((row) => normalizeClassMember(row as Row));
  }

  const fallbackQuery = await supabase
    .from("class_members")
    .select("id, class_id, user_id, role, joined_at")
    .eq("class_id", classId)
    .order("joined_at", { ascending: true });

  if (fallbackQuery.error) {
    throw new Error(fallbackQuery.error.message);
  }

  const rowsWithUsers = await attachUsers((fallbackQuery.data ?? []) as Row[]);
  return rowsWithUsers.map((row) => normalizeClassMember(row as Row));
}

export async function removeClassMember(classId: string, userId: string) {
  const { error } = await supabase
    .from("class_members")
    .delete()
    .eq("class_id", classId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getClassPosts(classId: string) {
  const joinedQuery = await supabase
    .from("class_posts")
    .select("id, class_id, author_id, type, title, content, created_at, users(name, avatar)")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });

  if (!joinedQuery.error) {
    return (joinedQuery.data ?? []).map((row) => normalizeClassPost(row as Row));
  }

  const fallbackQuery = await supabase
    .from("class_posts")
    .select("id, class_id, author_id, type, title, content, created_at")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });

  if (fallbackQuery.error) {
    throw new Error(fallbackQuery.error.message);
  }

  const rowsWithUsers = await attachUsers((fallbackQuery.data ?? []) as Row[], "author_id");
  return rowsWithUsers.map((row) => normalizeClassPost(row as Row));
}

export async function createClassPost(input: {
  classId: string;
  authorId: string;
  type: ClassPostType;
  title: string;
  content: string;
}) {
  const joinedInsert = await supabase
    .from("class_posts")
    .insert([
      {
        class_id: input.classId,
        author_id: input.authorId,
        type: input.type,
        title: input.title,
        content: input.content,
      },
    ])
    .select("id, class_id, author_id, type, title, content, created_at, users(name, avatar)")
    .single();

  if (!joinedInsert.error && joinedInsert.data) {
    return normalizeClassPost(joinedInsert.data as Row);
  }

  const fallbackInsert = await supabase
    .from("class_posts")
    .insert([
      {
        class_id: input.classId,
        author_id: input.authorId,
        type: input.type,
        title: input.title,
        content: input.content,
      },
    ])
    .select("id, class_id, author_id, type, title, content, created_at")
    .single();

  if (fallbackInsert.error || !fallbackInsert.data) {
    throw new Error(fallbackInsert.error?.message ?? joinedInsert.error?.message ?? "Could not create class post.");
  }

  const [rowWithUser] = await attachUsers([fallbackInsert.data as Row], "author_id");
  return normalizeClassPost(rowWithUser as Row);
}

export async function getClassResources(classId: string) {
  const { data, error } = await supabase
    .from("class_resources")
    .select("resource_id")
    .eq("class_id", classId);

  if (error) {
    throw new Error(error.message);
  }

  const resourceIds = Array.from(
    new Set(
      (data ?? [])
        .map((row) => String((row as Row).resource_id ?? ""))
        .filter(Boolean),
    ),
  );

  return getResourcesByIds(resourceIds);
}

export async function addResourceToClass(classId: string, resourceId: string) {
  const { error } = await supabase
    .from("class_resources")
    .upsert([{ class_id: classId, resource_id: resourceId }], { onConflict: "class_id,resource_id" });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getClassByInviteCode(inviteCode: string) {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("invite_code", inviteCode)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return normalizeClassRecord(data as Row);
}

export async function joinClassByInviteCode(inviteCode: string, userId: string) {
  const classRecord = await getClassByInviteCode(inviteCode);
  if (!classRecord) {
    throw new Error("Class not found.");
  }

  const { error } = await supabase
    .from("class_members")
    .upsert(
      [
        {
          class_id: classRecord.id,
          user_id: userId,
          role: "student",
        },
      ],
      { onConflict: "class_id,user_id" },
    );

  if (error) {
    throw new Error(error.message);
  }

  return classRecord;
}

export async function getSchoolChatConversations(schoolId: string, currentUserId: string) {
  const { data: groupRows, error: groupsError } = await supabase
    .from("school_chat_rooms")
    .select("id, school_id, name, type, member_ids, created_by, created_at")
    .eq("school_id", schoolId)
    .eq("type", "group")
    .order("created_at", { ascending: true });

  const { data: directRows } = await supabase
    .from("school_chat_rooms")
    .select("id, school_id, name, type, member_ids, created_by, created_at")
    .eq("type", "direct")
    .contains("member_ids", [currentUserId])
    .order("created_at", { ascending: true });

  if (groupsError && !directRows) {
    return [];
  }

  const rows = [...(groupRows ?? []), ...(directRows ?? [])] as Row[];
  const uniqueRows = Array.from(new Map(rows.map((row) => [String(row.id ?? ""), row])).values());

  return uniqueRows
    .map((row) => normalizeSchoolConversation(row))
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
}

export function getSchoolChatConversationFeed(
  schoolId: string,
  currentUserId: string,
  onData: (conversations: SchoolChatConversation[]) => void,
  onError: (error: Error) => void,
) {
  const refresh = async () => {
    try {
      onData(await getSchoolChatConversations(schoolId, currentUserId));
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Could not load school conversations."));
    }
  };

  void refresh();

  const channel = supabase
    .channel(`school-chat-rooms-${currentUserId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "school_chat_rooms" }, () => {
      void refresh();
    })
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function createSchoolChatConversation(input: {
  schoolId: string;
  name: string;
  type: SchoolChatConversation["type"];
  memberIds: string[];
  createdBy: string;
}) {
  const conversationId =
    input.type === "direct"
      ? `direct-${[...new Set(input.memberIds)].sort().join("-")}`
      : `group-${crypto.randomUUID()}`;

  const payload = {
    id: conversationId,
    school_id: input.schoolId,
    name: input.name,
    type: input.type,
    member_ids: [...new Set(input.memberIds)],
    created_by: input.createdBy,
  };

  const { data, error } = await supabase
    .from("school_chat_rooms")
    .upsert(payload, { onConflict: "id" })
    .select("id, school_id, name, type, member_ids, created_by, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeSchoolConversation(data as Row);
}

export async function deleteSchoolChatConversation(conversationId: string) {
  const { data: conversation } = await supabase
    .from("school_chat_rooms")
    .select("id, type")
    .eq("id", conversationId)
    .maybeSingle<{ id: string; type: "group" | "direct" }>();

  if (conversation?.type === "direct") {
    const { error: directMessagesError } = await supabase
      .from("direct_messages")
      .delete()
      .eq("conversation_id", conversationId);

    if (directMessagesError) {
      throw new Error(directMessagesError.message);
    }
  } else {
    const { error: messagesError } = await supabase
      .from("school_messages")
      .delete()
      .eq("room", conversationId);

    if (messagesError) {
      throw new Error(messagesError.message);
    }
  }

  const { error } = await supabase
    .from("school_chat_rooms")
    .delete()
    .eq("id", conversationId);

  if (error) {
    throw new Error(error.message);
  }
}

async function getSchoolNameById(schoolId: string | null | undefined) {
  if (!schoolId) {
    return null;
  }

  const { data, error } = await supabase
    .from("schools")
    .select("name")
    .eq("id", schoolId)
    .maybeSingle<{ name: string | null }>();

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

async function loadSchoolGroupMessages(schoolId: string) {
  const roomAwareQuery = await supabase
    .from("school_messages")
    .select("id, school_id, room, user_id, content, parent_id, attachment_url, attachment_name, attachment_type, attachment_size, created_at, users(name, avatar)")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: true });

  if (!roomAwareQuery.error) {
    return (roomAwareQuery.data ?? []).map((row) => normalizeSchoolMessage(row as Row));
  }

  const attachmentAwareFallback = await supabase
    .from("school_messages")
    .select("id, school_id, room, user_id, content, parent_id, attachment_url, attachment_name, attachment_type, attachment_size, created_at")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: true });

  if (!attachmentAwareFallback.error) {
    const rowsWithUsers = await attachUsers((attachmentAwareFallback.data ?? []) as Row[]);
    return rowsWithUsers.map((row) => normalizeSchoolMessage(row as Row));
  }

  const fallbackQuery = await supabase
    .from("school_messages")
    .select("id, school_id, room, user_id, content, created_at")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: true });

  if (fallbackQuery.error) {
    throw new Error(fallbackQuery.error.message);
  }

  const rowsWithUsers = await attachUsers((fallbackQuery.data ?? []) as Row[]);
  return rowsWithUsers.map((row) => normalizeSchoolMessage(row as Row));
}

async function loadDirectMessages(currentUserId: string) {
  const directQuery = await supabase
    .from("direct_messages")
    .select("id, conversation_id, sender_id, receiver_id, content, parent_id, attachment_url, attachment_name, attachment_type, attachment_size, created_at")
    .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
    .order("created_at", { ascending: true });

  if (directQuery.error) {
    throw new Error(directQuery.error.message);
  }

  const rowsWithUsers = await attachUsers((directQuery.data ?? []) as Row[], "sender_id");
  return rowsWithUsers.map((row) => normalizeDirectMessage(row as Row));
}

export function getSchoolMessages(
  schoolId: string,
  currentUserId: string,
  onData: (messages: SchoolMessage[]) => void,
  onError: (error: Error) => void,
) {
  const refresh = async () => {
    try {
      const [groupMessages, directMessages] = await Promise.all([
        loadSchoolGroupMessages(schoolId),
        loadDirectMessages(currentUserId),
      ]);

      onData(
        [...groupMessages, ...directMessages].sort(
          (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
        ),
      );
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Could not load school chat."));
    }
  };

  void refresh();

  const channel = supabase
    .channel(`school-chat-feed-${currentUserId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "school_messages" }, () => {
      void refresh();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, () => {
      void refresh();
    })
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

function detectChatAttachmentType(file: File | null | undefined) {
  if (!file) {
    return null;
  }

  if (file.type.startsWith("image/")) {
    return "image" as const;
  }

  return "file" as const;
}

export async function createSchoolMessage(input: {
  schoolId: string;
  userId: string;
  content: string;
  room: SchoolMessage["room"];
  parentId?: string | null;
  file?: File | null;
}) {
  let attachmentUrl: string | null = null;
  let attachmentName: string | null = null;
  let attachmentType: SchoolMessage["attachmentType"] = null;
  let attachmentSize: number | null = null;
  let storagePath = "";

  if (input.file) {
    storagePath = `chat/${input.userId}/${Date.now()}-${input.file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("resources")
      .upload(storagePath, input.file, { upsert: false });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from("resources").getPublicUrl(storagePath);
    attachmentUrl = data.publicUrl;
    attachmentName = input.file.name;
    attachmentType = detectChatAttachmentType(input.file);
    attachmentSize = input.file.size;
  }

  const roomAwareInsert = await supabase
    .from("school_messages")
    .insert([
      {
        school_id: input.schoolId,
        room: input.room,
        user_id: input.userId,
        content: input.content,
        parent_id: input.parentId ?? null,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        attachment_type: attachmentType,
        attachment_size: attachmentSize,
      },
    ])
    .select("id, school_id, room, user_id, content, parent_id, attachment_url, attachment_name, attachment_type, attachment_size, created_at, users(name, avatar)")
    .single();

  if (!roomAwareInsert.error && roomAwareInsert.data) {
    return normalizeSchoolMessage(roomAwareInsert.data as Row);
  }

  const fallbackPayloads = [
    {
      school_id: input.schoolId,
      room: input.room,
      user_id: input.userId,
      content: input.content,
      parent_id: input.parentId ?? null,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      attachment_type: attachmentType,
      attachment_size: attachmentSize,
    },
    {
      school_id: input.schoolId,
      room: input.room,
      user_id: input.userId,
      content: input.content,
    },
    {
      school_id: input.schoolId,
      user_id: input.userId,
      content: input.content,
    },
  ].map((payload) =>
    Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== null)),
  );

  let fallbackData: Row | null = null;
  let fallbackErrorMessage = roomAwareInsert.error?.message ?? "Could not send message.";

  for (const payload of fallbackPayloads) {
    const attempt = await supabase
      .from("school_messages")
      .insert([payload])
      .select("id, school_id, room, user_id, content, created_at")
      .single();

    if (!attempt.error && attempt.data) {
      fallbackData = attempt.data as Row;
      break;
    }

    fallbackErrorMessage = attempt.error?.message ?? fallbackErrorMessage;
  }

  if (!fallbackData) {
  if (storagePath) {
    await supabase.storage.from("resources").remove([storagePath]).catch(() => undefined);
  }
  throw new Error(fallbackErrorMessage);
}

  const [rowWithUser] = await attachUsers([fallbackData]);
  return normalizeSchoolMessage(rowWithUser as Row);
}

export async function createDirectMessage(input: {
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  parentId?: string | null;
  file?: File | null;
}) {
  let attachmentUrl: string | null = null;
  let attachmentName: string | null = null;
  let attachmentType: SchoolMessage["attachmentType"] = null;
  let attachmentSize: number | null = null;
  let storagePath = "";

  if (input.file) {
    storagePath = `chat/${input.senderId}/${Date.now()}-${input.file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("resources")
      .upload(storagePath, input.file, { upsert: false });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from("resources").getPublicUrl(storagePath);
    attachmentUrl = data.publicUrl;
    attachmentName = input.file.name;
    attachmentType = detectChatAttachmentType(input.file);
    attachmentSize = input.file.size;
  }

  const insert = await supabase
    .from("direct_messages")
    .insert([
      {
        conversation_id: input.conversationId,
        sender_id: input.senderId,
        receiver_id: input.receiverId,
        content: input.content,
        parent_id: input.parentId ?? null,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        attachment_type: attachmentType,
        attachment_size: attachmentSize,
      },
    ])
    .select("id, conversation_id, sender_id, receiver_id, content, parent_id, attachment_url, attachment_name, attachment_type, attachment_size, created_at")
    .single();

  if (insert.error || !insert.data) {
    if (storagePath) {
      await supabase.storage.from("resources").remove([storagePath]).catch(() => undefined);
    }
    throw new Error(insert.error?.message ?? "Could not send direct message.");
  }

  const [rowWithUser] = await attachUsers([insert.data as Row], "sender_id");
  return normalizeDirectMessage(rowWithUser as Row);
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
  const joinedInsert = await supabase
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

  if (!joinedInsert.error && joinedInsert.data) {
    return normalizePost(joinedInsert.data as Row);
  }

  const fallbackInsert = await supabase
    .from("posts")
    .insert([
      {
        content: input.content,
        user_id: input.userId,
        likes: [],
        bookmarks: [],
      },
    ])
    .select("id, content, user_id, created_at, likes, bookmarks")
    .single();

  if (fallbackInsert.error || !fallbackInsert.data) {
    throw new Error(fallbackInsert.error?.message ?? joinedInsert.error?.message ?? "Could not create post.");
  }

  const [rowWithUser] = await attachUsers([fallbackInsert.data as Row]);
  return normalizePost(rowWithUser as Row);
}

export async function createComment(input: {
  postId: string;
  content: string;
  userId: string;
  userName: string;
}): Promise<DiscussionComment> {
  const joinedInsert = await supabase
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

  if (!joinedInsert.error && joinedInsert.data) {
    return normalizeComment(joinedInsert.data as Row);
  }

  const fallbackInsert = await supabase
    .from("comments")
    .insert([
      {
        post_id: input.postId,
        content: input.content,
        user_id: input.userId,
      },
    ])
    .select("id, post_id, content, user_id, created_at")
    .single();

  if (fallbackInsert.error || !fallbackInsert.data) {
    throw new Error(fallbackInsert.error?.message ?? joinedInsert.error?.message ?? "Could not create comment.");
  }

  const [rowWithUser] = await attachUsers([fallbackInsert.data as Row]);
  return normalizeComment(rowWithUser as Row);
}

export function getPosts(onData: (posts: DiscussionPost[]) => void, onError: (error: Error) => void) {
  const refresh = async () => {
    const joinedQuery = await supabase
      .from("posts")
      .select("id, content, user_id, created_at, likes, bookmarks, users(name, avatar)")
      .order("created_at", { ascending: false });

    if (!joinedQuery.error) {
      onData((joinedQuery.data ?? []).map((row) => normalizePost(row as Row)));
      return;
    }

    const fallbackQuery = await supabase
      .from("posts")
      .select("id, content, user_id, created_at, likes, bookmarks")
      .order("created_at", { ascending: false });

    if (fallbackQuery.error) {
      onError(new Error(fallbackQuery.error.message));
      return;
    }

    const rowsWithUsers = await attachUsers((fallbackQuery.data ?? []) as Row[]);
    onData(rowsWithUsers.map((row) => normalizePost(row as Row)));
  };

  void refresh();
  return createRealtimeChannel("posts-feed", "posts", refresh);
}

export function getComments(onData: (comments: DiscussionComment[]) => void, onError: (error: Error) => void) {
  const refresh = async () => {
    const joinedQuery = await supabase
      .from("comments")
      .select("id, post_id, content, user_id, created_at, users(name, avatar)")
      .order("created_at", { ascending: true });

    if (!joinedQuery.error) {
      onData((joinedQuery.data ?? []).map((row) => normalizeComment(row as Row)));
      return;
    }

    const fallbackQuery = await supabase
      .from("comments")
      .select("id, post_id, content, user_id, created_at")
      .order("created_at", { ascending: true });

    if (fallbackQuery.error) {
      onError(new Error(fallbackQuery.error.message));
      return;
    }

    const rowsWithUsers = await attachUsers((fallbackQuery.data ?? []) as Row[]);
    onData(rowsWithUsers.map((row) => normalizeComment(row as Row)));
  };

  void refresh();
  return createRealtimeChannel("comments-feed", "comments", refresh);
}

export function getVisibleResources(
  schoolId: string | null | undefined,
  onData: (resources: ResourceRecord[]) => void,
  onError: (error: Error) => void,
) {
  const refresh = async () => {
    let joinedQuery = supabase
      .from("resources")
      .select("id, title, description, user_id, school_id, resource_scope, file_type, tags, file_name, likes, bookmarks, created_at, users(name, avatar), resource_versions(file_url, storage_path, created_at)")
      .order("created_at", { ascending: false });

    if (schoolId) {
      joinedQuery = joinedQuery.or(`resource_scope.eq.common,and(resource_scope.eq.school,school_id.eq.${schoolId})`);
    } else {
      joinedQuery = joinedQuery.eq("resource_scope", "common");
    }

    const joinedResult = await joinedQuery;

    if (!joinedResult.error) {
      onData((joinedResult.data ?? []).map((row) => normalizeResource(row as Row)));
      return;
    }

    let fallbackQuery = supabase
      .from("resources")
      .select("id, title, description, user_id, school_id, resource_scope, file_type, tags, file_name, likes, bookmarks, created_at")
      .order("created_at", { ascending: false });

    if (schoolId) {
      fallbackQuery = fallbackQuery.or(`resource_scope.eq.common,and(resource_scope.eq.school,school_id.eq.${schoolId})`);
    } else {
      fallbackQuery = fallbackQuery.eq("resource_scope", "common");
    }

    const fallbackResult = await fallbackQuery;
    let rows: Row[] = [];

    if (fallbackResult.error) {
      let legacyQuery = supabase
        .from("resources")
        .select("id, title, description, user_id, school_id, created_at")
        .order("created_at", { ascending: false });

      if (schoolId) {
        legacyQuery = legacyQuery.or(`school_id.is.null,school_id.eq.${schoolId}`);
      }

      const legacyResult = await legacyQuery;
      if (legacyResult.error) {
        onError(new Error(legacyResult.error.message));
        return;
      }
      rows = (legacyResult.data ?? []) as Row[];
    } else {
      rows = (fallbackResult.data ?? []) as Row[];
    }

    rows = await attachUsers(rows);
    rows = await attachResourceVersions(rows);
    onData(rows.map((row) => normalizeResource(row as Row)));
  };

  void refresh();
  return createRealtimeChannel("resources-feed", "resources", refresh);
}

export async function createResource(input: CreateResourceInput & { userId: string; userName: string; schoolId?: string | null }) {
  if (!input.file && !input.externalUrl) {
    throw new Error("Add a file or an external link before saving this resource.");
  }

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

  const basePayload = {
    title: input.title,
    description: input.description,
    user_id: input.userId,
    school_id: input.resourceScope === "school" ? input.schoolId ?? null : null,
    resource_scope: input.resourceScope,
    file_type: detectFileType(input),
    tags,
    file_name: input.file?.name ?? null,
    likes: [],
    bookmarks: [],
  };

  const candidatePayloads = [
    basePayload,
    { ...basePayload, file_name: undefined },
    { ...basePayload, file_name: undefined, resource_scope: undefined },
    {
      title: input.title,
      description: input.description,
      user_id: input.userId,
      school_id: input.resourceScope === "school" ? input.schoolId ?? null : null,
    },
  ].map((payload) =>
    Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)),
  );

  let resource: { id: string } | null = null;
  let resourceInsertError: Error | null = null;

  for (const payload of candidatePayloads) {
    const { data, error } = await supabase
      .from("resources")
      .insert([payload])
      .select("id")
      .single();

    if (!error && data) {
      resource = data as { id: string };
      resourceInsertError = null;
      break;
    }

    resourceInsertError = new Error(error?.message ?? "Unable to create resource.");
  }

  if (!resource) {
    if (storagePath) {
      await supabase.storage.from("resources").remove([storagePath]).catch(() => undefined);
    }

    throw resourceInsertError ?? new Error("Unable to create resource.");
  }

  const { error: versionError } = await supabase.from("resource_versions").insert([
    {
      resource_id: resource.id,
      file_url: fileUrl,
      storage_path: storagePath || null,
    },
  ]);

  if (versionError) {
    try {
      await supabase.from("resources").delete().eq("id", resource.id);
    } catch {
      // Ignore rollback cleanup failures.
    }
    if (storagePath) {
      await supabase.storage.from("resources").remove([storagePath]).catch(() => undefined);
    }
    throw new Error(versionError.message);
  }
}

export async function uploadResource(input: CreateResourceInput & { userId: string; userName: string; schoolId?: string | null }) {
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
