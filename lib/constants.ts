import { SchoolChatConversation, SchoolChatRoom } from "@/types";

import {
  BookMarked,
  BookOpenText,
  GraduationCap,
  FolderKanban,
  House,
  LayoutGrid,
  MessageCircleMore,
  School,
  Settings,
} from "lucide-react";

export const SUBJECT_OPTIONS = [
  "Mathematics",
  "Science",
  "English",
  "History",
  "Geography",
  "Art",
  "Computer",
];

export const GRADE_OPTIONS = [
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
];

export const DEFAULT_SCHOOL_CHAT_ROOMS: Array<{
  id: SchoolChatRoom;
  name: string;
  fallbackPreview: string;
  tone: string;
  type: SchoolChatConversation["type"];
}> = [
  {
    id: "general",
    name: "General Chat",
    fallbackPreview: "Good morning everyone!",
    tone: "bg-[#EEF2FF] text-[#4F46E5]",
    type: "group",
  },
  {
    id: "grade-3",
    name: "Grade 3 Teachers",
    fallbackPreview: "I shared a new worksheet",
    tone: "bg-[#FEE2E2] text-[#DC2626]",
    type: "group",
  },
  {
    id: "science",
    name: "Science Department",
    fallbackPreview: "Check out this experiment",
    tone: "bg-[#DCFCE7] text-[#16A34A]",
    type: "group",
  },
] as const;

export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: House },
  { id: "classes", label: "Classes", icon: GraduationCap },
  { id: "all", label: "Resources", icon: LayoutGrid },
  { id: "mine", label: "My Resources", icon: FolderKanban },
  { id: "community", label: "Community", icon: BookOpenText },
  { id: "school-chat", label: "School Chat", icon: School },
  { id: "bookmarks", label: "Bookmarks", icon: BookMarked },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export type NavigationItemId = (typeof NAV_ITEMS)[number]["id"];
