import {
  BookMarked,
  Bookmark,
  FolderKanban,
  LayoutGrid,
  MessageSquareText,
  Upload,
  UserCircle2,
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
  { id: "all", label: "All Resources", icon: LayoutGrid },
  { id: "mine", label: "My Resources", icon: FolderKanban },
  { id: "upload", label: "Upload", icon: Upload },
  { id: "community", label: "Community", icon: MessageSquareText },
  { id: "bookmarks", label: "Bookmarks", icon: BookMarked },
  { id: "profile", label: "Profile", icon: UserCircle2 },
] as const;

export type NavigationItemId = (typeof NAV_ITEMS)[number]["id"];
