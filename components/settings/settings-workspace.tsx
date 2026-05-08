"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Brush,
  Building2,
  Check,
  ChevronRight,
  Copy,
  Database,
  ExternalLink,
  Eye,
  Github,
  GraduationCap,
  KeyRound,
  Laptop,
  Link2,
  Lock,
  Mail,
  Monitor,
  Moon,
  Palette,
  Phone,
  Save,
  School,
  Shield,
  Smartphone,
  Sun,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GRADE_OPTIONS, SUBJECT_OPTIONS } from "@/lib/constants";
import { cn, formatRelativeDate, initials } from "@/lib/utils";
import {
  ClassRecord,
  DiscussionPost,
  ResourceRecord,
  SchoolTeacher,
  UserProfile,
} from "@/types";

type SettingsSectionId =
  | "profile"
  | "personal"
  | "security"
  | "school"
  | "notifications"
  | "appearance"
  | "connected"
  | "invite"
  | "privacy"
  | "danger";

type ThemeMode = "light" | "dark" | "system";
type AccentColor = "purple" | "blue" | "green";

interface SettingsWorkspaceProps {
  profile: UserProfile;
  profileForm: {
    name: string;
    subject: string;
    grade: string;
    avatar: string;
  };
  setProfileForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      subject: string;
      grade: string;
      avatar: string;
    }>
  >;
  savingProfile: boolean;
  uploadingAvatar: boolean;
  profileMessage: string | null;
  profileError: string | null;
  contributorLevel: string;
  uploadsCount: number;
  bookmarksCount: number;
  postsCount: number;
  totalStudents: number;
  classes: ClassRecord[];
  schoolTeachers: SchoolTeacher[];
  recentUploads: ResourceRecord[];
  recentPosts: DiscussionPost[];
  onAvatarUpload: (file: File | null) => Promise<void>;
  onSaveProfile: () => Promise<void>;
  onLogOut: () => Promise<void>;
  onOpenResource: (resource: ResourceRecord) => void;
  onOpenCommunity: () => void;
}

type LocalSettingsState = {
  bio: string;
  phone: string;
  notifications: {
    communityReplies: boolean;
    resourceUploads: boolean;
    schoolAnnouncements: boolean;
    classInvitations: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
  };
  appearance: {
    theme: ThemeMode;
    accent: AccentColor;
  };
  security: {
    twoFactor: boolean;
    loginAlerts: boolean;
  };
  connectedAccounts: {
    google: boolean;
    microsoft: boolean;
    github: boolean;
  };
  classPreferences: {
    defaultTab: "stream" | "resources" | "discussions" | "students";
    weeklyDigest: boolean;
    allowStudentRequests: boolean;
  };
  privacy: {
    allowTeacherDiscovery: boolean;
    showSubjectAndGrade: boolean;
    analyticsSharing: boolean;
  };
  pendingInvites: Array<{
    email: string;
    sentAt: string;
  }>;
};

type DangerAction = "delete-account" | "leave-school" | "clear-data" | null;

const SECTION_GROUPS: Array<{
  label: string;
  items: Array<{ id: SettingsSectionId; label: string }>;
}> = [
  {
    label: "Account",
    items: [
      { id: "profile", label: "Profile" },
      { id: "personal", label: "Personal Information" },
      { id: "security", label: "Password & Security" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { id: "school", label: "School Settings" },
      { id: "notifications", label: "Notifications" },
      { id: "appearance", label: "Appearance" },
    ],
  },
  {
    label: "Collaboration",
    items: [
      { id: "connected", label: "Connected Accounts" },
      { id: "invite", label: "Invite Teachers" },
    ],
  },
  {
    label: "Advanced",
    items: [
      { id: "privacy", label: "Data & Privacy" },
      { id: "danger", label: "Danger Zone" },
    ],
  },
];

const defaultLocalSettings = (): LocalSettingsState => ({
  bio: "",
  phone: "",
  notifications: {
    communityReplies: false,
    resourceUploads: false,
    schoolAnnouncements: false,
    classInvitations: false,
    emailNotifications: false,
    pushNotifications: false,
  },
  appearance: {
    theme: "system",
    accent: "purple",
  },
  security: {
    twoFactor: false,
    loginAlerts: true,
  },
  connectedAccounts: {
    google: false,
    microsoft: false,
    github: false,
  },
  classPreferences: {
    defaultTab: "stream",
    weeklyDigest: true,
    allowStudentRequests: true,
  },
  privacy: {
    allowTeacherDiscovery: true,
    showSubjectAndGrade: true,
    analyticsSharing: true,
  },
  pendingInvites: [],
});

function Toggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-150",
        enabled ? "bg-app-accent" : "bg-[#E5E7EB]",
      )}
      aria-pressed={enabled}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white transition-transform duration-150",
          enabled ? "translate-x-5" : "translate-x-1",
        )}
      />
    </button>
  );
}

function SectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-[32px] font-semibold tracking-[-0.02em] text-[#111827]">{title}</h2>
        <p className="max-w-3xl text-sm text-[#6B7280]">{description}</p>
      </div>
      {children}
    </div>
  );
}

function downloadJson(filename: string, data: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

async function copyText(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return false;
  }

  await navigator.clipboard.writeText(value);
  return true;
}

export function SettingsWorkspace({
  profile,
  profileForm,
  setProfileForm,
  savingProfile,
  uploadingAvatar,
  profileMessage,
  profileError,
  contributorLevel,
  uploadsCount,
  bookmarksCount,
  postsCount,
  totalStudents,
  classes,
  schoolTeachers,
  recentUploads,
  recentPosts,
  onAvatarUpload,
  onSaveProfile,
  onLogOut,
  onOpenResource,
  onOpenCommunity,
}: SettingsWorkspaceProps) {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("profile");
  const [inviteEmail, setInviteEmail] = useState("");
  const [localDraft, setLocalDraft] = useState<LocalSettingsState>(defaultLocalSettings);
  const [savedLocalSettings, setSavedLocalSettings] = useState<LocalSettingsState>(defaultLocalSettings);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dangerAction, setDangerAction] = useState<DangerAction>(null);
  const [showTwoFactorComingSoon, setShowTwoFactorComingSoon] = useState(false);
  const [showLoginAlertsComingSoon, setShowLoginAlertsComingSoon] = useState(false);
  const [notificationComingSoonLabel, setNotificationComingSoonLabel] = useState<string | null>(null);
  const [connectedAccountComingSoonLabel, setConnectedAccountComingSoonLabel] = useState<string | null>(null);

  const settingsStorageKey = useMemo(
    () => `teachshare-settings:${profile.uid}`,
    [profile.uid],
  );

  const profileDirty =
    profileForm.name !== profile.name ||
    profileForm.subject !== profile.subject ||
    profileForm.grade !== profile.grade ||
    profileForm.avatar !== (profile.avatar ?? "");

  const localDirty = JSON.stringify(localDraft) !== JSON.stringify(savedLocalSettings);
  const hasChanges = profileDirty || localDirty;

  const inviteLink = useMemo(() => {
    if (typeof window === "undefined") {
      return profile.schoolId ? `/signup?schoolId=${profile.schoolId}` : "/signup";
    }

    return profile.schoolId
      ? `${window.location.origin}/signup?schoolId=${profile.schoolId}`
      : `${window.location.origin}/signup`;
  }, [profile.schoolId]);

  const schoolMemberCount = schoolTeachers.length;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(settingsStorageKey);
    if (!raw) {
      const initial = defaultLocalSettings();
      setSavedLocalSettings(initial);
      setLocalDraft(initial);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<LocalSettingsState>;
      const merged: LocalSettingsState = {
        ...defaultLocalSettings(),
        ...parsed,
        notifications: {
          ...defaultLocalSettings().notifications,
          ...parsed.notifications,
        },
        appearance: {
          ...defaultLocalSettings().appearance,
          ...parsed.appearance,
        },
        security: {
          ...defaultLocalSettings().security,
          ...parsed.security,
        },
        connectedAccounts: {
          ...defaultLocalSettings().connectedAccounts,
          ...parsed.connectedAccounts,
        },
        classPreferences: {
          ...defaultLocalSettings().classPreferences,
          ...parsed.classPreferences,
        },
        privacy: {
          ...defaultLocalSettings().privacy,
          ...parsed.privacy,
        },
        pendingInvites: parsed.pendingInvites ?? [],
      };
      setSavedLocalSettings(merged);
      setLocalDraft(merged);
    } catch {
      const initial = defaultLocalSettings();
      setSavedLocalSettings(initial);
      setLocalDraft(initial);
    }
  }, [settingsStorageKey]);

  useEffect(() => {
    if (!profileMessage && !profileError) {
      return;
    }

    setLocalMessage(null);
    setLocalError(null);
  }, [profileError, profileMessage]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.setAttribute("data-accent", localDraft.appearance.accent);
  }, [localDraft.appearance.accent]);

  async function handleSaveAll() {
    setLocalError(null);
    setLocalMessage(null);

    try {
      if (localDirty && typeof window !== "undefined") {
        window.localStorage.setItem(settingsStorageKey, JSON.stringify(localDraft));
        setSavedLocalSettings(localDraft);
      }

      if (profileDirty) {
        await onSaveProfile();
      } else if (localDirty) {
        setLocalMessage("Settings updated successfully.");
      }
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "We could not save your settings.");
    }
  }

  async function handleCopyInviteLink() {
    const copied = await copyText(inviteLink);
    if (copied) {
      setLocalMessage("Invite link copied.");
      setLocalError(null);
    }
  }

  async function handleCreateInvite() {
    const trimmed = inviteEmail.trim();
    if (!trimmed) {
      setLocalError("Enter a teacher email to send an invite.");
      return;
    }

    setLocalDraft((current) => ({
      ...current,
      pendingInvites: [{ email: trimmed, sentAt: new Date().toISOString() }, ...current.pendingInvites],
    }));
    setInviteEmail("");
    setLocalError(null);
    setLocalMessage("Invite prepared. Save settings to keep this invite list.");
  }

  async function handleDangerConfirm() {
    if (dangerAction === "clear-data") {
      const reset = defaultLocalSettings();
      setLocalDraft(reset);
      setSavedLocalSettings(reset);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(settingsStorageKey);
      }
      setLocalMessage("Local settings data cleared.");
      setLocalError(null);
    } else if (dangerAction === "delete-account") {
      setLocalMessage("Account deletion requests are handled manually right now. Please contact your school administrator.");
      setLocalError(null);
    } else if (dangerAction === "leave-school") {
      setLocalMessage("School change and leave requests are reviewed by your workspace administrator.");
      setLocalError(null);
    }

    setDangerAction(null);
  }

  const currentDevice = useMemo(() => {
    if (typeof navigator === "undefined") {
      return "Current device";
    }

    if (/iPhone|Android/i.test(navigator.userAgent)) {
      return "Mobile device";
    }

    return "Desktop device";
  }, []);

  const securitySessions = [
    {
      name: currentDevice,
      browser: "Current browser session",
      location: profile.schoolName || "Current workspace",
      active: "Active now",
      icon: /Mobile/i.test(currentDevice) ? Smartphone : Laptop,
    },
    {
      name: "Browser session",
      browser: "TeachShare web app",
      location: "Recent access",
      active: "2 hours ago",
      icon: Monitor,
    },
  ];

  const stats = [
    { label: "Uploads", value: uploadsCount, icon: Upload },
    { label: "Bookmarks", value: bookmarksCount, icon: Link2 },
    { label: "Posts", value: postsCount, icon: Bell },
    { label: "Students", value: totalStudents, icon: GraduationCap },
  ];

  function renderProfileSection() {
    return (
      <SectionShell
        title="Profile"
        description="Shape how colleagues experience you across TeachShare with a strong teaching identity and a clear professional profile."
      >
        <Card className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-[#E5E7EB] bg-[#F3F4F6]">
                {profileForm.avatar ? (
                  <img
                    src={profileForm.avatar}
                    alt={profileForm.name || profile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-semibold text-[#111827]">
                    {initials(profileForm.name || profile.name)}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-semibold text-[#111827]">
                    {profileForm.name || profile.name}
                  </h3>
                  <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-xs font-medium text-[#6B7280]">
                    Teacher
                  </span>
                </div>
                <p className="text-sm text-[#6B7280]">{profile.email}</p>
                <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                  <School className="h-4 w-4" />
                  <span>{profile.schoolName || "No school linked yet"}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void onAvatarUpload(event.target.files?.[0] ?? null)}
                />
                <span className="inline-flex h-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#111827] transition hover:bg-[#F9FAFB]">
                  {uploadingAvatar ? "Uploading..." : "Upload photo"}
                </span>
              </label>
              <Button
                variant="ghost"
                className="h-11 rounded-xl border border-transparent px-4 text-sm font-medium text-[#6B7280] hover:border-[#E5E7EB] hover:bg-[#F9FAFB]"
                onClick={() => setProfileForm((current) => ({ ...current, avatar: "" }))}
              >
                Remove photo
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#E5E7EB] bg-[#FCFCFD] p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-app-accent-soft text-app-accent flex h-10 w-10 items-center justify-center rounded-2xl">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#9CA3AF]">
                        {item.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[#111827]">{item.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#111827]">Full Name</label>
                <Input
                  value={profileForm.name}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#111827]">Bio</label>
                <Textarea
                  value={localDraft.bio}
                  onChange={(event) =>
                    setLocalDraft((current) => ({ ...current, bio: event.target.value }))
                  }
                  placeholder="Tell your school how you teach, collaborate, and support learners."
                  className="min-h-[144px]"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#111827]">Subject</label>
                <Select
                  value={profileForm.subject}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, subject: event.target.value }))
                  }
                  options={SUBJECT_OPTIONS}
                  placeholder="Select subject"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#111827]">Grade</label>
                <Select
                  value={profileForm.grade}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, grade: event.target.value }))
                  }
                  options={GRADE_OPTIONS}
                  placeholder="Select grade"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#111827]">Phone Number</label>
                <Input
                  value={localDraft.phone}
                  onChange={(event) =>
                    setLocalDraft((current) => ({ ...current, phone: event.target.value }))
                  }
                  placeholder="+996 555 000 000"
                />
              </div>
            </div>
          </div>
        </Card>
      </SectionShell>
    );
  }

  function renderPersonalSection() {
    return (
      <SectionShell
        title="Personal Information"
        description="Keep your teacher profile complete so your school and collaborators can find the right expertise quickly."
      >
        <Card className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#E5E7EB] p-5">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#9CA3AF]">Primary Email</p>
              <p className="mt-3 text-base font-semibold text-[#111827]">{profile.email}</p>
              <p className="mt-2 text-sm text-[#6B7280]">This email is used for sign-in, invites, and important workspace alerts.</p>
            </div>
            <div className="rounded-2xl border border-[#E5E7EB] p-5">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#9CA3AF]">School Membership</p>
              <p className="mt-3 text-base font-semibold text-[#111827]">{profile.schoolName || "No school linked yet"}</p>
              <p className="mt-2 text-sm text-[#6B7280]">Your school membership controls classroom access, school chat, and internal sharing.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#E5E7EB] p-5">
              <p className="text-sm font-medium text-[#111827]">Subject focus</p>
              <p className="mt-2 text-sm text-[#6B7280]">{profileForm.subject || "No subject selected yet"}</p>
            </div>
            <div className="rounded-2xl border border-[#E5E7EB] p-5">
              <p className="text-sm font-medium text-[#111827]">Grade level</p>
              <p className="mt-2 text-sm text-[#6B7280]">{profileForm.grade || "No grade selected yet"}</p>
            </div>
            <div className="rounded-2xl border border-[#E5E7EB] p-5">
              <p className="text-sm font-medium text-[#111827]">Contact number</p>
              <p className="mt-2 text-sm text-[#6B7280]">{localDraft.phone || "No phone number added yet"}</p>
            </div>
          </div>
        </Card>
      </SectionShell>
    );
  }

  function renderSecuritySection() {
    return (
      <SectionShell
        title="Password & Security"
        description="Review how your account is protected and keep your current sessions under control."
      >
        <Card className="p-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#E5E7EB] p-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-app-accent-soft text-app-accent flex h-10 w-10 items-center justify-center rounded-2xl">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">Change password</p>
                      <p className="text-sm text-[#6B7280]">Reset your password when you want a stronger sign-in credential.</p>
                    </div>
                  </div>
                </div>
                <a
                  href="/forgot-password"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#E5E7EB] px-4 text-sm font-medium text-[#111827] transition hover:bg-[#F9FAFB]"
                >
                  Reset password
                </a>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] p-5">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#111827]">Two-factor authentication</p>
                  <p className="text-sm text-[#6B7280]">Add another layer of account protection for your workspace.</p>
                </div>
                <Toggle
                  enabled={localDraft.security.twoFactor}
                  onToggle={() => setShowTwoFactorComingSoon(true)}
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] p-5">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#111827]">Login alerts</p>
                  <p className="text-sm text-[#6B7280]">Notify you when your account is accessed from a new browser or device.</p>
                </div>
                <Toggle
                  enabled={localDraft.security.loginAlerts}
                  onToggle={() => setShowLoginAlertsComingSoon(true)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#111827]">Active sessions</h3>
                <span className="text-sm text-[#6B7280]">{securitySessions.length} devices</span>
              </div>
              {securitySessions.map((session) => {
                const Icon = session.icon;

                return (
                  <div
                    key={`${session.name}-${session.active}`}
                    className="rounded-2xl border border-[#E5E7EB] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F9FAFB] text-[#111827]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-[#111827]">{session.name}</p>
                          <p className="text-sm text-[#6B7280]">{session.browser}</p>
                          <p className="text-xs text-[#9CA3AF]">{session.location}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-sm font-medium text-[#DC2626] transition hover:text-[#B91C1C]"
                      >
                        Logout session
                      </button>
                    </div>
                    <p className="mt-4 text-xs text-[#9CA3AF]">Last active: {session.active}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </SectionShell>
    );
  }

  function renderSchoolSection() {
    return (
      <SectionShell
        title="School Settings"
        description="Understand how your school workspace is configured and how your teaching role fits inside it."
      >
        <Card className="p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#E5E7EB] p-5">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#9CA3AF]">Current school</p>
              <p className="mt-3 text-lg font-semibold text-[#111827]">{profile.schoolName || "No school linked yet"}</p>
            </div>
            <div className="rounded-2xl border border-[#E5E7EB] p-5">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#9CA3AF]">Role in school</p>
              <p className="mt-3 text-lg font-semibold text-[#111827]">Teacher</p>
            </div>
            <div className="rounded-2xl border border-[#E5E7EB] p-5">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#9CA3AF]">Members</p>
              <p className="mt-3 text-lg font-semibold text-[#111827]">{schoolMemberCount}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-[#E5E7EB] p-5">
              <h3 className="text-lg font-semibold text-[#111827]">School profile</h3>
              <p className="mt-2 text-sm text-[#6B7280]">
                Your school workspace controls internal resources, teacher collaboration, and classroom access for every connected teacher.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#E5E7EB] px-4 text-sm font-medium text-[#111827] transition hover:bg-[#F9FAFB]"
                  onClick={() => setLocalMessage("School profile is already reflected in your workspace settings.")}
                >
                  View school profile
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#E5E7EB] px-4 text-sm font-medium text-[#111827] transition hover:bg-[#F9FAFB]"
                  onClick={() => setLocalMessage("School change requests are coordinated by your school administrator.")}
                >
                  Request school change
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E5E7EB] p-5">
              <h3 className="text-lg font-semibold text-[#111827]">Teaching footprint</h3>
              <div className="mt-4 space-y-3 text-sm text-[#6B7280]">
                <div className="flex items-center justify-between">
                  <span>Classes managed</span>
                  <span className="font-medium text-[#111827]">{classes.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total students</span>
                  <span className="font-medium text-[#111827]">{totalStudents}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Visible resources</span>
                  <span className="font-medium text-[#111827]">{uploadsCount}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </SectionShell>
    );
  }

  function renderNotificationsSection() {
    const notificationItems = [
      ["Community replies", "Stay updated when another teacher responds to your discussion.", "communityReplies"] as const,
      ["Resource uploads", "Know when new materials are added to your workspace.", "resourceUploads"] as const,
      ["School announcements", "Receive important updates from your school workspace.", "schoolAnnouncements"] as const,
      ["Class invitations", "Track class membership and invite activity.", "classInvitations"] as const,
      ["Email notifications", "Send a digest to your email inbox.", "emailNotifications"] as const,
      ["Push notifications", "Show quick in-app alerts while you are active.", "pushNotifications"] as const,
    ];

    return (
      <SectionShell
        title="Notifications"
        description="Choose what should interrupt you and what should wait for a quieter moment."
      >
        <Card className="p-6">
          <div className="space-y-4">
            {notificationItems.map(([label, description, key]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-5 rounded-2xl border border-[#E5E7EB] p-5"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#111827]">{label}</p>
                  <p className="text-sm text-[#6B7280]">{description}</p>
                </div>
                <Toggle
                  enabled={false}
                  onToggle={() => setNotificationComingSoonLabel(label)}
                />
              </div>
            ))}
          </div>
        </Card>
      </SectionShell>
    );
  }

  function renderAppearanceSection() {
    const themes: Array<{ id: ThemeMode; label: string; icon: typeof Sun }> = [
      { id: "light", label: "Light mode", icon: Sun },
      { id: "dark", label: "Dark mode", icon: Moon },
      { id: "system", label: "System theme", icon: Monitor },
    ];

    const accents: Array<{ id: AccentColor; label: string; color: string }> = [
      { id: "purple", label: "Purple", color: "bg-[#6D28D9]" },
      { id: "blue", label: "Blue", color: "bg-[#2563EB]" },
      { id: "green", label: "Green", color: "bg-[#059669]" },
    ];

    return (
      <SectionShell
        title="Appearance"
        description="Control the visual tone of your workspace so it feels consistent with how you like to work."
      >
        <Card className="p-6">
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[#111827]">Theme</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {themes.map((theme) => {
                  const Icon = theme.icon;
                  const active = localDraft.appearance.theme === theme.id;

                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() =>
                        setLocalDraft((current) => ({
                          ...current,
                          appearance: { ...current.appearance, theme: theme.id },
                        }))
                      }
                      className={cn(
                        "rounded-2xl border p-5 text-left transition",
                        active
                          ? "border-app-accent bg-app-accent-soft"
                          : "border-[#E5E7EB] bg-white hover:bg-[#F9FAFB]",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#111827] shadow-sm">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#111827]">{theme.label}</p>
                          <p className="text-xs text-[#6B7280]">Preview workspace tone</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[#111827]">Accent color</h3>
              <div className="flex flex-wrap gap-3">
                {accents.map((accent) => {
                  const active = localDraft.appearance.accent === accent.id;

                  return (
                    <button
                      key={accent.id}
                      type="button"
                      onClick={() =>
                        setLocalDraft((current) => ({
                          ...current,
                          appearance: { ...current.appearance, accent: accent.id },
                        }))
                      }
                      className={cn(
                        "inline-flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition",
                        active
                          ? "border-app-accent bg-app-accent-soft text-app-accent"
                          : "border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F9FAFB]",
                      )}
                    >
                      <span className={cn("h-3 w-3 rounded-full", accent.color)} />
                      {accent.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      </SectionShell>
    );
  }

  function renderConnectedSection() {
    const connectedItems: Array<{
      key: keyof LocalSettingsState["connectedAccounts"];
      label: string;
      description: string;
      icon: typeof Mail;
    }> = [
      {
        key: "google",
        label: "Google",
        description: "Use Google identity and connected workspace services.",
        icon: Mail,
      },
      {
        key: "microsoft",
        label: "Microsoft",
        description: "Connect Microsoft services for calendar and school workflows.",
        icon: Building2,
      },
      {
        key: "github",
        label: "GitHub",
        description: "Link engineering collaboration tools for technical teams.",
        icon: Github,
      },
    ];

    return (
      <SectionShell
        title="Connected Accounts"
        description="Link the services that support your teaching workflow without cluttering your workspace."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {connectedItems.map((item) => {
            const Icon = item.icon;
            const connected = localDraft.connectedAccounts[item.key];

            return (
              <Card key={item.key} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F9FAFB] text-[#111827]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#111827]">{item.label}</h3>
                      <p className="mt-2 text-sm text-[#6B7280]">{item.description}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      connected
                        ? "bg-[#ECFDF5] text-[#059669]"
                        : "bg-[#F3F4F6] text-[#6B7280]",
                    )}
                  >
                    {connected ? "Connected" : "Not connected"}
                  </span>
                </div>
                <div className="mt-6">
                  <Button
                    variant={connected ? "outline" : "primary"}
                    className="h-11 w-full rounded-xl"
                    onClick={() => setConnectedAccountComingSoonLabel(item.label)}
                  >
                    {connected ? "Disconnect" : "Connect"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </SectionShell>
    );
  }

  function renderInviteSection() {
    return (
      <SectionShell
        title="Invite Teachers"
        description="Bring more teachers into your workspace with a direct link or a quick invite list you can manage in one place."
      >
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#111827]">Invite by email</label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="teacher@school.edu"
                    className="flex-1"
                  />
                  <Button className="h-11 rounded-xl px-5" onClick={() => void handleCreateInvite()}>
                    Invite teacher
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#111827]">Invite link</label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input value={inviteLink} readOnly className="flex-1" />
                  <Button variant="outline" className="h-11 rounded-xl px-5" onClick={() => void handleCopyInviteLink()}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy link
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-[#111827]">Pending invites</h3>
              <span className="text-sm text-[#6B7280]">{localDraft.pendingInvites.length} queued</span>
            </div>
            <div className="mt-5 space-y-3">
              {localDraft.pendingInvites.length > 0 ? (
                localDraft.pendingInvites.map((invite) => (
                  <div
                    key={`${invite.email}-${invite.sentAt}`}
                    className="rounded-2xl border border-[#E5E7EB] p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">{invite.email}</p>
                        <p className="mt-1 text-xs text-[#9CA3AF]">Queued {formatRelativeDate(invite.sentAt)}</p>
                      </div>
                      <span className="bg-app-accent-soft text-app-accent rounded-full px-3 py-1 text-xs font-semibold">
                        Pending
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[#E5E7EB] p-5 text-sm text-[#6B7280]">
                  No pending invites yet. Add teacher emails or share your school invite link.
                </div>
              )}
            </div>
          </Card>
        </div>
      </SectionShell>
    );
  }

  function renderPrivacySection() {
    return (
      <SectionShell
        title="Data & Privacy"
        description="Export what you need, control what other teachers can see, and keep your workspace transparent."
      >
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-6">
            <div className="space-y-4">
              {[
                {
                  label: "Allow teacher discovery",
                  description: "Let colleagues find you by subject, grade, and school expertise.",
                  key: "allowTeacherDiscovery",
                },
                {
                  label: "Show subject and grade",
                  description: "Display the teaching context on your profile across the workspace.",
                  key: "showSubjectAndGrade",
                },
                {
                  label: "Share product analytics",
                  description: "Help improve TeachShare by sharing usage signals from your workspace.",
                  key: "analyticsSharing",
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-5 rounded-2xl border border-[#E5E7EB] p-5"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#111827]">{item.label}</p>
                    <p className="text-sm text-[#6B7280]">{item.description}</p>
                  </div>
                  <Toggle
                    enabled={localDraft.privacy[item.key as keyof LocalSettingsState["privacy"]]}
                    onToggle={() =>
                      setLocalDraft((current) => ({
                        ...current,
                        privacy: {
                          ...current.privacy,
                          [item.key]: !current.privacy[item.key as keyof LocalSettingsState["privacy"]],
                        },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border border-[#E5E7EB] p-5 text-left transition hover:bg-[#F9FAFB]"
                onClick={() =>
                  downloadJson("teachshare-account-data.json", {
                    profile,
                    bio: localDraft.bio,
                    phone: localDraft.phone,
                    classes,
                    recentUploads,
                    recentPosts,
                  })
                }
              >
                <div>
                  <p className="text-sm font-semibold text-[#111827]">Download account data</p>
                  <p className="mt-1 text-sm text-[#6B7280]">Export your profile and workspace summary as JSON.</p>
                </div>
                <ChevronRight className="h-5 w-5 text-[#9CA3AF]" />
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border border-[#E5E7EB] p-5 text-left transition hover:bg-[#F9FAFB]"
                onClick={() => downloadJson("teachshare-resources.json", recentUploads)}
              >
                <div>
                  <p className="text-sm font-semibold text-[#111827]">Export resources</p>
                  <p className="mt-1 text-sm text-[#6B7280]">Save a structured copy of your latest teaching materials.</p>
                </div>
                <ChevronRight className="h-5 w-5 text-[#9CA3AF]" />
              </button>
            </div>
          </Card>
        </div>
      </SectionShell>
    );
  }

  function renderDangerSection() {
    return (
      <SectionShell
        title="Danger Zone"
        description="Handle sensitive account actions carefully. These controls are intentionally separated from the rest of your workspace."
      >
        <Card className="border-[#FECACA] p-6">
          <div className="space-y-4">
            {[
              {
                id: "delete-account" as const,
                title: "Delete account",
                description: "Remove your TeachShare account from this workspace.",
                actionLabel: "Delete account",
              },
              {
                id: "leave-school" as const,
                title: "Leave school",
                description: "Start the process of removing your membership from the current school.",
                actionLabel: "Leave school",
              },
              {
                id: "clear-data" as const,
                title: "Clear local data",
                description: "Reset your saved local preferences on this device.",
                actionLabel: "Clear data",
              },
            ].map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-[#991B1B]">{item.title}</p>
                  <p className="mt-1 text-sm text-[#B91C1C]">{item.description}</p>
                </div>
                <Button
                  variant="outline"
                  className="h-11 rounded-xl border-[#FCA5A5] bg-white px-4 text-[#B91C1C] hover:bg-[#FEE2E2]"
                  onClick={() => setDangerAction(item.id)}
                >
                  {item.actionLabel}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </SectionShell>
    );
  }

  function renderSectionContent() {
    switch (activeSection) {
      case "profile":
        return renderProfileSection();
      case "personal":
        return renderPersonalSection();
      case "security":
        return renderSecuritySection();
      case "school":
        return renderSchoolSection();
      case "notifications":
        return renderNotificationsSection();
      case "appearance":
        return renderAppearanceSection();
      case "connected":
        return renderConnectedSection();
      case "invite":
        return renderInviteSection();
      case "privacy":
        return renderPrivacySection();
      case "danger":
        return renderDangerSection();
      default:
        return null;
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[260px_minmax(0,1fr)]">
      <Card className="h-fit overflow-hidden xl:sticky xl:top-28">
        <div className="p-4">
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#FCFCFD] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F3F4F6]">
                {profileForm.avatar ? (
                  <img
                    src={profileForm.avatar}
                    alt={profileForm.name || profile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold text-[#111827]">
                    {initials(profileForm.name || profile.name)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">Workspace preferences</p>
                <h1 className="truncate text-lg font-semibold tracking-[-0.02em] text-[#111827]">
                  {profileForm.name || profile.name}
                </h1>
                <p className="truncate text-sm text-[#6B7280]">{profile.email}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="bg-app-accent-soft text-app-accent rounded-full px-2.5 py-1 text-[11px] font-semibold">
                    Teacher
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="my-4 h-px bg-[#E5E7EB]" />

          <div className="space-y-6">
          {SECTION_GROUPS.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition",
                      activeSection === item.id
                        ? "bg-app-accent-soft font-semibold text-app-accent"
                        : "text-[#4B5563] hover:bg-[#F9FAFB]",
                    )}
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          ))}
          </div>
        </div>
      </Card>

      <div className="min-w-0 space-y-8">
        {renderSectionContent()}

        <Card
          className={cn(
            "sticky bottom-4 z-20 border-[#E5E7EB] bg-white/95 p-4 backdrop-blur transition",
            hasChanges ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
          )}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#111827]">Unsaved changes</p>
              <p className="text-sm text-[#6B7280]">
                Save your updates to keep your profile and workspace preferences in sync.
              </p>
              {profileMessage || localMessage ? (
                <p className="text-sm text-[#059669]">{profileMessage || localMessage}</p>
              ) : null}
              {profileError || localError ? (
                <p className="text-sm text-[#B91C1C]">{profileError || localError}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="ghost"
                className="h-11 rounded-xl px-4 text-[#6B7280]"
                onClick={() => {
                  setProfileForm({
                    name: profile.name,
                    subject: profile.subject,
                    grade: profile.grade,
                    avatar: profile.avatar ?? "",
                  });
                  setLocalDraft(savedLocalSettings);
                  setLocalError(null);
                  setLocalMessage(null);
                }}
              >
                Reset changes
              </Button>
              <Button
                className="h-11 rounded-xl px-5"
                loading={savingProfile}
                loadingText="Saving..."
                disabled={savingProfile}
                onClick={() => void handleSaveAll()}
              >
                <Save className="mr-2 h-4 w-4" />
                Save settings
              </Button>
            </div>
          </div>
        </Card>

      </div>

      {dangerAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <Card className="w-full max-w-lg border-[#FECACA] bg-white p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FEF2F2] text-[#DC2626]">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-[#111827]">
                  {dangerAction === "delete-account"
                    ? "Delete account?"
                    : dangerAction === "leave-school"
                      ? "Leave this school?"
                      : "Clear local data?"}
                </h3>
                <p className="text-sm text-[#6B7280]">
                  {dangerAction === "clear-data"
                    ? "This will clear the settings saved on this device and reset your local preferences."
                    : "This action affects your workspace access and should only be used when you are ready to continue."}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="outline" className="h-11 rounded-xl px-5" onClick={() => setDangerAction(null)}>
                Cancel
              </Button>
              <Button
                className="h-11 rounded-xl bg-[#DC2626] px-5 text-white hover:bg-[#B91C1C]"
                onClick={() => void handleDangerConfirm()}
              >
                Confirm
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {showTwoFactorComingSoon ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <Card className="w-full max-w-md bg-white p-6">
            <div className="flex items-start gap-4">
              <div className="bg-app-accent-soft text-app-accent flex h-12 w-12 items-center justify-center rounded-2xl">
                <Shield className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-[#111827]">Feature coming soon</h3>
                <p className="text-sm text-[#6B7280]">
                  Two-factor authentication is on our roadmap and will be available in a future TeachShare update.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                className="h-11 rounded-xl px-5"
                onClick={() => setShowTwoFactorComingSoon(false)}
              >
                Got it
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {showLoginAlertsComingSoon ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <Card className="w-full max-w-md bg-white p-6">
            <div className="flex items-start gap-4">
              <div className="bg-app-accent-soft text-app-accent flex h-12 w-12 items-center justify-center rounded-2xl">
                <Bell className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-[#111827]">Feature coming soon</h3>
                <p className="text-sm text-[#6B7280]">
                  Login alerts are coming in a future TeachShare update and will help you spot new sign-ins faster.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                className="h-11 rounded-xl px-5"
                onClick={() => setShowLoginAlertsComingSoon(false)}
              >
                Got it
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {notificationComingSoonLabel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <Card className="w-full max-w-md bg-white p-6">
            <div className="flex items-start gap-4">
              <div className="bg-app-accent-soft text-app-accent flex h-12 w-12 items-center justify-center rounded-2xl">
                <Bell className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-[#111827]">Feature coming soon</h3>
                <p className="text-sm text-[#6B7280]">
                  {notificationComingSoonLabel} preferences are coming in a future TeachShare update.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                className="h-11 rounded-xl px-5"
                onClick={() => setNotificationComingSoonLabel(null)}
              >
                Got it
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {connectedAccountComingSoonLabel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <Card className="w-full max-w-md bg-white p-6">
            <div className="flex items-start gap-4">
              <div className="bg-app-accent-soft text-app-accent flex h-12 w-12 items-center justify-center rounded-2xl">
                <Link2 className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-[#111827]">Feature coming soon</h3>
                <p className="text-sm text-[#6B7280]">
                  {connectedAccountComingSoonLabel} account connections are coming in a future TeachShare update.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                className="h-11 rounded-xl px-5"
                onClick={() => setConnectedAccountComingSoonLabel(null)}
              >
                Got it
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
