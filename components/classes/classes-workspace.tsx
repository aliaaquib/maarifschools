"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarClock,
  Copy,
  GraduationCap,
  LayoutGrid,
  Link2,
  Megaphone,
  NotebookPen,
  Plus,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GRADE_OPTIONS, SUBJECT_OPTIONS } from "@/lib/constants";
import { toUserFacingError } from "@/lib/errors";
import { formatRelativeDate, initials } from "@/lib/utils";
import { ClassMember, ClassPost, ClassPostType, ClassRecord, ResourceRecord, UserProfile } from "@/types";

type ClassTab = "stream" | "resources" | "discussions" | "students";

interface ClassesWorkspaceProps {
  mode: "overview" | "detail";
  initialCreateOpen?: boolean;
  profile: UserProfile;
  classes: ClassRecord[];
  loading: boolean;
  selectedClassId: string | null;
  inviteClassId?: string | null;
  classMembers: ClassMember[];
  classPosts: ClassPost[];
  classResources: ResourceRecord[];
  myResources: ResourceRecord[];
  onSelectClass: (classId: string) => void;
  onOpenClass: (classId: string) => void;
  onBackToClasses?: () => void;
  onInviteClassChange?: (classId: string | null) => void;
  onCreateClass: (input: {
    name: string;
    subject: string;
    grade: string;
    description: string;
  }) => Promise<void>;
  onCreateClassPost: (input: {
    classId: string;
    type: ClassPostType;
    title: string;
    content: string;
  }) => Promise<void>;
  onAddResourceToClass: (classId: string, resourceId: string) => Promise<void>;
  onRemoveStudent: (classId: string, userId: string) => Promise<void>;
}

function getClassTone(index: number) {
  const tones = [
    "from-[#F5F3FF] to-[#EDE9FE]",
    "from-[#ECFDF5] to-[#DCFCE7]",
    "from-[#FFF7ED] to-[#FFEDD5]",
    "from-[#EFF6FF] to-[#DBEAFE]",
  ];

  return tones[index % tones.length];
}

