export type ResourceType = "pdf" | "ppt" | "docx" | "image" | "link" | "other";
export type ResourceScope = "common" | "school";
export type SchoolChatRoom = string;
export type SchoolChatAttachmentType = "image" | "file" | "link";
export type SchoolChatConversationType = "group" | "direct";
export type ClassMemberRole = "teacher" | "student";
export type ClassPostType = "announcement" | "discussion" | "assignment";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  avatar?: string | null;
  subject: string;
  grade: string;
  schoolId?: string | null;
  schoolName?: string | null;
  createdAt: string;
}

export interface SchoolRecord {
  id: string;
  name: string;
  createdAt: string;
}

export interface SchoolMessage {
  id: string;
  schoolId: string;
  room: SchoolChatRoom;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  content: string;
  parentId?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: SchoolChatAttachmentType | null;
  attachmentSize?: number | null;
  createdAt: string;
}

export interface SchoolChatConversation {
  id: string;
  schoolId: string;
  name: string;
  type: SchoolChatConversationType;
  memberIds: string[];
  createdBy?: string | null;
  createdAt: string;
}

export interface SchoolTeacher {
  id: string;
  name: string;
  avatar?: string | null;
  email: string;
  subject?: string;
  grade?: string;
}

export interface ClassRecord {
  id: string;
  teacherId: string;
  schoolId: string;
  name: string;
  subject: string;
  grade: string;
  description: string;
  inviteCode: string;
  bannerUrl?: string | null;
  createdAt: string;
  studentCount: number;
}

export interface ClassMember {
  id: string;
  classId: string;
  userId: string;
  role: ClassMemberRole;
  name: string;
  email: string;
  avatar?: string | null;
  subject?: string;
  grade?: string;
  joinedAt: string;
}

export interface ClassPost {
  id: string;
  classId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  type: ClassPostType;
  title: string;
  content: string;
  createdAt: string;
}

export interface ResourceRecord {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  fileType: ResourceType;
  tags: string[];
  userId: string;
  userName: string;
  resourceScope: ResourceScope;
  schoolId?: string | null;
  createdAt: string;
  fileName?: string;
  filePath?: string;
  likes: string[];
  bookmarks: string[];
  viewCount?: number;
  downloadCount?: number;
}

export type CommunityCategory = "all" | "questions" | "ideas" | "resources";

export interface CreateResourceInput {
  title: string;
  description: string;
  subject: string;
  grade: string;
  resourceScope: ResourceScope;
  externalUrl?: string;
  file?: File | null;
}

export interface DiscussionPost {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  createdAt: string;
  likes: string[];
  bookmarks: string[];
}

export interface DiscussionComment {
  id: string;
  postId: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  createdAt: string;
}

export interface ResourceFilters {
  search: string;
  subject: string;
  grade: string;
}

export interface NotificationItem {
  id: string;
  type: "resource" | "post" | "comment" | "school-message";
  title: string;
  description: string;
  createdAt: string;
  targetId?: string;
}
