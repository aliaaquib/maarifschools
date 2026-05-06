import {
  BookMarked,
  BookOpenText,
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

export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: House },
  { id: "all", label: "Resources", icon: LayoutGrid },
  { id: "mine", label: "My Resources", icon: FolderKanban },
  { id: "community", label: "Community", icon: BookOpenText },
  { id: "school-chat", label: "School Chat", icon: School },
  { id: "bookmarks", label: "Bookmarks", icon: BookMarked },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export type NavigationItemId = (typeof NAV_ITEMS)[number]["id"];