export function ClassesWorkspace({
  mode,
  initialCreateOpen = false,
  classes,
  loading,
  selectedClassId,
  inviteClassId: externalInviteClassId = null,
  classMembers,
  classPosts,
  classResources,
  myResources,
  onSelectClass,
  onOpenClass,
  onBackToClasses,
  onInviteClassChange,
  onCreateClass,
  onCreateClassPost,
  onAddResourceToClass,
  onRemoveStudent,
}: ClassesWorkspaceProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(initialCreateOpen);
  const [createError, setCreateError] = useState("");
  const [creatingClass, setCreatingClass] = useState(false);
  const [classTab, setClassTab] = useState<ClassTab>("stream");
  const [postType, setPostType] = useState<ClassPostType>("announcement");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [resourceLinkingId, setResourceLinkingId] = useState<string | null>(null);
  const [inviteClassId, setInviteClassId] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");

  useEffect(() => {
    setInviteClassId(externalInviteClassId);
  }, [externalInviteClassId]);

  useEffect(() => {
    setIsCreateOpen(initialCreateOpen);
  }, [initialCreateOpen]);

  const selectedClass = classes.find((item) => item.id === selectedClassId) ?? null;
  const activeClassId = selectedClass?.id ?? null;

  const streamItems = useMemo(
    () =>
      classPosts
        .filter((post) => post.type !== "discussion")
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [classPosts],
  );
  const discussionItems = useMemo(() => classPosts.filter((post) => post.type === "discussion"), [classPosts]);
  const studentMembers = useMemo(() => classMembers.filter((member) => member.role === "student"), [classMembers]);
  const teacherMembers = useMemo(() => classMembers.filter((member) => member.role === "teacher"), [classMembers]);

  const availableResources = useMemo(
    () => myResources.filter((resource) => !classResources.some((linked) => linked.id === resource.id)),
    [classResources, myResources],
  );

  const filteredClasses = useMemo(
    () =>
      classes.filter((classItem) => {
        const haystack = `${classItem.name} ${classItem.subject} ${classItem.grade}`.toLowerCase();
        const matchesSearch = haystack.includes(searchQuery.toLowerCase());
        const matchesSubject = subjectFilter ? classItem.subject === subjectFilter : true;
        const matchesGrade = gradeFilter ? classItem.grade === gradeFilter : true;
        return matchesSearch && matchesSubject && matchesGrade;
      }),
    [classes, gradeFilter, searchQuery, subjectFilter],
  );

  async function handleCreateClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setCreatingClass(true);
    setCreateError("");

    try {
      await onCreateClass({
        name: String(formData.get("name") ?? "").trim(),
        subject: String(formData.get("subject") ?? "").trim(),
        grade: String(formData.get("grade") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim(),
      });
      form.reset();
      setIsCreateOpen(false);
    } catch (error) {
      setCreateError(toUserFacingError(error, "We could not create this class."));
    } finally {
      setCreatingClass(false);
    }
  }

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeClassId) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    setPosting(true);
    setPostError("");

    try {
      await onCreateClassPost({
        classId: activeClassId,
        type: postType,
        title: String(formData.get("title") ?? "").trim(),
        content: String(formData.get("content") ?? "").trim(),
      });
      form.reset();
    } catch (error) {
      setPostError(toUserFacingError(error, "We could not save this class update."));
    } finally {
      setPosting(false);
    }
  }

  async function handleCopyInvite(classItem: ClassRecord) {
    const inviteLink =
      typeof window !== "undefined"
        ? `${window.location.origin}/join/${classItem.inviteCode}`
        : classItem.inviteCode;

    await navigator.clipboard.writeText(inviteLink);
    setCopiedInvite(true);
    window.setTimeout(() => setCopiedInvite(false), 1800);
  }

  function openInviteModal(classId: string) {
    setCopiedInvite(false);
    setInviteClassId(classId);
    onInviteClassChange?.(classId);
  }

  function closeInviteModal() {
    setCopiedInvite(false);
    setInviteClassId(null);
    onInviteClassChange?.(null);
  }

  const cardsContent = loading ? (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="min-h-[230px] rounded-[20px] border-[#E5E7EB] bg-white p-6">
          <div className="h-full w-full rounded-[16px] bg-[#F9FAFB]" />
        </Card>
      ))}
    </div>
  ) : filteredClasses.length === 0 ? (
    <EmptyState
      icon={GraduationCap}
      title={classes.length === 0 ? "Create your first class" : "No classes match your filters"}
      description={
        classes.length === 0
          ? "Set up a classroom, invite students, and start organizing lesson materials in one focused space."
          : "Try a different search or clear your subject and grade filters."
      }
      action={
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Class
        </Button>
      }
    />
  ) : (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {filteredClasses.map((classItem, index) => {
        return (
          <Card
            key={classItem.id}
            className="overflow-hidden rounded-[20px] border-[#E5E7EB] bg-white shadow-[0_4px_16px_rgba(17,24,39,0.03)] transition hover:-translate-y-[2px] hover:shadow-[0_10px_24px_rgba(17,24,39,0.06)]"
          >
            <button type="button" className="block w-full text-left" onClick={() => onOpenClass(classItem.id)}>
              <div className={`h-24 bg-gradient-to-br ${getClassTone(index)}`} />
              <div className="space-y-4 p-5">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-[#111827]">{classItem.name}</h3>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    {classItem.subject} • {classItem.grade}
                  </p>
                </div>

                <div className="space-y-2 text-sm text-[#6B7280]">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{classItem.studentCount} students</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    <span>Created {formatRelativeDate(classItem.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span className="truncate">{classItem.description || "Ready for class resources and updates"}</span>
                  </div>
                </div>
              </div>
            </button>

            <div className="flex items-center gap-2 px-5 pb-5">
              <Button variant="outline" className="flex-1" onClick={() => openInviteModal(classItem.id)}>
                <Link2 className="h-4 w-4" />
                Invite Students
              </Button>
              <Button className="flex-1" onClick={() => onOpenClass(classItem.id)}>
                Open Class
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-8">
      {mode === "overview" ? (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold text-foreground">Classes</h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Create classes, invite students, and keep every resource, discussion, and update organized around the classroom.
              </p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Class
            </Button>
          </div>

          <Card className="rounded-[20px] border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(17,24,39,0.03)]">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_220px_220px]">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search classes by name, subject, or grade"
              />
              <Select
                value={subjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
                options={SUBJECT_OPTIONS}
                placeholder="All subjects"
              />
              <Select
                value={gradeFilter}
                onChange={(event) => setGradeFilter(event.target.value)}
                options={GRADE_OPTIONS}
                placeholder="All grades"
              />
            </div>
          </Card>

          {cardsContent}
        </>
      ) : loading ? (
        cardsContent
      ) : !selectedClass ? (
        <EmptyState
          icon={GraduationCap}
          title="Class not found"
          description="This classroom could not be loaded. Head back to the classes overview and choose another one."
          action={
            <Button onClick={() => onBackToClasses?.()}>
              <ArrowLeft className="h-4 w-4" />
              Back to classes
            </Button>
          }
        />
      ) : (
        <Card className="rounded-[24px] border-[#E5E7EB] bg-white p-6 shadow-[0_4px_18px_rgba(17,24,39,0.03)]">
          <div className="flex flex-col gap-4 border-b border-[#F3F4F6] pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onBackToClasses?.()}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#6D28D9] transition hover:text-[#5B21B6]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to classes
              </button>
              <p className="text-sm text-[#6B7280]">{selectedClass.subject} • {selectedClass.grade}</p>
              <h3 className="text-2xl font-semibold text-[#111827]">{selectedClass.name}</h3>
              <p className="max-w-3xl text-sm leading-6 text-[#6B7280]">
                {selectedClass.description || "This class is ready for announcements, resources, discussions, and student collaboration."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => openInviteModal(selectedClass.id)}>
                <Copy className="h-4 w-4" />
                Invite Students
              </Button>
              <Button onClick={() => setClassTab("resources")}>
                <LayoutGrid className="h-4 w-4" />
                Manage Class
              </Button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {([
              { id: "stream", label: "Stream" },
              { id: "resources", label: "Resources" },
              { id: "discussions", label: "Discussions" },
              { id: "students", label: "Students" },
            ] as Array<{ id: ClassTab; label: string }>).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setClassTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  classTab === tab.id
                    ? "bg-[#F5F3FF] font-medium text-[#6D28D9]"
                    : "border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F9FAFB]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
            <div className="space-y-5">
              {(classTab === "stream" || classTab === "discussions") ? (
                <Card className="rounded-[20px] border-[#E5E7EB] bg-[#FCFCFD] p-5">
                  <form className="space-y-4" onSubmit={handleCreatePost}>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { id: "announcement", label: "Announcement", icon: Megaphone },
                        { id: "assignment", label: "Assignment", icon: NotebookPen },
                        { id: "discussion", label: "Discussion", icon: Sparkles },
                      ] as Array<{ id: ClassPostType; label: string; icon: typeof Megaphone }>).map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setPostType(option.id)}
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition ${
                            postType === option.id
                              ? "bg-[#F5F3FF] font-medium text-[#6D28D9]"
                              : "border border-[#E5E7EB] bg-white text-[#6B7280]"
                          }`}
                        >
                          <option.icon className="h-3.5 w-3.5" />
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <Input name="title" placeholder={`Add a ${postType} title`} required />
                    <Textarea name="content" placeholder="Share the details with your class..." required />
                    {postError ? <p className="text-sm text-foreground/80">{postError}</p> : null}
                    <Button type="submit" disabled={posting} loading={posting} loadingText="Saving...">
                      Save to class
                    </Button>
                  </form>
                </Card>
              ) : null}

              {classTab === "stream" ? (
                <div className="space-y-4">
                  {streamItems.length > 0 ? streamItems.map((post) => (
                    <Card key={post.id} className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB] bg-[#FAFAFA] text-sm font-semibold text-[#111827]">
                          {post.authorAvatar ? (
                            <img src={post.authorAvatar} alt={post.authorName} className="h-full w-full rounded-full object-cover" />
                          ) : (
                            initials(post.authorName)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-[#111827]">{post.title || "Class update"}</p>
                            <span className="text-xs text-[#9CA3AF]">{formatRelativeDate(post.createdAt)}</span>
                          </div>
                          <p className="mt-1 text-sm text-[#6B7280]">by {post.authorName}</p>
                          <p className="mt-3 whitespace-pre-wrap text-sm text-[#111827]">{post.content}</p>
                        </div>
                      </div>
                    </Card>
                  )) : (
                    <EmptyState icon={Megaphone} title="No class updates yet" description="Announcements and stream posts will appear here." />
                  )}
                </div>
              ) : null}

              {classTab === "resources" ? (
                <div className="space-y-4">
                  <Card className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">Link existing resources</p>
                        <p className="mt-1 text-sm text-[#6B7280]">Choose from the resources you have already uploaded.</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {availableResources.length > 0 ? availableResources.slice(0, 6).map((resource) => (
                        <div key={resource.id} className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[#111827]">{resource.title}</p>
                            <p className="mt-1 truncate text-xs text-[#6B7280]">{resource.tags.join(" • ")}</p>
                          </div>
                          <Button
                            variant="outline"
                            disabled={resourceLinkingId === resource.id}
                            loading={resourceLinkingId === resource.id}
                            loadingText="Adding..."
                            onClick={async () => {
                              if (!activeClassId) return;
                              setResourceLinkingId(resource.id);
                              try {
                                await onAddResourceToClass(activeClassId, resource.id);
                              } finally {
                                setResourceLinkingId(null);
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      )) : (
                        <p className="text-sm text-[#6B7280]">Upload resources first to attach them to this class.</p>
                      )}
                    </div>
                  </Card>

                  {classResources.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {classResources.map((resource) => (
                        <Card key={resource.id} className="p-5">
                          <p className="text-sm font-semibold text-[#111827]">{resource.title}</p>
                          <p className="mt-2 line-clamp-2 text-sm text-[#6B7280]">{resource.description}</p>
                          <p className="mt-4 text-xs text-[#9CA3AF]">{resource.tags.join(" • ")}</p>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={BookOpen} title="No class resources yet" description="Add lesson plans, worksheets, and references for this class." />
                  )}
                </div>
              ) : null}

              {classTab === "discussions" ? (
                discussionItems.length > 0 ? (
                  <div className="space-y-4">
                    {discussionItems.map((post) => (
                      <Card key={post.id} className="p-5">
                        <p className="text-sm font-semibold text-[#111827]">{post.title || "Discussion"}</p>
                        <p className="mt-1 text-xs text-[#9CA3AF]">by {post.authorName} • {formatRelativeDate(post.createdAt)}</p>
                        <p className="mt-3 whitespace-pre-wrap text-sm text-[#111827]">{post.content}</p>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Sparkles} title="No class discussions yet" description="Class-specific discussions will stay separate from the global community." />
                )
              ) : null}

              {classTab === "students" ? (
                studentMembers.length > 0 ? (
                  <div className="space-y-3">
                    {studentMembers.map((member) => (
                      <Card key={member.id} className="flex items-center gap-4 p-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] bg-[#FAFAFA] text-sm font-semibold text-[#111827]">
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.name} className="h-full w-full rounded-full object-cover" />
                          ) : (
                            initials(member.name)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#111827]">{member.name}</p>
                          <p className="mt-1 text-xs text-[#6B7280]">{member.email} • joined {formatRelativeDate(member.joinedAt)}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => void onRemoveStudent(selectedClass.id, member.userId)}>
                          Remove
                        </Button>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Users} title="No students have joined yet" description="Invite students with the class link to start building your roster." />
                )
              ) : null}
            </div>

            <div className="space-y-4">
              <Card className="p-5">
                <p className="text-sm font-semibold text-[#111827]">Invite students</p>
                <p className="mt-2 text-sm text-[#6B7280]">Share the class link or invite code so students can join quickly.</p>
                <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-[#9CA3AF]">Invite code</p>
                  <p className="mt-2 text-lg font-semibold text-[#111827]">{selectedClass.inviteCode}</p>
                </div>
                <Button className="mt-4 w-full" variant="outline" onClick={() => openInviteModal(selectedClass.id)}>
                  <Copy className="h-4 w-4" />
                  Share invite
                </Button>
              </Card>

              <Card className="p-5">
                <p className="text-sm font-semibold text-[#111827]">Class snapshot</p>
                <div className="mt-4 space-y-3 text-sm text-[#6B7280]">
                  <div className="flex items-center justify-between"><span>Students</span><span>{selectedClass.studentCount}</span></div>
                  <div className="flex items-center justify-between"><span>Teachers</span><span>{teacherMembers.length}</span></div>
                  <div className="flex items-center justify-between"><span>Resources</span><span>{classResources.length}</span></div>
                  <div className="flex items-center justify-between"><span>Discussions</span><span>{discussionItems.length}</span></div>
                </div>
              </Card>
            </div>
          </div>
        </Card>
      )}

      {isCreateOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-6 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)}>
          <div className="w-full max-w-[560px] rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_48px_rgba(17,24,39,0.12)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-[#111827]">Create a class</h3>
                <p className="mt-1 text-sm text-[#6B7280]">Set up a classroom workspace for students, resources, and updates.</p>
              </div>
              <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-xl p-2 text-[#6B7280] transition hover:bg-[#F9FAFB] hover:text-[#111827]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleCreateClass}>
              <Input name="name" placeholder="Computer Science Grade 3" required />
              <div className="grid gap-4 md:grid-cols-2">
                <Select name="subject" options={SUBJECT_OPTIONS} placeholder="Select subject" />
                <Select name="grade" options={GRADE_OPTIONS} placeholder="Select grade" />
              </div>
              <Textarea name="description" placeholder="Describe the class goals, schedule, or expectations..." required />
              {createError ? <p className="text-sm text-foreground/80">{createError}</p> : null}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={creatingClass} loading={creatingClass} loadingText="Creating...">
                  Create Class
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {inviteClassId ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-6 backdrop-blur-sm" onClick={closeInviteModal}>
          <div className="w-full max-w-[520px] rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_48px_rgba(17,24,39,0.12)]" onClick={(event) => event.stopPropagation()}>
            {(() => {
              const classItem = classes.find((item) => item.id === inviteClassId);
              if (!classItem) return null;
              const inviteLink =
                typeof window !== "undefined"
                  ? `${window.location.origin}/join/${classItem.inviteCode}`
                  : classItem.inviteCode;

              return (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-[#111827]">Invite students</h3>
                      <p className="mt-1 text-sm text-[#6B7280]">{classItem.name}</p>
                    </div>
                    <button type="button" onClick={closeInviteModal} className="rounded-xl p-2 text-[#6B7280] transition hover:bg-[#F9FAFB] hover:text-[#111827]">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.08em] text-[#9CA3AF]">Invite link</p>
                      <p className="mt-2 break-all text-sm text-[#111827]">{inviteLink}</p>
                    </div>
                    <div className="rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.08em] text-[#9CA3AF]">Invite code</p>
                      <p className="mt-2 text-lg font-semibold text-[#111827]">{classItem.inviteCode}</p>
                    </div>
                    <Button className="w-full" onClick={() => void handleCopyInvite(classItem)}>
                      <Copy className="h-4 w-4" />
                      {copiedInvite ? "Copied" : "Copy invite link"}
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}
    </div>
  );
}
