export type ResourceType = "pdf" | "ppt" | "docx" | "image" | "link" | "other";

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
  userId: string;
  userName: string;
  userAvatar?: string | null;
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
