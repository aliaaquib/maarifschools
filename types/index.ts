export type ResourceType = "pdf" | "ppt" | "docx" | "image" | "link" | "other";
export type ResourceScope = "common" | "school";
export type SchoolChatRoom = "general" | "grade-3" | "science";
export type SchoolChatAttachmentType = "image" | "file" | "link";

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
}
